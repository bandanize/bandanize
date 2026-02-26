FROM maven:3.9.1-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml ./
COPY src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine AS runtime

LABEL org.opencontainers.image.source = "https://github.com/bandanize/bandanize"

# Fix security vulnerabilities
RUN apk add --no-cache \
    'libexpat>=2.7.4-r0' \
    'gnutls>=3.8.12-r0' \
    'libpng>=1.6.55-r0'

WORKDIR /app

COPY --from=build /app/target/*.jar ./backend.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "backend.jar"]