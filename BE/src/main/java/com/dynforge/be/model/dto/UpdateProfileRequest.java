package com.dynforge.be.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank String fullName,
        String phone,
        String studentId,
        String major,
        String year,
        String avatarUrl,
        @Min(1940) @Max(2015) Integer birthYear,
        @Size(max = 60) String province,
        /** University code picked in the profile (e.g. "UTH", "OTHER"). Optional. */
        @Size(max = 30) String universityCode
) {
}
