package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.util.*;

public class LinkedListVisualizer implements Visualizer {

    private final Array1DTracer _tracer;
    private final NodeStructure _structure;
    private final Set<Object> _knownNodes = Collections.newSetFromMap(new IdentityHashMap<>());
    private final List<Object> _orderedNodes = new ArrayList<>();
    private final Map<String, Object> _localHeads = new LinkedHashMap<>();
    private Object _rootOwner;
    private String _rootFieldName;
    private Object _head;
    private Object _lastVisited;

    public LinkedListVisualizer(String name, Object head, Class<?> nodeClass) {
        this._structure = NodeStructure.of(nodeClass);
        this._head = head;
        this._tracer = new Array1DTracer(_structure.getListTypeLabel() + ": " + name);
        rebuild();
    }

    public void setRootOwner(Object owner, String fieldName) {
        this._rootOwner = owner;
        this._rootFieldName = fieldName;
    }

    public boolean onLocalUpdate(String varName, Object value) {
        if (value != null && value.getClass() == _structure.getNodeClass()) {
            _localHeads.put(varName, value);
            return true;
        }
        if (_localHeads.containsKey(varName)) {
            _localHeads.remove(varName);
            return true;
        }
        return false;
    }

    public void clearLocals() { _localHeads.clear(); }

    private void rebuild() {
        List<Object> heads = new ArrayList<>();
        if (_head != null) heads.add(_head);
        for (Object localHead : _localHeads.values()) {
            if (localHead != null) heads.add(localHead);
        }

        Set<Object> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        _orderedNodes.clear();
        for (Object h : heads) {
            Object node = h;
            int limit = 1000;
            while (node != null && limit-- > 0) {
                if (seen.contains(node)) break;
                seen.add(node);
                _knownNodes.add(node);
                _orderedNodes.add(node);
                node = _structure.getNext(node);
            }
        }

        List<Object> values = new ArrayList<>();
        for (Object n : _orderedNodes) values.add(_structure.getPrimaryValue(n));
        _tracer.set(values);
        Tracer.delay();
    }

    private int indexOf(Object node) {
        for (int i = 0; i < _orderedNodes.size(); i++) {
            if (_orderedNodes.get(i) == node) return i;
        }
        return -1;
    }

    public boolean onFieldGet(Object owner, String fieldName) {
        if (!_knownNodes.contains(owner)) return false;

        if (isNextField(fieldName)) {
            Object next = _structure.getNext(owner);
            if (next != null && _knownNodes.contains(next)) {
                int idx = indexOf(next);
                if (idx >= 0) {
                    leaveLastVisited();
                    _lastVisited = next;
                    _tracer.select(idx);
                    Tracer.delay();
                }
            }
            return true;
        }

        int idx = indexOf(owner);
        if (idx >= 0) {
            leaveLastVisited();
            _lastVisited = owner;
            _tracer.select(idx);
            Tracer.delay();
            return true;
        }
        return false;
    }

    public boolean onFieldSet(Object owner, String fieldName) {
        if (owner == _rootOwner && fieldName.equals(_rootFieldName)) {
            _head = getOwnerField(_rootOwner, _rootFieldName);
            rebuild();
            if (_head != null) VisualizerRegistry.emitObjectRef(_tracer, _head);
            return true;
        }

        if (!_knownNodes.contains(owner)) return false;

        if (isValueField(fieldName)) {
            int idx = indexOf(owner);
            if (idx >= 0) {
                _tracer.patch(idx, _structure.getPrimaryValue(owner));
                Tracer.delay();
                _tracer.depatch(idx);
            }
            return true;
        }

        if (isNextField(fieldName)) {
            Object next = _structure.getNext(owner);
            if (next != null) _knownNodes.add(next);
            rebuild();
            return true;
        }
        return false;
    }

    public boolean isTrackedNode(Object obj) {
        return _knownNodes.contains(obj);
    }

    public Class<?> getNodeClass() { return _structure.getNodeClass(); }
    public Object getHead() { return _head; }

    private boolean isNextField(String fieldName) {
        return (_structure.getNextField() != null && _structure.getNextField().getName().equals(fieldName))
                || (_structure.getPrevField() != null && _structure.getPrevField().getName().equals(fieldName));
    }

    private boolean isValueField(String fieldName) {
        return _structure.getValueFields().stream().anyMatch(f -> f.getName().equals(fieldName));
    }

    private void leaveLastVisited() {
        if (_lastVisited != null) {
            int idx = indexOf(_lastVisited);
            if (idx >= 0) _tracer.deselect(idx);
            _lastVisited = null;
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

    @Override
    public Commander getCommander() { return _tracer; }
}
