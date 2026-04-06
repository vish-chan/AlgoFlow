package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private int[][] adjMatrix = {
        {0, 1, 1, 0, 0, 0},
        {1, 0, 0, 1, 1, 0},
        {1, 0, 0, 0, 1, 0},
        {0, 1, 0, 0, 0, 1},
        {0, 1, 1, 0, 0, 1},
        {0, 0, 0, 1, 1, 0}
    };
    private boolean[] visited = new boolean[6];

    public static void main(String[] args) {
        new Main().dfs(0);
    }

    public void dfs(int node) {
        visited[node] = true;
        for (int neighbor = 0; neighbor < adjMatrix.length; neighbor++) {
            if (adjMatrix[node][neighbor] == 1 && !visited[neighbor]) {
                dfs(neighbor);
            }
        }
    }
}
