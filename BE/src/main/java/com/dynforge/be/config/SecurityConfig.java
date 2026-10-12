package com.dynforge.be.config;

import com.dynforge.be.security.CustomUserDetailsService;
import com.dynforge.be.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.cors.allowed-origins:}")
    private String additionalAllowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> allowedPatterns = new ArrayList<>(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "https://*.vercel.app",
                "https://*.azurewebsites.net",
                // Capacitor Android app (FE/capacitor.config.json: androidScheme https)
                "https://localhost"
        ));

        // Nạp tự động từ biến môi trường APP_FRONTEND_BASE_URL (ví dụ: https://dynforge.tech hoặc https://www.dynforge.tech)
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            String trimmed = frontendBaseUrl.trim().replaceAll("/+$", "");
            if (!allowedPatterns.contains(trimmed)) {
                allowedPatterns.add(trimmed);
            }
            // Tự động cho phép cả bản có www và không có www
            if (trimmed.startsWith("https://www.")) {
                String nonWww = trimmed.replace("https://www.", "https://");
                if (!allowedPatterns.contains(nonWww)) {
                    allowedPatterns.add(nonWww);
                }
            } else if (trimmed.startsWith("https://")) {
                String withWww = trimmed.replace("https://", "https://www.");
                if (!allowedPatterns.contains(withWww)) {
                    allowedPatterns.add(withWww);
                }
            }
        }

        // Hỗ trợ thêm biến môi trường APP_CORS_ALLOWED_ORIGINS (danh sách domain cách nhau bằng dấu phẩy)
        if (additionalAllowedOrigins != null && !additionalAllowedOrigins.isBlank()) {
            for (String origin : additionalAllowedOrigins.split(",")) {
                String o = origin.trim().replaceAll("/+$", "");
                if (!o.isEmpty() && !allowedPatterns.contains(o)) {
                    allowedPatterns.add(o);
                }
            }
        }

        // Cho phép các subdomain của domain chính
        allowedPatterns.add("https://dynforge.tech");
        allowedPatterns.add("https://*.dynforge.tech");

        config.setAllowedOriginPatterns(allowedPatterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Return 401 (not the default 403) for unauthenticated/expired-token requests
                // so the frontend can refresh the token and retry.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/api/auth/**").permitAll()
                        .requestMatchers("/api/ai/**").permitAll()
                        .requestMatchers("/api/wallet/webhook").permitAll()
                        // "/search" must precede "/me" and "/**" so it is publicly reachable.
                        .requestMatchers(HttpMethod.GET, "/api/mentors/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/mentors/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/mentors/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/universities/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/resources").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/verifications/mine").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/verifications/**").hasRole("ADMIN")
                        .requestMatchers("/api/verifications/*/decision").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/bookings/*/resolve").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
