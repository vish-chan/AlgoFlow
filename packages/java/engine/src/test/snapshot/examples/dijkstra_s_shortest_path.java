package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph(directed = true, weighted = true)
    private int[][] adjMatrix = {
        {0, 4, 2, 0, 0, 0},
        {0, 0, 8, 0, 0, 0},
        {0, 0, 0, 7, 0, 2},
        {0, 0, 0, 0, 9, 0},
        {0, 0, 0, 0, 0, 10},
        {0, 0, 0, 0, 3, 0}
    };

    public static void main(String[] args) {
        new Main().dijkstra(0);
    }

    public void dijkstra(int src) {
        int n = adjMatrix.length;
        int[] dist = new int[n];
        boolean[] visited = new boolean[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        for (int i = 0; i < n; i++) {
            int u = -1;
            for (int v = 0; v < n; v++)
                if (!visited[v] && (u == -1 || dist[v] < dist[u])) u = v;
            visited[u] = true;
            for (int v = 0; v < n; v++) {
                if (adjMatrix[u][v] > 0 && dist[u] + adjMatrix[u][v] < dist[v]) {
                    dist[v] = dist[u] + adjMatrix[u][v];
                }
            }
        }
    }
}
