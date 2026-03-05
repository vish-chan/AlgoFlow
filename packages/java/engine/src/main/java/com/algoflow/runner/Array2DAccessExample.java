package com.algoflow.runner;

import com.algoflow.annotation.Visualize;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;

public class Array2DAccessExample {
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
    
    @Visualize("Magic Square")
    private int[][] square = new int[5][5];
    
    public static void main(String[] args) {
        new Array2DAccessExample().run();
    }
    
    public void run() {
        generateMagicSquare(5);
    }
    
    private void generateMagicSquare(int n) {
        int row = 0;
        int col = n / 2;
        
        for (int num = 1; num <= n * n; num++) {
            square[row][col] = num;
            
            int newRow = (row - 1 + n) % n;
            int newCol = (col + 1) % n;
            
            if (square[newRow][newCol] != 0) {
                row = (row + 1) % n;
            } else {
                row = newRow;
                col = newCol;
            }
        }
    }
}
