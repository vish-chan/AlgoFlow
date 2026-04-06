package com.algoflow.runner;

import com.algoflow.annotation.Tree;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode(int val) { this.val = val; }
    }

    // @Tree visualizes a TreeNode field (must have val, left, right)
    @Tree
    TreeNode root;

    public static void main(String[] args) {
        Main m = new Main();
        m.root = new TreeNode(4);
        m.root.left = new TreeNode(2);
        m.root.right = new TreeNode(6);
        m.root.left.left = new TreeNode(1);
        m.root.left.right = new TreeNode(3);
        // TODO: your algorithm here
    }
}
