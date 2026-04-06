package com.algoflow.runner;

public class Main {
    private int[] arr = {5, 3, 8, 1, 9, 2, 7};
    private int[] temp = new int[7];

    public static void main(String[] args) {
        new Main().mergeSort();
    }

    public void mergeSort() {
        mergeSortHelper(0, arr.length - 1);
    }

    private void mergeSortHelper(int start, int end) {
        if (start >= end) return;
        int mid = (start + end) / 2;
        mergeSortHelper(start, mid);
        mergeSortHelper(mid + 1, end);
        merge(start, mid, end);
    }

    private void merge(int start, int mid, int end) {
        int i = start, j = mid + 1, k = start;
        while (i <= mid && j <= end) {
            if (arr[i] <= arr[j]) temp[k++] = arr[i++];
            else temp[k++] = arr[j++];
        }
        while (i <= mid) temp[k++] = arr[i++];
        while (j <= end) temp[k++] = arr[j++];
        for (i = start; i <= end; i++) arr[i] = temp[i];
    }
}
