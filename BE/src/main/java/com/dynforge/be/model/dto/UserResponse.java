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
        Instant createdAt,
        boolean mentorVerified,
        Integer birthYear,
        String province
) {
    /** Older call sites (and tests) that do not know the demographic fields. */
    public UserResponse(String id, String fullName, String email, String phone, Set<Role> roles,
                        String studentId, String major, String year, String avatarUrl,
                        String universityId, String universityName, String universityCode,
                        boolean schoolVerified, long walletBalance, UserStatus status, Instant createdAt) {
        this(id, fullName, email, phone, roles, studentId, major, year, avatarUrl, universityId,
                universityName, universityCode, schoolVerified, walletBalance, status, createdAt, false, null, null);
    }

    /** Call sites (and tests) that know mentorVerified but not the demographic fields. */
    public UserResponse(String id, String fullName, String email, String phone, Set<Role> roles,
                        String studentId, String major, String year, String avatarUrl,
                        String universityId, String universityName, String universityCode,
                        boolean schoolVerified, long walletBalance, UserStatus status, Instant createdAt,
                        boolean mentorVerified) {
        this(id, fullName, email, phone, roles, studentId, major, year, avatarUrl, universityId,
                universityName, universityCode, schoolVerified, walletBalance, status, createdAt,
                mentorVerified, null, null);
    }
}
