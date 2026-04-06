package com.algoflow.runner;

import java.util.*;

public class Main {
    private Map<Integer, Long> memo = new HashMap<>();

    public static void main(String[] args) {
        new Main().fib(10);
    }

    public long fib(int n) {
        if (n <= 1) return n;
        if (memo.containsKey(n)) return memo.get(n);
        long result = fib(n - 1) + fib(n - 2);
        memo.put(n, result);
        return result;
    }
}
