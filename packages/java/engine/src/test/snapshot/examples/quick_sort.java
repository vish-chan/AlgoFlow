package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().quickSort();
    }

    public void quickSort() {
        qs(0, arr.length - 1);
    }

    private void qs(int lo, int hi) {
        if (lo < hi) {
            int p = partition(lo, hi);
            qs(lo, p - 1);
            qs(p + 1, hi);
        }
    }

    private int partition(int lo, int hi) {
        int pivot = arr[lo];
        int i = lo + 1, j = hi;
        while (true) {
            while (i <= j && arr[i] <= pivot) i++;
            while (i <= j && arr[j] > pivot) j--;
            if (i >= j) break;
            int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        int tmp = arr[lo]; arr[lo] = arr[j]; arr[j] = tmp;
        return j;
    }
}
