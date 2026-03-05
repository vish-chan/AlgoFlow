# Spring Boot Reference Guide

## **What is Spring Boot?**

A framework that makes building Java web applications **easy** by:
- Auto-configuring everything (web server, JSON, database)
- Eliminating boilerplate code
- Providing production-ready features out-of-the-box

## **Core Concepts**

### 1. **Dependency Injection (DI) / Inversion of Control (IoC)**

**Traditional way:**
```java
class UserService {
    private Database db = new Database(); // You create it
}
```

**Spring way:**
```java
@Service
class UserService {
    @Autowired
    private Database db; // Spring creates and injects it
}
```

Spring manages object lifecycle - you just declare what you need.

### 2. **Annotations = Configuration**

Instead of XML files, use annotations:

```java
@RestController  // "This is a REST API controller"
@Service         // "This is a business logic service"
@Repository      // "This is a database access layer"
@Component       // "This is a Spring-managed bean"
```

### 3. **Component Scanning**

Spring automatically finds classes with annotations:
```
src/main/java/com/algoflow/backend/
├── AlgoBackendApplication.java  ← @SpringBootApplication (scans this package)
└── ExecutionController.java     ← @RestController (found automatically)
```

## **REST Controller Example**

### **@RestController**
```java
@RestController
public class ExecutionController {
```

Tells Spring:
1. Create an instance of this class
2. Register it as a REST API handler
3. Automatically convert return values to JSON

**What Spring does behind the scenes:**
```java
// Spring creates this for you:
ExecutionController controller = new ExecutionController();

// Registers HTTP routes
server.addRoute("POST", "/execute", controller::execute);

// Wraps responses in JSON converter
response = jsonConverter.toJson(controller.execute(request));
```

### **@PostMapping("/execute")**
```java
@PostMapping("/execute")
public Map<String, Object> execute(@RequestBody Map<String, String> request) {
```

Maps HTTP POST to this method:
- **URL:** `http://localhost:8080/execute`
- **Method:** POST
- **@RequestBody:** Deserializes JSON → Java object

**HTTP Request:**
```http
POST /execute HTTP/1.1
Content-Type: application/json

{"code": "public class Main { ... }"}
```

**Spring converts to:**
```java
Map<String, String> request = Map.of("code", "public class Main { ... }");
execute(request); // Calls your method
```

### **@CrossOrigin**
```java
@CrossOrigin(origins = "http://localhost:5173")
```

Allows frontend (React on port 5173) to call backend (port 8080).

**Without this:**
```
Browser: ❌ Blocked by CORS policy
```

**With this:**
```
Browser: ✅ Allowed
```

### **Automatic JSON Conversion**
```java
return Map.of("commands", commands);
```

Spring automatically converts to JSON:
```json
{
  "commands": [
    {"key": "arr", "method": "Array1DTracer", "args": ["Sample"]}
  ]
}
```

Uses **Jackson** library (included by default).

## **Spring Boot Project Structure**

```
algo-backend/
├── src/main/java/com/algoflow/backend/
│   ├── AlgoBackendApplication.java    ← Main entry point
│   └── ExecutionController.java       ← Your REST API
├── src/main/resources/
│   └── application.properties         ← Configuration (port, etc.)
├── pom.xml                            ← Dependencies
└── target/                            ← Compiled code
```

### **Main Application Class**
```java
@SpringBootApplication
public class AlgoBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(AlgoBackendApplication.class, args);
    }
}
```

**@SpringBootApplication** = 3 annotations combined:
1. **@Configuration** - This is a config class
2. **@EnableAutoConfiguration** - Auto-configure based on dependencies
3. **@ComponentScan** - Find all @RestController, @Service, etc.

## **How Spring Boot Starts**

```
1. Run main() method
2. Scan for @Component, @RestController, @Service
3. Create instances (dependency injection)
4. Auto-configure embedded Tomcat server
5. Register HTTP routes from @GetMapping/@PostMapping
6. Start server on port 8080
7. Ready to handle requests!
```

## **Key Spring Boot Features**

### **1. Embedded Web Server**
No need to install Tomcat - it's included:
```bash
mvn spring-boot:run  # Starts Tomcat automatically
```

### **2. Auto-Configuration**
Add dependency → Spring configures it:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```
Automatically includes:
- Tomcat server
- Jackson (JSON)
- Spring MVC (REST APIs)

### **3. application.properties**
```properties
server.port=8080
spring.application.name=algo-backend
```

### **4. Starter Dependencies**
Pre-packaged dependency bundles:
- `spring-boot-starter-web` - REST APIs
- `spring-boot-starter-data-jpa` - Database
- `spring-boot-starter-security` - Authentication

## **Common Annotations Summary**

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@RestController` | REST API handler | Your controller |
| `@Service` | Business logic | UserService |
| `@Repository` | Database access | UserRepository |
| `@Component` | Generic Spring bean | EmailSender |
| `@Autowired` | Inject dependency | `@Autowired UserService` |
| `@GetMapping` | HTTP GET | `@GetMapping("/users")` |
| `@PostMapping` | HTTP POST | `@PostMapping("/execute")` |
| `@RequestBody` | Parse JSON body | `@RequestBody User user` |
| `@PathVariable` | URL parameter | `/users/{id}` |
| `@RequestParam` | Query parameter | `/search?q=java` |

## **Request Mapping Examples**

### **GET Request**
```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userService.findById(id);
}
```

**HTTP:** `GET /users/123` → `getUser(123)`

### **POST Request**
```java
@PostMapping("/users")
public User createUser(@RequestBody User user) {
    return userService.save(user);
}
```

**HTTP:** `POST /users` with JSON body → `createUser(user)`

### **Query Parameters**
```java
@GetMapping("/search")
public List<User> search(@RequestParam String query) {
    return userService.search(query);
}
```

**HTTP:** `GET /search?query=john` → `search("john")`

## **Application Flow Example**

```
1. Frontend sends POST to /execute with JSON
   ↓
2. Spring receives request
   ↓
3. @PostMapping routes to execute() method
   ↓
4. @RequestBody converts JSON to Map
   ↓
5. Your code runs (compile, execute Java)
   ↓
6. Return Map<String, Object>
   ↓
7. Spring converts to JSON
   ↓
8. Frontend receives JSON response
```

## **Dependency Injection Example**

```java
@RestController
public class UserController {
    
    @Autowired  // Spring injects this
    private UserService userService;
    
    @GetMapping("/users")
    public List<User> getUsers() {
        return userService.findAll();
    }
}

@Service
public class UserService {
    
    @Autowired  // Spring injects this
    private UserRepository userRepository;
    
    public List<User> findAll() {
        return userRepository.findAll();
    }
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Spring Data JPA provides implementation
}
```

**Spring creates and wires everything:**
```
UserRepository (created by Spring Data)
    ↓ injected into
UserService (created by Spring)
    ↓ injected into
UserController (created by Spring)
```

## **Exception Handling**

### **Method-level**
```java
@PostMapping("/execute")
public Map<String, Object> execute(@RequestBody Map<String, String> request) {
    try {
        List<?> commands = executeJavaCode(code);
        return Map.of("commands", commands);
    } catch (Exception e) {
        return Map.of("error", e.getMessage());
    }
}
```

### **Global Exception Handler**
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGeneral(Exception e) {
        return ResponseEntity.status(500).body("Internal error");
    }
}
```

## **Configuration Properties**

### **application.properties**
```properties
# Server
server.port=8080
server.servlet.context-path=/api

# Logging
logging.level.root=INFO
logging.level.com.algoflow=DEBUG

# Custom properties
app.temp-dir=/tmp/algo
app.max-execution-time=30
```

### **Using Properties in Code**
```java
@Component
public class AppConfig {
    
    @Value("${app.temp-dir}")
    private String tempDir;
    
    @Value("${app.max-execution-time}")
    private int maxExecutionTime;
}
```

## **Testing**

### **Unit Test**
```java
@SpringBootTest
class ExecutionControllerTest {
    
    @Autowired
    private ExecutionController controller;
    
    @Test
    void testExecute() {
        Map<String, String> request = Map.of("code", "public class Main {}");
        Map<String, Object> response = controller.execute(request);
        assertNotNull(response.get("commands"));
    }
}
```

### **Integration Test with MockMvc**
```java
@SpringBootTest
@AutoConfigureMockMvc
class ExecutionControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void testExecuteEndpoint() throws Exception {
        mockMvc.perform(post("/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\": \"public class Main {}\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.commands").exists());
    }
}
```

## **Why Spring Boot is Popular**

✅ **Convention over configuration** - sensible defaults
✅ **Rapid development** - less boilerplate
✅ **Production-ready** - metrics, health checks built-in
✅ **Microservices friendly** - easy to deploy
✅ **Large ecosystem** - integrations for everything

## **Next Steps to Learn**

1. **Dependency Injection** - `@Autowired`, `@Service`
2. **Exception Handling** - `@ExceptionHandler`, `@ControllerAdvice`
3. **Validation** - `@Valid`, `@NotNull`
4. **Database** - Spring Data JPA
5. **Testing** - `@SpringBootTest`, MockMvc
6. **Security** - Spring Security
7. **Actuator** - Health checks, metrics

## **Useful Resources**

- Official Docs: https://spring.io/projects/spring-boot
- Guides: https://spring.io/guides
- Reference: https://docs.spring.io/spring-boot/docs/current/reference/html/
