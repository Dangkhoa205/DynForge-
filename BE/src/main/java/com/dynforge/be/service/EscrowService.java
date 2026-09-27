package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.mapper.BookingMapper;
import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.EscrowTransaction;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.WalletTransaction;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.EscrowStatus;
import com.dynforge.be.model.enums.TransactionStatus;
import com.dynforge.be.model.enums.TransactionType;
import com.dynforge.be.repository.BookingRepository;
import com.dynforge.be.repository.EscrowTransactionRepository;
import com.dynforge.be.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

/**
 * Escrow lifecycle: PENDING_PAYMENT -> ESCROW_HELD -> ACCEPTED -> TAUGHT -> COMPLETED
 * (or DISPUTED / REFUNDED).
 *
 * <p>Every status change goes through {@link BookingTransitions} (atomic compare-and-set) and every
 * balance change through {@link WalletBalanceService} (atomic $inc). Concurrent requests on the same
 * booking can therefore never pay, release or refund twice.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EscrowService {

    private static final Set<BookingStatus> PAID_NOT_TAUGHT =
            EnumSet.of(BookingStatus.ESCROW_HELD, BookingStatus.ACCEPTED);
    private static final Set<BookingStatus> DISPUTABLE =
            EnumSet.of(BookingStatus.ESCROW_HELD, BookingStatus.ACCEPTED, BookingStatus.TAUGHT);

    private final BookingRepository bookingRepository;
    private final EscrowTransactionRepository escrowRepository;
    private final WalletTransactionRepository walletTxnRepository;
    private final WalletBalanceService walletBalanceService;
    private final BookingTransitions transitions;
    private final BookingMapper bookingMapper;

    // ── pay ──────────────────────────────────────────────────────────────────

    public BookingResponse pay(User mentee, String bookingId) {
        Booking booking = requireBooking(bookingId);

        if (!booking.getMenteeId().toHexString().equals(mentee.getId())) {
            throw new BadRequestException("Only the mentee can pay for this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new BadRequestException(
                    "Expected booking status PENDING_PAYMENT but was " + booking.getStatus());
        }

        long total      = booking.getPrice();
        double rate     = booking.getCommissionRate();
        long commission = Math.round(total * rate);
        long payout     = total - commission;

        // 1. Take the money atomically (fails instead of going negative).
        if (!walletBalanceService.debit(mentee.getId(), total)) {
            throw new BadRequestException(
                    "Insufficient wallet balance. Required: " + total
                            + ", available: " + walletBalanceService.balanceOf(mentee.getId()));
        }

        // 2. Claim the booking. If another request paid or cancelled it meanwhile, give the money back.
        Booking claimed = transitions.transition(bookingId, EnumSet.of(BookingStatus.PENDING_PAYMENT),
                BookingStatus.ESCROW_HELD, null);
        if (claimed == null) {
            walletBalanceService.credit(mentee.getId(), total);
            throw new BadRequestException("This booking has already been paid or cancelled");
        }

        recordWalletTxn(mentee.getId(), TransactionType.PAYMENT, total,
                "Payment for booking " + bookingId, bookingId);

        EscrowTransaction escrow = escrowRepository.save(EscrowTransaction.builder()
                .bookingId(new ObjectId(bookingId))
                .menteeId(new ObjectId(mentee.getId()))
                .mentorId(booking.getMentorId())
                .totalAmount(total)
                .commissionRate(rate)
                .commissionAmount(commission)
                .mentorPayout(payout)
                .status(EscrowStatus.HELD)
                .heldAt(Instant.now())
                .build());

        transitions.linkEscrow(bookingId, escrow.getId());
        return bookingMapper.toResponse(requireBooking(bookingId));
    }

    // ── accept request (mentor) ──────────────────────────────────────────────

    public BookingResponse accept(User mentor, String bookingId) {
        requireMentor(mentor, requireBooking(bookingId), "accept");
        Booking updated = transitions.transitionOrFail(bookingId, EnumSet.of(BookingStatus.ESCROW_HELD),
                BookingStatus.ACCEPTED, new Update().set("acceptedAt", Instant.now()));
        return bookingMapper.toResponse(updated);
    }

    // ── decline request (mentor) → refund mentee ─────────────────────────────

    public BookingResponse decline(User mentor, String bookingId) {
        requireMentor(mentor, requireBooking(bookingId), "decline");
        return refundEscrow(bookingId, PAID_NOT_TAUGHT);
    }

    // ── mark-taught (mentor) ─────────────────────────────────────────────────

    public BookingResponse markTaught(User mentor, String bookingId) {
        requireMentor(mentor, requireBooking(bookingId), "mark as taught");
        // Allowed from ESCROW_HELD (implicit accept) or ACCEPTED
        Booking updated = transitions.transitionOrFail(bookingId, PAID_NOT_TAUGHT,
                BookingStatus.TAUGHT, new Update().set("taughtAt", Instant.now()));
        return bookingMapper.toResponse(updated);
    }

    // ── confirm (mentee) → COMPLETED + release ───────────────────────────────

    public BookingResponse confirmAndRelease(User mentee, String bookingId) {
        requireMentee(mentee, requireBooking(bookingId), "confirm");
        return releaseEscrow(bookingId, EnumSet.of(BookingStatus.TAUGHT));
    }

    // ── dispute (mentee) ─────────────────────────────────────────────────────

    public BookingResponse dispute(User mentee, String bookingId, String issueType, String reason) {
        requireMentee(mentee, requireBooking(bookingId), "open a dispute on");
        // A dispute can be raised on any paid session that isn't finished yet.
        Booking updated = transitions.transitionOrFail(bookingId, DISPUTABLE, BookingStatus.DISPUTED,
                new Update().set("disputeIssueType", issueType).set("disputeReason", reason));
        return bookingMapper.toResponse(updated);
    }

    // ── resolve dispute (admin) ───────────────────────────────────────────────

    public BookingResponse resolveDispute(String bookingId, boolean releaseToMentor) {
        requireBooking(bookingId);
        Set<BookingStatus> from = EnumSet.of(BookingStatus.DISPUTED);
        return releaseToMentor ? releaseEscrow(bookingId, from) : refundEscrow(bookingId, from);
    }

    // ── auto-confirm (called by scheduler) ───────────────────────────────────

    public void autoConfirm(String bookingId) {
        try {
            releaseEscrow(bookingId, EnumSet.of(BookingStatus.TAUGHT));
            log.info("Auto-confirmed booking {}", bookingId);
        } catch (Exception e) {
            // Usually means the mentee confirmed or disputed a moment earlier.
            log.info("Auto-confirm skipped for booking {}: {}", bookingId, e.getMessage());
        }
    }

    // ── internals ────────────────────────────────────────────────────────────

    /** Booking -> COMPLETED and escrow HELD -> RELEASED, then pay the mentor. */
    private BookingResponse releaseEscrow(String bookingId, Set<BookingStatus> from) {
        Booking completed = transitions.transitionOrFail(bookingId, from, BookingStatus.COMPLETED, null);

        EscrowTransaction escrow = transitions.settleEscrow(bookingId, EscrowStatus.RELEASED);
        if (escrow == null) {
            log.error("Booking {} moved to COMPLETED but its escrow was not HELD — no payout made", bookingId);
            throw new BadRequestException("Escrow for this booking has already been settled");
        }

        String mentorId = escrow.getMentorId().toHexString();
        if (escrow.getMentorPayout() > 0) {
            walletBalanceService.credit(mentorId, escrow.getMentorPayout());
        }
        recordWalletTxn(mentorId, TransactionType.PAYOUT, escrow.getMentorPayout(),
                "Payout for booking " + bookingId, bookingId);

        return bookingMapper.toResponse(completed);
    }

    /** Booking -> REFUNDED and escrow HELD -> REFUNDED, then give the mentee their money back. */
    private BookingResponse refundEscrow(String bookingId, Set<BookingStatus> from) {
        Booking refunded = transitions.transitionOrFail(bookingId, from, BookingStatus.REFUNDED, null);

        EscrowTransaction escrow = transitions.settleEscrow(bookingId, EscrowStatus.REFUNDED);
        if (escrow == null) {
            log.error("Booking {} moved to REFUNDED but its escrow was not HELD — no refund made", bookingId);
            throw new BadRequestException("Escrow for this booking has already been settled");
        }

        String menteeId = escrow.getMenteeId().toHexString();
        if (escrow.getTotalAmount() > 0) {
            walletBalanceService.credit(menteeId, escrow.getTotalAmount());
        }
        recordWalletTxn(menteeId, TransactionType.REFUND, escrow.getTotalAmount(),
                "Refund for booking " + bookingId, bookingId);

        return bookingMapper.toResponse(refunded);
    }

    private void recordWalletTxn(String userId, TransactionType type, long amount,
                                 String description, String bookingId) {
        walletTxnRepository.save(WalletTransaction.builder()
                .userId(new ObjectId(userId))
                .type(type)
                .status(TransactionStatus.COMPLETED)
                .amount(amount)
                .description(description)
                .relatedBookingId(bookingId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    private Booking requireBooking(String bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
    }

    private static void requireMentor(User user, Booking booking, String action) {
        if (!booking.getMentorId().toHexString().equals(user.getId())) {
            throw new BadRequestException("Only the mentor can " + action + " this booking");
        }
    }

    private static void requireMentee(User user, Booking booking, String action) {
        if (!booking.getMenteeId().toHexString().equals(user.getId())) {
            throw new BadRequestException("Only the mentee can " + action + " this booking");
        }
    }
}
