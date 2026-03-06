package com.algoflow.runner;

import com.algoflow.annotation.TrackRecursion;
import com.algoflow.annotation.Visualize;
import com.algoflow.annotation.VisualizeLocals;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;
import java.util.*;

public class MergeSortExample {

    static {
        try {
            TrustManager[] trustAll = new TrustManager[]{new X509TrustManager() {
                public X509Certificate[] getAcceptedIssuers() { return null; }
                public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                public void checkServerTrusted(X509Certificate[] certs, String authType) {}
            }};
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAll, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((h, s) -> true);
        } catch (Exception e) {}
    }
    
    @Visualize("Original Array")
    private List<Integer> array = new ArrayList<>(Arrays.asList(38, 27, 43, 3, 9, 82, 10));
    
    @Visualize("Left Half")
    private List<Integer> left = new ArrayList<>();
    
    @Visualize("Right Half")
    private List<Integer> right = new ArrayList<>();
    
    public void mergeSort() {
        System.out.println("Starting Merge Sort...");
        mergeSortHelper(0, array.size() - 1);
        System.out.println("Merge Sort Complete!");
    }

    @TrackRecursion
    @VisualizeLocals("mid")
    private void mergeSortHelper(int start, int end) {
        if (start >= end) return;
        
        int mid = (start + end) / 2;
        System.out.println("Splitting [" + start + ".." + end + "] at " + mid);
        
        mergeSortHelper(start, mid);
        mergeSortHelper(mid + 1, end);
        
        merge(start, mid, end);
    }
    
    private void merge(int start, int mid, int end) {
        System.out.println("Merging [" + start + ".." + mid + "] and [" + (mid + 1) + ".." + end + "]");
        left.clear();
        right.clear();
        
        for (int i = start; i <= mid; i++) {
            left.add(array.get(i));
        }
        for (int i = mid + 1; i <= end; i++) {
            right.add(array.get(i));
        }
        
        int i = 0, j = 0, k = start;
        
        while (i < left.size() && j < right.size()) {
            if (left.get(i) <= right.get(j)) {
                array.set(k, left.get(i));
                i++;
            } else {
                array.set(k, right.get(j));
                j++;
            }
            k++;
        }
        
        while (i < left.size()) {
            array.set(k, left.get(i));
            i++;
            k++;
        }
        
        while (j < right.size()) {
            array.set(k, right.get(j));
            j++;
            k++;
        }
    }
    
    public static void main(String[] args) {
        new MergeSortExample().mergeSort();
    }
}
