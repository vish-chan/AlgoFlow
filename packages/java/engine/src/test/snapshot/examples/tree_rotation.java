package com.algoflow.runner;

public class Main {

    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int x) { val = x; }
    }

    public static void main(String[] args) {
        Main demo = new Main();

        TreeNode root = new TreeNode(30);
        root.left = new TreeNode(20);
        root.left.left = new TreeNode(10);
        root.left.right = new TreeNode(25);

        root = demo.rotateRight(root);
    }

    public TreeNode rotateRight(TreeNode y) {
        TreeNode x = y.left;
        TreeNode T2 = x.right;

        x.right = y;
        y.left = T2;

        return x;
    }
}
