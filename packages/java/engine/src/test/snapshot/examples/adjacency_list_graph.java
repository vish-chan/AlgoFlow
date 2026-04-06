package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    // @Graph also supports Map<K, List<V>> as adjacency list
    @Graph
    private Map<Integer, List<Integer>> graph = new HashMap<>();

    public static void main(String[] args) {
        Main m = new Main();
        m.graph.put(0, Arrays.asList(1, 2));
        m.graph.put(1, Arrays.asList(0, 3));
        m.graph.put(2, Arrays.asList(0, 3, 4));
        m.graph.put(3, Arrays.asList(1, 2, 4));
        m.graph.put(4, Arrays.asList(2, 3));
        m.solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}
