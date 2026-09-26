package com.dynforge.be.mapper;

import com.dynforge.be.model.dto.UniversityResponse;
import com.dynforge.be.model.entity.University;
import org.springframework.stereotype.Component;

@Component
public class UniversityMapper {

    public UniversityResponse toResponse(University university, long mentorCount) {
        return new UniversityResponse(
                university.getId(),
                university.getCode(),
                university.getName(),
                university.getShortName(),
                university.getLogoUrl(),
                university.getStatus(),
                mentorCount
        );
    }
}
