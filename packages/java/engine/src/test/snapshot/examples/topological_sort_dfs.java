package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph(directed = true)
    private int[][] adjMatrix = {
        {0, 1, 1, 0, 0, 0},
        {0, 0, 0, 1, 0, 0},
        {0, 0, 0, 1, 1, 0},
        {0, 0, 0, 0, 0, 1},
        {0, 0, 0, 0, 0, 1},
        {0, 0, 0, 0, 0, 0}
    };
    private boolean[] visited = new boolean[6];
    private Stack<Integer> stack = new Stack<>();

    public static void main(String[] args) {
        new Main().topoSort();
    }

    public void topoSort() {
        for (int i = 0; i < adjMatrix.length; i++)
            if (!visited[i]) dfs(i);
        while (!stack.isEmpty())
            System.out.print(stack.pop() + " ");
    }

    private void dfs(int node) {
        visited[node] = true;
        for (int i = 0; i < adjMatrix.length; i++)
            if (adjMatrix[node][i] == 1 && !visited[i]) dfs(i);
        stack.push(node);
    }
}
