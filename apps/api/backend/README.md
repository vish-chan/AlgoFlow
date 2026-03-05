# Algo Backend

Spring Boot REST API for executing Java code with algo-transformer.

## Build

```bash
mvn clean package
```

## Run

```bash
mvn spring-boot:run
```

Server starts on http://localhost:8080

## API

**POST /execute**

Request:
```json
{
  "code": "public class Main { ... }"
}
```

Response:
```json
{
  "commands": [
    { "key": "arr", "method": "Array1DTracer", "args": ["Array"] },
    { "key": "arr", "method": "set", "args": [[1,2,3]] }
  ]
}
```

## TODO

Implement `executeJavaCode()` in `ExecutionController.java`:
1. Write code to temp file
2. Compile with `javac`
3. Run with `-javaagent:../algo-transformer/target/algo-transformer-1.0-SNAPSHOT.jar`
4. Capture JSON output from stdout
5. Parse and return
