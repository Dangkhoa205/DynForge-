package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.model.dto.TopUpRequest;
import com.dynforge.be.model.dto.TopUpResponse;
import com.dynforge.be.model.dto.TransactionResponse;
import com.dynforge.be.model.dto.WalletResponse;
import com.dynforge.be.model.dto.WebhookRequest;
import com.dynforge.be.model.dto.WithdrawRequest;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.WalletTransaction;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.TransactionStatus;
import com.dynforge.be.model.enums.TransactionType;
import com.dynforge.be.repository.BookingRepository;
import com.dynforge.be.repository.UserRepository;
import com.dynforge.be.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletTransactionRepository txnRepository;
    private final UserRepository userRepository;
    private final PayOsClient payOsClient;
    private final MongoTemplate mongoTemplate;
    private final BookingRepository bookingRepository;
    private final EscrowService escrowService;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public WalletResponse getWallet(User user) {
        ObjectId userId = new ObjectId(user.getId());
        List<TransactionResponse> history = txnRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();

        return new WalletResponse(user.getWalletBalance(), history);
    }

    public TopUpResponse topUp(User user, TopUpRequest request) {
        long orderCode = newOrderCode();

        WalletTransaction txn = WalletTransaction.builder()
                .userId(new ObjectId(user.getId()))
                .type(TransactionType.TOPUP)
                .status(TransactionStatus.PENDING)
                .amount(request.amount())
                .description("Wallet top-up")
                .externalRef(String.valueOf(orderCode))
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        txnRepository.save(txn);

        // PayOS redirects the buyer back to the wallet page (it appends orderCode + status).
        String returnUrl = frontendBaseUrl + "/dashboard/wallet";
        String cancelUrl = frontendBaseUrl + "/dashboard/wallet";
        String checkoutUrl = payOsClient.createPaymentLink(
                orderCode, request.amount(), "Nap vi DynForge", returnUrl, cancelUrl);

        return new TopUpResponse(txn.getId(), request.amount(), checkoutUrl, orderCode);
    }

    /**
     * Pays for ONE specific session through PayOS (exact booking price, no stored balance).
     * Used by the Android app: it does not sell wallet top-ups, only 1:1 live sessions, which
     * Google Play allows to be paid outside Play Billing. Once PayOS confirms the payment the
     * money goes straight into escrow for that booking (see {@link #payLinkedBooking}).
     */
    public TopUpResponse createBookingCheckout(User user, String bookingId, boolean fromApp) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        if (!booking.getMenteeId().toHexString().equals(user.getId())) {
            throw new BadRequestException("Only the mentee can pay for this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new BadRequestException("Buổi học này không còn chờ thanh toán (trạng thái " + booking.getStatus() + ").");
        }

        long amount = booking.getPrice();
        long orderCode = newOrderCode();

        WalletTransaction txn = txnRepository.save(WalletTransaction.builder()
                .userId(new ObjectId(user.getId()))
                .type(TransactionType.TOPUP)
                .status(TransactionStatus.PENDING)
                .amount(amount)
                .description("PayOS payment for booking " + bookingId)
                .externalRef(String.valueOf(orderCode))
                .relatedBookingId(bookingId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        // /payment-return is a public web page; with app=1 it sends the buyer back into the Android app.
        String returnUrl = frontendBaseUrl + "/payment-return?bookingId="
                + URLEncoder.encode(bookingId, StandardCharsets.UTF_8) + (fromApp ? "&app=1" : "");
        String checkoutUrl = payOsClient.createPaymentLink(orderCode, amount, "DynForge", returnUrl, returnUrl);

        return new TopUpResponse(txn.getId(), amount, checkoutUrl, orderCode);
    }

    /**
     * Called after PayOS redirects back. Verifies the payment with PayOS and credits
     * the wallet once (idempotent).
     */
    public TransactionResponse confirmPayosPayment(User user, long orderCode) {
        WalletTransaction txn = txnRepository.findByExternalRef(String.valueOf(orderCode))
                .orElseThrow(() -> new ResourceNotFoundException("Unknown order: " + orderCode));

        if (!txn.getUserId().toHexString().equals(user.getId())) {
            throw new BadRequestException("This payment does not belong to you");
        }

        // Idempotency: already finalized — return current state
        if (txn.getStatus() != TransactionStatus.PENDING) {
            return toResponse(txn);
        }

        String status = payOsClient.getPaymentStatus(orderCode);
        if ("PAID".equals(status)) {
            // Atomic PENDING -> COMPLETED so the web tab and the app confirming at once credit only once.
            WalletTransaction completed = finalizePending(txn.getExternalRef(), TransactionStatus.COMPLETED);
            if (completed == null) {
                return toResponse(txnRepository.findById(txn.getId()).orElse(txn));
            }
            creditWallet(completed.getUserId(), completed.getAmount());
            payLinkedBooking(completed);
            return toResponse(completed);
        }
        if ("CANCELLED".equals(status) || "EXPIRED".equals(status)) {
            WalletTransaction failed = finalizePending(txn.getExternalRef(), TransactionStatus.FAILED);
            return toResponse(failed != null ? failed : txn);
        }
        // PENDING/PROCESSING → leave as-is; the buyer can retry confirmation.
        return toResponse(txn);
    }

    /**
     * Mentor payout: debits the wallet immediately and records a completed WITHDRAWAL.
     * (Demo: no real bank transfer — settlement is assumed instant.)
     */
    public TransactionResponse withdraw(User user, WithdrawRequest request) {
        // Atomic wallet deduction (Anti race-condition)
        Query debitQuery = new Query(Criteria.where("_id").is(new ObjectId(user.getId()))
                .and("walletBalance").gte(request.amount()));
        Update debitUpdate = new Update().inc("walletBalance", -request.amount());
        User updated = mongoTemplate.findAndModify(debitQuery, debitUpdate,
                FindAndModifyOptions.options().returnNew(true), User.class);

        if (updated == null) {
            throw new BadRequestException("Số dư khả dụng không đủ để thực hiện yêu cầu rút tiền.");
        }

        WalletTransaction txn = WalletTransaction.builder()
                .userId(new ObjectId(user.getId()))
                .type(TransactionType.WITHDRAWAL)
                .status(TransactionStatus.COMPLETED)
                .amount(request.amount())
                .description("Withdrawal to " + request.bankName() + " · " + request.bankAccount())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return toResponse(txnRepository.save(txn));
    }

    /**
     * Idempotent: if the webhook is replayed, returns the already-processed result
     * without crediting the wallet a second time.
     */
    public TransactionResponse handleWebhook(WebhookRequest body) {
        WalletTransaction txn = txnRepository.findByExternalRef(body.txnRef())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Unknown transaction reference: " + body.txnRef()));

        boolean success = body.status() == WebhookRequest.WebhookStatus.SUCCESS;
        WalletTransaction finalized = finalizePending(body.txnRef(),
                success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED);
        if (finalized == null) {
            // Idempotency: already finalized — return current state
            return toResponse(txnRepository.findById(txn.getId()).orElse(txn));
        }

        if (success) {
            creditWallet(finalized.getUserId(), finalized.getAmount());
            payLinkedBooking(finalized);
        }

        return toResponse(finalized);
    }

    /** PENDING -> {@code outcome} in one atomic write. Returns null if it was not PENDING anymore. */
    private WalletTransaction finalizePending(String externalRef, TransactionStatus outcome) {
        Query query = Query.query(Criteria.where("externalRef").is(externalRef)
                .and("status").is(TransactionStatus.PENDING));
        Update update = new Update().set("status", outcome).set("updatedAt", Instant.now());
        return mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true),
                WalletTransaction.class);
    }

    /** For per-session checkouts: move the just-credited money into the booking's escrow. */
    private void payLinkedBooking(WalletTransaction txn) {
        String bookingId = txn.getRelatedBookingId();
        if (bookingId == null || bookingId.isBlank()) {
            return;
        }
        try {
            // Reload the user so EscrowService sees the balance that was just credited.
            User fresh = userRepository.findById(txn.getUserId().toHexString())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + txn.getUserId()));
            escrowService.pay(fresh, bookingId);
        } catch (Exception e) {
            // e.g. the booking was cancelled meanwhile — the money simply stays in the wallet.
            log.warn("Paid order {} but could not move it into booking {}: {}",
                    txn.getExternalRef(), bookingId, e.getMessage());
        }
    }

    /** Unique, positive, fits PayOS's limit (<= 9007199254740991). */
    private static long newOrderCode() {
        return System.currentTimeMillis() * 1000 + ThreadLocalRandom.current().nextInt(1000);
    }

    private void creditWallet(ObjectId userId, long amount) {
        mongoTemplate.updateFirst(
                new Query(Criteria.where("_id").is(userId)),
                new Update().inc("walletBalance", amount),
                User.class
        );
    }

    private TransactionResponse toResponse(WalletTransaction txn) {
        return new TransactionResponse(
                txn.getId(),
                txn.getType(),
                txn.getStatus(),
                txn.getAmount(),
                txn.getDescription(),
                txn.getRelatedBookingId(),
                txn.getCreatedAt()
        );
    }
}
