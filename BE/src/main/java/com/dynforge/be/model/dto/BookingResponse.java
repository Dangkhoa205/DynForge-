package com.dynforge.be.model.dto;

import com.dynforge.be.model.enums.BookingFormat;
import com.dynforge.be.model.enums.BookingStatus;

import java.time.Instant;

public record BookingResponse(
        String id,
        String menteeId,
        String mentorId,
        String menteeName,
        String mentorName,
        String courseCode,
        BookingFormat format,
        Instant startAt,
        int durationMin,
        long price,
        double commissionRate,
        BookingStatus status,
        String escrowTxnId,
        Instant createdAt,
        Instant acceptedAt,
        Instant taughtAt,
        String disputeIssueType,
        String disputeReason,
        String disputeMentorResponse,
        String disputeMentorEvidenceUrl,
        Instant disputeRespondedAt,
        Instant rescheduledFrom,
        Instant pendingStartAt,
        int rescheduleCount,
        String roomId,
        String menteeEmail,
        String menteeAvatarUrl
) {
    // 25-parameter backward-compatible constructor for existing tests and services
    public BookingResponse(
            String id,
            String menteeId,
            String mentorId,
            String menteeName,
            String mentorName,
            String courseCode,
            BookingFormat format,
            Instant startAt,
            int durationMin,
            long price,
            double commissionRate,
            BookingStatus status,
            String escrowTxnId,
            Instant createdAt,
            Instant acceptedAt,
            Instant taughtAt,
            String disputeIssueType,
            String disputeReason,
            String disputeMentorResponse,
            String disputeMentorEvidenceUrl,
            Instant disputeRespondedAt,
            Instant rescheduledFrom,
            Instant pendingStartAt,
            int rescheduleCount,
            String roomId
    ) {
        this(
                id,
                menteeId,
                mentorId,
                menteeName,
                mentorName,
                courseCode,
                format,
                startAt,
                durationMin,
                price,
                commissionRate,
                status,
                escrowTxnId,
                createdAt,
                acceptedAt,
                taughtAt,
                disputeIssueType,
                disputeReason,
                disputeMentorResponse,
                disputeMentorEvidenceUrl,
                disputeRespondedAt,
                rescheduledFrom,
                pendingStartAt,
                rescheduleCount,
                roomId,
                null,
                null
        );
    }
}
