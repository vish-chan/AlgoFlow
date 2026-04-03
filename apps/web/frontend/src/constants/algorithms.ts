export const DEFAULT_JAVA_CODE = `// Common data structures are visualized automatically
// when you hit Run.
public class Solution {

    public static void main(String[] args) {
        new Solution().solve();
    }

    void solve() {
        // Write your code here
    }
}
`;

export const DEFAULT_PYTHON_CODE = `# Common data structures are visualized automatically
# when you hit Run.

arr = [5, 3, 8, 1, 9, 2, 7]

# Write your algorithm here
`;

export interface Algorithm {
    name: string;
    category: string;
    code: string;
}

export interface Template {
    name: string;
    category: string;
    description: string;
    code: string;
}

export const ALGORITHMS: Algorithm[] = [
    // Sorting
    {
        name: "Bubble Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().bubbleSort();
    }

    public void bubbleSort() {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
}`,
    },
    {
        name: "Selection Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().selectionSort();
    }

    public void selectionSort() {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            int temp = arr[minIdx];
            arr[minIdx] = arr[i];
            arr[i] = temp;
        }
    }
}`,
    },
    {
        name: "Insertion Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().insertionSort();
    }

    public void insertionSort() {
        int n = arr.length;
        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
    }
}`,
    },
    {
        name: "Quick Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().quickSort();
    }

    public void quickSort() {
        qs(0, arr.length - 1);
    }

    private void qs(int lo, int hi) {
        if (lo < hi) {
            int p = partition(lo, hi);
            qs(lo, p - 1);
            qs(p + 1, hi);
        }
    }

    private int partition(int lo, int hi) {
        int pivot = arr[lo];
        int i = lo + 1, j = hi;
        while (true) {
            while (i <= j && arr[i] <= pivot) i++;
            while (i <= j && arr[j] > pivot) j--;
            if (i >= j) break;
            int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        int tmp = arr[lo]; arr[lo] = arr[j]; arr[j] = tmp;
        return j;
    }
}`,
    },
    {
        name: "Merge Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};
    private int[] temp = new int[7];

    public static void main(String[] args) {
        new Main().mergeSort();
    }

    public void mergeSort() {
        mergeSortHelper(0, arr.length - 1);
    }

    private void mergeSortHelper(int start, int end) {
        if (start >= end) return;
        int mid = (start + end) / 2;
        mergeSortHelper(start, mid);
        mergeSortHelper(mid + 1, end);
        merge(start, mid, end);
    }

    private void merge(int start, int mid, int end) {
        int i = start, j = mid + 1, k = start;
        while (i <= mid && j <= end) {
            if (arr[i] <= arr[j]) temp[k++] = arr[i++];
            else temp[k++] = arr[j++];
        }
        while (i <= mid) temp[k++] = arr[i++];
        while (j <= end) temp[k++] = arr[j++];
        for (i = start; i <= end; i++) arr[i] = temp[i];
    }
}`,
    },
    {
        name: "Bubble Sort (Bar Chart)",
        category: "Sorting",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Chart;

public class Main {
    @Chart
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().bubbleSort();
    }

    public void bubbleSort() {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
}`,
    },
    {
        name: "Selection Sort (Bar Chart)",
        category: "Sorting",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Chart;

public class Main {
    @Chart
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().selectionSort();
    }

    public void selectionSort() {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            int temp = arr[minIdx];
            arr[minIdx] = arr[i];
            arr[i] = temp;
        }
    }
}`,
    },
    // Searching
    {
        name: "Binary Search",
        category: "Searching",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {1, 3, 5, 7, 9, 11, 13, 15, 17};

    public static void main(String[] args) {
        new Main().binarySearch(7);
    }

    public int binarySearch(int target) {
        int lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}`,
    },
    {
        name: "Linear Search",
        category: "Searching",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().linearSearch(9);
    }

    public int linearSearch(int target) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) return i;
        }
        return -1;
    }
}`,
    },
    // Graphs
    {
        name: "BFS",
        category: "Graphs",
        code: `package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private Map<Integer, List<Integer>> graph = new HashMap<>();

    public static void main(String[] args) {
        Main m = new Main();
        m.graph.put(0, Arrays.asList(1, 2));
        m.graph.put(1, Arrays.asList(0, 3, 4));
        m.graph.put(2, Arrays.asList(0, 4));
        m.graph.put(3, Arrays.asList(1, 5));
        m.graph.put(4, Arrays.asList(1, 2, 5));
        m.graph.put(5, Arrays.asList(3, 4));
        m.bfs(0);
    }

    public void bfs(int start) {
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        visited.add(start);
        queue.add(start);
        while (!queue.isEmpty()) {
            int current = queue.poll();
            for (int neighbor : graph.get(current)) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }
    }
}`,
    },
    {
        name: "DFS",
        category: "Graphs",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private int[][] adjMatrix = {
        {0, 1, 1, 0, 0, 0},
        {1, 0, 0, 1, 1, 0},
        {1, 0, 0, 0, 1, 0},
        {0, 1, 0, 0, 0, 1},
        {0, 1, 1, 0, 0, 1},
        {0, 0, 0, 1, 1, 0}
    };
    private boolean[] visited = new boolean[6];

    public static void main(String[] args) {
        new Main().dfs(0);
    }

    public void dfs(int node) {
        visited[node] = true;
        for (int neighbor = 0; neighbor < adjMatrix.length; neighbor++) {
            if (adjMatrix[node][neighbor] == 1 && !visited[neighbor]) {
                dfs(neighbor);
            }
        }
    }
}`,
    },
    // Trees
    {
        name: "BST Inorder Traversal",
        category: "Trees",
        code: `package com.algoflow.runner;

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
        m.root.right = new TreeNode(6);
        m.root.left.left = new TreeNode(1);
        m.root.left.right = new TreeNode(3);
        m.root.right.left = new TreeNode(5);
        m.root.right.right = new TreeNode(7);
        m.inorder(m.root);
    }

    public void inorder(TreeNode node) {
        if (node == null) return;
        inorder(node.left);
        System.out.println(node.val);
        inorder(node.right);
    }
}`,
    },
    {
        name: "BST Insert/Search",
        category: "Trees",
        code: `package com.algoflow.runner;

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
}`,
    },
    {
        name: "Invert Binary Tree",
        category: "Trees",
        code: `package com.algoflow.runner;

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
        m.root = m.invert(m.root);
    }

    public TreeNode invert(TreeNode node) {
        if (node == null) return null;
        TreeNode temp = node.left;
        node.left = invert(node.right);
        node.right = invert(temp);
        return node;
    }
}`,
    },

    // Graphs (continued)
    {
        name: "Dijkstra's Shortest Path",
        category: "Graphs",
        code: `package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph(directed = true, weighted = true)
    private int[][] adjMatrix = {
        {0, 4, 2, 0, 0, 0},
        {0, 0, 8, 0, 0, 0},
        {0, 0, 0, 7, 0, 2},
        {0, 0, 0, 0, 9, 0},
        {0, 0, 0, 0, 0, 10},
        {0, 0, 0, 0, 3, 0}
    };

    public static void main(String[] args) {
        new Main().dijkstra(0);
    }

    public void dijkstra(int src) {
        int n = adjMatrix.length;
        int[] dist = new int[n];
        boolean[] visited = new boolean[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        for (int i = 0; i < n; i++) {
            int u = -1;
            for (int v = 0; v < n; v++)
                if (!visited[v] && (u == -1 || dist[v] < dist[u])) u = v;
            visited[u] = true;
            for (int v = 0; v < n; v++) {
                if (adjMatrix[u][v] > 0 && dist[u] + adjMatrix[u][v] < dist[v]) {
                    dist[v] = dist[u] + adjMatrix[u][v];
                }
            }
        }
    }
}`,
    },
    {
        name: "Topological Sort (DFS)",
        category: "Graphs",
        code: `package com.algoflow.runner;

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
}`,
    },
    // Dynamic Programming
    {
        name: "Fibonacci (Memoized)",
        category: "Dynamic Programming",
        code: `package com.algoflow.runner;

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
}`,
    },
    {
        name: "Longest Common Subsequence",
        category: "Dynamic Programming",
        code: `package com.algoflow.runner;

public class Main {
    private String s1 = "ABCBDAB";
    private String s2 = "BDCAB";

    public static void main(String[] args) {
        new Main().lcs();
    }

    public int lcs() {
        int m = s1.length(), n = s2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1))
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                else
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }
}`,
    },
    {
        name: "0/1 Knapsack",
        category: "Dynamic Programming",
        code: `package com.algoflow.runner;

public class Main {
    private int[] weights = {2, 3, 4, 5};
    private int[] values = {3, 4, 5, 6};
    private int capacity = 8;

    public static void main(String[] args) {
        new Main().knapsack();
    }

    public int knapsack() {
        int n = weights.length;
        int[][] dp = new int[n + 1][capacity + 1];
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= capacity; w++) {
                dp[i][w] = dp[i - 1][w];
                if (weights[i - 1] <= w)
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
            }
        }
        return dp[n][capacity];
    }
}`,
    },

    // Backtracking
    {
        name: "N-Queens",
        category: "Backtracking",
        code: `package com.algoflow.runner;

public class Main {
    private int n = 6;
    private int[] queens = new int[6];

    public static void main(String[] args) {
        new Main().solve(0);
    }

    public boolean solve(int row) {
        if (row == n) return true;
        for (int col = 0; col < n; col++) {
            if (isSafe(row, col)) {
                queens[row] = col;
                if (solve(row + 1)) return true;
                queens[row] = -1;
            }
        }
        return false;
    }

    private boolean isSafe(int row, int col) {
        for (int r = 0; r < row; r++) {
            if (queens[r] == col || Math.abs(queens[r] - col) == row - r)
                return false;
        }
        return true;
    }
}`,
    },

    // Linked Lists
    {
        name: "Reverse Linked List",
        category: "Linked Lists",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.LinkedList;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    @LinkedList
    ListNode head;

    public static void main(String[] args) {
        Main m = new Main();
        m.head = new ListNode(1);
        m.head.next = new ListNode(2);
        m.head.next.next = new ListNode(3);
        m.head.next.next.next = new ListNode(4);
        m.head = m.reverse(m.head);
    }

    ListNode reverse(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}`,
    },

    // Divide & Conquer
    {
        name: "Tower of Hanoi",
        category: "Divide & Conquer",
        code: `package com.algoflow.runner;

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
}`,
    },

];

export const CATEGORIES = [...new Set(ALGORITHMS.map(a => a.category))];

export const TEMPLATES: Template[] = [
    {
        name: "Bar Chart Array",
        category: "Arrays",
        description: "Array visualized as bar chart",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Chart;

public class Main {
    @Chart
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "1D Array",
        category: "Arrays",
        description: "Auto-visualized int array",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "2D Matrix",
        category: "Arrays",
        description: "Auto-visualized 2D array",
        code: `package com.algoflow.runner;

public class Main {
    private int[][] matrix = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "Binary Tree",
        category: "Trees",
        description: "TreeNode with @Tree annotation",
        code: `package com.algoflow.runner;

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
}`,
    },
    {
        name: "Undirected Graph",
        category: "Graphs",
        description: "Adjacency matrix graph",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    // @Graph visualizes an adjacency matrix or Map<K, List<V>>
    @Graph
    private int[][] adjMatrix = {
        {0, 1, 1, 0, 0},
        {1, 0, 0, 1, 0},
        {1, 0, 0, 1, 1},
        {0, 1, 1, 0, 1},
        {0, 0, 1, 1, 0}
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "Linked List",
        category: "Data Structures",
        description: "Auto-visualized LinkedList (Deque)",
        code: `package com.algoflow.runner;

import java.util.LinkedList;

public class Main {
    private LinkedList<Integer> list = new LinkedList<>();

    public static void main(String[] args) {
        Main m = new Main();
        m.list.add(1);
        m.list.add(2);
        m.list.add(3);
        m.list.add(4);
        m.solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "ListNode (Singly Linked)",
        category: "Data Structures",
        description: "LeetCode-style ListNode with @LinkedList",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.LinkedList;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    @LinkedList
    ListNode head;

    public static void main(String[] args) {
        Main m = new Main();
        m.head = new ListNode(1);
        m.head.next = new ListNode(2);
        m.head.next.next = new ListNode(3);
        m.head.next.next.next = new ListNode(4);
        m.solve();
    }

    void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "Adjacency List Graph",
        category: "Graphs",
        description: "Graph from Map<Integer, List<Integer>>",
        code: `package com.algoflow.runner;

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
}`,
    },
    {
        name: "Directed Weighted Graph",
        category: "Graphs",
        description: "Directed graph with weights",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    // Use directed/weighted options: @Graph(directed = true, weighted = true)
    @Graph(directed = true, weighted = true)
    private int[][] adjMatrix = {
        {0, 4, 0, 0},
        {0, 0, 3, 0},
        {0, 0, 0, 2},
        {0, 0, 0, 0}
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // TODO: your algorithm here
    }
}`,
    },
    {
        name: "HashMap",
        category: "Data Structures",
        description: "Auto-visualized HashMap",
        code: `package com.algoflow.runner;

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
}`,
    },
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))];

// ── Python ──

export const PYTHON_ALGORITHMS: Algorithm[] = [
    {
        name: "Bubble Sort",
        category: "Sorting",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]

def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]

bubble_sort(arr)
print("sorted")
`,
    },
    {
        name: "Selection Sort",
        category: "Sorting",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]

def selection_sort(a):
    n = len(a)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if a[j] < a[min_idx]:
                min_idx = j
        a[i], a[min_idx] = a[min_idx], a[i]

selection_sort(arr)
`,
    },
    {
        name: "Insertion Sort",
        category: "Sorting",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]

def insertion_sort(a):
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key

insertion_sort(arr)
`,
    },
    {
        name: "Binary Search",
        category: "Searching",
        code: `arr = [1, 3, 5, 7, 9, 11, 13, 15, 17]

def binary_search(a, target):
    lo = 0
    hi = len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

result = binary_search(arr, 7)
print("found at", result)
`,
    },
    {
        name: "Linear Search",
        category: "Searching",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]

def linear_search(a, target):
    for i in range(len(a)):
        if a[i] == target:
            return i
    return -1

result = linear_search(arr, 9)
print("found at", result)
`,
    },
    {
        name: "Fibonacci (Memoized)",
        category: "Dynamic Programming",
        code: `memo = {}

def fib(n):
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    result = fib(n - 1) + fib(n - 2)
    memo[n] = result
    return result

fib(10)
print("fib(10) =", memo[10])
`,
    },
    {
        name: "Quick Sort",
        category: "Sorting",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]

def quick_sort(a, lo, hi):
    if lo < hi:
        p = partition(a, lo, hi)
        quick_sort(a, lo, p - 1)
        quick_sort(a, p + 1, hi)

def partition(a, lo, hi):
    pivot = a[lo]
    i, j = lo + 1, hi
    while True:
        while i <= j and a[i] <= pivot:
            i += 1
        while i <= j and a[j] > pivot:
            j -= 1
        if i >= j:
            break
        a[i], a[j] = a[j], a[i]
    a[lo], a[j] = a[j], a[lo]
    return j

quick_sort(arr, 0, len(arr) - 1)
`,
    },
    {
        name: "Merge Sort",
        category: "Sorting",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]
temp = [0] * len(arr)

def merge_sort(a, t, start, end):
    if start >= end:
        return
    mid = (start + end) // 2
    merge_sort(a, t, start, mid)
    merge_sort(a, t, mid + 1, end)
    merge(a, t, start, mid, end)

def merge(a, t, start, mid, end):
    i, j, k = start, mid + 1, start
    while i <= mid and j <= end:
        if a[i] <= a[j]:
            t[k] = a[i]; i += 1
        else:
            t[k] = a[j]; j += 1
        k += 1
    while i <= mid:
        t[k] = a[i]; i += 1; k += 1
    while j <= end:
        t[k] = a[j]; j += 1; k += 1
    for x in range(start, end + 1):
        a[x] = t[x]

merge_sort(arr, temp, 0, len(arr) - 1)
`,
    },
    {
        name: "Two Sum",
        category: "Hash Maps",
        code: `nums = [2, 7, 11, 15]
seen = {}

def two_sum(nums, target):
    for i in range(len(nums)):
        complement = target - nums[i]
        if complement in seen:
            print("found", seen[complement], i)
            return
        seen[nums[i]] = i

two_sum(nums, 9)
`,
    },
    {
        name: "BFS",
        category: "Graphs",
        code: `from collections import deque

graph = {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 4],
    3: [1, 5],
    4: [1, 2, 5],
    5: [3, 4],
}

def bfs(start):
    visited = set()
    queue = deque([start])
    visited.add(start)
    while queue:
        current = queue.popleft()
        for neighbor in graph[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

bfs(0)
`,
    },
    {
        name: "DFS",
        category: "Graphs",
        code: `adj_matrix = [
    [0, 1, 1, 0, 0, 0],
    [1, 0, 0, 1, 1, 0],
    [1, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 1],
    [0, 1, 1, 0, 0, 1],
    [0, 0, 0, 1, 1, 0],
]
visited = [False] * 6

def dfs(node):
    visited[node] = True
    for neighbor in range(len(adj_matrix)):
        if adj_matrix[node][neighbor] == 1 and not visited[neighbor]:
            dfs(neighbor)

dfs(0)
`,
    },
    {
        name: "Dijkstra's Shortest Path",
        category: "Graphs",
        code: `import heapq

adj_matrix = [
    [0, 4, 2, 0, 0, 0],
    [0, 0, 8, 0, 0, 0],
    [0, 0, 0, 7, 0, 2],
    [0, 0, 0, 0, 9, 0],
    [0, 0, 0, 0, 0, 10],
    [0, 0, 0, 0, 3, 0],
]

def dijkstra(src):
    n = len(adj_matrix)
    dist = [float('inf')] * n
    dist[src] = 0
    visited = [False] * n
    for _ in range(n):
        u = -1
        for v in range(n):
            if not visited[v] and (u == -1 or dist[v] < dist[u]):
                u = v
        visited[u] = True
        for v in range(n):
            if adj_matrix[u][v] > 0 and dist[u] + adj_matrix[u][v] < dist[v]:
                dist[v] = dist[u] + adj_matrix[u][v]

dijkstra(0)
`,
    },
    {
        name: "Topological Sort (DFS)",
        category: "Graphs",
        code: `adj_matrix = [
    [0, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0],
]
visited = [False] * 6
stack = []

def topo_sort():
    for i in range(len(adj_matrix)):
        if not visited[i]:
            dfs(i)
    print(stack[::-1])

def dfs(node):
    visited[node] = True
    for i in range(len(adj_matrix)):
        if adj_matrix[node][i] == 1 and not visited[i]:
            dfs(i)
    stack.append(node)

topo_sort()
`,
    },
    {
        name: "BST Inorder Traversal",
        category: "Trees",
        code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

root = TreeNode(4)
root.left = TreeNode(2)
root.right = TreeNode(6)
root.left.left = TreeNode(1)
root.left.right = TreeNode(3)
root.right.left = TreeNode(5)
root.right.right = TreeNode(7)

def inorder(node):
    if node is None:
        return
    inorder(node.left)
    print(node.val)
    inorder(node.right)

inorder(root)
`,
    },
    {
        name: "BST Insert/Search",
        category: "Trees",
        code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(node, val):
    if node is None:
        return TreeNode(val)
    if val < node.val:
        node.left = insert(node.left, val)
    elif val > node.val:
        node.right = insert(node.right, val)
    return node

def search(node, val):
    if node is None:
        return False
    if val == node.val:
        return True
    return search(node.left, val) if val < node.val else search(node.right, val)

root = None
for v in [4, 2, 6, 1, 3, 5, 7]:
    root = insert(root, v)
print("Found 3:", search(root, 3))
print("Found 8:", search(root, 8))
`,
    },
    {
        name: "Invert Binary Tree",
        category: "Trees",
        code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

root = TreeNode(4)
root.left = TreeNode(2)
root.right = TreeNode(7)
root.left.left = TreeNode(1)
root.left.right = TreeNode(3)
root.right.left = TreeNode(6)
root.right.right = TreeNode(9)

def invert(node):
    if node is None:
        return None
    node.left, node.right = invert(node.right), invert(node.left)
    return node

root = invert(root)
`,
    },
    {
        name: "Longest Common Subsequence",
        category: "Dynamic Programming",
        code: `s1 = "ABCBDAB"
s2 = "BDCAB"

def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

print("LCS length:", lcs(s1, s2))
`,
    },
    {
        name: "0/1 Knapsack",
        category: "Dynamic Programming",
        code: `weights = [2, 3, 4, 5]
values = [3, 4, 5, 6]
capacity = 8

def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i - 1][w]
            if weights[i - 1] <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
    return dp[n][capacity]

print("Max value:", knapsack(weights, values, capacity))
`,
    },
    {
        name: "N-Queens",
        category: "Backtracking",
        code: `n = 6
queens = [-1] * n

def is_safe(row, col):
    for r in range(row):
        if queens[r] == col or abs(queens[r] - col) == row - r:
            return False
    return True

def solve(row):
    if row == n:
        return True
    for col in range(n):
        if is_safe(row, col):
            queens[row] = col
            if solve(row + 1):
                return True
            queens[row] = -1
    return False

solve(0)
print(queens)
`,
    },
    {
        name: "Tower of Hanoi",
        category: "Divide & Conquer",
        code: `def hanoi(n, src, dst, aux):
    if n == 0:
        return
    hanoi(n - 1, src, aux, dst)
    print(f"Move disk {n} from {src} to {dst}")
    hanoi(n - 1, aux, dst, src)

hanoi(4, "A", "C", "B")
`,
    },
];

export const PYTHON_CATEGORIES = [...new Set(PYTHON_ALGORITHMS.map(a => a.category))];

export const PYTHON_TEMPLATES: Template[] = [
    {
        name: "1D List",
        category: "Lists",
        description: "Auto-visualized list",
        code: `arr = [5, 3, 8, 1, 9, 2, 7]

# Write your algorithm here
`,
    },
    {
        name: "2D List",
        category: "Lists",
        description: "Auto-visualized 2D list",
        code: `matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

# Write your algorithm here
`,
    },
    {
        name: "Dictionary",
        category: "Data Structures",
        description: "Auto-visualized dict",
        code: `scores = {"alice": 90, "bob": 80, "charlie": 70}

# Write your algorithm here
`,
    },
    {
        name: "Set",
        category: "Data Structures",
        description: "Auto-visualized set",
        code: `visited = set()

visited.add(1)
visited.add(2)
visited.add(3)

# Write your algorithm here
`,
    },
];

export const PYTHON_TEMPLATE_CATEGORIES = [...new Set(PYTHON_TEMPLATES.map(t => t.category))];
