package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.lang.reflect.Field;
import java.util.*;

public class TreeVisualizer implements Visualizer {

    private final GraphTracer _tracer;
    private final String _valField;
    private final String _leftField;
    private final String _rightField;
    private final Set<Object> _knownNodes = Collections.newSetFromMap(new IdentityHashMap<>());
    private Object _lastVisited;
    private Object _rootOwner;
    private String _rootFieldName;
    private Object _root;
    private int _nullCounter;

    public TreeVisualizer(String name, Object root, Class<?> nodeClass) {
        this._tracer = new GraphTracer(name);

        List<String> childFields = new ArrayList<>();
        String valField = null;
        for (Field f : nodeClass.getDeclaredFields()) {
            if (f.getType() == nodeClass) {
                childFields.add(f.getName());
            } else if (valField == null && !java.lang.reflect.Modifier.isStatic(f.getModifiers())) {
                valField = f.getName();
            }
        }
        this._leftField = !childFields.isEmpty() ? childFields.get(0) : "left";
        this._rightField = childFields.size() > 1 ? childFields.get(1) : "right";
        this._valField = valField != null ? valField : "val";
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
        _tracer.addNode(id(root), getNodeValue(root));
        queue.add(root);

        while (!queue.isEmpty()) {
            Object node = queue.poll();
            Object left = getChild(node, _leftField);
            Object right = getChild(node, _rightField);
            addChild(queue, node, left);
            addChild(queue, node, right);
        }
    }

    private void addChild(Queue<Object> queue, Object node, Object child) {
        if (child != null) {
            if (_knownNodes.add(child)) {
                _tracer.addNode(id(child), getNodeValue(child));
                queue.add(child);
            }
            _tracer.addEdge(id(node), id(child));
        } else {
            String nullId = "null_" + (_nullCounter++);
            _tracer.addNode(nullId);
            _tracer.addEdge(id(node), nullId);
        }
    }

    public void onFieldGet(Object owner, String fieldName) {
        if (!_knownNodes.contains(owner))
            return;
        leaveLastVisited(owner);
        _lastVisited = owner;
        _tracer.visit(id(owner));
        Tracer.delay();
    }

    public void onFieldSet(Object owner, String fieldName) {
        if (owner == _rootOwner && fieldName.equals(_rootFieldName)) {
            _root = getChild(_rootOwner, _rootFieldName);
            rebuild();
            return;
        }

        if (!_knownNodes.contains(owner))
            return;

        if (fieldName.equals(_valField)) {
            _tracer.updateNode(id(owner), getNodeValue(owner));
            Tracer.delay();
            return;
        }

        if (fieldName.equals(_leftField) || fieldName.equals(_rightField)) {
            rebuild();
        }
    }

    public void visit(Object node) {
        if (node == null || !_knownNodes.contains(node))
            return;
        leaveLastVisited(node);
        _lastVisited = node;
        _tracer.visit(id(node));
        Tracer.delay();
    }

    public void visit(Object node, Object parent) {
        if (node == null || !_knownNodes.contains(node))
            return;
        leaveLastVisited(node);
        _lastVisited = node;
        _tracer.visit(id(node), id(parent));
        Tracer.delay();
    }

    public void leave(Object node) {
        if (node == null || !_knownNodes.contains(node))
            return;
        _tracer.leave(id(node));
        Tracer.delay();
        if (_lastVisited == node)
            _lastVisited = null;
    }

    public void select(Object node) {
        if (node == null || !_knownNodes.contains(node))
            return;
        _tracer.select(id(node));
        Tracer.delay();
    }

    public void deselect(Object node) {
        if (node == null || !_knownNodes.contains(node))
            return;
        _tracer.deselect(id(node));
        Tracer.delay();
    }

    public boolean isTrackedNode(Object obj) {
        return _knownNodes.contains(obj) || obj == _rootOwner;
    }

    private void leaveLastVisited(Object newNode) {
        if (_lastVisited != null && _lastVisited != newNode) {
            _tracer.leave(id(_lastVisited));
            Tracer.delay();
        }
    }

    private double getNodeValue(Object node) {
        try {
            Field f = node.getClass().getDeclaredField(_valField);
            f.setAccessible(true);
            Object val = f.get(node);
            if (val instanceof Number n)
                return n.doubleValue();
            return 0;
        } catch (Exception e) {
            return 0;
        }
    }

    private Object getChild(Object node, String fieldName) {
        try {
            Field f = node.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            return f.get(node);
        } catch (Exception e) {
            return null;
        }
    }

    private static String id(Object node) {
        return String.valueOf(System.identityHashCode(node));
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
