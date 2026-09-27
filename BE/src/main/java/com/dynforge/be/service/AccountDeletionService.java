package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.UserStatus;
import com.dynforge.be.repository.BookingRepository;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.MessageRepository;
import com.dynforge.be.repository.PasswordResetTokenRepository;
import com.dynforge.be.repository.RefreshTokenRepository;
import com.dynforge.be.repository.SchoolEmailTokenRepository;
import com.dynforge.be.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * "Delete my account" — required by Google Play for every app that lets users create an account.
 *
 * <p>What happens:
 * <ul>
 *   <li>Refused while money is still involved: a positive wallet balance, or a paid session that is
 *       not finished yet (the user must withdraw / finish / resolve first).</li>
 *   <li>Deleted: mentor profile, verification requests (transcripts), messages, session recordings,
 *       login/refresh tokens, OTP tokens. Unpaid bookings are cancelled.</li>
 *   <li>Kept but anonymised: the user record itself (name/email/phone... wiped), because completed
 *       bookings and wallet transactions must stay for accounting. Reviews stay so mentor ratings
 *       remain correct, but now show "Tài khoản đã xoá" as the author.</li>
 * </ul>
 * The privacy policy page (/privacy) describes exactly this.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    public static final String DELETED_NAME = "Tài khoản đã xoá";

    private static final Set<BookingStatus> IN_PROGRESS = EnumSet.of(
            BookingStatus.ESCROW_HELD, BookingStatus.ACCEPTED, BookingStatus.TAUGHT, BookingStatus.DISPUTED);

    private final BookingRepository bookingRepository;
    private final MentorRepository mentorRepository;
    private final VerificationRepository verificationRepository;
    private final MessageRepository messageRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SchoolEmailTokenRepository schoolEmailTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RecordingService recordingService;
    private final WalletBalanceService walletBalanceService;
    private final BookingTransitions transitions;
    private final PasswordEncoder passwordEncoder;
    private final MongoTemplate mongoTemplate;

    public void deleteAccount(User user, String confirmEmail) {
        if (confirmEmail == null || !confirmEmail.trim().equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("Email xác nhận không khớp với email tài khoản.");
        }
        if (user.getRoles() != null && user.getRoles().contains(Role.ADMIN)) {
            throw new BadRequestException("Tài khoản quản trị không thể tự xoá. Hãy nhờ một quản trị viên khác.");
        }

        String userId = user.getId();
        ObjectId uid = new ObjectId(userId);

        long balance = walletBalanceService.balanceOf(userId);
        if (balance > 0) {
            throw new BadRequestException("Ví của bạn còn " + balance
                    + "₫. Vui lòng rút hết số dư trước khi xoá tài khoản.");
        }

        Map<String, Booking> bookings = new LinkedHashMap<>();
        bookingRepository.findByMenteeId(uid).forEach(b -> bookings.put(b.getId(), b));
        bookingRepository.findByMentorId(uid).forEach(b -> bookings.put(b.getId(), b));

        boolean hasOpenSession = bookings.values().stream().anyMatch(b -> IN_PROGRESS.contains(b.getStatus()));
        if (hasOpenSession) {
            throw new BadRequestException("Bạn còn buổi học đã thanh toán nhưng chưa kết thúc hoặc đang tranh chấp. "
                    + "Hãy hoàn tất hoặc chờ xử lý xong rồi xoá tài khoản.");
        }

        // Unpaid bookings can simply be cancelled.
        for (Booking b : bookings.values()) {
            if (b.getStatus() == BookingStatus.PENDING_PAYMENT) {
                transitions.transition(b.getId(), EnumSet.of(BookingStatus.PENDING_PAYMENT),
                        BookingStatus.CANCELLED, null);
            }
        }

        // Personal data that is no longer needed.
        int recordings = 0;
        for (String bookingId : bookings.keySet()) {
            recordings += recordingService.deleteForBooking(bookingId);
        }
        mentorRepository.findByUserId(uid).ifPresent(mentorRepository::delete);
        verificationRepository.deleteAll(verificationRepository.findByUserId(uid));
        messageRepository.deleteAll(messageRepository.findBySenderIdOrRecipientId(uid, uid));
        refreshTokenRepository.deleteByUserId(uid);
        schoolEmailTokenRepository.deleteByUserId(uid);
        if (user.getEmail() != null) {
            passwordResetTokenRepository.deleteByEmail(user.getEmail());
        }

        // Anonymise the user record (kept only as an accounting reference).
        Update update = new Update()
                .set("fullName", DELETED_NAME)
                .set("email", "deleted-" + userId + "@deleted.dynforge.invalid")
                .set("passwordHash", passwordEncoder.encode(UUID.randomUUID().toString()))
                .set("roles", List.of())
                .set("schoolVerified", false)
                .set("status", UserStatus.DELETED)
                .unset("phone")
                .unset("studentId")
                .unset("major")
                .unset("year")
                .unset("avatarUrl")
                .unset("schoolEmail");
        mongoTemplate.updateFirst(Query.query(Criteria.where("id").is(userId)), update, User.class);

        log.info("Account {} deleted: {} booking(s) kept anonymised, {} recording(s) removed",
                userId, bookings.size(), recordings);
    }
}
