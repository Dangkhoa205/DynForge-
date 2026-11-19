package com.dynforge.be.model.dto;

import com.dynforge.be.model.enums.UserStatus;

import java.time.Instant;

public record AdminMenteeDetail(
        String id,
        String fullName,
        String email,
        String phone,
        String studentId,
        String major,
        String universityName,
        String universityCode,
        String year,
        String avatarUrl,
        String schoolEmail,
        boolean schoolVerified,
        UserStatus status,
        Instant joinedAt,
        int totalSessionsWithMentor
) {
}
