package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.mapper.UserMapper;
import com.dynforge.be.model.dto.AdminDashboardResponse;
import com.dynforge.be.model.dto.AdminDisputeResponse;
import com.dynforge.be.model.dto.AdminTransactionResponse;
import com.dynforge.be.model.dto.CommissionReportResponse;
import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.EscrowTransaction;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.WalletTransaction;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.EscrowStatus;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.TransactionType;
import com.dynforge.be.model.enums.UserStatus;
import com.dynforge.be.model.enums.VerificationStatus;
import com.dynforge.be.repository.BookingRepository;
import com.dynforge.be.repository.EscrowTransactionRepository;
import com.dynforge.be.repository.UserRepository;
import com.dynforge.be.repository.VerificationRepository;
import com.dynforge.be.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final double DEFAULT_COMMISSION_RATE = 0.15;

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final EscrowTransactionRepository escrowRepository;
    private final WalletTransactionRepository walletTxnRepository;
    private final VerificationRepository verificationRepository;
    private final UserMapper userMapper;

    // ── dashboard ─────────────────────────────────────────────────────────────

    public AdminDashboardResponse getDashboard() {
        List<EscrowTransaction> released = escrowRepository.findByStatus(EscrowStatus.RELEASED);
        List<EscrowTransaction> held     = escrowRepository.findByStatus(EscrowStatus.HELD);

        long totalRevenue   = released.stream().mapToLong(EscrowTransaction::getTotalAmount).sum();
        long totalCommission = released.stream().mapToLong(EscrowTransaction::getCommissionAmount).sum();
        long escrowHeld     = held.stream().mapToLong(EscrowTransaction::getTotalAmount).sum();

        return new AdminDashboardResponse(
                userRepository.count(),
                userRepository.countByRolesContaining(Role.MENTOR),
                userRepository.countByRolesContaining(Role.MENTEE),
                bookingRepository.count(),
                bookingRepository.countByStatus(BookingStatus.COMPLETED),
                bookingRepository.countByStatusIn(EnumSet.of(
                        BookingStatus.ESCROW_HELD, BookingStatus.ACCEPTED, BookingStatus.TAUGHT)),
                bookingRepository.countByStatus(BookingStatus.DISPUTED),
                verificationRepository.findByStatus(VerificationStatus.PENDING).size(),
                totalRevenue,
                totalCommission,
                escrowHeld
        );
    }

    // ── users ─────────────────────────────────────────────────────────────────

    public List<UserResponse> listUsers(Role role) {
        List<User> users = role == null
                ? userRepository.findAll()
                : userRepository.findByRolesContaining(role);
        return users.stream().map(userMapper::toResponse).toList();
    }

    public UserResponse updateUserStatus(String userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getStatus() == UserStatus.DELETED || status == UserStatus.DELETED) {
            throw new BadRequestException("Deleted accounts cannot be changed from the admin panel");
        }
        user.setStatus(status);
        return userMapper.toResponse(userRepository.save(user));
    }

    // ── transactions ────────────────────────────────────────────────────────────

    public List<AdminTransactionResponse> listTransactions(TransactionType type) {
        Map<String, String> nameById = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));

        return walletTxnRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(t -> type == null || t.getType() == type)
                .map(t -> toAdminTransaction(t, nameById))
                .toList();
    }

    // ── disputes ────────────────────────────────────────────────────────────────

    public List<AdminDisputeResponse> listDisputes() {
        Map<String, String> nameById = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));

        return bookingRepository.findByStatus(BookingStatus.DISPUTED).stream()
                .map(b -> toDispute(b, nameById))
                .toList();
    }

    // ── commission ────────────────────────────────────────────────────────────

    public CommissionReportResponse getCommissionReport() {
        List<EscrowTransaction> released = escrowRepository.findByStatus(EscrowStatus.RELEASED);
        List<EscrowTransaction> held     = escrowRepository.findByStatus(EscrowStatus.HELD);

        long totalCommissionEarned = released.stream().mapToLong(EscrowTransaction::getCommissionAmount).sum();
        long pendingCommission     = held.stream().mapToLong(EscrowTransaction::getCommissionAmount).sum();
        long grossVolume           = released.stream().mapToLong(EscrowTransaction::getTotalAmount).sum();

        return new CommissionReportResponse(
                DEFAULT_COMMISSION_RATE,
                totalCommissionEarned,
                pendingCommission,
                grossVolume,
                released.size(),
                held.size()
        );
    }

    // ── internals ────────────────────────────────────────────────────────────

    private AdminDisputeResponse toDispute(Booking b, Map<String, String> nameById) {
        String menteeId = b.getMenteeId().toHexString();
        String mentorId = b.getMentorId().toHexString();
        return new AdminDisputeResponse(
                b.getId(),
                menteeId,
                nameById.get(menteeId),
                mentorId,
                nameById.get(mentorId),
                b.getCourseCode(),
                b.getPrice(),
                b.getStatus(),
                b.getDisputeIssueType(),
                b.getDisputeReason(),
                b.getStartAt(),
                b.getCreatedAt()
        );
    }

    private AdminTransactionResponse toAdminTransaction(WalletTransaction t, Map<String, String> nameById) {
        String uid = t.getUserId().toHexString();
        return new AdminTransactionResponse(
                t.getId(),
                uid,
                nameById.get(uid),
                t.getType(),
                t.getStatus(),
                t.getAmount(),
                t.getDescription(),
                t.getRelatedBookingId(),
                t.getCreatedAt()
        );
    }
}
