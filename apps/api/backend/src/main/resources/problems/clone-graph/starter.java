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
}
