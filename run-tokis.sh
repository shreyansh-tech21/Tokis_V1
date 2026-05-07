#!/bin/bash
# Tokis Java 17 Setup and Spring Boot Runner
# Usage: ./run-tokis.sh [start|stop|status]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
JAVA_HOME_PATH="/usr/lib/jvm/java-17-openjdk-amd64"
SPRING_BOOT_DIR="tokis/tokis"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[TOKIS]${NC} $1"
}

# Function to setup Java 17
setup_java() {
    print_info "Setting up Java 17 environment..."

    # Check if Java 17 is installed
    if [ ! -d "$JAVA_HOME_PATH" ]; then
        print_error "Java 17 not found at $JAVA_HOME_PATH"
        print_error "Please install Java 17 first:"
        echo "  sudo apt-get update && sudo apt-get install -y openjdk-17-jdk"
        exit 1
    fi

    # Set Java environment variables
    export JAVA_HOME="$JAVA_HOME_PATH"
    export PATH="$JAVA_HOME/bin:$PATH"

    # Verify Java version
    if ! java -version 2>&1 | grep -q "17\."; then
        print_error "Java 17 not properly configured"
        print_error "Current Java version:"
        java -version
        exit 1
    fi

    print_status "Java 17 configured successfully"
    java -version 2>&1 | head -1
}

# Function to check Docker services
check_docker() {
    print_info "Checking Docker services..."

    if ! docker ps | grep -q tokis_db; then
        print_warning "Database container not running. Starting Docker services..."
        if [ -f "$DOCKER_COMPOSE_FILE" ]; then
            docker-compose up -d
            sleep 3
        else
            print_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
            exit 1
        fi
    fi

    if docker ps | grep -q tokis_db; then
        print_status "Database container is running"
    else
        print_error "Failed to start database container"
        exit 1
    fi
}

# Function to start Spring Boot
start_spring_boot() {
    print_info "Starting Spring Boot application..."

    cd "$SPRING_BOOT_DIR"

    # Make mvnw executable if needed
    if [ ! -x "./mvnw" ]; then
        print_warning "Making mvnw executable..."
        chmod +x ./mvnw
    fi

    # Start Spring Boot
    print_status "Running: ./mvnw spring-boot:run"
    ./mvnw spring-boot:run
}

# Function to stop Spring Boot
stop_spring_boot() {
    print_info "Stopping Spring Boot application..."

    # Find and kill Spring Boot process
    SPRING_PID=$(ps aux | grep "spring-boot:run" | grep -v grep | awk '{print $2}')
    if [ -n "$SPRING_PID" ]; then
        print_status "Stopping Spring Boot process (PID: $SPRING_PID)"
        kill $SPRING_PID
        sleep 2
        if ps -p $SPRING_PID > /dev/null 2>&1; then
            print_warning "Force killing Spring Boot process..."
            kill -9 $SPRING_PID
        fi
        print_status "Spring Boot stopped"
    else
        print_warning "No Spring Boot process found"
    fi
}

# Function to check status
check_status() {
    print_info "Checking Tokis system status..."

    # Check Java
    if java -version 2>&1 | grep -q "17\."; then
        print_status "Java 17: ✓ Configured"
    else
        print_error "Java 17: ✗ Not configured"
    fi

    # Check Docker
    if docker ps | grep -q tokis_db; then
        print_status "Database: ✓ Running"
    else
        print_error "Database: ✗ Not running"
    fi

    # Check Spring Boot
    if ps aux | grep -q "spring-boot:run"; then
        print_status "Spring Boot: ✓ Running"
        SPRING_PID=$(ps aux | grep "spring-boot:run" | grep -v grep | awk '{print $2}')
        echo "  Process ID: $SPRING_PID"
    else
        print_error "Spring Boot: ✗ Not running"
    fi

    # Check health endpoint
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        print_status "Health Check: ✓ OK"
    else
        print_error "Health Check: ✗ Failed"
    fi
}

# Function to show usage
show_usage() {
    echo "Tokis Java 17 Setup and Spring Boot Runner"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Setup Java 17 and start Spring Boot"
    echo "  stop     - Stop Spring Boot application"
    echo "  status   - Check system status"
    echo "  java     - Setup Java 17 only"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Full startup"
    echo "  $0 java     # Just setup Java"
    echo "  $0 status   # Check everything"
}

# Main script logic
case "${1:-start}" in
    "start")
        print_info "Starting Tokis application..."
        setup_java
        check_docker
        start_spring_boot
        ;;
    "stop")
        stop_spring_boot
        ;;
    "status")
        check_status
        ;;
    "java")
        setup_java
        print_status "Java 17 is ready. Run '$0 start' to launch Spring Boot."
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac