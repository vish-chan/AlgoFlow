package com.algoflow.backend;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import jakarta.annotation.PostConstruct;

@Service
public class ProblemService {

    private static final Logger log = LoggerFactory.getLogger(ProblemService.class);
    private final Map<Integer, ProblemData> problems = new LinkedHashMap<>();

    public record ProblemData(
        int id, String title, String difficulty, String category,
        String description, List<String> examples, String leetcodeUrl,
        String starterCode
    ) {}

    @PostConstruct
    public void loadProblems() {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] yamlResources = resolver.getResources("classpath:problems/*/problem.yaml");

            for (Resource yamlRes : yamlResources) {
                try {
                    String yamlContent = new String(yamlRes.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                    Map<String, Object> map = new Yaml().load(yamlContent);

                    String basePath = yamlRes.getURI().toString();
                    basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
                    String starterCode = loadSibling(resolver, basePath, "starter.java");

                    int id = (int) map.get("id");
                    @SuppressWarnings("unchecked")
                    List<String> examples = (List<String>) map.getOrDefault("examples", List.of());

                    problems.put(id, new ProblemData(
                        id,
                        (String) map.get("title"),
                        (String) map.get("difficulty"),
                        (String) map.get("category"),
                        ((String) map.get("description")).trim(),
                        examples,
                        (String) map.get("leetcodeUrl"),
                        starterCode
                    ));
                    log.info("Loaded problem {}: {}", id, map.get("title"));
                } catch (Exception e) {
                    log.error("Failed to load problem from {}: {}", yamlRes.getFilename(), e.getMessage());
                }
            }
            log.info("Loaded {} problems total", problems.size());
        } catch (IOException e) {
            log.error("Failed to scan problem resources: {}", e.getMessage());
        }
    }

    private String loadSibling(PathMatchingResourcePatternResolver resolver, String basePath, String filename) {
        try {
            Resource res = resolver.getResource(basePath + filename);
            if (res.exists()) return new String(res.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.warn("Could not load {}: {}", filename, e.getMessage());
        }
        return "";
    }

    public List<ProblemData> getAllProblems() {
        return new ArrayList<>(problems.values());
    }
}
