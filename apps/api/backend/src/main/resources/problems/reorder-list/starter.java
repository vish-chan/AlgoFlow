public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    public static void main(String[] args) {
        Main m = new Main();
        ListNode head = new ListNode(1);
        head.next = new ListNode(2);
        head.next.next = new ListNode(3);
        head.next.next.next = new ListNode(4);
        m.reorderList(head);
        while (head != null) { System.out.print(head.val + " "); head = head.next; }
    }

    public void reorderList(ListNode head) {
        // TODO: implement
    }
}
