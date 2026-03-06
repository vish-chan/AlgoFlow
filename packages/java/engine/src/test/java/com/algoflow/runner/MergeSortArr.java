package com.algoflow.runner;

import com.algoflow.annotation.TrackRecursion;
import com.algoflow.annotation.Visualize;
import com.algoflow.annotation.VisualizeLocals;

public class MergeSortArr {

    @Visualize
    private int[] arr = new int[] {38, 27, 43, 3, 9, 82, 10};

    private int[] temp;

    public static void main(String[] args) {
        new MergeSortArr().mergeSort();
    }

    public void mergeSort() {
        System.out.println("Starting Merge sort");
        temp = new int[arr.length];
        mergeSortHelper(arr, 0, arr.length - 1);
        System.out.println("Merge sort complete!");
    }

    @TrackRecursion
    @VisualizeLocals("mid")
    private void mergeSortHelper(int[] arr, int start, int end) {
        if(start >= end) {
            return;
        }

        int mid = (start + end)/2;
        System.out.println("Splitting [" + start + ".." + end + "] at " + mid);

        mergeSortHelper(arr, start, mid);
        mergeSortHelper(arr, mid + 1, end);
        merge(arr, start, mid, end);
    }

    @TrackRecursion
    private void merge(int[] arr, int start, int mid, int end) {
        int i = start, j = mid + 1, k = start;
        while(i <= mid && j <= end ) {
            if(arr[i] > arr[j]) {
                temp[k++] = arr[j++];
            } else {
                temp[k++] = arr[i++];
            }
        }

        while(i <= mid) {
            temp[k++] = arr[i++];
        }

        while(j <= end) {
                temp[k++] = arr[j++];
        }

        for(i=start ; i<=end ; i++) {
            arr[i] = temp[i];
        }
    }
}
