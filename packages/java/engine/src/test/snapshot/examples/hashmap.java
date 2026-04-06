package com.algoflow.runner;

import java.util.HashMap;
import java.util.Map;

public class Main {
    private Map<String, Integer> map = new HashMap<>();

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        map.put("a", 1);
        map.put("b", 2);
        map.put("c", 3);
        map.get("b");
        map.put("a", 10);
        map.remove("c");
    }
}
