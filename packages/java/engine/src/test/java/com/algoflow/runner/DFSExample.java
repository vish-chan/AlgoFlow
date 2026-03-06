package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class DFSExample {

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

    void dfs(int start) {
        boolean[] visited = new boolean[adjMatrix.length];
        System.out.println("Starting DFS from node " + start);
        dfsVisit(start, visited);
        System.out.println("DFS Complete!");
    }

    void dfsVisit(int node, boolean[] visited) {
        visited[node] = true;
        System.out.println("Visiting node " + node);

        for (int neighbor = 0; neighbor < adjMatrix.length; neighbor++) {
            if (adjMatrix[node][neighbor] == 1 && !visited[neighbor]) {
                System.out.println("  Exploring edge " + node + " -> " + neighbor);
                dfsVisit(neighbor, visited);
            }
        }
    }

    public static void main(String[] args) {
        new DFSExample().dfs(0);
    }
}
