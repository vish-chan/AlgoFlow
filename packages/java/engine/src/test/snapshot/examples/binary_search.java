package com.algoflow.runner;

public class Main {
    private int[] arr = {1, 3, 5, 7, 9, 11, 13, 15, 17};

    public static void main(String[] args) {
        new Main().binarySearch(7);
    }

    public int binarySearch(int target) {
        int lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}
