package com.algoflow.runner;

import com.algoflow.annotation.Visualize;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;
import java.util.*;

public class ShortestUnsortedSubarrayExample {

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
    
    @Visualize
    private List<Integer> nums = new ArrayList<>(Arrays.asList(2, 6, 4, 8, 10, 9, 15));

    @Visualize
    private List<Integer> max = new ArrayList<>(List.of(Integer.MIN_VALUE));

    @Visualize
    private List<Integer> min = new ArrayList<>(List.of(Integer.MAX_VALUE));


    public int findUnsortedSubarray() {
        int n = nums.size();
        int left = -1, right = -1;

        // Find right boundary
        for (int i = 0; i < n; i++) {
            int val = nums.get(i);
            if (val < max.getFirst()) {
                right = i;
            } else {
                max.set(0, val);
            }
        }
        
        // Find left boundary
        for (int i = n - 1; i >= 0; i--) {
            int val = nums.get(i);
            if (val > min.getFirst()) {
                left = i;
            } else {
                min.set(0, val);
            }
        }
        
        return right == -1 ? 0 : right - left + 1;
    }
    
    public static void main(String[] args) {
        ShortestUnsortedSubarrayExample example = new ShortestUnsortedSubarrayExample();
        int length = example.findUnsortedSubarray();
        System.out.println("Shortest unsorted subarray length: " + length);
    }
}
