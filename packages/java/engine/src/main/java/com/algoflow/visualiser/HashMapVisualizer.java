package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class HashMapVisualizer implements ObjectVisualizer {

    private final Map<?, ?> _map;
    private final Array2DTracer _tracer;

    public HashMapVisualizer(Map<?, ?> map, String name) {
        this._map = map;
        this._tracer = new Array2DTracer(name);
        updateDisplay();
        Tracer.delay();
    }

    @Override
    public void onRead(Object target, Object[] args) {
        onGet(args[0]);
    }

    @Override
    public void onWrite(Object target, Object[] args) {
        // Map writes are handled via onPut/onRemove/onClear directly
    }

    public void onPut(Object key, Object value, String phase) {
        if ("before".equals(phase)) {
            int existing = keyIndex(key);
            if (existing >= 0) {
                _tracer.patch(1, existing, value);
                Tracer.delay();
                _tracer.depatch(1, existing);
            }
        } else {
            updateDisplay();
            int col = keyIndex(key);
            if (col >= 0) {
                _tracer.select(0, col);
                _tracer.select(1, col);
                Tracer.delay();
                _tracer.deselect(0, col);
                _tracer.deselect(1, col);
            }
            Tracer.delay();
        }
    }

    public void onGet(Object key) {
        int col = keyIndex(key);
        if (col >= 0) {
            _tracer.select(0, col);
            _tracer.select(1, col);
            Tracer.delay();
            _tracer.deselect(0, col);
            _tracer.deselect(1, col);
            Tracer.delay();
        } else {
            Tracer.delay();
        }
    }

    public void onRemove(Object key, String phase) {
        if ("before".equals(phase)) {
            int col = keyIndex(key);
            if (col >= 0) {
                _tracer.patch(0, col, key);
                _tracer.patch(1, col, _map.get(key));
                Tracer.delay();
                _tracer.depatch(0, col);
                _tracer.depatch(1, col);
                Tracer.delay();
            }
        } else {
            updateDisplay();
            Tracer.delay();
        }
    }

    public void onClear() {
        updateDisplay();
        Tracer.delay();
    }

    public void onValueMutated() {
        updateDisplay();
        Tracer.delay();
    }

    public void onIterateIndex(int col) {
        _tracer.select(0, col);
        _tracer.select(1, col);
        Tracer.delay();
        _tracer.deselect(0, col);
        _tracer.deselect(1, col);
    }

    public boolean containsValue(Object value) {
        return _map.containsValue(value);
    }

    private int keyIndex(Object key) {
        int i = 0;
        for (Object k : _map.keySet()) {
            if (java.util.Objects.equals(k, key)) return i;
            i++;
        }
        return -1;
    }

    private void updateDisplay() {
        List<Object> keys = new ArrayList<>(_map.keySet());
        List<Object> values = new ArrayList<>();
        for (Object k : keys) values.add(_map.get(k));
        _tracer.set(new Object[][]{keys.toArray(), values.toArray()});
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
