import java.util.*;

public class Main {
    private PriorityQueue<Integer> small = new PriorityQueue<>(Collections.reverseOrder());
    private PriorityQueue<Integer> large = new PriorityQueue<>();

    public static void main(String[] args) {
        Main m = new Main();
        m.addNum(1);
        m.addNum(2);
        System.out.println(m.findMedian());
        m.addNum(3);
        System.out.println(m.findMedian());
    }

    public void addNum(int num) {
        // TODO: implement
    }

    public double findMedian() {
        // TODO: implement
        return 0.0;
    }
}
