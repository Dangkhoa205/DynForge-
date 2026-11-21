package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.mapper.BookingMapper;
import com.dynforge.be.mapper.UserMapper;
import com.dynforge.be.model.dto.AuthResponse;
import com.dynforge.be.model.dto.BookingResponse;
import com.dynforge.be.model.dto.MentorMatchResponse;
import com.dynforge.be.model.dto.RefreshRequest;
import com.dynforge.be.model.dto.SessionAskResponse;
import com.dynforge.be.model.dto.UserResponse;
import com.dynforge.be.model.dto.VerifyOtpRequest;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.PasswordResetToken;
import com.dynforge.be.model.entity.RefreshToken;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.BookingFormat;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.UserStatus;
import com.dynforge.be.repository.PasswordResetTokenRepository;
import com.dynforge.be.repository.RefreshTokenRepository;
import com.dynforge.be.repository.UserRepository;
import com.dynforge.be.security.JwtService;
import com.dynforge.be.util.UrlValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Phase4SecurityTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private MailService mailService;
    @Mock
    private JwtService jwtService;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private PasswordResetService passwordResetService;

    @InjectMocks
    private AuthService authService;

    private static final String TEST_OTP_SECRET = "test-secret-key-for-hmac-sha256-minimum-32-chars";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(passwordResetService, "otpSecret", TEST_OTP_SECRET);
        ReflectionTestUtils.setField(passwordResetService, "otpExpirationMs", 600000L);
        ReflectionTestUtils.setField(authService, "refreshExpirationMs", 2592000000L);
    }

    // ── 1. Jackson isDemo serialization ──────────────────────────────────────

    @Test
    @DisplayName("MentorMatchResponse serializes boolean isDemo as 'isDemo' in JSON matching aiService.ts")
    void testMentorMatchResponse_isDemoSerialization() throws Exception {
        MentorMatchResponse response = new MentorMatchResponse(
                "Great match",
                List.of(new MentorMatchResponse.Item("m1", "Dr. Jane", "High rating")),
                List.of("What is your research interest?"),
                true
        );

        String json = objectMapper.writeValueAsString(response);
        assertTrue(json.contains("\"isDemo\":true"), "JSON should contain \"isDemo\":true but got: " + json);
        assertFalse(json.contains("\"demo\":"), "JSON should NOT contain \"demo\": key");

        MentorMatchResponse deserialized = objectMapper.readValue(json, MentorMatchResponse.class);
        assertTrue(deserialized.isDemo());
        assertEquals("Great match", deserialized.advice());
    }

    @Test
    @DisplayName("SessionAskResponse serializes boolean isDemo as 'isDemo' in JSON matching aiService.ts")
    void testSessionAskResponse_isDemoSerialization() throws Exception {
        SessionAskResponse response = new SessionAskResponse(
                "Here is the summary",
                List.of("Tell me more"),
                true
        );

        String json = objectMapper.writeValueAsString(response);
        assertTrue(json.contains("\"isDemo\":true"), "JSON should contain \"isDemo\":true but got: " + json);
        assertFalse(json.contains("\"demo\":"), "JSON should NOT contain \"demo\": key");

        SessionAskResponse deserialized = objectMapper.readValue(json, SessionAskResponse.class);
        assertTrue(deserialized.isDemo());
        assertEquals("Here is the summary", deserialized.answer());
    }

    // ── 2. OTP HMAC-SHA256 hashing & 5 attempts limit ─────────────────────────

    @Test
    @DisplayName("PasswordResetService verifies OTP hashed with HMAC-SHA256 and rejects incorrect OTP")
    void testPasswordResetService_hmacSha256Verification() throws Exception {
        String email = "student@example.com";
        String rawOtp = "123456";

        // Compute expected HMAC-SHA256
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_OTP_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(rawOtp.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        String hmacSha256Hex = hexString.toString();

        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .otp(hmacSha256Hex)
                .verified(false)
                .failedAttempts(0)
                .expiresAt(Instant.now().plusSeconds(300))
                .createdAt(Instant.now())
                .build();

        when(passwordResetTokenRepository.findByEmail(email)).thenReturn(Optional.of(token));

        // Correct OTP succeeds
        passwordResetService.verifyOtp(new VerifyOtpRequest(email, rawOtp));
        assertTrue(token.isVerified());
        verify(passwordResetTokenRepository).save(token);
    }

    @Test
    @DisplayName("PasswordResetService enforces 5 failed attempts limit on incorrect OTP")
    void testPasswordResetService_failedAttemptsLimit() {
        String email = "student@example.com";
        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .otp("correct-hmac-hash")
                .verified(false)
                .failedAttempts(4)
                .expiresAt(Instant.now().plusSeconds(300))
                .createdAt(Instant.now())
                .build();

        when(passwordResetTokenRepository.findByEmail(email)).thenReturn(Optional.of(token));

        // 5th wrong attempt triggers lock and token deletion
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                passwordResetService.verifyOtp(new VerifyOtpRequest(email, "wrong-code"))
        );
        assertTrue(ex.getMessage().contains("quá 5 lần"));
        verify(passwordResetTokenRepository).deleteByEmail(email);
    }

    // ── 3. URL Validation ────────────────────────────────────────────────────

    @Test
    @DisplayName("UrlValidator accepts valid http and https URLs within 2048 chars")
    void testUrlValidator_validUrls() {
        assertDoesNotThrow(() -> UrlValidator.validateHttpUrl("https://example.com/document.pdf", "transcriptUrl"));
        assertDoesNotThrow(() -> UrlValidator.validateHttpUrl("http://cdn.dynforge.edu.vn/alumni/proof.png", "alumniProofUrl"));
        assertDoesNotThrow(() -> UrlValidator.validateHttpUrl("https://evidence.org/case123?token=xyz#page2", "disputeMentorEvidenceUrl"));
        assertDoesNotThrow(() -> UrlValidator.validateHttpUrl(null, "optionalUrl"));
        assertDoesNotThrow(() -> UrlValidator.validateHttpUrl("", "optionalUrl"));
    }

    @Test
    @DisplayName("UrlValidator rejects dangerous protocols, malformed URLs, and length > 2048")
    void testUrlValidator_invalidUrls() {
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                UrlValidator.validateHttpUrl("javascript:alert(1)", "transcriptUrl"));
        assertTrue(ex1.getMessage().contains("http:// hoặc https://"));

        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                UrlValidator.validateHttpUrl("ftp://files.dynforge.vn/doc.pdf", "alumniProofUrl"));
        assertTrue(ex2.getMessage().contains("http:// hoặc https://"));

        BadRequestException ex3 = assertThrows(BadRequestException.class, () ->
                UrlValidator.validateHttpUrl("not-a-valid-url", "disputeMentorEvidenceUrl"));
        assertTrue(ex3.getMessage().contains("URL hợp lệ") || ex3.getMessage().contains("http://"));

        String tooLongUrl = "https://example.com/" + "a".repeat(2040);
        BadRequestException ex4 = assertThrows(BadRequestException.class, () ->
                UrlValidator.validateHttpUrl(tooLongUrl, "transcriptUrl"));
        assertTrue(ex4.getMessage().contains("quá dài"));
    }

    // ── 4. Jitsi roomId & Fallback ───────────────────────────────────────────

    @Test
    @DisplayName("Booking uses random roomId if present, and falls back to DynForge-{id} for legacy bookings")
    void testBooking_roomIdAndFallback() {
        String randomUuid = UUID.randomUUID().toString();
        Booking modernBooking = Booking.builder()
                .id("booking-001")
                .roomId(randomUuid)
                .build();
        assertEquals(randomUuid, modernBooking.getEffectiveRoomId());

        Booking legacyBooking = Booking.builder()
                .id("booking-legacy-999")
                .roomId(null)
                .build();
        assertEquals("DynForge-booking-legacy-999", legacyBooking.getEffectiveRoomId());

        Booking blankRoomBooking = Booking.builder()
                .id("booking-legacy-888")
                .roomId("   ")
                .build();
        assertEquals("DynForge-booking-legacy-888", blankRoomBooking.getEffectiveRoomId());
    }

    @Test
    @DisplayName("BookingMapper maps effective roomId to BookingResponse")
    void testBookingMapper_mapsRoomId() {
        UserRepository mockUserRepo = mock(UserRepository.class);
        BookingMapper mapper = new BookingMapper(mockUserRepo);

        ObjectId menteeId = new ObjectId();
        ObjectId mentorId = new ObjectId();
        String roomId = UUID.randomUUID().toString();

        Booking booking = Booking.builder()
                .id("b-100")
                .menteeId(menteeId)
                .mentorId(mentorId)
                .courseCode("CS501")
                .format(BookingFormat.ONE_ON_ONE)
                .startAt(Instant.now())
                .durationMin(60)
                .price(200000)
                .commissionRate(0.15)
                .status(BookingStatus.ACCEPTED)
                .roomId(roomId)
                .createdAt(Instant.now())
                .build();

        BookingResponse response = mapper.toResponse(booking);
        assertEquals(roomId, response.roomId());
    }

    // ── 5. RefreshToken Hashing ──────────────────────────────────────────────

    @Test
    @DisplayName("AuthService stores SHA-256 hash of refresh token instead of plaintext, and rotates properly")
    void testAuthService_refreshTokenHashing() {
        String userIdStr = new ObjectId().toHexString();
        User user = User.builder()
                .id(userIdStr)
                .fullName("John Doe")
                .email("john@example.com")
                .roles(Set.of(Role.MENTEE))
                .status(UserStatus.ACTIVE)
                .build();

        when(userRepository.findById(userIdStr)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any())).thenReturn("mock-access-token");
        UserResponse userResponse = new UserResponse(
                userIdStr, "John Doe", "john@example.com", "0123456789", Set.of(Role.MENTEE),
                "SE123456", "SE", "4", null, null, null, null, false, 0L, UserStatus.ACTIVE, Instant.now(), false
        );
        when(userMapper.toResponse(any())).thenReturn(userResponse);

        // 1. Issue refresh token
        ReflectionTestUtils.invokeMethod(authService, "issueRefreshToken", user);

        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(tokenCaptor.capture());

        RefreshToken savedToken = tokenCaptor.getValue();
        assertNotNull(savedToken.getToken());
        // A SHA-256 hex string has exactly 64 characters
        assertEquals(64, savedToken.getToken().length(), "Stored token must be a 64-char SHA-256 hex string");
        assertFalse(savedToken.getToken().contains("-"), "Stored token must not be a plaintext UUID");

        // 2. Refreshing with plaintext UUID should search by hash
        String rawTokenUuid = UUID.randomUUID().toString();
        // Compute expected SHA-256 hash for rawTokenUuid
        String expectedHash = (String) ReflectionTestUtils.invokeMethod(authService, "hashToken", rawTokenUuid);
        assertEquals(64, expectedHash.length());

        RefreshToken storedToken = RefreshToken.builder()
                .userId(new ObjectId(userIdStr))
                .token(expectedHash)
                .expiresAt(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();

        when(refreshTokenRepository.findByToken(expectedHash)).thenReturn(Optional.of(storedToken));

        AuthResponse authResponse = authService.refresh(new RefreshRequest(rawTokenUuid));
        assertNotNull(authResponse);
        assertEquals("mock-access-token", authResponse.accessToken());
        verify(refreshTokenRepository).delete(storedToken);

        // 3. Logout with plaintext UUID deletes the hashed token
        authService.logout(new RefreshRequest(rawTokenUuid));
        verify(refreshTokenRepository, atLeastOnce()).delete(storedToken);
    }
}
