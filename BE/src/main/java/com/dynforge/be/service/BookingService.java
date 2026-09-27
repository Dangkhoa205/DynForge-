package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.mapper.BookingMapper;
import com.dynforge.be.model.dto.BookingRequest;
import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.dto.MentorEarningsResponse;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.Course;
import com.dynforge.be.model.entity.EscrowTransaction;
import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.BookingFormat;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.EscrowStatus;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.repository.BookingRepository;
import com.dynforge.be.repository.EscrowTransactionRepository;
import com.dynforge.be.repository.MentorRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final double DEFAULT_COMMISSION_RATE = 0.15;

    private static final Set<BookingStatus> UPCOMING_STATUSES =
            EnumSet.of(BookingStatus.ESCROW_HELD, BookingStatus.ACCEPTED, BookingStatus.TAUGHT);

    private final BookingRepository bookingRepository;
    private final MentorRepository mentorRepository;
    private final EscrowTransactionRepository escrowRepository;
    private final BookingMapper bookingMapper;
    private final BookingTransitions transitions;

    public BookingResponse create(User mentee, BookingRequest request) {
        if (!ObjectId.isValid(request.mentorId())) {
            throw new BadRequestException("Invalid mentor id: " + request.mentorId());
        }
        ObjectId mentorUserId = new ObjectId(request.mentorId());

        if (mentorUserId.toHexString().equals(mentee.getId())) {
            throw new BadRequestException("You cannot book a session with yourself");
        }

        MentorProfile mentor = mentorRepository.findByUserId(mentorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor not found: " + request.mentorId()));

        if (!mentor.isVerified()) {
            throw new BadRequestException("This mentor has not been verified yet");
        }

        Course course = mentor.getCourses() == null ? null : mentor.getCourses().stream()
                .filter(c -> c.getCode().equalsIgnoreCase(request.courseCode()))
                .findFirst()
                .orElse(null);

        if (course == null) {
            throw new BadRequestException(
                    "Mentor does not teach course: " + request.courseCode());
        }

        long price = calculatePrice(course, request.format(), request.durationMin());

        Booking booking = Booking.builder()
                .menteeId(new ObjectId(mentee.getId()))
                .mentorId(mentorUserId)
                .courseCode(request.courseCode())
                .format(request.format())
                .startAt(request.startAt())
                .durationMin(request.durationMin())
                .price(price)
                .commissionRate(DEFAULT_COMMISSION_RATE)
                .status(BookingStatus.PENDING_PAYMENT)
                .createdAt(Instant.now())
                .build();

        return bookingMapper.toResponse(bookingRepository.save(booking));
    }

    public List<BookingResponse> listMine(User user) {
        ObjectId userId = new ObjectId(user.getId());

        Map<String, Booking> byId = new LinkedHashMap<>();
        bookingRepository.findByMenteeId(userId).forEach(b -> byId.put(b.getId(), b));
        bookingRepository.findByMentorId(userId).forEach(b -> byId.put(b.getId(), b));

        return byId.values().stream()
                .sorted(Comparator.comparing(Booking::getStartAt).reversed())
                .map(bookingMapper::toResponse)
                .toList();
    }

    /** Mentor schedule: only bookings where the user is the mentor, upcoming first. */
    public List<BookingResponse> listMentorSchedule(User mentor) {
        return bookingRepository.findByMentorId(new ObjectId(mentor.getId())).stream()
                .sorted(Comparator.comparing(Booking::getStartAt))
                .map(bookingMapper::toResponse)
                .toList();
    }

    /** Aggregated earnings snapshot for the mentor console. */
    public MentorEarningsResponse getMentorEarnings(User mentor) {
        ObjectId mentorId = new ObjectId(mentor.getId());

        List<EscrowTransaction> escrows = escrowRepository.findByMentorId(mentorId);

        long pendingClearance = escrows.stream()
                .filter(e -> e.getStatus() == EscrowStatus.HELD)
                .mapToLong(EscrowTransaction::getMentorPayout)
                .sum();

        long totalEarned = escrows.stream()
                .filter(e -> e.getStatus() == EscrowStatus.RELEASED)
                .mapToLong(EscrowTransaction::getMentorPayout)
                .sum();

        long totalCommissionPaid = escrows.stream()
                .filter(e -> e.getStatus() == EscrowStatus.RELEASED)
                .mapToLong(EscrowTransaction::getCommissionAmount)
                .sum();

        List<Booking> mentorBookings = bookingRepository.findByMentorId(mentorId);
        long completedSessions = mentorBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .count();
        long upcomingSessions = mentorBookings.stream()
                .filter(b -> UPCOMING_STATUSES.contains(b.getStatus()))
                .count();

        return new MentorEarningsResponse(
                mentor.getWalletBalance(),
                pendingClearance,
                totalEarned,
                totalCommissionPaid,
                completedSessions,
                upcomingSessions
        );
    }

    public BookingResponse getById(User user, String id) {
        return bookingMapper.toResponse(findOwned(user, id));
    }

    public BookingResponse cancel(User user, String id) {
        Booking booking = findOwned(user, id);

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new BadRequestException(
                    "Only unpaid bookings (PENDING_PAYMENT) can be cancelled. Current status is " + booking.getStatus());
        }

        // Conditional update: if a payment lands at the same moment, the cancel loses instead of
        // leaving a paid booking marked CANCELLED with money stuck in escrow.
        Booking cancelled = transitions.transitionOrFail(booking.getId(),
                EnumSet.of(BookingStatus.PENDING_PAYMENT), BookingStatus.CANCELLED, null);
        return bookingMapper.toResponse(cancelled);
    }

    // price = hourly_rate * durationMin / 60, rounded up to nearest unit
    private long calculatePrice(Course course, BookingFormat format, int durationMin) {
        long hourlyRate = format == BookingFormat.ONE_ON_ONE
                ? course.getRatePrivate()
                : course.getRateGroup();
        return (long) Math.ceil((double) hourlyRate * durationMin / 60);
    }

    private Booking findOwned(User user, String id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        String userId = user.getId();
        boolean isParticipant = booking.getMenteeId().toHexString().equals(userId)
                || booking.getMentorId().toHexString().equals(userId);
        boolean isAdmin = user.getRoles().contains(Role.ADMIN);

        if (!isParticipant && !isAdmin) {
            throw new AccessDeniedException("You do not have access to this booking");
        }

        return booking;
    }
}
