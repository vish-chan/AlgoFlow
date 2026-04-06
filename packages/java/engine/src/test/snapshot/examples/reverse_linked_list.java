package com.algoflow.runner;

import com.algoflow.annotation.LinkedList;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    @LinkedList
    ListNode head;

    public static void main(String[] args) {
        Main m = new Main();
        m.head = new ListNode(1);
        m.head.next = new ListNode(2);
        m.head.next.next = new ListNode(3);
        m.head.next.next.next = new ListNode(4);
        m.head = m.reverse(m.head);
    }

    ListNode reverse(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
