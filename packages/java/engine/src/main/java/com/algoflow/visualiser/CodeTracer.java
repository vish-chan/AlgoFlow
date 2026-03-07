package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

public class CodeTracer extends LogTracer {
    
    public CodeTracer(String name) {
        super(name);
    }
    
    public void highlightLine(int lineNumber) {
        // Emit line highlight as a log event that can be captured by the frontend
        println(lineNumber);
    }
}