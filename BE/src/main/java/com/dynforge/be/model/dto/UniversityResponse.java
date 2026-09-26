package com.dynforge.be.model.dto;

import com.dynforge.be.model.enums.UniversityStatus;

public record UniversityResponse(
        String id,
        String code,
        String name,
        String shortName,
        String logoUrl,
        UniversityStatus status,
        long mentorCount
) {
}
