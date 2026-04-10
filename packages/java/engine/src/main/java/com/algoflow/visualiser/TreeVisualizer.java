package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.util.*;

public class TreeVisualizer implements Visualizer {

    private final GraphTracer _tracer;
    private final NodeStructure _structure;
    private final Set<Object> _knownNodes = Collections.newSetFromMap(new IdentityHashMap<>());
    private Object _lastVisited;
    private Object _rootOwner;
    private String _rootFieldName;
    private Object _root;
    private int _nullCounter;

    public TreeVisualizer(String name, Object root, Class<?> nodeClass) {
        this._tracer = new GraphTracer(name);
        this._structure = NodeStructure.of(nodeClass);
        this._root = root;

        _tracer.directed(true);
        rebuild();
    }

    public void setRootOwner(Object owner, String fieldName) {
        this._rootOwner = owner;
        this._rootFieldName = fieldName;
    }

    private void rebuild() {
        _knownNodes.clear();
        _nullCounter = 0;
        _tracer.reset();
        _tracer.directed(true);
        if (_root != null) {
            walkAndBuild(_root);
            _tracer.layoutTree(id(_root));
        }
        Tracer.delay();
    }

    private void walkAndBuild(Object root) {
        Queue<Object> queue = new LinkedList<>();
        _knownNodes.add(root);
        _tracer.addNode(id(root), _structure.getPrimaryValueAsDouble(root));
        queue.add(root);

        while (!queue.isEmpty()) {
            Object node = queue.poll();
            addChild(queue, node, _structure.getLeft(node));
            addChild(queue, node, _structure.getRight(node));
        }
    }

    private void addChild(Queue<Object> queue, Object node, Object child) {
        if (child != null) {
            if (_knownNodes.add(child)) {
                _tracer.addNode(id(child), _structure.getPrimaryValueAsDouble(child));
                queue.add(child);
            }
            _tracer.addEdge(id(node), id(child));
        } else {
            String nullId = "null_" + (_nullCounter++);
            _tracer.addNode(nullId);
            _tracer.addEdge(id(node), nullId);
        }
    }

    public boolean onFieldGet(Object owner, String fieldName) {
        if (!_knownNodes.contains(owner)) return false;

        if (isChildField(fieldName)) {
            Object child = getChild(owner, fieldName);
            if (child != null && _knownNodes.contains(child)) {
                leaveLastVisited(child);
                _lastVisited = child;
                _tracer.visit(id(child), id(owner));
                Tracer.delay();
            }
            return true;
        }
        if (_lastVisited == owner) return true;
        leaveLastVisited(owner);
        _lastVisited = owner;
        _tracer.visit(id(owner));
        Tracer.delay();
        return true;
    }

    public boolean onFieldSet(Object owner, String fieldName) {
        if (owner == _rootOwner && fieldName.equals(_rootFieldName)) {
            _root = getOwnerField(_rootOwner, _rootFieldName);
            rebuild();
            return true;
        }

        if (!_knownNodes.contains(owner)) return false;

        if (isValueField(fieldName)) {
            _tracer.updateNode(id(owner), _structure.getPrimaryValueAsDouble(owner));
            Tracer.delay();
            return true;
        }

        if (isChildField(fieldName)) {
            rebuild();
            return true;
        }
        return false;
    }

    public void visit(Object node) {
        if (node == null || !_knownNodes.contains(node)) return;
        leaveLastVisited(node);
        _lastVisited = node;
        _tracer.visit(id(node));
        Tracer.delay();
    }

    public void visit(Object node, Object parent) {
        if (node == null || !_knownNodes.contains(node)) return;
        leaveLastVisited(node);
        _lastVisited = node;
        _tracer.visit(id(node), id(parent));
        Tracer.delay();
    }

    public void leave(Object node) {
        if (node == null || !_knownNodes.contains(node)) return;
        _tracer.leave(id(node));
        Tracer.delay();
        if (_lastVisited == node) _lastVisited = null;
    }

    public void select(Object node) {
        if (node == null || !_knownNodes.contains(node)) return;
        _tracer.select(id(node));
        Tracer.delay();
    }

    public void deselect(Object node) {
        if (node == null || !_knownNodes.contains(node)) return;
        _tracer.deselect(id(node));
        Tracer.delay();
    }

    public boolean isTrackedNode(Object obj) {
        return _knownNodes.contains(obj);
    }

    public Object getRoot() { return _root; }

    public Class<?> getNodeClass() { return _structure.getNodeClass(); }

    public void reRoot(Object newRoot) {
        if (newRoot == _root) return;
        _root = newRoot;
        rebuild();
    }

    private boolean isChildField(String fieldName) {
        return (_structure.getLeftField() != null && _structure.getLeftField().getName().equals(fieldName))
                || (_structure.getRightField() != null && _structure.getRightField().getName().equals(fieldName));
    }

    private boolean isValueField(String fieldName) {
        return _structure.getValueFields().stream().anyMatch(f -> f.getName().equals(fieldName));
    }

    private Object getChild(Object node, String fieldName) {
        return getOwnerField(node, fieldName);
    }

    private void leaveLastVisited(Object newNode) {
        if (_lastVisited != null && _lastVisited != newNode) {
            _tracer.leave(id(_lastVisited));
            Tracer.delay();
        }
    }

    private static Object getOwnerField(Object obj, String fieldName) {
        try {
            java.lang.reflect.Field f = obj.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            return f.get(obj);
        } catch (Exception e) {
            return null;
        }
    }

    private static String id(Object node) {
        return String.valueOf(System.identityHashCode(node));
    }

    @Override
    public Commander getCommander() { return _tracer; }
}
