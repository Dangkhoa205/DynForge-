package com.dynforge.be.mapper;

import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.UniversityRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final UniversityRepository universityRepository;
    private final MentorRepository mentorRepository;

    public UserResponse toResponse(User user) {
        University university = user.getUniversityId() != null
                ? universityRepository.findById(user.getUniversityId().toHexString()).orElse(null)
                : null;

        boolean mentorVerified = user.getRoles() != null && user.getRoles().contains(Role.MENTOR)
                && user.getId() != null
                && mentorRepository.findByUserId(new ObjectId(user.getId()))
                        .map(MentorProfile::isVerified)
                        .orElse(false);

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
                user.getCreatedAt(),
                mentorVerified,
                user.getBirthYear(),
                user.getProvince()
        );
    }
}
