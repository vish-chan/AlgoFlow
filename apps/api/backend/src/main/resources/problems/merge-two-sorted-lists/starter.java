public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    public static void main(String[] args) {
        Main m = new Main();
        ListNode l1 = new ListNode(1); l1.next = new ListNode(2); l1.next.next = new ListNode(4);
        ListNode l2 = new ListNode(1); l2.next = new ListNode(3); l2.next.next = new ListNode(4);
        ListNode result = m.mergeTwoLists(l1, l2);
        while (result != null) { System.out.print(result.val + " "); result = result.next; }
    }

    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // TODO: implement
        return null;
    }
}
