export const DEFAULT_JAVA_CODE = `package com.algoflow.runner;

public class Main {

    private int[] arr = new int[] {5, 3, 8, 1, 9, 2, 7};

    public static void main(String[] args) {
        new Main().quickSort();
    }

    public void quickSort() {
        System.out.println("Starting QuickSort");
        qs(0, arr.length - 1);
        System.out.println("QuickSort complete!");
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
        int i = lo + 1;
        int j = hi;
        while (true) {
            while (i <= j && arr[i] <= pivot) i++;
            while (i <= j && arr[j] > pivot) j--;
            if (i >= j) break;
            int tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        int tmp = arr[lo];
        arr[lo] = arr[j];
        arr[j] = tmp;
        return j;
    }
}
`;

// Array: [5, 3, 8, 1, 9, 2, 7]  pivot=arr[lo] Hoare-style
// Trace every step with correct state.

export const SAMPLE_COMMANDS = [
    // Setup tracers
    {"key":"arr","method":"Array1DTracer","args":["Array"]},
    {"key":"cs","method":"Array2DTracer","args":["CallStack"]},
    {"key":"vars","method":"Array2DTracer","args":["Local Variables"]},
    {"key":"log","method":"LogTracer","args":["Console"]},
    {"key":"layout","method":"VerticalLayout","args":[["arr","cs","vars","log"]]},
    {"key":null,"method":"setRoot","args":["layout"]},
    {"key":"arr","method":"set","args":[[5,3,8,1,9,2,7]]},
    {"key":"log","method":"println","args":["Starting QuickSort"]},
    {"key":null,"method":"delay","args":[]},

    // qs(0,6)
    {"key":"cs","method":"push","args":["recursive qs(0, 6)",[]]},
    {"key":null,"method":"delay","args":[]},

    // partition(0,6) pivot=5  arr=[5,3,8,1,9,2,7]
    {"key":"cs","method":"push","args":["partition(0, 6)",[]]},
    {"key":"vars","method":"setVar","args":["pivot",5]},
    {"key":"vars","method":"setVar","args":["i",1]},
    {"key":"vars","method":"setVar","args":["j",6]},
    {"key":"arr","method":"select","args":[0]},
    {"key":"log","method":"println","args":["partition(0,6) pivot=5"]},
    {"key":null,"method":"delay","args":[]},

    // i moves: arr[1]=3<=5 → i=2, arr[2]=8>5 stop. i=2
    {"key":"vars","method":"setVar","args":["i",2]},
    {"key":"arr","method":"select","args":[2]},
    {"key":"log","method":"println","args":["i stops at 2 (8>5)"]},
    {"key":null,"method":"delay","args":[]},

    // j moves: arr[6]=7>5 → j=5, arr[5]=2<=5 stop. j=5
    {"key":"vars","method":"setVar","args":["j",5]},
    {"key":"arr","method":"select","args":[5]},
    {"key":"log","method":"println","args":["j stops at 5 (2<=5)"]},
    {"key":null,"method":"delay","args":[]},

    // swap(2,5): 8↔2  arr→[5,3,2,1,9,8,7]
    {"key":"log","method":"println","args":["swap(2,5): 8↔2"]},
    {"key":"arr","method":"deselect","args":[2]},
    {"key":"arr","method":"deselect","args":[5]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"patch","args":[2,2]},
    {"key":"arr","method":"patch","args":[5,8]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"depatch","args":[2]},
    {"key":"arr","method":"depatch","args":[5]},

    // i=3, arr[3]=1<=5 → i=4, arr[4]=9>5 stop. i=4
    {"key":"vars","method":"setVar","args":["i",4]},
    {"key":"arr","method":"select","args":[4]},
    {"key":"log","method":"println","args":["i stops at 4 (9>5)"]},
    {"key":null,"method":"delay","args":[]},

    // j=4, arr[4]=9>5 → j=3, arr[3]=1<=5 stop. j=3
    {"key":"vars","method":"setVar","args":["j",3]},
    {"key":"arr","method":"select","args":[3]},
    {"key":"log","method":"println","args":["j stops at 3 (1<=5)"]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"deselect","args":[4]},
    {"key":"arr","method":"deselect","args":[3]},

    // i>=j break. swap pivot arr[0]↔arr[3]: 5↔1  arr→[1,3,2,5,9,8,7]
    {"key":"log","method":"println","args":["i>=j, place pivot: swap(0,3)"]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"patch","args":[0,1]},
    {"key":"arr","method":"patch","args":[3,5]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"depatch","args":[0]},
    {"key":"arr","method":"depatch","args":[3]},
    {"key":"arr","method":"deselect","args":[0]},
    {"key":"log","method":"println","args":["pivot 5 at index 3"]},
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(0,2) arr=[1,3,2,5,9,8,7]
    {"key":"cs","method":"push","args":["recursive qs(0, 2)",[]]},
    {"key":null,"method":"delay","args":[]},

    // partition(0,2) pivot=1
    {"key":"cs","method":"push","args":["partition(0, 2)",[]]},
    {"key":"vars","method":"setVar","args":["pivot",1]},
    {"key":"vars","method":"setVar","args":["i",1]},
    {"key":"vars","method":"setVar","args":["j",2]},
    {"key":"arr","method":"select","args":[0]},
    {"key":"log","method":"println","args":["partition(0,2) pivot=1"]},
    {"key":null,"method":"delay","args":[]},

    // i=1: arr[1]=3>1 stop. j=2: arr[2]=2>1→j=1, arr[1]=3>1→j=0. j=0
    {"key":"vars","method":"setVar","args":["j",0]},
    {"key":"log","method":"println","args":["i=1, j=0, i>=j break"]},
    {"key":null,"method":"delay","args":[]},

    // swap(0,0) — no-op, pivot already in place
    {"key":"log","method":"println","args":["pivot 1 already at index 0"]},
    {"key":"arr","method":"deselect","args":[0]},
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(1,2) arr=[1,3,2,5,9,8,7]
    {"key":"cs","method":"push","args":["recursive qs(1, 2)",[]]},
    {"key":null,"method":"delay","args":[]},

    // partition(1,2) pivot=3
    {"key":"cs","method":"push","args":["partition(1, 2)",[]]},
    {"key":"vars","method":"setVar","args":["pivot",3]},
    {"key":"vars","method":"setVar","args":["i",2]},
    {"key":"vars","method":"setVar","args":["j",2]},
    {"key":"arr","method":"select","args":[1]},
    {"key":"log","method":"println","args":["partition(1,2) pivot=3"]},
    {"key":null,"method":"delay","args":[]},

    // i=2: arr[2]=2<=3→i=3, i>j stop. j=2: arr[2]=2<=3 stop. j=2
    {"key":"vars","method":"setVar","args":["j",2]},
    {"key":"log","method":"println","args":["place pivot: swap(1,2)"]},
    {"key":null,"method":"delay","args":[]},

    // swap(1,2): 3↔2  arr→[1,2,3,5,9,8,7]
    {"key":"arr","method":"patch","args":[1,2]},
    {"key":"arr","method":"patch","args":[2,3]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"depatch","args":[1]},
    {"key":"arr","method":"depatch","args":[2]},
    {"key":"arr","method":"deselect","args":[1]},
    {"key":"log","method":"println","args":["pivot 3 at index 2"]},
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(1,2) done, pop
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(0,2) done, pop
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(4,6) arr=[1,2,3,5,9,8,7]
    {"key":"cs","method":"push","args":["recursive qs(4, 6)",[]]},
    {"key":null,"method":"delay","args":[]},

    // partition(4,6) pivot=9
    {"key":"cs","method":"push","args":["partition(4, 6)",[]]},
    {"key":"vars","method":"setVar","args":["pivot",9]},
    {"key":"vars","method":"setVar","args":["i",5]},
    {"key":"vars","method":"setVar","args":["j",6]},
    {"key":"arr","method":"select","args":[4]},
    {"key":"log","method":"println","args":["partition(4,6) pivot=9"]},
    {"key":null,"method":"delay","args":[]},

    // i=5: 8<=9→i=6, 7<=9→i=7, i>j. j=6: 7<=9 stop. j=6
    {"key":"vars","method":"setVar","args":["j",6]},
    {"key":"log","method":"println","args":["place pivot: swap(4,6)"]},
    {"key":null,"method":"delay","args":[]},

    // swap(4,6): 9↔7  arr→[1,2,3,5,7,8,9]
    {"key":"arr","method":"patch","args":[4,7]},
    {"key":"arr","method":"patch","args":[6,9]},
    {"key":null,"method":"delay","args":[]},
    {"key":"arr","method":"depatch","args":[4]},
    {"key":"arr","method":"depatch","args":[6]},
    {"key":"arr","method":"deselect","args":[4]},
    {"key":"log","method":"println","args":["pivot 9 at index 6"]},
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(4,5) arr=[1,2,3,5,7,8,9]
    {"key":"cs","method":"push","args":["recursive qs(4, 5)",[]]},
    {"key":null,"method":"delay","args":[]},

    // partition(4,5) pivot=7
    {"key":"cs","method":"push","args":["partition(4, 5)",[]]},
    {"key":"vars","method":"setVar","args":["pivot",7]},
    {"key":"vars","method":"setVar","args":["i",5]},
    {"key":"vars","method":"setVar","args":["j",5]},
    {"key":"arr","method":"select","args":[4]},
    {"key":"log","method":"println","args":["partition(4,5) pivot=7"]},
    {"key":null,"method":"delay","args":[]},

    // i=5: 8>7 stop. j=5: 8>7→j=4. j=4, i>=j break. swap(4,4) no-op
    {"key":"vars","method":"setVar","args":["j",4]},
    {"key":"log","method":"println","args":["pivot 7 already at index 4"]},
    {"key":"arr","method":"deselect","args":[4]},
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(4,5) done
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(4,6) done
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    // qs(0,6) done
    {"key":"cs","method":"pop","args":[]},
    {"key":null,"method":"delay","args":[]},

    {"key":"log","method":"println","args":["QuickSort complete! [1,2,3,5,7,8,9]"]},
    {"key":null,"method":"delay","args":[]},
];
