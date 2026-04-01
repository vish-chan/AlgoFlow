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
}
