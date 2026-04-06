package com.algoflow.runner;

public class Main {
    public static void main(String[] args) {
        new Main().hanoi(4, "A", "C", "B");
    }

    public void hanoi(int n, String from, String to, String aux) {
        if (n == 0) return;
        hanoi(n - 1, from, aux, to);
        System.out.println("Move disk " + n + " from " + from + " to " + to);
        hanoi(n - 1, aux, to, from);
    }
}
