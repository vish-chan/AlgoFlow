package com.algoflow.runner;

import com.algoflow.annotation.Tree;
import java.util.*;

public class Main {

    // Static fields — "Static Fields" panel
    static int MAX_SIZE = 10;
    static String LABEL = "demo";

    // Instance fields — per-instance "Main@<hash>" panel
    int[] arr = {5, 3, 8, 1};
    List<Integer> list = new ArrayList<>(Arrays.asList(10, 20, 30));
    Map<String, Integer> scores = new HashMap<>();
    @Tree TreeNode root;

    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int v) { val = v; }
    }

    public static void main(String[] args) {
        Main demo = new Main();
        demo.run();
    }

    void run() {
        arr[0] = 99;

        list.add(40);

        scores.put("alice", 95);
        scores.put("bob", 87);

        root = new TreeNode(10);
        root.left = new TreeNode(5);
        root.right = new TreeNode(15);

        int[] localArr = {1, 2, 3};
        List<String> localList = new ArrayList<>(Arrays.asList("a", "b"));

        localArr[0] = 100;
        localList.add("c");

        int result = sum(arr, 0);
        System.out.println("Sum: " + result);
    }

    int sum(int[] data, int idx) {
        if (idx >= data.length) return 0;
        return data[idx] + sum(data, idx + 1);
    }
}
