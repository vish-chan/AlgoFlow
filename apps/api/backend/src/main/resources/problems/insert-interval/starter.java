import java.util.*;

public class Main {
    private int[][] intervals = {{1,3},{6,9}};
    private int[] newInterval = {2, 5};

    public static void main(String[] args) {
        Main m = new Main();
        int[][] result = m.insert(m.intervals, m.newInterval);
        for (int[] r : result) System.out.println(Arrays.toString(r));
    }

    public int[][] insert(int[][] intervals, int[] newInterval) {
        // TODO: implement
        return new int[][]{};
    }
}
