package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().linearSearch(9);
    }

    public int linearSearch(int target) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) return i;
        }
        return -1;
    }
}
