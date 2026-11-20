package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.mapper.BookingMapper;
import com.dynforge.be.mapper.MentorMapper;
import com.dynforge.be.mapper.UserMapper;
import com.dynforge.be.model.dto.AdminDashboardResponse;
import com.dynforge.be.model.dto.AdminDisputeResponse;
import com.dynforge.be.model.dto.AdminMenteeDetail;
import com.dynforge.be.model.dto.AdminMentorBookingItem;
import com.dynforge.be.model.dto.AdminMentorScheduleOverview;
import com.dynforge.be.model.dto.AdminTransactionResponse;
import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.dto.CommissionReportResponse;
import com.dynforge.be.model.dto.MentorProfileResponse;
import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.Course;
import com.dynforge.be.model.entity.EscrowTransaction;
import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.VerificationRequest;
import com.dynforge.be.model.entity.WalletTransaction;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.EscrowStatus;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.TransactionType;
import com.dynforge.be.model.enums.UserStatus;
import com.dynforge.be.model.enums.VerificationStatus;
import com.dynforge.be.repository.BookingRepository;
import com.dynforge.be.repository.EscrowTransactionRepository;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.UniversityRepository;
import com.dynforge.be.repository.UserRepository;
import com.dynforge.be.repository.VerificationRepository;
import com.dynforge.be.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final double DEFAULT_COMMISSION_RATE = 0.15;

    private static final Set<BookingStatus> UPCOMING_STATUSES =
            EnumSet.of(BookingStatus.ESCROW_HELD, BookingStatus.ACCEPTED, BookingStatus.TAUGHT);

    private static final Set<BookingStatus> CANCELLED_STATUSES =
            EnumSet.of(BookingStatus.CANCELLED, BookingStatus.DISPUTED, BookingStatus.REFUNDED);

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final EscrowTransactionRepository escrowRepository;
    private final WalletTransactionRepository walletTxnRepository;
    private final VerificationRepository verificationRepository;
    private final UserMapper userMapper;
    private final BookingMapper bookingMapper;
    private final MentorRepository mentorRepository;
    private final UniversityRepository universityRepository;
    private final MentorMapper mentorMapper;

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
        user.setStatus(status);
        return userMapper.toResponse(userRepository.save(user));
    }

    // ── transactions ────────────────────────────────────────────────────────────

    public List<AdminTransactionResponse> listTransactions(TransactionType type) {
        Map<String, String> nameById = userNamesById();

        return walletTxnRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(t -> type == null || t.getType() == type)
                .map(t -> toAdminTransaction(t, nameById))
                .toList();
    }

    // ── disputes ────────────────────────────────────────────────────────────────

    public List<AdminDisputeResponse> listDisputes() {
        Map<String, String> nameById = userNamesById();

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

    // ── mentor bookings & mentees ─────────────────────────────────────────────

    public List<BookingResponse> getMentorBookings(String id) {
        ObjectId mentorUserId = resolveMentorUserId(id);

        return bookingRepository.findByMentorId(mentorUserId).stream()
                .sorted(Comparator.comparing(Booking::getStartAt).reversed())
                .map(bookingMapper::toResponse)
                .toList();
    }

    public AdminMentorScheduleOverview getMentorScheduleOverview(String id) {
        ObjectId mentorUserId = resolveMentorUserId(id);

        // Fetch mentor info
        User mentorUser = userRepository.findById(mentorUserId.toHexString()).orElse(null);
        MentorProfile mentorProfile = mentorRepository.findByUserId(mentorUserId).orElse(null);

        String mentorName = mentorUser != null ? mentorUser.getFullName() : "Mentor";
        String mentorAvatarUrl = mentorUser != null ? mentorUser.getAvatarUrl() : null;
        String mentorRole = mentorProfile != null && mentorProfile.getTeachingRole() != null
                ? mentorProfile.getTeachingRole() : "Mentor";
        String university = mentorProfile != null ? mentorProfile.getUniversity() : null;
        String major = mentorProfile != null ? mentorProfile.getMajor() : null;

        // Fetch bookings
        List<Booking> bookings = bookingRepository.findByMentorId(mentorUserId).stream()
                .sorted(Comparator.comparing(Booking::getStartAt).reversed())
                .toList();

        // Calculate session frequency per mentee
        Map<ObjectId, Long> sessionCountPerMentee = bookings.stream()
                .filter(b -> b.getMenteeId() != null)
                .collect(Collectors.groupingBy(Booking::getMenteeId, Collectors.counting()));

        // Cache universities for fast lookup
        Map<String, University> universityMap = universityRepository.findAll().stream()
                .collect(Collectors.toMap(University::getId, u -> u, (a, b) -> a));

        // Map sessions with full mentee profile
        List<AdminMentorBookingItem> sessionItems = new ArrayList<>();
        for (Booking b : bookings) {
            AdminMenteeDetail menteeDetail = null;
            if (b.getMenteeId() != null) {
                User mentee = userRepository.findById(b.getMenteeId().toHexString()).orElse(null);
                if (mentee != null) {
                    University univ = mentee.getUniversityId() != null
                            ? universityMap.get(mentee.getUniversityId().toHexString()) : null;
                    String univName = univ != null ? univ.getName() : null;
                    String univCode = univ != null ? univ.getCode() : null;
                    int countWithMentor = sessionCountPerMentee.getOrDefault(b.getMenteeId(), 0L).intValue();

                    menteeDetail = new AdminMenteeDetail(
                            mentee.getId(),
                            mentee.getFullName(),
                            mentee.getEmail(),
                            mentee.getPhone(),
                            mentee.getStudentId(),
                            mentee.getMajor(),
                            univName,
                            univCode,
                            mentee.getYear(),
                            mentee.getAvatarUrl(),
                            mentee.getSchoolEmail(),
                            mentee.isSchoolVerified(),
                            mentee.getStatus(),
                            mentee.getCreatedAt(),
                            countWithMentor
                    );
                }
            }

            sessionItems.add(new AdminMentorBookingItem(
                    b.getId(),
                    b.getCourseCode(),
                    b.getFormat(),
                    b.getStartAt(),
                    b.getDurationMin(),
                    b.getPrice(),
                    b.getCommissionRate(),
                    b.getStatus(),
                    b.getCreatedAt(),
                    b.getAcceptedAt(),
                    b.getTaughtAt(),
                    b.getEffectiveRoomId(),
                    b.getDisputeIssueType(),
                    b.getDisputeReason(),
                    menteeDetail
            ));
        }

        int totalSessions = bookings.size();
        int uniqueMenteesCount = sessionCountPerMentee.size();
        long totalRevenue = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .mapToLong(Booking::getPrice)
                .sum();
        int upcomingCount = (int) bookings.stream()
                .filter(b -> UPCOMING_STATUSES.contains(b.getStatus()))
                .count();
        int completedCount = (int) bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .count();
        int cancelledCount = (int) bookings.stream()
                .filter(b -> CANCELLED_STATUSES.contains(b.getStatus()))
                .count();

        return new AdminMentorScheduleOverview(
                mentorUserId.toHexString(),
                mentorName,
                mentorAvatarUrl,
                mentorRole,
                university,
                major,
                totalSessions,
                uniqueMenteesCount,
                totalRevenue,
                upcomingCount,
                completedCount,
                cancelledCount,
                sessionItems
        );
    }

    private ObjectId resolveMentorUserId(String id) {
        ObjectId targetId;
        try {
            targetId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid ID: " + id);
        }

        MentorProfile profile = mentorRepository.findById(id).orElse(null);
        if (profile != null && profile.getUserId() != null) {
            return profile.getUserId();
        }
        return targetId;
    }

    public MentorProfileResponse toggleCourseVerification(String mentorIdOrUserId, String courseCode, boolean verified) {
        ObjectId mentorUserId = resolveMentorUserId(mentorIdOrUserId);

        MentorProfile profile = mentorRepository.findByUserId(mentorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor profile not found for user: " + mentorUserId));

        if (profile.getCourses() == null || profile.getCourses().isEmpty()) {
            throw new BadRequestException("Mentor does not have any courses registered");
        }

        boolean found = false;
        for (Course c : profile.getCourses()) {
            if (c.getCode() != null && c.getCode().equalsIgnoreCase(courseCode)) {
                c.setVerified(verified);
                found = true;
                break;
            }
        }

        if (!found) {
            throw new ResourceNotFoundException("Course " + courseCode + " not found in mentor profile");
        }

        // If verified is true, ensure profile is marked verified; if false, verify if any other course is still verified
        if (verified) {
            profile.setVerified(true);
        } else {
            boolean anyVerified = profile.getCourses().stream().anyMatch(Course::isVerified);
            profile.setVerified(anyVerified);
        }

        profile = mentorRepository.save(profile);

        User user = userRepository.findById(mentorUserId.toHexString()).orElse(null);
        if (user != null) {
            if (verified && (user.getRoles() == null || !user.getRoles().contains(Role.MENTOR))) {
                Set<Role> roles = user.getRoles() == null ? EnumSet.noneOf(Role.class) : EnumSet.copyOf(user.getRoles());
                roles.add(Role.MENTOR);
                user.setRoles(roles);
                userRepository.save(user);
            }
        }

        // Synchronize corresponding VerificationRequest if present
        List<VerificationRequest> requests = verificationRepository.findByUserId(mentorUserId);
        for (VerificationRequest vr : requests) {
            if (vr.getCourse() != null && vr.getCourse().equalsIgnoreCase(courseCode)) {
                if (vr.getStatus() == VerificationStatus.PENDING) {
                    vr.setStatus(verified ? VerificationStatus.APPROVED : VerificationStatus.REJECTED);
                    vr.setReviewedAt(Instant.now());
                    verificationRepository.save(vr);
                }
            }
        }

        return mentorMapper.toResponse(profile, user);
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
                b.getCreatedAt(),
                b.getDisputeMentorResponse(),
                b.getDisputeMentorEvidenceUrl(),
                b.getDisputeRespondedAt()
        );
    }

    /**
     * id -> full name. Built with a HashMap on purpose: Collectors.toMap throws a NullPointerException
     * as soon as ONE user has no full name (e.g. a Google sign-in without a name), which used to make
     * the whole admin transaction / dispute list fail and show "0 giao dịch".
     */
    private Map<String, String> userNamesById() {
        Map<String, String> names = new java.util.HashMap<>();
        for (User u : userRepository.findAll()) {
            if (u.getId() != null) {
                names.putIfAbsent(u.getId(), u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getEmail());
            }
        }
        return names;
    }

    private AdminTransactionResponse toAdminTransaction(WalletTransaction t, Map<String, String> nameById) {
        String uid = t.getUserId() != null ? t.getUserId().toHexString() : null;
        return new AdminTransactionResponse(
                t.getId(),
                uid,
                uid != null ? nameById.get(uid) : null,
                t.getType(),
                t.getStatus(),
                t.getAmount(),
                t.getDescription(),
                t.getRelatedBookingId(),
                t.getCreatedAt()
        );
    }
}
