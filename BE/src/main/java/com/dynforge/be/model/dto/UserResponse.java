package com.dynforge.be.model.dto;

import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.UserStatus;

import java.time.Instant;
import java.util.Set;

public record UserResponse(
        String id,
        String fullName,
        String email,
        String phone,
        Set<Role> roles,
        String studentId,
        String major,
        String year,
        String avatarUrl,
        String universityId,
        String universityName,
        String universityCode,
        boolean schoolVerified,
        long walletBalance,
        UserStatus status,
        Instant createdAt
) {
}
