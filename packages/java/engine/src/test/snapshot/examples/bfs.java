package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private Map<Integer, List<Integer>> graph = new HashMap<>();

    public static void main(String[] args) {
        Main m = new Main();
        m.graph.put(0, Arrays.asList(1, 2));
        m.graph.put(1, Arrays.asList(0, 3, 4));
        m.graph.put(2, Arrays.asList(0, 4));
        m.graph.put(3, Arrays.asList(1, 5));
        m.graph.put(4, Arrays.asList(1, 2, 5));
        m.graph.put(5, Arrays.asList(3, 4));
        m.bfs(0);
    }

    public void bfs(int start) {
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        visited.add(start);
        queue.add(start);
        while (!queue.isEmpty()) {
            int current = queue.poll();
            for (int neighbor : graph.get(current)) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }
    }
}
