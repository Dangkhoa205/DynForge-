package com.dynforge.be.seeder;

import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.entity.VerificationRequest;
import com.dynforge.be.model.enums.UniversityStatus;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.UniversityRepository;
import com.dynforge.be.repository.UserRepository;
import com.dynforge.be.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Backfills the multi-university data model. Runs before {@link DataSeeder}
 * (@Order(1)) so demo data seeded afterwards already sees the default
 * university. Idempotent: safe to run repeatedly.
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class UniversityMigration implements CommandLineRunner {

    private static final String DEFAULT_CODE = "FPTU-HCM";
    private static final String DEFAULT_NAME = "FPT University HCM Campus";

    private final UniversityRepository universityRepository;
    private final UserRepository userRepository;
    private final MentorRepository mentorRepository;
    private final VerificationRepository verificationRepository;

    @Override
    public void run(String... args) {
        // a. Ensure the default university exists.
        University fptu = universityRepository.findByCode(DEFAULT_CODE)
                .orElseGet(() -> {
                    University created = universityRepository.save(University.builder()
                            .code(DEFAULT_CODE)
                            .name(DEFAULT_NAME)
                            .shortName("FPTU HCM")
                            .aliases(List.of("ĐH FPT", "FPT University", "FPTU", "FPT University HCM"))
                            .emailDomains(List.of("fpt.edu.vn"))
                            .status(UniversityStatus.ACTIVE)
                            .createdAt(Instant.now())
                            .build());
                    log.info("[UniversityMigration] Created default university {} ({})", DEFAULT_NAME, DEFAULT_CODE);
                    return created;
                });
        ObjectId fptuId = new ObjectId(fptu.getId());

        // b. Backfill users without a university.
        List<User> usersWithoutUni = userRepository.findByUniversityIdIsNull();
        for (User user : usersWithoutUni) {
            user.setUniversityId(fptuId);
        }
        if (!usersWithoutUni.isEmpty()) {
            userRepository.saveAll(usersWithoutUni);
        }
        log.info("[UniversityMigration] Assigned {} user(s) to {}", usersWithoutUni.size(), DEFAULT_CODE);

        // c. Backfill mentor profiles without a university.
        List<MentorProfile> mentorsWithoutUni = mentorRepository.findByUniversityIdIsNull();
        for (MentorProfile profile : mentorsWithoutUni) {
            profile.setUniversityId(fptuId);
            profile.setUniversity(DEFAULT_NAME);
        }
        if (!mentorsWithoutUni.isEmpty()) {
            mentorRepository.saveAll(mentorsWithoutUni);
        }
        log.info("[UniversityMigration] Assigned {} mentor profile(s) to {}", mentorsWithoutUni.size(), DEFAULT_CODE);

        // d. Backfill verification requests, copying the owning user's university.
        List<VerificationRequest> requestsWithoutUni = verificationRepository.findByUniversityIdIsNull();
        Map<ObjectId, ObjectId> userToUni = new HashMap<>();
        int updatedRequests = 0;
        for (VerificationRequest request : requestsWithoutUni) {
            ObjectId userId = request.getUserId();
            if (userId == null) {
                continue;
            }
            ObjectId uniId = userToUni.computeIfAbsent(userId, id ->
                    userRepository.findById(id.toHexString())
                            .map(User::getUniversityId)
                            .orElse(fptuId));
            request.setUniversityId(uniId != null ? uniId : fptuId);
            updatedRequests++;
        }
        if (updatedRequests > 0) {
            verificationRepository.saveAll(requestsWithoutUni);
        }
        log.info("[UniversityMigration] Assigned {} verification request(s) to a university", updatedRequests);
    }
}
