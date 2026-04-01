export interface Problem {
    id: number;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
    description: string;
    examples: string[];
    starterCode: string;
}

export const PROBLEMS: Problem[] = [
    // Arrays
    {
        id: 1, title: "Two Sum", difficulty: "Easy", category: "Arrays",
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume each input has exactly one solution, and you may not use the same element twice.",
        examples: ["Input: nums = [2,7,11,15], target = 9 → Output: [0,1]", "Input: nums = [3,2,4], target = 6 → Output: [1,2]"],
        starterCode: `package com.algoflow.runner;

import java.util.*;

public class Main {
    private int[] nums = {2, 7, 11, 15};

    public static void main(String[] args) {
        Main m = new Main();
        int[] result = m.twoSum(m.nums, 9);
        System.out.println(Arrays.toString(result));
    }

    public int[] twoSum(int[] nums, int target) {
        // TODO: implement
        return new int[]{};
    }
}`,
    },
    {
        id: 2, title: "Best Time to Buy and Sell Stock", difficulty: "Easy", category: "Arrays",
        description: "Given an array `prices` where `prices[i]` is the price of a stock on the ith day, find the maximum profit from one buy and one sell. If no profit is possible, return 0.",
        examples: ["Input: prices = [7,1,5,3,6,4] → Output: 5", "Input: prices = [7,6,4,3,1] → Output: 0"],
        starterCode: `package com.algoflow.runner;

public class Main {
    private int[] prices = {7, 1, 5, 3, 6, 4};

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.maxProfit(m.prices));
    }

    public int maxProfit(int[] prices) {
        // TODO: implement
        return 0;
    }
}`,
    },
    {
        id: 3, title: "Contains Duplicate", difficulty: "Easy", category: "Arrays",
        description: "Given an integer array `nums`, return `true` if any value appears at least twice, and `false` if every element is distinct.",
        examples: ["Input: nums = [1,2,3,1] → Output: true", "Input: nums = [1,2,3,4] → Output: false"],
        starterCode: `package com.algoflow.runner;

import java.util.*;

public class Main {
    private int[] nums = {1, 2, 3, 1};

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.containsDuplicate(m.nums));
    }

    public boolean containsDuplicate(int[] nums) {
        // TODO: implement
        return false;
    }
}`,
    },
    {
        id: 4, title: "Maximum Subarray", difficulty: "Medium", category: "Arrays",
        description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
        examples: ["Input: nums = [-2,1,-3,4,-1,2,1,-5,4] → Output: 6", "Input: nums = [1] → Output: 1"],
        starterCode: `package com.algoflow.runner;

public class Main {
    private int[] nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.maxSubArray(m.nums));
    }

    public int maxSubArray(int[] nums) {
        // TODO: implement
        return 0;
    }
}`,
    },
    {
        id: 5, title: "Product of Array Except Self", difficulty: "Medium", category: "Arrays",
        description: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all elements of `nums` except `nums[i]`. You must solve it in O(n) time without using division.",
        examples: ["Input: nums = [1,2,3,4] → Output: [24,12,8,6]", "Input: nums = [-1,1,0,-3,3] → Output: [0,0,9,0,0]"],
        starterCode: `package com.algoflow.runner;

import java.util.*;

public class Main {
    private int[] nums = {1, 2, 3, 4};

    public static void main(String[] args) {
        Main m = new Main();
        int[] result = m.productExceptSelf(m.nums);
        System.out.println(Arrays.toString(result));
    }

    public int[] productExceptSelf(int[] nums) {
        // TODO: implement
        return new int[nums.length];
    }
}`,
    },
    // Binary Search
    {
        id: 6, title: "Search in Rotated Sorted Array", difficulty: "Medium", category: "Binary Search",
        description: "Given a rotated sorted array `nums` and a `target`, return the index of `target` or -1 if not found. You must write an algorithm with O(log n) runtime.",
        examples: ["Input: nums = [4,5,6,7,0,1,2], target = 0 → Output: 4", "Input: nums = [4,5,6,7,0,1,2], target = 3 → Output: -1"],
        starterCode: `package com.algoflow.runner;

public class Main {
    private int[] nums = {4, 5, 6, 7, 0, 1, 2};

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.search(m.nums, 0));
    }

    public int search(int[] nums, int target) {
        // TODO: implement
        return -1;
    }
}`,
    },
    // Trees
    {
        id: 7, title: "Invert Binary Tree", difficulty: "Easy", category: "Trees",
        description: "Given the root of a binary tree, invert the tree (mirror it), and return its root.",
        examples: ["Input: root = [4,2,7,1,3,6,9] → Output: [4,7,2,9,6,3,1]"],
        starterCode: `package com.algoflow.runner;

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
        m.root = new TreeNode(4);
        m.root.left = new TreeNode(2);
        m.root.right = new TreeNode(7);
        m.root.left.left = new TreeNode(1);
        m.root.left.right = new TreeNode(3);
        m.root.right.left = new TreeNode(6);
        m.root.right.right = new TreeNode(9);
        m.root = m.invertTree(m.root);
    }

    public TreeNode invertTree(TreeNode root) {
        // TODO: implement
        return root;
    }
}`,
    },
    {
        id: 8, title: "Maximum Depth of Binary Tree", difficulty: "Easy", category: "Trees",
        description: "Given the root of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
        examples: ["Input: root = [3,9,20,null,null,15,7] → Output: 3"],
        starterCode: `package com.algoflow.runner;

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
        m.root = new TreeNode(3);
        m.root.left = new TreeNode(9);
        m.root.right = new TreeNode(20);
        m.root.right.left = new TreeNode(15);
        m.root.right.right = new TreeNode(7);
        System.out.println(m.maxDepth(m.root));
    }

    public int maxDepth(TreeNode root) {
        // TODO: implement
        return 0;
    }
}`,
    },
    {
        id: 9, title: "Validate Binary Search Tree", difficulty: "Medium", category: "Trees",
        description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST has left subtree values strictly less than the node, and right subtree values strictly greater.",
        examples: ["Input: root = [2,1,3] → Output: true", "Input: root = [5,1,4,null,null,3,6] → Output: false"],
        starterCode: `package com.algoflow.runner;

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
        m.root = new TreeNode(5);
        m.root.left = new TreeNode(1);
        m.root.right = new TreeNode(4);
        m.root.right.left = new TreeNode(3);
        m.root.right.right = new TreeNode(6);
        System.out.println(m.isValidBST(m.root));
    }

    public boolean isValidBST(TreeNode root) {
        // TODO: implement
        return false;
    }
}`,
    },
    {
        id: 10, title: "Lowest Common Ancestor of BST", difficulty: "Medium", category: "Trees",
        description: "Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given nodes p and q. The LCA is the lowest node that has both p and q as descendants.",
        examples: ["Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8 → Output: 6"],
        starterCode: `package com.algoflow.runner;

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
        m.root = new TreeNode(6);
        m.root.left = new TreeNode(2);
        m.root.right = new TreeNode(8);
        m.root.left.left = new TreeNode(0);
        m.root.left.right = new TreeNode(4);
        m.root.right.left = new TreeNode(7);
        m.root.right.right = new TreeNode(9);
        m.root.left.right.left = new TreeNode(3);
        m.root.left.right.right = new TreeNode(5);
        TreeNode lca = m.lowestCommonAncestor(m.root, m.root.left, m.root.right);
        System.out.println(lca != null ? lca.val : "null");
    }

    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // TODO: implement
        return null;
    }
}`,
    },
    // Graphs
    {
        id: 11, title: "Number of Islands", difficulty: "Medium", category: "Graphs",
        description: "Given an m x n 2D grid of '1's (land) and '0's (water), count the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
        examples: ["Input: grid = [[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]] → Output: 3"],
        starterCode: `package com.algoflow.runner;

public class Main {
    private int[][] grid = {
        {1, 1, 0, 0, 0},
        {1, 1, 0, 0, 0},
        {0, 0, 1, 0, 0},
        {0, 0, 0, 1, 1}
    };

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.numIslands(m.grid));
    }

    public int numIslands(int[][] grid) {
        // TODO: implement
        return 0;
    }
}`,
    },
    {
        id: 12, title: "Clone Graph", difficulty: "Medium", category: "Graphs",
        description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node contains a value and a list of its neighbors.",
        examples: ["Input: adjList = [[2,4],[1,3],[2,4],[1,3]] → Output: [[2,4],[1,3],[2,4],[1,3]]"],
        starterCode: `package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private int[][] adjMatrix = {
        {0, 1, 0, 1},
        {1, 0, 1, 0},
        {0, 1, 0, 1},
        {1, 0, 1, 0}
    };

    public static void main(String[] args) {
        Main m = new Main();
        m.solve();
    }

    public void solve() {
        // TODO: implement graph clone using BFS/DFS
        // The adjacency matrix above represents the graph
        boolean[] visited = new boolean[adjMatrix.length];
        dfs(0, visited);
    }

    private void dfs(int node, boolean[] visited) {
        visited[node] = true;
        for (int i = 0; i < adjMatrix.length; i++) {
            if (adjMatrix[node][i] == 1 && !visited[i]) {
                dfs(i, visited);
            }
        }
    }
}`,
    },
    // Dynamic Programming
    {
        id: 13, title: "Climbing Stairs", difficulty: "Easy", category: "Dynamic Programming",
        description: "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
        examples: ["Input: n = 2 → Output: 2", "Input: n = 3 → Output: 3"],
        starterCode: `package com.algoflow.runner;

public class Main {
    private int[] dp;

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.climbStairs(5));
    }

    public int climbStairs(int n) {
        dp = new int[n + 1];
        // TODO: implement
        return 0;
    }
}`,
    },
    {
        id: 14, title: "Coin Change", difficulty: "Medium", category: "Dynamic Programming",
        description: "Given an array of coin denominations and a total `amount`, return the fewest number of coins needed to make up that amount. If it cannot be made up, return -1.",
        examples: ["Input: coins = [1,5,11], amount = 11 → Output: 1", "Input: coins = [2], amount = 3 → Output: -1"],
        starterCode: `package com.algoflow.runner;

import java.util.*;

public class Main {
    private int[] coins = {1, 5, 11};
    private int[] dp;

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.coinChange(m.coins, 15));
    }

    public int coinChange(int[] coins, int amount) {
        dp = new int[amount + 1];
        // TODO: implement
        return -1;
    }
}`,
    },
    {
        id: 15, title: "Longest Increasing Subsequence", difficulty: "Medium", category: "Dynamic Programming",
        description: "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
        examples: ["Input: nums = [10,9,2,5,3,7,101,18] → Output: 4", "Input: nums = [0,1,0,3,2,3] → Output: 4"],
        starterCode: `package com.algoflow.runner;

public class Main {
    private int[] nums = {10, 9, 2, 5, 3, 7, 101, 18};
    private int[] dp;

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.lengthOfLIS(m.nums));
    }

    public int lengthOfLIS(int[] nums) {
        dp = new int[nums.length];
        // TODO: implement
        return 0;
    }
}`,
    },
    // Sorting
    {
        id: 16, title: "Merge Intervals", difficulty: "Medium", category: "Arrays",
        description: "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals and return an array of the non-overlapping intervals.",
        examples: ["Input: intervals = [[1,3],[2,6],[8,10],[15,18]] → Output: [[1,6],[8,10],[15,18]]"],
        starterCode: `package com.algoflow.runner;

import java.util.*;

public class Main {
    private int[][] intervals = {{1,3},{2,6},{8,10},{15,18}};

    public static void main(String[] args) {
        Main m = new Main();
        int[][] result = m.merge(m.intervals);
        for (int[] r : result) System.out.println(Arrays.toString(r));
    }

    public int[][] merge(int[][] intervals) {
        // TODO: implement
        return new int[][]{};
    }
}`,
    },
];

export const PROBLEM_CATEGORIES = [...new Set(PROBLEMS.map(p => p.category))];
