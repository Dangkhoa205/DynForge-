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

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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

    @Value("${app.otp.secret:dynforge-otp-secret-key-32-chars-minimum}")
    private String otpSecret;

    public void requestVerification(User user, String schoolEmail, String universityCode) {
        if (schoolEmail == null || schoolEmail.isBlank()) {
            throw new BadRequestException("Vui lòng nhập email.");
        }
        String email = schoolEmail.trim();
        String domain = extractDomain(email);

        // Any email is accepted: the university comes from a known school domain, otherwise from the
        // university picked in the form, otherwise from the user's profile.
        University university = universityRepository.findByEmailDomainsContaining(domain)
                .or(() -> (universityCode == null || universityCode.isBlank())
                        ? Optional.empty()
                        : universityRepository.findByCode(universityCode.trim()))
                .or(() -> user.getUniversityId() == null
                        ? Optional.empty()
                        : universityRepository.findById(user.getUniversityId().toHexString()))
                .orElseThrow(() -> new BadRequestException("Vui lòng chọn trường đại học trước khi xác minh email."));

        // Block if this email is already verified by a different user.
        Optional<User> owner = userRepository.findBySchoolEmail(email.toLowerCase());
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            throw new BadRequestException("Email này đã được một tài khoản khác xác minh.");
        }

        enforceRateLimit(user.getId());

        String rawOtp = String.format("%06d", random.nextInt(1_000_000));
        String hashedOtp = hashOtp(rawOtp);

        ObjectId userId = new ObjectId(user.getId());
        tokenRepository.deleteByUserId(userId);
        tokenRepository.save(SchoolEmailToken.builder()
                .userId(userId)
                .universityId(new ObjectId(university.getId()))
                .email(email.toLowerCase())
                .otp(hashedOtp)
                .verified(false)
                .failedAttempts(0)
                .expiresAt(Instant.now().plusMillis(otpExpirationMs))
                .createdAt(Instant.now())
                .build());

        mailService.sendOtpEmail(email, rawOtp, otpExpirationMs / 60_000);
    }

    public void confirmVerification(User user, String inputOtp) {
        ObjectId userId = new ObjectId(user.getId());
        SchoolEmailToken token = tokenRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Mã OTP không hợp lệ hoặc đã hết hạn."));

        if (token.getExpiresAt().isBefore(Instant.now())) {
            tokenRepository.deleteByUserId(userId);
            throw new BadRequestException("Mã OTP đã hết hạn, vui lòng yêu cầu mã mới.");
        }

        if (token.getFailedAttempts() >= 5) {
            tokenRepository.deleteByUserId(userId);
            throw new BadRequestException("Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị hủy vì lý do an toàn. Vui lòng gửi lại yêu cầu mới.");
        }

        String hashedInput = hashOtp(inputOtp);
        boolean match = hashedInput.equals(token.getOtp()) || legacySha256(inputOtp).equals(token.getOtp()) || inputOtp.equals(token.getOtp());
        if (!match) {
            token.setFailedAttempts(token.getFailedAttempts() + 1);
            tokenRepository.save(token);
            int remaining = 5 - token.getFailedAttempts();
            if (remaining <= 0) {
                tokenRepository.deleteByUserId(userId);
                throw new BadRequestException("Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị hủy vì lý do an toàn. Vui lòng gửi lại yêu cầu mới.");
            }
            throw new BadRequestException("Mã OTP không chính xác. Bạn còn " + remaining + " lần thử.");
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

    private String hashOtp(String rawOtp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(otpSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(rawOtp.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("HmacSHA256 not available", e);
        }
    }

    private String legacySha256(String rawOtp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawOtp.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return "";
        }
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
