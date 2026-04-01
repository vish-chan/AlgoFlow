package com.algoflow.backend;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/problems")
public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @GetMapping
    public List<Map<String, Object>> listProblems() {
        return problemService.getAllProblems().stream().map(p -> Map.<String, Object>of(
            "id", p.id(),
            "title", p.title(),
            "difficulty", p.difficulty(),
            "category", p.category(),
            "description", p.description(),
            "examples", p.examples(),
            "leetcodeUrl", p.leetcodeUrl(),
            "starterCode", p.starterCode()
        )).toList();
    }
}
