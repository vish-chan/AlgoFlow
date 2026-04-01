import java.util.*;

public class Main {
    private int[][] matrix = {{1,2,3},{4,5,6},{7,8,9}};

    public static void main(String[] args) {
        Main m = new Main();
        m.rotate(m.matrix);
        for (int[] row : m.matrix) System.out.println(Arrays.toString(row));
    }

    public void rotate(int[][] matrix) {
        // TODO: implement
    }
}
