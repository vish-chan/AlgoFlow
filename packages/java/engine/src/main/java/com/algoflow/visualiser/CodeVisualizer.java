package com.algoflow.visualiser;

import org.algorithm_visualizer.Commander;
import org.algorithm_visualizer.Tracer;

public class CodeVisualizer implements Visualizer {

    private final CodeTracer _tracer;
    private int _lastLine = -1;

    public CodeVisualizer(String name) {
        this._tracer = new CodeTracer(name);
    }

    public void highlightLine(int lineNumber) {
        if (lineNumber == _lastLine)
            return;
        _lastLine = lineNumber;
        _tracer.highlightLine(lineNumber);
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
