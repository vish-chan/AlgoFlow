package com.algoflow.runner;

import java.util.ArrayList;
import java.util.Arrays;

public class BubbleSortExample {

    ArrayList<Integer> list = new ArrayList<>(Arrays.asList(64, 34, 25, 12, 22, 11, 90));

    public static void main(String[] args) {
        new BubbleSortExample().bubbleSort();
    }

    void bubbleSort() {
        System.out.println("Starting Bubble Sort...");
        int n = list.size();
        for (int i = 0; i < n - 1; i++) {
            System.out.println("Pass " + (i + 1));
            for (int j = 0; j < n - i - 1; j++) {
                if (list.get(j) > list.get(j + 1)) {
                    System.out.println("Swapping " + list.get(j) + " and " + list.get(j + 1));
                    int temp = list.get(j);
                    list.set(j, list.get(j + 1));
                    list.set(j + 1, temp);
                }
            }
        }
        System.out.println("Bubble Sort Complete!");
    }
}
