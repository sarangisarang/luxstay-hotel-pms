package com.booksys.user;

import com.booksys.config.DemoProtectionFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final DemoProtectionFilter demoProtectionFilter;
    private final UserService userService;

    /* ===================== Beans: Auth & Password ===================== */

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        // IMPORTANT: UserService must implement UserDetailsService. If not, expose a separate bean that does.
        p.setUserDetailsService((UserDetailsService) userService);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    /* ===================== Bean: Centralized CORS ===================== */

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        // API uses JWT Bearer tokens (not cookies), so allowCredentials=false is safe.
        // allowedOriginPatterns("*") permits any origin including tunnel URLs.
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        cfg.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    /* ===================== Security Filter Chain ===================== */

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        /* ---------- Public endpoints ---------- */
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/public/**",
                                "/api/vouchers/validate",
                                "/api/rooms/availability",
                                "/actuator/health",
                                "/error",
                                "/ws/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        /* AI endpoints — accessible to all authenticated roles */
                        .requestMatchers("/api/ai/**").hasAnyRole("ADMIN", "RECEPTION", "USER")
                        /* CRM, POS, Channels, Pricing — ADMIN and RECEPTION */
                        .requestMatchers("/api/crm/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/pos/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/channels/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/pricing-rules/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.GET, "/api/checkins/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PATCH, "/api/checkins/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()


                        /* ---------- Static GET (public) ---------- */
                        .requestMatchers(HttpMethod.GET, "/uploads/**", "/roomtype/**").permitAll()

                        /* ---------- Namespaces ---------- */
                        // RECEPTION can read operational stats and reporting endpoints
                        .requestMatchers(HttpMethod.GET,
                                "/api/admin/stats", "/api/admin/monthly-revenue",
                                "/api/admin/booking-status-summary", "/api/admin/forecast",
                                "/api/admin/kpi", "/api/admin/reconciliation",
                                "/api/admin/pace", "/api/admin/pickup",
                                "/api/admin/occupancy-heatmap",
                                "/api/admin/revenue-suggestions",
                                "/api/admin/manifest",
                                "/api/admin/guest-analytics",
                                "/api/admin/revenue-by-channel",
                                "/api/admin/night-audit",
                                "/api/admin/booking-trends",
                                "/api/admin/repeat-guests")
                            .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/corporate/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/corporate/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/concierge/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.POST, "/api/concierge/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PATCH, "/api/concierge/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/concierge/**").hasRole("ADMIN")
                        .requestMatchers("/api/chain/**").hasAnyRole("ADMIN")
                        .requestMatchers("/api/reception/**").hasRole("RECEPTION")
                        // Profile endpoints must be accessible to all authenticated roles
                        .requestMatchers("/api/user/me", "/api/user/change-password")
                            .hasAnyRole("ADMIN", "RECEPTION", "USER")
                        .requestMatchers("/api/user/**").hasRole("USER")

                        /* ---------- ADMIN-only sensitive endpoints ---------- */
                        // Audit trail and webhook config must never be visible to non-admins
                        .requestMatchers("/api/audit-log/**").hasRole("ADMIN")
                        .requestMatchers("/api/webhooks/**").hasRole("ADMIN")
                        .requestMatchers("/api/ai-audit/**").hasRole("ADMIN")
                        .requestMatchers("/api/ai-health/**").hasRole("ADMIN")

                        /* ---------- Sensitive list-all endpoints: ADMIN + RECEPTION only ---------- */
                        // A USER role must never enumerate all records — data breach risk
                        .requestMatchers(HttpMethod.GET,
                                "/api/invoices",
                                "/api/invoices/number/*",
                                "/api/payments",
                                "/api/bookings",
                                "/api/guests",
                                "/api/employees",
                                "/api/staff/**"
                        ).hasAnyRole("ADMIN", "RECEPTION")

                        /* ---------- READ access (generic) ---------- */
                        .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyRole("ADMIN", "RECEPTION", "USER")

                        /* ---------- RECEPTION core operations ---------- */
                        // Bookings — RECEPTION can create, update, and action
                        .requestMatchers(HttpMethod.POST, "/api/bookings", "/api/bookings/calculate")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/bookings/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Guests — RECEPTION can create and update
                        .requestMatchers(HttpMethod.POST, "/api/guests")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/guests/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Invoices — RECEPTION can generate and update status
                        .requestMatchers(HttpMethod.POST, "/api/invoices/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/invoices/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Payments — RECEPTION can create
                        .requestMatchers(HttpMethod.POST, "/api/payments")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Service requests — RECEPTION can create and update
                        .requestMatchers(HttpMethod.POST, "/api/servicerequests")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/servicerequests/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Feedback / Reviews — all authenticated roles can submit
                        .requestMatchers(HttpMethod.POST, "/api/feedback-reviews/**")
                        .hasAnyRole("USER", "ADMIN", "RECEPTION")

                        // Groups and Preferences — RECEPTION full write
                        .requestMatchers(HttpMethod.POST, "/api/groups/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/groups/**", "/api/guests/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PATCH, "/api/groups/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.DELETE, "/api/groups/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Housekeeping and Maintenance — RECEPTION full write
                        .requestMatchers(HttpMethod.POST, "/api/housekeeping/**", "/api/maintenance/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/housekeeping/**", "/api/maintenance/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PATCH, "/api/housekeeping/**", "/api/maintenance/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Rate plans and Loyalty — RECEPTION full write
                        .requestMatchers(HttpMethod.POST, "/api/rate-plans/**", "/api/loyalty/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PUT, "/api/rate-plans/**", "/api/loyalty/**")
                        .hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PATCH, "/api/rate-plans/**", "/api/loyalty/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

                        // Chat
                        .requestMatchers(HttpMethod.POST, "/api/chat/**").hasAnyRole("USER", "ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.GET, "/api/chat/**").hasAnyRole("ADMIN", "RECEPTION", "USER")

                        // Notifications — all authenticated roles
                        .requestMatchers("/api/notifications/**").hasAnyRole("ADMIN", "RECEPTION", "USER")

                        /* ---------- GENERIC WRITE rules (ADMIN only for everything else) ---------- */
                        .requestMatchers(HttpMethod.POST,   "/api/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH,  "/api/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")

                        /* ---------- Everything else ---------- */
                        .anyRequest().authenticated()
                )

                .authenticationProvider(daoAuthenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(demoProtectionFilter, JwtAuthenticationFilter.class)

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> {
                            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"Unauthorized\"}");
                        })
                        .accessDeniedHandler((req, res, e) -> {
                            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"Forbidden\"}");
                        })
                );
        return http.build();
    }
}
