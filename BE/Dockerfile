# DynForge backend — container image for Render (or any Docker host).
# Build locally to test:  docker build -t dynforge-api BE  &&  docker run -p 8080:8080 --env-file BE/.env dynforge-api

# ---- build stage ----------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies first so they are cached between builds when only src changes.
RUN mvn -B -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- runtime stage --------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --create-home dynforge && mkdir -p /app/recordings && chown dynforge /app/recordings
COPY --from=build /app/target/*.jar /app/app.jar
USER dynforge
# Render's free instance has 512 MB RAM.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
