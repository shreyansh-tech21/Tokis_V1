# Running Spring Boot Application

## Summary of the Problem

Every time you open a new codespace terminal, Spring Boot fails because:
1. **Java Version**: The project requires Java 17, but codespace defaults to Java 11
2. **Compilation Errors**: Missing imports and incorrect method calls in `QueryController`

Both issues have been **fixed**. Follow the quick start below.

---

## Quick Start (Every Terminal Session)

### Step 1: Set up Java 17 environment
From the workspace root (`/workspaces/Tokis_V1`), run:

```bash
source ./setup-java17.sh
```

This sets the `JAVA_HOME` and `PATH` variables to use Java 17 for the current terminal session.

### Step 2: Navigate to the Spring Boot project
```bash
cd tokis/tokis
```

### Step 3: Run the Spring Boot application
```bash
./mvnw spring-boot:run
```

The application should now compile and start successfully.

---

## What Was Fixed

### 1. Java Version Mismatch (Persistent Issue)
- **Problem**: Codespace environment defaults to Java 11
- **Solution**: Created `setup-java17.sh` script to configure Java 17 paths
- **Note**: This must be done once per terminal session because the environment resets on new terminals

### 2. QueryController Compilation Errors
- **Missing imports**: Added imports for `QueryResponse`, `FileNode`, `FileRepository`, and `WorkerClient`
- **Missing dependencies**: Injected `FileRepository` and `WorkerClient` into the controller's constructor
- **Missing method fix**: Updated `/prompt` endpoint to use correct `workerClient.getSnippets()` method

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
