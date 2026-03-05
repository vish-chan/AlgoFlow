package com.algoflow.visualiser;

import org.algorithm_visualizer.*;
import java.util.*;

public class RecursionTreeVisualizer implements Visualizer {
    
    private final Array2DTracer _tracer;
    private final Deque<String> _callStack = new ArrayDeque<>();
    
    public RecursionTreeVisualizer(String name) {
        this._tracer = new Array2DTracer(name);
    }
    
    public void onEnter(String methodName, Object[] args) {
        String label = formatCall(methodName, args);
        _callStack.addFirst(label);
        updateDisplay(false);
    }
    
    public void onExit(String methodName, Object result) {
        if (!_callStack.isEmpty()) {
            if(result != null) {
                String updated = _callStack.removeFirst() + " → " + result;
                _callStack.addFirst(updated);
            }
            updateDisplay(true);
            _callStack.removeFirst();
            updateDisplay(false);
        }
    }
    
    private void updateDisplay(boolean patchTop) {
        Object[][] grid = new Object[_callStack.size()][1];
        int i = 0;
        for (String call : _callStack) {
            grid[i++][0] = call;
        }
        _tracer.set(grid);
        if (!_callStack.isEmpty()) {
            if (patchTop) {
                _tracer.patch(0, 0);
            } else {
                _tracer.select(0, 0);
                if(_callStack.size() > 1) {
                    _tracer.deselect(0, 1);
                }
            }
            Tracer.delay();
        }
    }
    
    private String formatCall(String methodName, Object[] args) {
        if (args == null || args.length == 0) {
            return methodName + "()";
        }
        StringBuilder sb = new StringBuilder(methodName).append("(");
        for (int i = 0; i < args.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(args[i]);
        }
        return sb.append(")").toString();
    }
    
    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
