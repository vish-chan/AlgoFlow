package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    // Use directed/weighted options: @Graph(directed = true, weighted = true)
    @Graph(directed = true, weighted = true)
    private int[][] adjMatrix = {
        {0, 4, 0, 0},
        {0, 0, 3, 0},
        {0, 0, 0, 2},
        {0, 0, 0, 0}
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}
