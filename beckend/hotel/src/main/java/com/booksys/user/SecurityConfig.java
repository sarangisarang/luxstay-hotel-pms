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

    /**
     * Only the configured frontend origins may call the API from a browser
     * (ALLOWED_ORIGINS, comma separated). It used to be "*", which ignored
     * the setting. Entries without a scheme (Render passes bare host names)
     * are treated as https.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @org.springframework.beans.factory.annotation.Value("${app.frontend.allowed-origins:http://localhost:3000}")
            String allowedOrigins) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(parseOrigins(allowedOrigins));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        // JWT travels in the Authorization header, not in cookies
        cfg.setAllowCredentials(false);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    /** "a.com, http://b.com:3000/" → ["https://a.com", "http://b.com:3000"] */
    public static List<String> parseOrigins(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .map(o -> o.replaceAll("/+$", ""))
                .map(o -> o.contains("://") ? o : "https://" + o)
                .distinct()
                .toList();
    }

    /* ===================== Security Filter Chain ===================== */

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        /* ---------- Public ---------- */
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/public/**",
                                "/actuator/health",
                                "/error",
                                // SockJS handshake; every STOMP frame is authenticated
                                // by WebSocketAuthInterceptor (JWT on CONNECT)
                                "/ws/**",
                                // only reachable when API_DOCS_ENABLED=true
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/vouchers/validate").permitAll()
                        // Public images (room, room type, hotel pictures)
                        .requestMatchers(HttpMethod.GET,
                                "/uploads/**", "/roomtype/**",
                                "/api/room-types/roomtype/**", "/api/images/files/**").permitAll()

                        /* ---------- Any logged-in account (guest or staff) ---------- */
                        // Guest accounts (USER) get ONLY these; everything else is staff
                        // data. Endpoints below check ownership themselves.
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/user/me", "/api/user/change-password").authenticated()
                        .requestMatchers("/api/user/**").hasRole("USER")
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/chat/*/messages").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/feedback-reviews").authenticated()

                        /* ---------- Staff only from here on ---------- */
                        .requestMatchers("/api/ai/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/chat/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/crm/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/pos/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/channels/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers("/api/pricing-rules/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.GET, "/api/checkins/**").hasAnyRole("ADMIN", "RECEPTION")
                        .requestMatchers(HttpMethod.PATCH, "/api/checkins/**").hasAnyRole("ADMIN", "RECEPTION")

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

                        /* ---------- ADMIN-only sensitive endpoints ---------- */
                        // Audit trail and webhook config must never be visible to non-admins
                        .requestMatchers("/api/audit-log/**").hasRole("ADMIN")
                        .requestMatchers("/api/webhooks/**").hasRole("ADMIN")
                        .requestMatchers("/api/ai-audit/**").hasRole("ADMIN")
                        .requestMatchers("/api/ai-health/**").hasRole("ADMIN")

                        /* ---------- READ access: staff only ---------- */
                        // Was ADMIN/RECEPTION/USER: any registered guest could read other
                        // guests' profiles, DSGVO exports, allergies, all voucher codes,
                        // housekeeping/maintenance data and revenue insights.
                        .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyRole("ADMIN", "RECEPTION")

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
