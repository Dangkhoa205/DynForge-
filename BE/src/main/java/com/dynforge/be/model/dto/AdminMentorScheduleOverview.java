package com.dynforge.be.model.dto;

import java.util.List;

public record AdminMentorScheduleOverview(
        String mentorUserId,
        String mentorName,
        String mentorAvatarUrl,
        String mentorRole,
        String university,
        String major,
        int totalSessions,
        int uniqueMenteesCount,
        long totalRevenue,
        int upcomingCount,
        int completedCount,
        int cancelledCount,
        List<AdminMentorBookingItem> sessions
) {
}
