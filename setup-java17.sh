#!/bin/bash
# Setup Java 17 environment for Tokis Spring Boot application
# Run this script once per codespace session: source ./setup-java17.sh

echo "Setting up Java 17 for Tokis..."

# Export Java 17 paths
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"

# Verify installation
echo "Java version:"
java -version
echo ""
echo "Javac version:"
javac -version
echo ""
echo "✓ Java 17 environment configured successfully!"
echo ""
echo "Now you can run: cd tokis/tokis && ./mvnw spring-boot:run"
