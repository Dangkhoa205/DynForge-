package com.dynforge.be.seeder;

import com.dynforge.be.model.entity.User;
import com.dynforge.be.model.enums.Role;
import com.dynforge.be.model.enums.UserStatus;
import com.dynforge.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.EnumSet;

/**
 * Production has no demo accounts, so the first admin is created from environment variables:
 * ADMIN_EMAIL + ADMIN_PASSWORD (Render dashboard). Runs once; does nothing if the email already exists.
 * Remove ADMIN_PASSWORD from Render after the first successful start.
 */
@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            log.info("[AdminBootstrap] {} already exists — nothing to do.", email);
            return;
        }
        if (adminPassword.length() < 12) {
            log.warn("[AdminBootstrap] ADMIN_PASSWORD must be at least 12 characters — admin NOT created.");
            return;
        }
        userRepository.save(User.builder()
                .fullName("DynForge Admin")
                .email(email)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .roles(EnumSet.of(Role.ADMIN))
                .walletBalance(0)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .build());
        log.info("[AdminBootstrap] Created admin account {}", email);
    }
}
