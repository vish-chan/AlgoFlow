package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

public class LogVisualizer implements Visualizer {
    
    private final LogTracer _tracer;

    public LogVisualizer() {
        _tracer = new LogTracer("Console");
    }
    
    public void log(String message) {
        _tracer.println(message);
        Tracer.delay();
    }
    
    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
