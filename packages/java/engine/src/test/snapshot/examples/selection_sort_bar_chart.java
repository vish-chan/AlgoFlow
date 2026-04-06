package com.algoflow.runner;

import com.algoflow.annotation.Chart;

public class Main {
    @Chart
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().selectionSort();
    }

    public void selectionSort() {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            int temp = arr[minIdx];
            arr[minIdx] = arr[i];
            arr[i] = temp;
        }
    }
}
