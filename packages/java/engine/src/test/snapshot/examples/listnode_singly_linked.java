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
        m.solve();
    }

    void solve() {
        // TODO: your algorithm here
    }
}
