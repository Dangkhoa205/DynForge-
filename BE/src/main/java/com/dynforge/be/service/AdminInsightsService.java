package com.dynforge.be.service;

import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.Review;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.ReviewRepository;
import com.dynforge.be.repository.UniversityRepository;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Admin analytics: who the users are (demographics) and what they say after sessions (reviews). */
@Service
@RequiredArgsConstructor
public class AdminInsightsService {

    private static final String UNKNOWN = "Chưa cập nhật";

    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final ReviewRepository reviewRepository;
    private final MentorRepository mentorRepository;

    public record Bucket(String label, long count) { }

    public record Demographics(
            long totalUsers, long mentees, long mentors,
            List<Bucket> ageGroups, List<Bucket> majors, List<Bucket> universities, List<Bucket> provinces,
            long profilesWithAge, long profilesWithProvince) { }

    public record ReviewItem(
            String id, Instant createdAt, int rating, String comment, String courseCode, String bookingId,
            String menteeId, String menteeName, String mentorId, String mentorName) { }

    public record MentorRating(String mentorId, String mentorName, double averageRating, long reviewCount) { }

    public record Feedback(long totalReviews, double averageRating, List<Bucket> ratingDistribution,
                           List<MentorRating> mentorRatings, List<ReviewItem> reviews) { }

    /** Mentees and mentors (admins excluded). {@code role}: null = everyone, MENTEE or MENTOR. */
    public Demographics demographics(Role role) {
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getRoles() == null || !u.getRoles().contains(Role.ADMIN))
                .filter(u -> role == null || (u.getRoles() != null && u.getRoles().contains(role)))
                .toList();

        Map<String, String> uniNames = universityRepository.findAll().stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(University::getId,
                        u -> u.getShortName() != null && !u.getShortName().isBlank() ? u.getShortName()
                                : (u.getName() != null ? u.getName() : u.getCode() != null ? u.getCode() : "—"),
                        (a, b) -> a));

        int currentYear = Year.now().getValue();
        Function<User, String> ageGroup = u -> {
            if (u.getBirthYear() == null) return UNKNOWN;
            int age = currentYear - u.getBirthYear();
            if (age < 18) return "Dưới 18";
            if (age <= 20) return "18–20";
            if (age <= 22) return "21–22";
            if (age <= 25) return "23–25";
            return "Trên 25";
        };

        long mentees = users.stream().filter(u -> u.getRoles() != null && u.getRoles().contains(Role.MENTEE)).count();
        long mentors = users.stream().filter(u -> u.getRoles() != null && u.getRoles().contains(Role.MENTOR)).count();

        return new Demographics(
                users.size(), mentees, mentors,
                ordered(countBy(users, ageGroup), List.of("Dưới 18", "18–20", "21–22", "23–25", "Trên 25", UNKNOWN)),
                top(countBy(users, u -> blankToUnknown(u.getMajor())), 12),
                top(countBy(users, u -> u.getUniversityId() == null ? UNKNOWN
                        : uniNames.getOrDefault(u.getUniversityId().toHexString(), UNKNOWN)), 15),
                top(countBy(users, u -> blankToUnknown(u.getProvince())), 15),
                users.stream().filter(u -> u.getBirthYear() != null).count(),
                users.stream().filter(u -> u.getProvince() != null && !u.getProvince().isBlank()).count());
    }

    public Feedback feedback() {
        List<Review> reviews = reviewRepository.findAll().stream()
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        Map<String, String> names = userRepository.findAll().stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(User::getId,
                        u -> u.getFullName() == null ? "" : u.getFullName(), (a, b) -> a));
        // Review.mentorId may hold the mentor's user id or the mentor-profile id: resolve both.
        Map<String, String> profileToUser = mentorRepository.findAll().stream()
                .filter(p -> p.getUserId() != null)
                .collect(Collectors.toMap(MentorProfile::getId, p -> p.getUserId().toHexString(), (a, b) -> a));
        Function<String, String> mentorName = id -> {
            if (id == null) return null;
            String n = names.get(id);
            if (n == null && profileToUser.containsKey(id)) n = names.get(profileToUser.get(id));
            return n;
        };

        List<ReviewItem> items = reviews.stream().map(r -> {
            String menteeId = r.getMenteeId() == null ? null : r.getMenteeId().toHexString();
            String mentorId = r.getMentorId() == null ? null : r.getMentorId().toHexString();
            return new ReviewItem(r.getId(), r.getCreatedAt(), r.getRating(), r.getComment(), r.getCourseCode(),
                    r.getBookingId() == null ? null : r.getBookingId().toHexString(),
                    menteeId, menteeId == null ? null : names.get(menteeId),
                    mentorId, mentorName.apply(mentorId));
        }).toList();

        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        Map<String, Long> dist = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            final int s = star;
            dist.put(star + " sao", reviews.stream().filter(r -> r.getRating() == s).count());
        }

        List<MentorRating> mentorRatings = items.stream()
                .filter(i -> i.mentorId() != null)
                .collect(Collectors.groupingBy(ReviewItem::mentorId))
                .entrySet().stream()
                .map(e -> new MentorRating(e.getKey(),
                        e.getValue().get(0).mentorName(),
                        Math.round(e.getValue().stream().mapToInt(ReviewItem::rating).average().orElse(0) * 10) / 10.0,
                        e.getValue().size()))
                .sorted(Comparator.comparingDouble(MentorRating::averageRating).reversed()
                        .thenComparing(Comparator.comparingLong(MentorRating::reviewCount).reversed()))
                .toList();

        return new Feedback(reviews.size(), Math.round(avg * 10) / 10.0,
                dist.entrySet().stream().map(e -> new Bucket(e.getKey(), e.getValue())).toList(),
                mentorRatings, items);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static String blankToUnknown(String v) {
        return v == null || v.isBlank() ? UNKNOWN : v.trim();
    }

    private static Map<String, Long> countBy(List<User> users, Function<User, String> key) {
        return users.stream().collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.counting()));
    }

    /** Largest first, "Chưa cập nhật" last, the tail folded into "Khác". */
    private static List<Bucket> top(Map<String, Long> counts, int limit) {
        long unknown = counts.getOrDefault(UNKNOWN, 0L);
        List<Bucket> known = counts.entrySet().stream()
                .filter(e -> !UNKNOWN.equals(e.getKey()))
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new Bucket(e.getKey(), e.getValue()))
                .toList();
        List<Bucket> out = new ArrayList<>(known.subList(0, Math.min(limit, known.size())));
        long rest = known.stream().skip(limit).mapToLong(Bucket::count).sum();
        if (rest > 0) out.add(new Bucket("Khác", rest));
        if (unknown > 0) out.add(new Bucket(UNKNOWN, unknown));
        return out;
    }

    private static List<Bucket> ordered(Map<String, Long> counts, List<String> order) {
        return order.stream().filter(counts::containsKey).map(k -> new Bucket(k, counts.get(k))).toList();
    }
}
