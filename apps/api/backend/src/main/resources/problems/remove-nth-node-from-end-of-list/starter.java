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
        head.next.next.next.next = new ListNode(5);
        ListNode result = m.removeNthFromEnd(head, 2);
        while (result != null) { System.out.print(result.val + " "); result = result.next; }
    }

    public ListNode removeNthFromEnd(ListNode head, int n) {
        // TODO: implement
        return head;
    }
}
