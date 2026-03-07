package com.algoflow.backend;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class ExecutionController {

    private static final Logger log = LoggerFactory.getLogger(ExecutionController.class);
    private static final String RUNNER_PACKAGE = "com.algoflow.runner";
    private static final Pattern CLASS_NAME_PATTERN = Pattern.compile("public\\s+class\\s+(\\w+)");

    @PostMapping("/execute")
    public Map<String, Object> execute(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        log.info("Received execution request, code length: {}", code.length());
        
        try {
            Map<String, Object> result = executeJavaCode(code);
            log.info("Execution successful");
            return result;
        } catch (Exception e) {
            log.error("Execution failed: {}", e.getMessage(), e);
            return Map.of("error", e.getMessage());
        }
    }

    private Map<String, Object> executeJavaCode(String code) throws Exception {
        Path tempDir = Files.createTempDirectory("algo");
        String className = extractClassName(code);
        Path javaFile = tempDir.resolve(className + ".java");
        Path transformerJar = Paths.get("../../../packages/java/engine/target/algo-transformer-1.0-SNAPSHOT.jar").toAbsolutePath();
        
        log.debug("Temp directory: {}", tempDir);
        log.debug("Transformer JAR: {}", transformerJar);
        
        try {
            String normalizedCode = normalizeToRunnerPackage(code);
            Files.writeString(javaFile, normalizedCode);
            log.debug("Written code to: {}", javaFile);
            
            Process compile = new ProcessBuilder("javac",
                "-d", ".",
                "-cp", transformerJar.toString(),
                "-g",
                className + ".java")
                .directory(tempDir.toFile())
                .redirectErrorStream(true)
                .start();
            
            int compileExitCode = compile.waitFor();
            log.debug("Compilation exit code: {}", compileExitCode);
            
            if (compileExitCode != 0) {
                String compileError = new String(compile.getInputStream().readAllBytes());
                log.error("Compilation failed: {}", compileError);
                throw new RuntimeException("Compilation failed: " + compileError);
            }
            
            ProcessBuilder runBuilder = new ProcessBuilder("java",
                "-javaagent:" + transformerJar,
                "-cp", transformerJar + ":.",
                "--add-opens", "java.base/java.util=ALL-UNNAMED",
                RUNNER_PACKAGE + "." + className);
            runBuilder.directory(tempDir.toFile());
            runBuilder.environment().put("ALGORITHM_VISUALIZER", "true");
            
            log.debug("Starting Java process with command: {}", runBuilder.command());
            
            Process run = runBuilder.start();
            run.getOutputStream().close();
            int runExitCode = run.waitFor();
            
            String runOutput = new String(run.getInputStream().readAllBytes());
            if (log.isDebugEnabled()) {
                log.debug("Java process output:\n{}", runOutput);
            }
            
            log.debug("Java process exit code: {}", runExitCode);
            
            if (runExitCode != 0) {
                log.error("Java execution failed: {}", runOutput);
                throw new RuntimeException("Execution failed: " + runOutput);
            }
            
            Path jsonFile = tempDir.resolve("visualization.json");
            if (!Files.exists(jsonFile)) {
                log.error("visualization.json not found. Process output: {}", runOutput);
                throw new RuntimeException("visualization.json not generated. Output: " + runOutput);
            }
            
            String jsonContent = Files.readString(jsonFile);
            log.debug("Read visualization.json, size: {} bytes", jsonContent.length());
            if (log.isDebugEnabled()) {
                log.debug("visualization.json content:\n{}", jsonContent);
            }
            
            List<?> commands = new ObjectMapper().readValue(jsonContent, List.class);
            return Map.of("commands", commands, "code", normalizedCode);
        } finally {
            log.debug("Cleaning up temp directory: {}", tempDir);
            Files.walk(tempDir)
                .sorted(Comparator.reverseOrder())
                .forEach(path -> {
                    try { Files.delete(path); } catch (IOException ignored) {}
                });
        }
    }

    /**
     * Ensures the user-provided Java code is compiled as com.algoflow.runner.Main.
     * Any existing package declaration is stripped and replaced with the expected one.
     */
    private String extractClassName(String code) {
        Matcher m = CLASS_NAME_PATTERN.matcher(code);
        if (!m.find()) {
            throw new IllegalArgumentException("No public class found in code");
        }
        return m.group(1);
    }

    private String normalizeToRunnerPackage(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Code must not be empty");
        }

        // Remove any leading package declaration (first one only).
        // This regex matches: optional leading whitespace, 'package', anything up to ';', and trailing whitespace.
        String withoutUserPackage = code.replaceFirst("^\\s*package\\s+[^;]+;\\s*", "");

        StringBuilder sb = new StringBuilder();
        sb.append("package ").append(RUNNER_PACKAGE).append(";\n\n");
        sb.append(withoutUserPackage.strip()).append('\n');
        return sb.toString();
    }
}
