package com.dynforge.be.model.dto;

import com.dynforge.be.model.enums.BookingFormat;
import com.dynforge.be.model.enums.BookingStatus;

import java.time.Instant;

public record AdminMentorBookingItem(
        String id,
        String courseCode,
        BookingFormat format,
        Instant startAt,
        int durationMin,
        long price,
        double commissionRate,
        BookingStatus status,
        Instant createdAt,
        Instant acceptedAt,
        Instant taughtAt,
        String roomId,
        String disputeIssueType,
        String disputeReason,
        AdminMenteeDetail mentee
) {
}
