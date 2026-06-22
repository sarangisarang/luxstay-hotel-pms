package com.booksys.user;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretFromProps;

    @Value("${jwt.ttl-seconds:86400}")
    private long ttlSeconds;

    @Value("${jwt.issuer:hotel-booking}")
    private String issuer;

    @Value("${jwt.audience:web}")
    private String audience;

    @PostConstruct
    public void validateSecret() {
        if (secretFromProps == null || secretFromProps.isBlank()) {
            throw new IllegalStateException("JWT_SECRET env var is required and must not be empty.");
        }
        byte[] decoded;
        try {
            decoded = Decoders.BASE64.decode(secretFromProps);
        } catch (IllegalArgumentException e) {
            decoded = secretFromProps.getBytes(StandardCharsets.UTF_8);
        }
        if (decoded.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes for HS256.");
        }
    }

    private SecretKey getSigningKey() {
        try {
            return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretFromProps));
        } catch (IllegalArgumentException ignored) {
            return Keys.hmacShaKeyFor(secretFromProps.getBytes(StandardCharsets.UTF_8));
        }
    }

    private Claims parseAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public <T> T extractClaim(String token, java.util.function.Function<Claims, T> resolver) {
        return resolver.apply(parseAllClaims(token));
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public List<String> extractRoles(String token) {
        Object val = extractClaim(token, c -> c.get("roles"));
        if (val instanceof Collection<?> col) {
            List<String> out = new ArrayList<>();
            for (Object o : col) if (o != null) out.add(String.valueOf(o));
            return out;
        }
        return Collections.emptyList();
    }

    public String extractRole(String token) {
        Object val = extractClaim(token, c -> c.get("role"));
        return val == null ? null : String.valueOf(val);
    }

    public boolean isDemoAccount(String token) {
        Object val = extractClaim(token, c -> c.get("demoAccount"));
        return Boolean.TRUE.equals(val);
    }

    public boolean isTokenValid(String token, String expectedEmail) {
        try {
            String email = extractUsername(token);
            if (!Objects.equals(email, expectedEmail)) return false;
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public String generateToken(AppUser user) {
        Map<String, Object> claims = new HashMap<>();
        String roleName = user.getRole().name();
        claims.put("role", roleName);
        claims.put("roles", List.of("ROLE_" + roleName));
        claims.put("email", user.getEmail());
        claims.put("userId", user.getId() != null ? user.getId().toString() : null);
        claims.put("demoAccount", user.isDemoAccount());

        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        Date exp = new Date(nowMillis + (ttlSeconds * 1000));

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .id(UUID.randomUUID().toString())
                .issuer(issuer)
                .audience().add(audience).and()
                .issuedAt(now)
                .expiration(exp)
                .signWith(getSigningKey())
                .compact();
    }
}
