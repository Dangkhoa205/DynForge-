package com.dynforge.be.mapper;

import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookingMapper {

    private final UserRepository userRepository;

    public BookingResponse toResponse(Booking booking) {
        User mentee = userRepository.findById(booking.getMenteeId().toHexString()).orElse(null);
        String menteeName = mentee != null ? mentee.getFullName() : null;
        String menteeEmail = mentee != null ? mentee.getEmail() : null;
        String menteeAvatarUrl = mentee != null ? mentee.getAvatarUrl() : null;

        String mentorName = userRepository.findById(booking.getMentorId().toHexString())
                .map(User::getFullName).orElse(null);

        return new BookingResponse(
                booking.getId(),
                booking.getMenteeId().toHexString(),
                booking.getMentorId().toHexString(),
                menteeName,
                mentorName,
                booking.getCourseCode(),
                booking.getFormat(),
                booking.getStartAt(),
                booking.getDurationMin(),
                booking.getPrice(),
                booking.getCommissionRate(),
                booking.getStatus(),
                booking.getEscrowTxnId() != null ? booking.getEscrowTxnId().toHexString() : null,
                booking.getCreatedAt(),
                booking.getAcceptedAt(),
                booking.getTaughtAt(),
                booking.getDisputeIssueType(),
                booking.getDisputeReason(),
                booking.getDisputeMentorResponse(),
                booking.getDisputeMentorEvidenceUrl(),
                booking.getDisputeRespondedAt(),
                booking.getRescheduledFrom(),
                booking.getPendingStartAt(),
                booking.getRescheduleCount(),
                booking.getEffectiveRoomId(),
                menteeEmail,
                menteeAvatarUrl
        );
    }
}
