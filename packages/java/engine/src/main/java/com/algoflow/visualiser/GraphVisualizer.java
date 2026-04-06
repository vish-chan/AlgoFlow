package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

public class GraphVisualizer implements ObjectVisualizer {

    private final GraphTracer _tracer;
    private Object _adjacency;
    private final boolean _weighted;
    private Object _lastSource;

    public GraphVisualizer(String name, Object adjacency, boolean directed, boolean weighted) {
        this._tracer = new GraphTracer(name);
        this._adjacency = adjacency;
        this._weighted = weighted;
        if (directed)
            _tracer.directed(true);
        if (weighted)
            _tracer.weighted(true);
        if (adjacency != null) {
            buildGraph();
            _tracer.layoutCircle();
        }
        Tracer.delay();
    }

    @Override
    public void lateInit(Object value) {
        this._adjacency = value;
        buildGraph();
        _tracer.layoutCircle();
        Tracer.delay();
    }

    @Override
    public void onRead(Object target, Object[] args) {
        if (target == _adjacency) {
            // Top-level access on adjacency matrix/map — no-op for matrix, visit for map
            if (isAdjList()) {
                visit(args[0]);
            }
            return;
        }
        // Subarray row access: adjMatrix[row][col]
        int row = findRowIndex(target);
        if (row >= 0) {
            int col = (Integer) args[0];
            if (((int[]) target)[col] != 0) {
                visit(row, col);
            }
        }
    }

    @Override
    public void onWrite(Object target, Object[] args) {
        if (target == _adjacency) return; // top-level set — no-op
        // Subarray row write: adjMatrix[row][col] = value
        int row = findRowIndex(target);
        if (row >= 0) {
            int col = (Integer) args[0];
            int value = (Integer) args[1];
            if (value != 0) {
                addEdge(row, col, value);
            } else {
                removeEdge(row, col);
            }
        }
    }

    // --- Map-based adj list operations (called directly by registry) ---

    public void onMapPut(Object node, Object neighbors) {
        _tracer.addNode(node);
        addEdgesForNode(node, neighbors);
        _tracer.layoutCircle();
        Tracer.delay();
    }

    public void onMapRemove(Object node) {
        _tracer.visit(node);
        Tracer.delay();
        _tracer.leave(node);
        if (_adjacency instanceof java.util.Map<?, ?> map) {
            removeEdgesForNode(node, map.get(node));
        }
        _tracer.removeNode(node);
        _tracer.layoutCircle();
        Tracer.delay();
    }

    public void onNeighborAdd(Object node, Object neighbor) {
        _tracer.addEdge(node, neighbor);
        _tracer.visit(neighbor, node);
        Tracer.delay();
    }

    public void onNeighborRemove(Object node, Object neighbor) {
        _tracer.removeEdge(node, neighbor);
        Tracer.delay();
    }

    public void onNeighborIterate(Object node, int index) {
        if (_adjacency instanceof java.util.Map<?, ?> map) {
            Object neighbors = map.get(node);
            if (neighbors instanceof java.util.List<?> list && index < list.size()) {
                Object neighbor = list.get(index);
                _tracer.visit(neighbor, node);
                Tracer.delay();
            }
        }
    }

    // --- Graph traversal operations ---

    public void visit(Object source, Object target) {
        leaveLastSource(source);
        _lastSource = source;
        _tracer.visit(target, source);
        Tracer.delay();
    }

    public void visit(Object node) {
        leaveLastSource(node);
        _lastSource = node;
        _tracer.visit(node);
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

    public void select(Object source, Object target) {
        _tracer.select(target, source);
        Tracer.delay();
    }

    public void deselect(Object source, Object target) {
        _tracer.deselect(target, source);
        Tracer.delay();
    }

    // --- Helpers ---

    private void buildGraph() {
        if (_adjacency instanceof int[][]) {
            _tracer.set(_adjacency);
        } else if (_adjacency instanceof java.util.Map<?, ?> map) {
            for (var entry : map.entrySet()) {
                Object node = entry.getKey();
                _tracer.addNode(node);
                addEdgesForNode(node, entry.getValue());
            }
        }
    }

    private void addEdgesForNode(Object node, Object neighbors) {
        if (neighbors instanceof java.util.List<?> list) {
            for (Object neighbor : list) {
                _tracer.addEdge(node, neighbor);
            }
        }
    }

    private void removeEdgesForNode(Object node, Object neighbors) {
        if (neighbors instanceof java.util.List<?> list) {
            for (Object neighbor : list) {
                _tracer.removeEdge(node, neighbor);
            }
        }
    }

    private void leaveLastSource(Object newSource) {
        if (_lastSource != null && !_lastSource.equals(newSource)) {
            _tracer.leave(_lastSource);
            Tracer.delay();
        }
    }

    public boolean isAdjList() {
        return _adjacency instanceof java.util.Map;
    }

    public Object findNodeForList(Object list) {
        if (_adjacency instanceof java.util.Map<?, ?> map) {
            for (var entry : map.entrySet()) {
                if (entry.getValue() == list) return entry.getKey();
            }
        }
        return null;
    }

    public int findRowIndex(Object rowArray) {
        if (_adjacency instanceof int[][] arr) {
            for (int i = 0; i < arr.length; i++) {
                if (arr[i] == rowArray)
                    return i;
            }
        }
        return -1;
    }

    /** Returns all row sub-arrays for eager registration. */
    public Object[] getRows() {
        if (_adjacency instanceof int[][] arr) {
            return arr;
        }
        return new Object[0];
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
