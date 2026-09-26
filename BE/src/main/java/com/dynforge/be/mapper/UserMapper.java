package com.dynforge.be.mapper;

import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.repository.UniversityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final UniversityRepository universityRepository;

    public UserResponse toResponse(User user) {
        University university = user.getUniversityId() != null
                ? universityRepository.findById(user.getUniversityId().toHexString()).orElse(null)
                : null;
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRoles(),
                user.getStudentId(),
                user.getMajor(),
                user.getYear(),
                user.getAvatarUrl(),
                user.getUniversityId() != null ? user.getUniversityId().toHexString() : null,
                university != null ? university.getName() : null,
                university != null ? university.getCode() : null,
                user.isSchoolVerified(),
                user.getWalletBalance(),
                user.getStatus(),
                user.getCreatedAt()
        );
    }
}
