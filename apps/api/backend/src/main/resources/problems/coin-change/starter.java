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
}
