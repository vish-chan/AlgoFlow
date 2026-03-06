package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

public class GraphVisualizer implements Visualizer {
    
    private final GraphTracer _tracer;
    private final Object _adjacency;
    private Object _lastSource;
    
    public GraphVisualizer(String name, Object adjacency, boolean directed, boolean weighted) {
        this._tracer = new GraphTracer(name);
        this._adjacency = adjacency;
        if (directed) _tracer.directed(true);
        if (weighted) _tracer.weighted(true);
        buildGraph(adjacency);
        _tracer.layoutCircle();
        Tracer.delay();
    }
    
    private void buildGraph(Object adjacency) {
        if (adjacency instanceof int[][]) {
            _tracer.set(adjacency);
        }
    }
    
    public void visit(Object source, Object target) {
        leaveLastSource(source);
        _lastSource = source;
        _tracer.visit(target, source);
        Tracer.delay();
    }
    
    public void addEdge(int source, int target, int weight) {
        _tracer.addEdge(source, target, weight);
        Tracer.delay();
    }
    
    public void removeEdge(int source, int target) {
        _tracer.removeEdge(source, target);
        Tracer.delay();
    }
    
    private void leaveLastSource(Object newSource) {
        if (_lastSource != null && !_lastSource.equals(newSource)) {
            _tracer.leave(_lastSource);
            Tracer.delay();
        }
    }
    
    public void select(Object source, Object target) {
        _tracer.select(target, source);
        Tracer.delay();
    }
    
    public void deselect(Object source, Object target) {
        _tracer.deselect(target, source);
        Tracer.delay();
    }
    
    public int findRowIndex(Object rowArray) {
        if (_adjacency instanceof int[][] arr) {
            for (int i = 0; i < arr.length; i++) {
                if (arr[i] == rowArray) return i;
            }
        }
        return -1;
    }
    
    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
