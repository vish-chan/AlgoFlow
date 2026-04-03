package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.lang.reflect.Field;
import java.util.*;

public class LinkedListVisualizer implements Visualizer {

    private final Array1DTracer _tracer;
    private final String _valField;
    private final String _nextField;
    private final Class<?> _nodeClass;
    private final Set<Object> _knownNodes = Collections.newSetFromMap(new IdentityHashMap<>());
    private Object _rootOwner;
    private String _rootFieldName;
    private Object _head;
    private Object _lastVisited;

    public LinkedListVisualizer(String name, Object head, Class<?> nodeClass) {
        this._nodeClass = nodeClass;

        String nextField = null;
        String valField = null;
        int selfRefCount = 0;
        for (Field f : nodeClass.getDeclaredFields()) {
            if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) continue;
            if (f.getType() == nodeClass) {
                if (nextField == null) nextField = f.getName();
                selfRefCount++;
            } else if (valField == null) {
                valField = f.getName();
            }
        }
        this._nextField = nextField != null ? nextField : "next";
        this._valField = valField != null ? valField : "val";
        this._head = head;

        String dsType = selfRefCount == 1 ? "SinglyLinkedList" : "LinkedList";
        this._tracer = new Array1DTracer(dsType + ": " + name);

        rebuild();
    }

    public void setRootOwner(Object owner, String fieldName) {
        this._rootOwner = owner;
        this._rootFieldName = fieldName;
    }

    private void rebuild() {
        _knownNodes.clear();
        List<Object> values = walkValues();
        _tracer.set(values);
        Tracer.delay();
    }

    private List<Object> walkValues() {
        List<Object> values = new ArrayList<>();
        Object node = _head;
        int limit = 1000;
        while (node != null && limit-- > 0) {
            _knownNodes.add(node);
            values.add(getNodeValue(node));
            node = getNext(node);
            if (_knownNodes.contains(node)) break; // cycle guard
        }
        return values;
    }

    private int indexOf(Object node) {
        Object cur = _head;
        int idx = 0;
        int limit = 1000;
        while (cur != null && limit-- > 0) {
            if (cur == node) return idx;
            cur = getNext(cur);
            idx++;
        }
        return -1;
    }

    public void onFieldGet(Object owner, String fieldName) {
        if (!_knownNodes.contains(owner)) return;

        if (fieldName.equals(_nextField)) {
            Object next = getNext(owner);
            if (next != null && _knownNodes.contains(next)) {
                int idx = indexOf(next);
                if (idx >= 0) {
                    leaveLastVisited();
                    _lastVisited = next;
                    _tracer.select(idx);
                    Tracer.delay();
                }
            }
            return;
        }

        // val field read — select the node
        int idx = indexOf(owner);
        if (idx >= 0) {
            leaveLastVisited();
            _lastVisited = owner;
            _tracer.select(idx);
            Tracer.delay();
        }
    }

    public void onFieldSet(Object owner, String fieldName) {
        // Head reassignment
        if (owner == _rootOwner && fieldName.equals(_rootFieldName)) {
            _head = getField(_rootOwner, _rootFieldName);
            rebuild();
            return;
        }

        if (!_knownNodes.contains(owner)) return;

        if (fieldName.equals(_valField)) {
            int idx = indexOf(owner);
            if (idx >= 0) {
                _tracer.patch(idx, getNodeValue(owner));
                Tracer.delay();
                _tracer.depatch(idx);
            }
            return;
        }

        if (fieldName.equals(_nextField)) {
            // Structural change — rebuild
            rebuild();
        }
    }

    public boolean isTrackedNode(Object obj) {
        return _knownNodes.contains(obj) || obj == _rootOwner;
    }

    public Class<?> getNodeClass() {
        return _nodeClass;
    }

    private void leaveLastVisited() {
        if (_lastVisited != null) {
            int idx = indexOf(_lastVisited);
            if (idx >= 0) {
                _tracer.deselect(idx);
            }
            _lastVisited = null;
        }
    }

    private Object getNodeValue(Object node) {
        try {
            Field f = node.getClass().getDeclaredField(_valField);
            f.setAccessible(true);
            return f.get(node);
        } catch (Exception e) {
            return 0;
        }
    }

    private Object getNext(Object node) {
        return getField(node, _nextField);
    }

    private Object getField(Object obj, String fieldName) {
        try {
            Field f = obj.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            return f.get(obj);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
