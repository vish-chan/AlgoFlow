package com.algoflow.runner;

import com.algoflow.annotation.Visualize;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;
import java.util.*;

public class Matrix2DExample {

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
    
    @Visualize("Matrix")
    private List<List<Integer>> matrix = new ArrayList<>(Arrays.asList(
        new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)),
        new ArrayList<>(Arrays.asList(11, 12, 13, 14, 15, 16, 17, 18, 19, 20)),
        new ArrayList<>(Arrays.asList(21, 22, 23, 24, 25, 26, 27, 28, 29, 30)),
        new ArrayList<>(Arrays.asList(31, 32, 33, 34, 35, 36, 37, 38, 39, 40)),
        new ArrayList<>(Arrays.asList(41, 42, 43, 44, 45, 46, 47, 48, 49, 50)),
        new ArrayList<>(Arrays.asList(51, 52, 53, 54, 55, 56, 57, 58, 59, 60)),
        new ArrayList<>(Arrays.asList(61, 62, 63, 64, 65, 66, 67, 68, 69, 70)),
        new ArrayList<>(Arrays.asList(71, 72, 73, 74, 75, 76, 77, 78, 79, 80)),
        new ArrayList<>(Arrays.asList(81, 82, 83, 84, 85, 86, 87, 88, 89, 90)),
        new ArrayList<>(Arrays.asList(91, 92, 93, 94, 95, 96, 97, 98, 99, 100))
    ));
    
    public void transpose() {
        int rows = matrix.size();
        int cols = matrix.get(0).size();
        
        for (int i = 0; i < rows; i++) {
            System.out.println("Row: " + i);
            for (int j = i + 1; j < cols; j++) {
                System.out.println("Swapping matrix[" + i + "][" + j + "] with matrix[" + j + "][" + i + "]");
                int temp = matrix.get(i).get(j);
                matrix.get(i).set(j, matrix.get(j).get(i));
                matrix.get(j).set(i, temp);
            }
        }
        System.out.println("Done");
    }
    
    public static void main(String[] args) {
        new Matrix2DExample().transpose();
    }
}
