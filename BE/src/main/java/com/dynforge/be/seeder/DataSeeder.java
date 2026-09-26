package com.dynforge.be.seeder;

import com.dynforge.be.model.entity.Course;
import com.dynforge.be.model.entity.MentorProfile;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.UniversityStatus;
import com.dynforge.be.model.enums.UserStatus;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.UniversityRepository;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MentorRepository mentorRepository;
    private final UniversityRepository universityRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "DynForge@123";

    @Override
    public void run(String... args) {
        // ── Universities ─────────────────────────────────────────────────────
        // Ensured OUTSIDE the demo-account guard so the second campus always
        // exists (idempotent), even if the demo accounts were seeded earlier.
        // FPTU-HCM is created by UniversityMigration (@Order(0)); UTH is a demo
        // second campus used to exercise the multi-university model.
        University fptu = universityRepository.findByCode("FPTU-HCM")
                .orElseThrow(() -> new IllegalStateException("FPTU-HCM university missing — did UniversityMigration run?"));
        University uth = universityRepository.findByCode("UTH")
                .orElseGet(() -> {
                    log.info("Seeding demo university UTH…");
                    return universityRepository.save(University.builder()
                            .code("UTH")
                            .name("Trường Đại học Giao thông Vận tải TP. Hồ Chí Minh")
                            .shortName("UTH")
                            .aliases(List.of("UTH", "GTVT", "Giao thông Vận tải"))
                            .emailDomains(List.of("ut.edu.vn"))
                            .status(UniversityStatus.WAITLIST)
                            .createdAt(Instant.now())
                            .build());
                });

        if (userRepository.existsByEmail("khoa.tran@dynforge.vn") || userRepository.existsByEmail("khoa.tran@gradora.vn")) {
            log.info("Seed data already present — skipping demo accounts.");
            return;
        }

        log.info("Seeding demo accounts…");

        // ── Admin ────────────────────────────────────────────────────────────
        createUser("Admin DynForge", "admin@dynforge.vn", Set.of(Role.ADMIN), null, null, 0, fptu);

        // ── Student ──────────────────────────────────────────────────────────
        createUser("Nguyễn Văn An", "student@dynforge.vn", Set.of(Role.MENTEE),
                "SE", "2022", 500_000L, fptu);

        // ── Mentors ──────────────────────────────────────────────────────────
        seedMentor(
            /* user info */
            "Trần Minh Khoa",
            "khoa.tran@dynforge.vn",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
            "SE",
            "2019",
            /* profile */
            "AI/ML Lecturer · FPT University",
            "Former AI engineer at VinAI Research, now teaching Machine Learning and Deep Learning at FPT University. I help students build strong mathematical intuition and practical coding skills for AI/ML projects.",
            List.of(
                course("MAL301", "Machine Learning", "A+", 120_000, 70_000),
                course("MAL401", "Deep Learning Practices", "A+", 130_000, 75_000),
                course("NLP301", "Natural Language Processing", "A", 120_000, 70_000)
            ),
            List.of("Python", "TensorFlow", "PyTorch", "Scikit-learn", "Data Analysis", "Research"),
            List.of("Vietnamese", "English"),
            List.of("Online", "Offline"),
            availability("Monday", "Wednesday", "Friday"),
            4.9, 128, 214,
            fptu
        );

        seedMentor(
            "Nguyễn Thị Linh",
            "linh.nguyen@dynforge.vn",
            "https://images.unsplash.com/photo-1531427888099-b3ecff6e1a6f?auto=format&fit=crop&w=200&q=80",
            "SE",
            "2020",
            "Software Engineer · Alumni 2023",
            "Graduated with distinction from FPT University. Currently a backend engineer at VNG. Passionate about clean code, system design, and helping juniors build solid engineering foundations.",
            List.of(
                course("PRJ301", "Java Web Application", "A+", 110_000, 65_000),
                course("SWR302", "Software Requirements", "A", 100_000, 60_000),
                course("SWT301", "Software Testing", "A", 105_000, 62_000)
            ),
            List.of("Java", "Spring Boot", "System Design", "SQL", "REST API", "Testing"),
            List.of("Vietnamese", "English"),
            List.of("Online", "Offline"),
            availability("Tuesday", "Thursday", "Saturday"),
            4.8, 96, 180,
            fptu
        );

        seedMentor(
            "Phạm Văn Hùng",
            "hung.pham@dynforge.vn",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
            "AI",
            "2021",
            "Senior Student · AI Major",
            "4th-year AI student, top 5% GPA. Strong background in mathematics and programming. I enjoy breaking down complex topics so anyone can understand them. Specialising in OOP and foundational CS courses.",
            List.of(
                course("PRO192", "Object-Oriented Programming", "A+", 95_000, 55_000),
                course("MAD101", "Discrete Mathematics", "A+", 90_000, 52_000),
                course("CSD201", "Data Structures & Algorithms", "A", 100_000, 58_000)
            ),
            List.of("Java", "C++", "Discrete Math", "Algorithm Design", "OOP"),
            List.of("Vietnamese"),
            List.of("Online"),
            availability("Monday", "Tuesday", "Wednesday", "Thursday"),
            4.7, 64, 96,
            fptu
        );

        seedMentor(
            "Lê Thị Thu",
            "thu.le@dynforge.vn",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            "BA",
            "2020",
            "Business Analyst · Alumni 2023",
            "BA graduate turned product analyst at Momo. I cover business and finance courses and can help you with case studies, business reports, and exam preparation. Available for group sessions too!",
            List.of(
                course("MKT101", "Marketing Principles", "A", 100_000, 60_000),
                course("ACC101", "Principles of Accounting", "A+", 105_000, 62_000),
                course("FIN101", "Financial Management", "A", 100_000, 60_000)
            ),
            List.of("Business Analysis", "Excel", "Power BI", "Financial Modeling", "Case Study"),
            List.of("Vietnamese", "English"),
            List.of("Online", "Offline"),
            availability("Wednesday", "Friday", "Saturday", "Sunday"),
            4.8, 112, 154,
            fptu
        );

        seedMentor(
            "Đặng Văn Minh",
            "minh.dang@dynforge.vn",
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
            "SE",
            "2021",
            "Senior Student · SE Major",
            "3rd-year SE student and competitive programmer. ICPC Vietnam national contestant 2023. I excel at algorithmic thinking and C/C++ fundamentals, and I love helping students pass their lab exams.",
            List.of(
                course("PRF192", "C/C++ Fundamentals", "A+", 105_000, 60_000),
                course("LAB211", "OOP with Java (Lab)", "A+", 110_000, 63_000),
                course("CSD201", "Data Structures & Algorithms", "A+", 110_000, 65_000)
            ),
            List.of("C++", "Java", "Competitive Programming", "Algorithms", "Data Structures"),
            List.of("Vietnamese"),
            List.of("Online"),
            availability("Monday", "Thursday", "Saturday", "Sunday"),
            4.6, 48, 86,
            fptu
        );

        // ── UTH mentors (demo second campus) ──────────────────────────────────
        seedMentor(
            "Võ Thị Mai",
            "mai.vo@dynforge.vn",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
            "LOG",
            "2020",
            "Logistics Analyst · Alumni 2023",
            "UTH alumni working in supply-chain analytics at Gemadept. I tutor logistics and transport-economics courses and help students with case studies and graduation projects.",
            List.of(
                course("LOG201", "Nhập môn Logistics", "A", 100_000, 60_000),
                course("MAE101", "Toán cao cấp", "A+", 90_000, 52_000, true),
                course("TRE301", "Kinh tế vận tải", "A", 105_000, 62_000)
            ),
            List.of("Logistics", "Supply Chain", "Excel", "Data Analysis"),
            List.of("Vietnamese", "English"),
            List.of("Online", "Offline"),
            availability("Tuesday", "Thursday", "Saturday"),
            4.7, 41, 63,
            uth
        );

        seedMentor(
            "Trịnh Quốc Bảo",
            "bao.trinh@dynforge.vn",
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
            "SE",
            "2021",
            "Senior Student · UTH",
            "Sinh viên năm cuối ngành CNTT tại UTH. Mạnh về lập trình nền tảng và các môn đại cương. Mình giúp các bạn vượt qua Toán cao cấp và Vật lý đại cương.",
            List.of(
                course("PRF101", "Lập trình cơ bản", "A", 95_000, 55_000),
                course("MAE101", "Toán cao cấp", "A+", 90_000, 52_000, true),
                course("PHE101", "Vật lý đại cương", "A", 90_000, 52_000, true)
            ),
            List.of("C", "Python", "Toán cao cấp", "Vật lý"),
            List.of("Vietnamese"),
            List.of("Online"),
            availability("Monday", "Wednesday", "Friday"),
            4.5, 22, 30,
            uth
        );

        log.info("Seed complete: 2 accounts + 7 mentor profiles created (5 FPTU, 2 UTH).");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User createUser(String fullName, String email, Set<Role> roles,
                            String major, String year, long walletBalance, University university) {
        User user = User.builder()
                .fullName(fullName)
                .email(email)
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .roles(roles)
                .major(major)
                .universityId(new ObjectId(university.getId()))
                .year(year)
                .walletBalance(walletBalance)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        return userRepository.save(user);
    }

    private void seedMentor(
            String fullName, String email, String avatarUrl,
            String major, String year,
            String title, String bio,
            List<Course> courses, List<String> skills, List<String> languages,
            List<String> formats,
            Map<String, List<String>> availability,
            double ratingAvg, int ratingCount, int sessionsCount,
            University university
    ) {
        ObjectId universityId = new ObjectId(university.getId());
        User user = User.builder()
                .fullName(fullName)
                .email(email)
                .avatarUrl(avatarUrl)
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .roles(Set.of(Role.MENTOR))
                .major(major)
                .universityId(universityId)
                .year(year)
                .walletBalance(0L)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        user = userRepository.save(user);

        MentorProfile profile = MentorProfile.builder()
                .userId(new ObjectId(user.getId()))
                .title(title)
                .bio(bio)
                .major(majorLabel(major))
                .universityId(universityId)
                .university(university.getName())
                .teachingRole(roleFromTitle(title))
                .courses(courses)
                .skills(skills)
                .languages(languages)
                .formats(formats)
                .availability(availability)
                .verified(true)
                .ratingAvg(ratingAvg)
                .ratingCount(ratingCount)
                .sessionsCount(sessionsCount)
                .build();
        mentorRepository.save(profile);
    }

    // Maps the short major code to a label that matches the mentee search filter.
    private static String majorLabel(String code) {
        return switch (code == null ? "" : code) {
            case "BA" -> "Ngành Quản trị kinh doanh";
            case "AI" -> "Ngành Khoa học máy tính";
            case "LOG" -> "Ngành Logistics và Quản lý chuỗi cung ứng";
            default -> "Ngành Công nghệ thông tin"; // SE and others
        };
    }

    private static String roleFromTitle(String title) {
        String t = title == null ? "" : title.toLowerCase();
        if (t.contains("lecturer")) return "Lecturer";
        if (t.contains("alumni")) return "Alumni Mentor";
        if (t.contains("research")) return "Research Advisor";
        return "Senior Student";
    }

    private static Course course(String code, String name, String grade,
                                 long ratePrivate, long rateGroup) {
        return course(code, name, grade, ratePrivate, rateGroup, false);
    }

    private static Course course(String code, String name, String grade,
                                 long ratePrivate, long rateGroup, boolean generalEducation) {
        return Course.builder()
                .code(code)
                .name(name)
                .grade(grade)
                .ratePrivate(ratePrivate)
                .rateGroup(rateGroup)
                .generalEducation(generalEducation)
                .build();
    }

    private static Map<String, List<String>> availability(String... days) {
        Map<String, List<String>> map = new java.util.LinkedHashMap<>();
        List<String> slots = List.of("08:00", "09:00", "10:00", "14:00", "15:00", "16:00", "19:00", "20:00");
        for (String day : days) {
            map.put(day, slots);
        }
        return map;
    }
}
