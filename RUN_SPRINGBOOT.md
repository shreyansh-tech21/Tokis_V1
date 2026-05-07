# Running Spring Boot Application

## 🚀 Quick Start (Recommended)

Use the all-in-one script for the easiest experience:

```bash
./run-tokis.sh start
```

This script automatically:
- ✅ Sets up Java 17 environment
- ✅ Checks/starts Docker services (database)
- ✅ Starts Spring Boot application
- ✅ Verifies everything is working

---

## 📋 Script Commands

The `run-tokis.sh` script supports multiple commands:

```bash
./run-tokis.sh start    # Full startup (Java + Docker + Spring Boot)
./run-tokis.sh stop     # Stop Spring Boot application
./run-tokis.sh status   # Check system status
./run-tokis.sh java     # Setup Java 17 only
./run-tokis.sh help     # Show help
```

---

## 🔧 Manual Setup (Alternative)

If you prefer manual control:

### Step 1: Set up Java 17 environment
```bash
source ./setup-java17.sh
```

### Step 2: Ensure Docker services are running
```bash
docker-compose up -d
```

### Step 3: Navigate to Spring Boot project
```bash
cd tokis/tokis
```

### Step 4: Run Spring Boot
```bash
./mvnw spring-boot:run
```

---

## 📊 System Status

Check if everything is running:

```bash
./run-tokis.sh status
```

Expected output when everything is working:
```
[TOKIS] Checking Tokis system status...
[INFO] Java 17: ✓ Configured
[INFO] Database: ✓ Running
[INFO] Spring Boot: ✓ Running
[INFO] Health Check: ✓ OK
```

---

## 🔍 Troubleshooting

### Java 17 Issues
```bash
./run-tokis.sh java
# This will setup Java and show version
```

### Database Issues
```bash
docker-compose up -d
docker ps  # Should show tokis_db running
```

### Spring Boot Issues
```bash
cd tokis/tokis
./mvnw clean compile  # Test compilation
```

---

## 📁 Files Overview

- `run-tokis.sh` - **Main script** (use this!)
- `setup-java17.sh` - Java 17 setup only
- `RUN_SPRINGBOOT.md` - This documentation
- `docker-compose.yml` - Database services
- `tokis/tokis/` - Spring Boot application

---

## 🔧 The `run-tokis.sh` Script

### What It Does

The `run-tokis.sh` script is a comprehensive Bash script that automates the entire setup and startup process for the Tokis Spring Boot application. It was created to solve the persistent Java version issues and simplify the development workflow.

### Script Features

- **Java 17 Setup**: Automatically configures the Java 17 environment by setting `JAVA_HOME` and `PATH`
- **Docker Management**: Checks if Docker services are running and starts them if needed
- **Spring Boot Control**: Starts, stops, and monitors the Spring Boot application
- **Health Monitoring**: Performs health checks on all components
- **Error Handling**: Comprehensive error checking with colored output and clear error messages
- **Status Reporting**: Detailed status information for all system components

### Script Commands

| Command | Description | What It Does |
|---------|-------------|--------------|
| `start` | Full system startup | Java setup → Docker check → Spring Boot launch |
| `stop` | Stop Spring Boot | Gracefully shuts down the Spring Boot process |
| `status` | System health check | Checks Java, Docker, Spring Boot, and health endpoints |
| `java` | Java setup only | Configures Java 17 without starting services |
| `help` | Show help | Displays usage information |

### Script Architecture

The script is structured with modular functions:

```bash
setup_java()      # Configures Java 17 environment
check_docker()    # Verifies Docker services
start_spring_boot() # Launches Spring Boot
stop_spring_boot()  # Stops Spring Boot
check_status()    # Comprehensive status check
```

### Error Handling

- **Java Verification**: Checks if Java 17 is installed and properly configured
- **Docker Validation**: Ensures database container is running
- **Process Management**: Safely starts/stops processes with PID tracking
- **Health Checks**: Validates application endpoints are responding

### Colored Output

The script uses ANSI color codes for clear visual feedback:
- 🟢 **Green** `[INFO]` - Success messages
- 🟡 **Yellow** `[WARN]` - Warning messages  
- 🔴 **Red** `[ERROR]` - Error messages
- 🔵 **Blue** `[TOKIS]` - Script status messages

### Why This Script Was Created

**Problem Solved**: Every codespace session required manual execution of multiple commands:
1. `source ./setup-java17.sh` (Java setup)
2. `docker-compose up -d` (Database)
3. `cd tokis/tokis` (Navigation)
4. `./mvnw spring-boot:run` (Spring Boot)

**Solution**: One command does everything:
```bash
./run-tokis.sh start
```

### Usage Examples

```bash
# Full startup (recommended)
./run-tokis.sh start

# Check if everything is working
./run-tokis.sh status

# Stop the application
./run-tokis.sh stop

# Just setup Java for other tasks
./run-tokis.sh java
```

### Dependencies

The script requires:
- **Java 17**: Must be installed at `/usr/lib/jvm/java-17-openjdk-amd64`
- **Docker**: For database services
- **Maven**: Included via Maven Wrapper (`mvnw`)

### Maintenance

The script is designed to be:
- **Self-contained**: No external dependencies beyond system tools
- **Idempotent**: Can be run multiple times safely
- **Robust**: Handles edge cases and provides clear error messages
- **Extensible**: Easy to add new commands or features

---

## 🌐 Access Points

Once running successfully:
- **Spring Boot API**: `http://localhost:8080`
- **Health Check**: `http://localhost:8080/health`
- **Database**: `localhost:5432` (PostgreSQL)

---

## 📝 What Was Fixed

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| **Java Version Error** | Codespace defaults to Java 11, project needs 17 | `run-tokis.sh` script with Java setup |
| **Compilation Failures** | Missing imports & dependencies in QueryController | Fixed imports and dependency injection |
| **Database Connection** | Docker services not running | Script checks and starts Docker |
| **Manual Steps** | Too many commands to remember | Single script handles everything |

---

## 💡 Pro Tips

1. **Always use `./run-tokis.sh start`** - it's the easiest way
2. **Check status** with `./run-tokis.sh status` if something seems wrong
3. **Stop cleanly** with `./run-tokis.sh stop` before restarting
4. **Java only** setup with `./run-tokis.sh java` for other Java tasks

The application **is now fully automated** - just run `./run-tokis.sh start` and you're good to go!

---

## Troubleshooting

### Error: "release version 17 not supported"
**Solution**: You likely skipped Step 1. Run `source ./setup-java17.sh` again and verify:
```bash
java -version
# Should show: openjdk version "17.0.18"
```

### Error: "Command not found: ./mvnw"
**Solution**: Make sure you're in the correct directory:
```bash
cd /workspaces/Tokis_V1/tokis/tokis
ls -l mvnw  # Should show it exists and is executable
```

### Application fails to start after compilation
Check the logs for database or service connectivity issues. See the main `README.md` for infrastructure setup (docker-compose).

---

## Permanent Fix (Optional)

To avoid running `setup-java17.sh` every time, add this to `~/.bashrc`:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.bashrc
```

Now Java 17 will be active in all new terminal sessions.

---

## Infrastructure Setup

Before running Spring Boot, ensure the backend services are running:

```bash
cd /workspaces/Tokis_V1
docker-compose up -d
```

This starts the database and other services. Spring Boot connects to these services via the configuration in `tokis/tokis/src/main/resources/application.yml`.

---

## Default Port

Once running successfully, the Spring Boot application is typically available at:
```
http://localhost:8080
```

Check the console output for the actual port if different.

---

## Files Modified

- `tokis/tokis/src/main/java/com/example/tokis/controller/QueryController.java` - Fixed imports and dependencies
- `setup-java17.sh` - New script to configure Java 17 environment
- `RUN_SPRINGBOOT.md` - This documentation
