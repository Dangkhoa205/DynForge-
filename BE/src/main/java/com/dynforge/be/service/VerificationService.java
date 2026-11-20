package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.mapper.VerificationMapper;
import com.dynforge.be.util.UrlValidator;
import com.dynforge.be.model.dto.VerificationDecisionRequest;
import com.dynforge.be.model.dto.VerificationRequestDto;
import com.dynforge.be.model.dto.VerificationResponse;
import com.dynforge.be.model.entity.Course;
import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.VerificationRequest;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.VerificationStatus;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.UserRepository;
import com.dynforge.be.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationRepository verificationRepository;
    private final MentorRepository mentorRepository;
    private final VerificationMapper verificationMapper;
    private final UserRepository userRepository;
    private final MailService mailService;

    public VerificationResponse submit(User user, VerificationRequestDto dto) {
        validateDocumentProof(dto.transcriptUrl(), "transcriptUrl");
        validateDocumentProof(dto.alumniProofUrl(), "alumniProofUrl");
        java.util.List<String> documents = new java.util.ArrayList<>();
        if (dto.documents() != null) {
            for (String entry : dto.documents()) {
                if (entry == null || entry.isBlank()) continue;
                int bar = entry.indexOf('|');
                String category = bar > 0 ? entry.substring(0, bar).trim() : "other";
                String ref = bar > 0 ? entry.substring(bar + 1).trim() : entry.trim();
                if (!category.matches("[a-zA-Z_-]{1,30}")) {
                    throw new BadRequestException("documents: loại tài liệu không hợp lệ.");
                }
                validateDocumentProof(ref, "documents");
                documents.add(category + "|" + ref);
            }
        }

        VerificationRequest request = VerificationRequest.builder()
                .userId(new ObjectId(user.getId()))
                .universityId(user.getUniversityId())
                .course(dto.course())
                .claimedGrade(dto.claimedGrade())
                .transcriptUrl(dto.transcriptUrl())
                .alumniProofUrl(dto.alumniProofUrl())
                .documents(documents)
                .status(VerificationStatus.PENDING)
                .createdAt(Instant.now())
                .build();

        return verificationMapper.toResponse(verificationRepository.save(request));
    }

    public List<VerificationResponse> getMine(User user) {
        return verificationRepository.findByUserId(new ObjectId(user.getId()))
                .stream().map(verificationMapper::toResponse).toList();
    }

    public List<VerificationResponse> list(VerificationStatus status) {
        List<VerificationRequest> requests = status == null
                ? verificationRepository.findAll()
                : verificationRepository.findByStatus(status);

        return requests.stream().map(verificationMapper::toResponse).toList();
    }

    public VerificationResponse decide(User reviewer, String id, VerificationDecisionRequest decision) {
        if (decision.status() == VerificationStatus.PENDING) {
            throw new BadRequestException("Decision must be APPROVED or REJECTED");
        }

        VerificationRequest request = verificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Verification request not found: " + id));

        request.setStatus(decision.status());
        request.setNote(decision.note());
        request.setReviewedBy(new ObjectId(reviewer.getId()));
        request.setReviewedAt(Instant.now());
        request = verificationRepository.save(request);

        if (decision.status() == VerificationStatus.APPROVED) {
            // Upsert: create a minimal profile if the mentor hasn't set one up yet,
            // so approval always results in a verified, listable mentor.
            ObjectId mentorUserId = request.getUserId();
            ObjectId mentorUniversityId = request.getUniversityId();
            MentorProfile profile = mentorRepository.findByUserId(mentorUserId)
                    .orElseGet(() -> MentorProfile.builder()
                            .userId(mentorUserId)
                            .universityId(mentorUniversityId)
                            .courses(new ArrayList<>())
                            .build());
            profile.setVerified(true);

            // Mark the specific course as verified (Course-level KYC)
            if (profile.getCourses() == null) {
                profile.setCourses(new ArrayList<>());
            }
            String targetCode = request.getCourse();
            boolean found = false;
            for (Course c : profile.getCourses()) {
                if (c.getCode() != null && c.getCode().equalsIgnoreCase(targetCode)) {
                    c.setVerified(true);
                    if (request.getClaimedGrade() != null && !request.getClaimedGrade().isBlank()) {
                        c.setGrade(request.getClaimedGrade());
                    }
                    found = true;
                    break;
                }
            }
            if (!found && targetCode != null && !targetCode.isBlank()) {
                profile.getCourses().add(Course.builder()
                        .code(targetCode)
                        .name(targetCode)
                        .grade(request.getClaimedGrade() != null ? request.getClaimedGrade() : "A")
                        .ratePrivate(150000)
                        .rateGroup(100000)
                        .verified(true)
                        .build());
            }

            mentorRepository.save(profile);

            // Grant MENTOR role to the user account if not already assigned
            User mentorUser = userRepository.findById(mentorUserId.toHexString()).orElse(null);
            if (mentorUser != null) {
                if (mentorUser.getRoles() == null) {
                    mentorUser.setRoles(EnumSet.of(Role.MENTOR));
                    userRepository.save(mentorUser);
                } else if (!mentorUser.getRoles().contains(Role.MENTOR)) {
                    Set<Role> updatedRoles = EnumSet.copyOf(mentorUser.getRoles());
                    updatedRoles.add(Role.MENTOR);
                    mentorUser.setRoles(updatedRoles);
                    userRepository.save(mentorUser);
                }

                // Send automated congratulatory email to the mentor
                mailService.sendMentorApprovalSuccessEmail(
                        mentorUser.getEmail(),
                        mentorUser.getFullName(),
                        request.getCourse(),
                        request.getClaimedGrade(),
                        decision.note()
                );
            }
        } else if (decision.status() == VerificationStatus.REJECTED) {
            ObjectId mentorUserId = request.getUserId();
            User mentorUser = userRepository.findById(mentorUserId.toHexString()).orElse(null);
            if (mentorUser != null) {
                mailService.sendMentorRejectionEmail(
                        mentorUser.getEmail(),
                        mentorUser.getFullName(),
                        request.getCourse(),
                        decision.note()
                );
            }
        }

        return verificationMapper.toResponse(request);
    }

    private void validateDocumentProof(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            return;
        }
        String trimmed = value.trim();
        // If it looks like a URL (contains scheme or starts with http/https/etc.)
        if (trimmed.contains("://") || trimmed.toLowerCase().startsWith("http:") || trimmed.toLowerCase().startsWith("https:")
                || trimmed.toLowerCase().startsWith("javascript:") || trimmed.toLowerCase().startsWith("ftp:") || trimmed.toLowerCase().startsWith("file:")) {
            UrlValidator.validateHttpUrl(trimmed, fieldName);
        } else {
            // It's an uploaded file name / document proof identifier
            if (trimmed.length() > 255) {
                throw new BadRequestException(fieldName + " tên tệp quá dài (tối đa 255 ký tự).");
            }
            if (trimmed.contains("..") || trimmed.contains("/") || trimmed.contains("\\")) {
                throw new BadRequestException(fieldName + " chứa ký tự không hợp lệ.");
            }
        }
    }
}
