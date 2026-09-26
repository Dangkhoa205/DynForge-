package com.dynforge.be.mapper;

import com.dynforge.be.model.dto.VerificationResponse;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.VerificationRequest;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VerificationMapper {

    private final UserRepository userRepository;

    public VerificationResponse toResponse(VerificationRequest request) {
        User user = userRepository.findById(request.getUserId().toHexString()).orElse(null);
        return new VerificationResponse(
                request.getId(),
                request.getUserId().toHexString(),
                user != null ? user.getFullName() : null,
                user != null ? user.getAvatarUrl() : null,
                request.getCourse(),
                request.getClaimedGrade(),
                request.getTranscriptUrl(),
                request.getType(),
                request.getAlumniProofUrl(),
                request.getStatus(),
                request.getReviewedBy() != null ? request.getReviewedBy().toHexString() : null,
                request.getReviewedAt(),
                request.getNote(),
                request.getCreatedAt()
        );
    }
}
