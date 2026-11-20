package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.mapper.UserMapper;
import com.dynforge.be.model.dto.ChangePasswordRequest;
import com.dynforge.be.model.dto.UpdateProfileRequest;
import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.repository.RefreshTokenRepository;
import com.dynforge.be.repository.UniversityRepository;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final UniversityRepository universityRepository;

    public UserResponse updateProfile(User user, UpdateProfileRequest request) {
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setStudentId(request.studentId());
        user.setMajor(request.major());
        user.setYear(request.year());
        if (request.birthYear() != null) {
            user.setBirthYear(request.birthYear());
        }
        if (request.universityCode() != null && !request.universityCode().isBlank()) {
            changeUniversity(user, request.universityCode().trim());
        }
        if (request.province() != null) {
            user.setProvince(request.province().isBlank() ? null : request.province().trim());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl());
        }
        return userMapper.toResponse(userRepository.save(user));
    }

    /**
     * Lets any user pick/change their university freely from the profile (no verification needed).
     * If the old school had been confirmed by school email, that badge no longer applies to the new
     * school, so the flag is cleared.
     */
    private void changeUniversity(User user, String code) {
        var university = universityRepository.findByCode(code)
                .orElseThrow(() -> new BadRequestException("Trường không hợp lệ: " + code));
        ObjectId newId = new ObjectId(university.getId());
        if (newId.equals(user.getUniversityId())) {
            return;
        }
        user.setUniversityId(newId);
        user.setSchoolVerified(false);
    }

    public void changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from the current one");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Force re-login on all other devices
        refreshTokenRepository.deleteByUserId(new ObjectId(user.getId()));
    }
}
