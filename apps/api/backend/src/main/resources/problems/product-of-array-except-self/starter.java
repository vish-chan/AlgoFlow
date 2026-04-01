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
}
