package com.algoflow.runner;

import com.algoflow.annotation.Chart;

public class Main {
    @Chart
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().bubbleSort();
    }

    public void bubbleSort() {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
}
