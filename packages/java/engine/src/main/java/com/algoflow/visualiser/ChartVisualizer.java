package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

public class ChartVisualizer implements ObjectVisualizer {

    private Object _array;
    private final ChartTracer _tracer;
    private int _lastSelected = -1;

    public ChartVisualizer(Object array, String name) {
        this._array = array;
        this._tracer = new ChartTracer(name);
        if (array != null) updateDisplay();
    }

    @Override
    public void lateInit(Object value) {
        this._array = value;
        updateDisplay();
    }

    @Override
    public void onRead(Object target, Object[] args) {
        if (_lastSelected != -1) {
            _tracer.deselect(_lastSelected);
        }
        int idx = (Integer) args[0];
        _tracer.select(idx);
        Tracer.delay();
        _lastSelected = idx;
    }

    @Override
    public void onWrite(Object target, Object[] args) {
        if (_lastSelected != -1) {
            _tracer.deselect(_lastSelected);
        }
        int idx = (Integer) args[0];
        Object value = args[1];
        _tracer.patch(idx, value);
        Tracer.delay();
        _tracer.depatch(idx);
        _lastSelected = idx;
    }

    private void updateDisplay() {
        _tracer.set(toBoxedArray(_array));
        Tracer.delay();
    }

    private Object[] toBoxedArray(Object array) {
        if (array instanceof int[] arr) return java.util.Arrays.stream(arr).boxed().toArray();
        if (array instanceof double[] arr) return java.util.Arrays.stream(arr).boxed().toArray();
        if (array instanceof long[] arr) return java.util.Arrays.stream(arr).boxed().toArray();
        if (array instanceof float[] arr) {
            Float[] r = new Float[arr.length];
            for (int i = 0; i < arr.length; i++) r[i] = arr[i];
            return r;
        }
        if (array instanceof Object[]) return (Object[]) array;
        return new Object[0];
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
