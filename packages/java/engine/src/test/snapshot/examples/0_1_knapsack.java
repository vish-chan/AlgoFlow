package com.algoflow.runner;

public class Main {
    private int[] weights = {2, 3, 4, 5};
    private int[] values = {3, 4, 5, 6};
    private int capacity = 8;

    public static void main(String[] args) {
        new Main().knapsack();
    }

    public int knapsack() {
        int n = weights.length;
        int[][] dp = new int[n + 1][capacity + 1];
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= capacity; w++) {
                dp[i][w] = dp[i - 1][w];
                if (weights[i - 1] <= w)
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
            }
        }
        return dp[n][capacity];
    }
}
