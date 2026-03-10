export const DEFAULT_JAVA_CODE = `package com.algoflow.runner;

public class Main {

    private int[] arr = new int[] {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().quickSort();
    }

    public void quickSort() {
        System.out.println("Starting QuickSort");
        qs(0, arr.length - 1);
        System.out.println("QuickSort complete!");
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
        int i = lo + 1;
        int j = hi;
        while (true) {
            while (i <= j && arr[i] <= pivot) i++;
            while (i <= j && arr[j] > pivot) j--;
            if (i >= j) break;
            int tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        int tmp = arr[lo];
        arr[lo] = arr[j];
        arr[j] = tmp;
        return j;
    }
}
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
    private int[][] adjMatrix = {
        {0, 1, 1, 0, 0, 0},
        {1, 0, 0, 1, 1, 0},
        {1, 0, 0, 0, 1, 0},
        {0, 1, 0, 0, 0, 1},
        {0, 1, 1, 0, 0, 1},
        {0, 0, 0, 1, 1, 0}
    };

    public static void main(String[] args) {
        new Main().bfs(0);
    }

    public void bfs(int start) {
        boolean[] visited = new boolean[adjMatrix.length];
        Queue<Integer> queue = new LinkedList<>();
        visited[start] = true;
        queue.add(start);
        while (!queue.isEmpty()) {
            int current = queue.poll();
            for (int neighbor = 0; neighbor < adjMatrix.length; neighbor++) {
                if (adjMatrix[current][neighbor] == 1 && !visited[neighbor]) {
                    visited[neighbor] = true;
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
    // Strings
    {
        name: "KMP String Search",
        category: "Strings",
        code: `package com.algoflow.runner;

public class Main {
    public static void main(String[] args) {
        new Main().kmpSearch("ABABDABACDABABCABAB", "ABABCABAB");
    }

    public void kmpSearch(String text, String pattern) {
        int[] lps = buildLPS(pattern);
        int i = 0, j = 0;
        while (i < text.length()) {
            if (text.charAt(i) == pattern.charAt(j)) {
                i++;
                j++;
            }
            if (j == pattern.length()) {
                System.out.println("Pattern found at index " + (i - j));
                j = lps[j - 1];
            } else if (i < text.length() && text.charAt(i) != pattern.charAt(j)) {
                if (j != 0) j = lps[j - 1];
                else i++;
            }
        }
    }

    private int[] buildLPS(String pattern) {
        int[] lps = new int[pattern.length()];
        int len = 0, i = 1;
        while (i < pattern.length()) {
            if (pattern.charAt(i) == pattern.charAt(len)) {
                lps[i++] = ++len;
            } else if (len != 0) {
                len = lps[len - 1];
            } else {
                lps[i++] = 0;
            }
        }
        return lps;
    }
}`,
    },
    // Sorting (continued)
    {
        name: "Heap Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().heapSort();
    }

    public void heapSort() {
        int n = arr.length;
        for (int i = n / 2 - 1; i >= 0; i--) heapify(n, i);
        for (int i = n - 1; i > 0; i--) {
            int tmp = arr[0]; arr[0] = arr[i]; arr[i] = tmp;
            heapify(i, 0);
        }
    }

    private void heapify(int n, int i) {
        int largest = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && arr[l] > arr[largest]) largest = l;
        if (r < n && arr[r] > arr[largest]) largest = r;
        if (largest != i) {
            int tmp = arr[i]; arr[i] = arr[largest]; arr[largest] = tmp;
            heapify(n, largest);
        }
    }
}`,
    },
    {
        name: "Counting Sort",
        category: "Sorting",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {4, 2, 2, 8, 3, 3, 1};

    public static void main(String[] args) {
        new Main().countingSort();
    }

    public void countingSort() {
        int max = 0;
        for (int v : arr) if (v > max) max = v;
        int[] count = new int[max + 1];
        for (int v : arr) count[v]++;
        int idx = 0;
        for (int i = 0; i <= max; i++) {
            while (count[i]-- > 0) arr[idx++] = i;
        }
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
    {
        name: "Longest Increasing Subsequence",
        category: "Dynamic Programming",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {10, 9, 2, 5, 3, 7, 101, 18};

    public static void main(String[] args) {
        new Main().lis();
    }

    public int lis() {
        int n = arr.length;
        int[] dp = new int[n];
        java.util.Arrays.fill(dp, 1);
        int maxLen = 1;
        for (int i = 1; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (arr[j] < arr[i])
                    dp[i] = Math.max(dp[i], dp[j] + 1);
            }
            maxLen = Math.max(maxLen, dp[i]);
        }
        return maxLen;
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
    {
        name: "Sudoku Solver",
        category: "Backtracking",
        code: `package com.algoflow.runner;

public class Main {
    private int[][] board = {
        {5,3,0,0,7,0,0,0,0},
        {6,0,0,1,9,5,0,0,0},
        {0,9,8,0,0,0,0,6,0},
        {8,0,0,0,6,0,0,0,3},
        {4,0,0,8,0,3,0,0,1},
        {7,0,0,0,2,0,0,0,6},
        {0,6,0,0,0,0,2,8,0},
        {0,0,0,4,1,9,0,0,5},
        {0,0,0,0,8,0,0,7,9}
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public boolean solve() {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == 0) {
                    for (int num = 1; num <= 9; num++) {
                        if (isValid(r, c, num)) {
                            board[r][c] = num;
                            if (solve()) return true;
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    private boolean isValid(int row, int col, int num) {
        for (int i = 0; i < 9; i++) {
            if (board[row][i] == num || board[i][col] == num) return false;
            int r = 3 * (row / 3) + i / 3, c = 3 * (col / 3) + i % 3;
            if (board[r][c] == num) return false;
        }
        return true;
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
    {
        name: "Matrix Chain Multiplication",
        category: "Dynamic Programming",
        code: `package com.algoflow.runner;

public class Main {
    private int[] dims = {10, 30, 5, 60, 10};

    public static void main(String[] args) {
        new Main().mcm();
    }

    public int mcm() {
        int n = dims.length - 1;
        int[][] dp = new int[n][n];
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                dp[i][j] = Integer.MAX_VALUE;
                for (int k = i; k < j; k++) {
                    int cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                    dp[i][j] = Math.min(dp[i][j], cost);
                }
            }
        }
        return dp[0][n - 1];
    }
}`,
    },
    {
        name: "Floyd-Warshall",
        category: "Graphs",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private int[][] adjMatrix = {
        {0, 3, 0, 7, 0},
        {3, 0, 4, 2, 0},
        {0, 4, 0, 5, 6},
        {7, 2, 5, 0, 4},
        {0, 0, 6, 4, 0}
    };

    public static void main(String[] args) {
        new Main().floydWarshall();
    }

    public void floydWarshall() {
        int n = adjMatrix.length;
        int INF = 99999;
        int[][] dist = new int[n][n];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                dist[i][j] = (i == j) ? 0 : (adjMatrix[i][j] > 0 ? adjMatrix[i][j] : INF);
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    if (dist[i][k] + dist[k][j] < dist[i][j])
                        dist[i][j] = dist[i][k] + dist[k][j];
    }
}`,
    },
    {
        name: "Prim's MST",
        category: "Graphs",
        code: `package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private int[][] adjMatrix = {
        {0, 2, 0, 6, 0},
        {2, 0, 3, 8, 5},
        {0, 3, 0, 0, 7},
        {6, 8, 0, 0, 9},
        {0, 5, 7, 9, 0}
    };

    public static void main(String[] args) {
        new Main().prim();
    }

    public void prim() {
        int n = adjMatrix.length;
        boolean[] inMST = new boolean[n];
        int[] key = new int[n];
        Arrays.fill(key, Integer.MAX_VALUE);
        key[0] = 0;
        for (int count = 0; count < n; count++) {
            int u = -1;
            for (int v = 0; v < n; v++)
                if (!inMST[v] && (u == -1 || key[v] < key[u])) u = v;
            inMST[u] = true;
            for (int v = 0; v < n; v++)
                if (adjMatrix[u][v] > 0 && !inMST[v] && adjMatrix[u][v] < key[v])
                    key[v] = adjMatrix[u][v];
        }
    }
}`,
    },
    {
        name: "Bellman-Ford",
        category: "Graphs",
        code: `package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph(directed = true, weighted = true)
    private int[][] adjMatrix = {
        {0, 6, 0, 7, 0},
        {0, 0, 5, 8, -4},
        {0, -2, 0, 0, 0},
        {0, 0, -3, 0, 9},
        {2, 0, 7, 0, 0}
    };

    public static void main(String[] args) {
        new Main().bellmanFord(0);
    }

    public void bellmanFord(int src) {
        int n = adjMatrix.length;
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        for (int iter = 0; iter < n - 1; iter++) {
            for (int u = 0; u < n; u++) {
                if (dist[u] == Integer.MAX_VALUE) continue;
                for (int v = 0; v < n; v++) {
                    if (adjMatrix[u][v] != 0 && dist[u] + adjMatrix[u][v] < dist[v]) {
                        dist[v] = dist[u] + adjMatrix[u][v];
                    }
                }
            }
        }
    }
}`,
    },
];

export const CATEGORIES = [...new Set(ALGORITHMS.map(a => a.category))];

export const TEMPLATES: Template[] = [
    {
        name: "Graph (Adjacency Matrix)",
        category: "Graphs",
        description: "Undirected graph with adjacency matrix",
        code: `package com.algoflow.runner;

import com.algoflow.annotation.Graph;

public class Main {
    @Graph
    private int[][] adjMatrix = {
        //  0  1  2  3  4
        {0, 1, 1, 0, 0},  // 0
        {1, 0, 0, 1, 0},  // 1
        {1, 0, 0, 1, 1},  // 2
        {0, 1, 1, 0, 1},  // 3
        {0, 0, 1, 1, 0}   // 4
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // Your graph algorithm here
        // Access adjMatrix[i][j] to check edges
        // The @Graph annotation auto-visualizes the matrix
        int n = adjMatrix.length;
        boolean[] visited = new boolean[n];
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
    {
        name: "Directed Weighted Graph",
        category: "Graphs",
        description: "Directed graph with edge weights",
        code: `package com.algoflow.runner;

import java.util.*;
import com.algoflow.annotation.Graph;

public class Main {
    @Graph(directed = true, weighted = true)
    private int[][] adjMatrix = {
        //  0  1  2  3
        {0, 4, 0, 0},  // 0 -> 1 (weight 4)
        {0, 0, 3, 0},  // 1 -> 2 (weight 3)
        {0, 0, 0, 2},  // 2 -> 3 (weight 2)
        {0, 0, 0, 0}   // 3
    };

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // Your algorithm here
        // Non-zero adjMatrix[i][j] = edge from i to j with that weight
        int n = adjMatrix.length;
        for (int u = 0; u < n; u++) {
            for (int v = 0; v < n; v++) {
                if (adjMatrix[u][v] > 0) {
                    System.out.println(u + " -> " + v + " (" + adjMatrix[u][v] + ")");
                }
            }
        }
    }
}`,
    },
    {
        name: "Binary Tree (Traversal)",
        category: "Trees",
        description: "TreeNode-based tree with inorder traversal",
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
        // Build tree:       4
        //                 /   \\
        //                2     6
        //               / \\   / \\
        //              1   3 5   7
        m.root = new TreeNode(4);
        m.root.left = new TreeNode(2);
        m.root.right = new TreeNode(6);
        m.root.left.left = new TreeNode(1);
        m.root.left.right = new TreeNode(3);
        m.root.right.left = new TreeNode(5);
        m.root.right.right = new TreeNode(7);

        m.inorder(m.root);
    }

    void inorder(TreeNode node) {
        if (node == null) return;
        inorder(node.left);
        System.out.println(node.val);
        inorder(node.right);
    }
}`,
    },
    {
        name: "BST Insert & Search",
        category: "Trees",
        description: "Binary search tree with insert and lookup",
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
        Main bst = new Main();
        int[] values = {5, 3, 7, 1, 4, 6, 8};
        for (int v : values) {
            bst.insert(v);
        }
        System.out.println("Found 4: " + bst.search(4));
        System.out.println("Found 9: " + bst.search(9));
    }

    void insert(int val) {
        root = insertRec(root, val);
    }

    TreeNode insertRec(TreeNode node, int val) {
        if (node == null) return new TreeNode(val);
        if (val < node.val) node.left = insertRec(node.left, val);
        else node.right = insertRec(node.right, val);
        return node;
    }

    boolean search(int val) {
        TreeNode cur = root;
        while (cur != null) {
            if (val == cur.val) return true;
            cur = val < cur.val ? cur.left : cur.right;
        }
        return false;
    }
}`,
    },
    {
        name: "1D Array",
        category: "Arrays",
        description: "Basic array with iteration",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().solve();
    }

    public void solve() {
        // Your array algorithm here
        // The array will be auto-visualized
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            System.out.println("arr[" + i + "] = " + arr[i]);
        }
    }
}`,
    },
    {
        name: "2D Matrix",
        category: "Arrays",
        description: "2D array / grid operations",
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
        // Your 2D array algorithm here
        int rows = matrix.length;
        int cols = matrix[0].length;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                System.out.print(matrix[i][j] + " ");
            }
            System.out.println();
        }
    }
}`,
    },
    {
        name: "Recursive Function",
        category: "Recursion",
        description: "Template with recursion call stack visualization",
        code: `package com.algoflow.runner;

public class Main {
    public static void main(String[] args) {
        new Main().solve(5);
    }

    public void solve(int n) {
        // Recursive calls are auto-tracked in the call stack
        if (n <= 0) {
            System.out.println("Base case reached");
            return;
        }
        System.out.println("Processing n=" + n);
        solve(n - 1);
    }
}`,
    },
    {
        name: "Backtracking",
        category: "Recursion",
        description: "Backtracking pattern with state tracking",
        code: `package com.algoflow.runner;

public class Main {
    private int[] arr = new int[4];
    private boolean[] used = new boolean[4];

    public static void main(String[] args) {
        new Main().permute(0);
    }

    public void permute(int idx) {
        if (idx == arr.length) {
            // Found a permutation
            StringBuilder sb = new StringBuilder();
            for (int v : arr) sb.append(v).append(" ");
            System.out.println(sb.toString().trim());
            return;
        }
        for (int i = 0; i < arr.length; i++) {
            if (!used[i]) {
                arr[idx] = i + 1;
                used[i] = true;
                permute(idx + 1);
                used[i] = false;
            }
        }
    }
}`,
    },
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))];
