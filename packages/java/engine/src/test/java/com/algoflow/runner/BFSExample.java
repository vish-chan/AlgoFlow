package com.algoflow.runner;

import com.algoflow.annotation.Graph;

import java.util.*;

public class BFSExample {

    // 0 — 1 — 3 — 5
    // |   |       |
    // 2 — 4 ------
    @Graph
    int[][] adjMatrix = {
        {0, 1, 1, 0, 0, 0},
        {1, 0, 0, 1, 1, 0},
        {1, 0, 0, 0, 1, 0},
        {0, 1, 0, 0, 0, 1},
        {0, 1, 1, 0, 0, 1},
        {0, 0, 0, 1, 1, 0},
    };

    Queue<Integer> queue = new LinkedList<>();

    boolean[] visited = new boolean[adjMatrix.length];

    void bfs(int start) {

        visited[start] = true;
        queue.add(start);

        System.out.println("Starting BFS from node " + start);

        while (!queue.isEmpty()) {
            int current = queue.poll();
            System.out.println("Visiting node " + current);

            for (int neighbor = 0; neighbor < adjMatrix.length; neighbor++) {
                if (adjMatrix[current][neighbor] == 1 && !visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.add(neighbor);
                    System.out.println("  Discovered node " + neighbor);
                }
            }
        }

        System.out.println("BFS Complete!");
    }

    public static void main(String[] args) {
        new BFSExample().bfs(0);
    }
}
