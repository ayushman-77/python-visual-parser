FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
# Download dependencies
RUN mvn dependency:go-offline

COPY src ./src
# Build the application
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /app/target/compiler-backend-1.0-SNAPSHOT.jar app.jar
EXPOSE 7070
ENTRYPOINT ["java", "-jar", "app.jar"]
