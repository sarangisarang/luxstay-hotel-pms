# ── Stage 1: Build ──────────────────────────────────────────────────────────
# Uses the official Maven image instead of ./mvnw: the wrapper's .mvn/ folder
# is not part of the repository, so `COPY .mvn` failed on every clean clone
# (Render, CI, a fresh checkout).
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Resolve dependencies first so this layer is cached between builds
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q package -DskipTests

# ── Stage 2: Run ────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /app/target/hotel-0.0.1-SNAPSHOT.jar app.jar

# Upload directory owned by the runtime user (mount a volume here in production)
RUN mkdir -p /app/uploads && chown -R spring:spring /app/uploads
VOLUME /app/uploads

USER spring
EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
