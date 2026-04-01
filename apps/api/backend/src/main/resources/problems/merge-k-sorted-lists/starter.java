public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    public static void main(String[] args) {
        Main m = new Main();
        ListNode l1 = new ListNode(1); l1.next = new ListNode(4); l1.next.next = new ListNode(5);
        ListNode l2 = new ListNode(1); l2.next = new ListNode(3); l2.next.next = new ListNode(4);
        ListNode l3 = new ListNode(2); l3.next = new ListNode(6);
        ListNode result = m.mergeKLists(new ListNode[]{l1, l2, l3});
        while (result != null) { System.out.print(result.val + " "); result = result.next; }
    }

    public ListNode mergeKLists(ListNode[] lists) {
        // TODO: implement
        return null;
    }
}
