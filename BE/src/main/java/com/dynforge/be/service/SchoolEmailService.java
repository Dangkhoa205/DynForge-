package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.SchoolEmailToken;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.SchoolEmailTokenRepository;
import com.dynforge.be.repository.UniversityRepository;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Verifies that a user owns a school email whose domain belongs to a University.
 * Mirrors {@link PasswordResetService}'s OTP pattern (SecureRandom 6-digit code,
 * token entity, MailService).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SchoolEmailService {

    private static final int RATE_LIMIT_MAX = 3;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(15);

    private final SchoolEmailTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final MentorRepository mentorRepository;
    private final MailService mailService;

    private final SecureRandom random = new SecureRandom();

    /** In-memory sliding-window rate limiter: userId -> recent send timestamps. */
    private final Map<String, Deque<Instant>> sendHistory = new ConcurrentHashMap<>();

    @Value("${app.otp.expiration-ms}")
    private long otpExpirationMs;

    public void requestVerification(User user, String schoolEmail) {
        if (schoolEmail == null || schoolEmail.isBlank()) {
            throw new BadRequestException("Vui lòng nhập email trường.");
        }
        String email = schoolEmail.trim();
        String domain = extractDomain(email);

        University university = universityRepository.findByEmailDomainsContaining(domain)
                .orElseThrow(() -> new BadRequestException(
                        "Email domain chưa thuộc trường nào trên DynForge. "
                        + "Vui lòng dùng email trường hoặc gửi minh chứng cựu sinh viên."));

        // Block if this school email is already verified by a different user.
        Optional<User> owner = userRepository.findBySchoolEmail(email.toLowerCase());
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            throw new BadRequestException("Email trường này đã được một tài khoản khác xác minh.");
        }

        enforceRateLimit(user.getId());

        String otp = String.format("%06d", random.nextInt(1_000_000));

        ObjectId userId = new ObjectId(user.getId());
        tokenRepository.deleteByUserId(userId);
        tokenRepository.save(SchoolEmailToken.builder()
                .userId(userId)
                .universityId(new ObjectId(university.getId()))
                .email(email.toLowerCase())
                .otp(otp)
                .verified(false)
                .expiresAt(Instant.now().plusMillis(otpExpirationMs))
                .createdAt(Instant.now())
                .build());

        mailService.sendOtpEmail(email, otp, otpExpirationMs / 60_000);
    }

    public void confirmVerification(User user, String otp) {
        ObjectId userId = new ObjectId(user.getId());
        SchoolEmailToken token = tokenRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP"));

        if (token.getExpiresAt().isBefore(Instant.now())) {
            tokenRepository.deleteByUserId(userId);
            throw new BadRequestException("OTP has expired, please request a new one");
        }
        if (!token.getOtp().equals(otp)) {
            throw new BadRequestException("Invalid or expired OTP");
        }

        user.setUniversityId(token.getUniversityId());
        user.setSchoolEmail(token.getEmail());
        user.setSchoolVerified(true);
        userRepository.save(user);

        // Keep the mentor profile's denormalized university in sync, if any.
        mentorRepository.findByUserId(userId).ifPresent(profile -> {
            profile.setUniversityId(token.getUniversityId());
            universityRepository.findById(token.getUniversityId().toHexString())
                    .map(University::getName)
                    .ifPresent(profile::setUniversity);
            mentorRepository.save(profile);
        });

        tokenRepository.deleteByUserId(userId);
        sendHistory.remove(user.getId());
    }

    /** Lowercased domain after the LAST '@'. Rejects addresses without a valid domain part. */
    private String extractDomain(String email) {
        int at = email.lastIndexOf('@');
        if (at < 0 || at == email.length() - 1) {
            throw new BadRequestException("Email trường không hợp lệ.");
        }
        String domain = email.substring(at + 1).toLowerCase();
        if (domain.isBlank() || domain.contains("@") || !domain.contains(".")) {
            throw new BadRequestException("Email trường không hợp lệ.");
        }
        return domain;
    }

    private void enforceRateLimit(String userId) {
        Instant now = Instant.now();
        Instant windowStart = now.minus(RATE_LIMIT_WINDOW);
        Deque<Instant> history = sendHistory.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (history) {
            while (!history.isEmpty() && history.peekFirst().isBefore(windowStart)) {
                history.pollFirst();
            }
            if (history.size() >= RATE_LIMIT_MAX) {
                throw new BadRequestException(
                        "Bạn đã gửi mã quá nhiều lần. Vui lòng thử lại sau 15 phút.");
            }
            history.addLast(now);
        }
    }
}
