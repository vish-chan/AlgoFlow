package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

public class PrimitiveArray1DVisualizer implements Visualizer {

    private final Object _array;
    private final Array1DTracer _tracer;
    private int _lastSelected = -1;

    public PrimitiveArray1DVisualizer(Object array, String name) {
        this._array = array;
        this._tracer = new Array1DTracer(name);
        updateDisplay();
    }

    public void onGet(Object[] args) {
        if (_lastSelected != -1) {
            _tracer.deselect(_lastSelected);
        }
        int idx = (Integer) args[0];
        _tracer.select(idx);
        Tracer.delay();
        _lastSelected = idx;
    }

    public void onSet(Object[] args) {
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
        Object[] boxed = toBoxedArray(_array);
        _tracer.set(boxed);
        Tracer.delay();
    }

    private Object[] toBoxedArray(Object array) {
        if (array instanceof Object[]) {
            return (Object[]) array;
        } else if (array instanceof int[] arr) {
            return java.util.Arrays.stream(arr).boxed().toArray();
        } else if (array instanceof long[] arr) {
            return java.util.Arrays.stream(arr).boxed().toArray();
        } else if (array instanceof double[] arr) {
            return java.util.Arrays.stream(arr).boxed().toArray();
        } else if (array instanceof float[] arr) {
            Float[] result = new Float[arr.length];
            for (int i = 0; i < arr.length; i++) result[i] = arr[i];
            return result;
        } else if (array instanceof byte[] arr) {
            Byte[] result = new Byte[arr.length];
            for (int i = 0; i < arr.length; i++) result[i] = arr[i];
            return result;
        } else if (array instanceof short[] arr) {
            Short[] result = new Short[arr.length];
            for (int i = 0; i < arr.length; i++) result[i] = arr[i];
            return result;
        } else if (array instanceof char[] arr) {
            Character[] result = new Character[arr.length];
            for (int i = 0; i < arr.length; i++) result[i] = arr[i];
            return result;
        } else if (array instanceof boolean[] arr) {
            Boolean[] result = new Boolean[arr.length];
            for (int i = 0; i < arr.length; i++) result[i] = arr[i];
            return result;
        }
        return new Object[0];
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
