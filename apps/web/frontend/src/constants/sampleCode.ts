export const DEFAULT_JAVA_CODE = `package com.algoflow.runner;

import com.algoflow.annotation.TrackRecursion;
import com.algoflow.annotation.Visualize;
import com.algoflow.annotation.VisualizeLocals;

public class Main {

    @Visualize
    private int[] arr = new int[] {38, 27, 43, 3, 9, 82, 10};

    @Visualize
    private int[] temp = new int[] {38, 27, 43, 3, 9, 82, 10};

    public static void main(String[] args) {
        new Main().mergeSort();
    }

    public void mergeSort() {
        System.out.println("Starting Merge sort");
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
`;

export const SAMPLE_COMMANDS = [
    {"key":"log","method":"LogTracer","args":["Console"]},
    {"key":"arr","method":"Array1DTracer","args":["Array"]},
    {"key":"layout","method":"VerticalLayout","args":[["arr","log"]]},
    {"key":null,"method":"setRoot","args":["layout"]},
    {"key":"arr","method":"set","args":[[38,27,43,3,9]]},
    {"key":null,"method":"delay","args":[]},
    {"key":"log","method":"println","args":["Starting sort..."]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"select","args":[0]},
    {"key":null,"method":"delay","args":[]},
    {"key":"log","method":"println","args":["Comparing index 0"]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"deselect","args":[0]},
    {"key":"arr","method":"select","args":[1]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"patch","args":[0,27]},
    {"key":null,"method":"delay","args":[]},
    {"key":"log","method":"println","args":["Swapped to index 0!"]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"depatch","args":[0]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"deselect","args":[1]},
    {"key":"arr","method":"patch","args":[1,38]},
    {"key":null,"method":"delay","args":[]},
    {"key":"log","method":"println","args":["Swapped to index 1!"]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"depatch","args":[1]},
    {"key":null,"method":"delay","args":[]},
];
