package com.algoflow.runner;

import com.algoflow.annotation.Tree;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode(int val) { this.val = val; }
    }

    @Tree
    TreeNode root;

    public static void main(String[] args) {
        Main m = new Main();
        m.root = m.insert(m.root, 4);
        m.root = m.insert(m.root, 2);
        m.root = m.insert(m.root, 6);
        m.root = m.insert(m.root, 1);
        m.root = m.insert(m.root, 3);
        m.root = m.insert(m.root, 5);
        m.root = m.insert(m.root, 7);
        System.out.println("Found 3: " + m.search(m.root, 3));
        System.out.println("Found 8: " + m.search(m.root, 8));
    }

    public TreeNode insert(TreeNode node, int val) {
        if (node == null) return new TreeNode(val);
        if (val < node.val) node.left = insert(node.left, val);
        else if (val > node.val) node.right = insert(node.right, val);
        return node;
    }

    public boolean search(TreeNode node, int val) {
        if (node == null) return false;
        if (val == node.val) return true;
        return val < node.val ? search(node.left, val) : search(node.right, val);
    }
}
