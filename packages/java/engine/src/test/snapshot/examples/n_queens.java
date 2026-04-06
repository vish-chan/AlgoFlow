package com.algoflow.runner;

public class Main {
    private int n = 6;
    private int[] queens = new int[6];

    public static void main(String[] args) {
        new Main().solve(0);
    }

    public boolean solve(int row) {
        if (row == n) return true;
        for (int col = 0; col < n; col++) {
            if (isSafe(row, col)) {
                queens[row] = col;
                if (solve(row + 1)) return true;
                queens[row] = -1;
            }
        }
        return false;
    }

    private boolean isSafe(int row, int col) {
        for (int r = 0; r < row; r++) {
            if (queens[r] == col || Math.abs(queens[r] - col) == row - r)
                return false;
        }
        return true;
    }
}
