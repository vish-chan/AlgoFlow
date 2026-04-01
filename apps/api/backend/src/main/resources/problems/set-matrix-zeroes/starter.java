import java.util.*;

public class Main {
    private int[][] matrix = {{1,1,1},{1,0,1},{1,1,1}};

    public static void main(String[] args) {
        Main m = new Main();
        m.setZeroes(m.matrix);
        for (int[] row : m.matrix) System.out.println(Arrays.toString(row));
    }

    public void setZeroes(int[][] matrix) {
        // TODO: implement
    }
}
