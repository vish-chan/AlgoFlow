package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    // @Graph visualizes an adjacency matrix or Map<K, List<V>>
    @Graph
    private int[][] adjMatrix = {
        {0, 1, 1, 0, 0},
        {1, 0, 0, 1, 0},
        {1, 0, 0, 1, 1},
        {0, 1, 1, 0, 1},
        {0, 0, 1, 1, 0}
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}
