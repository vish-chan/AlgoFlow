package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.lang.reflect.Array;

public class PrimitiveArray2DVisualizer implements ObjectVisualizer {

    private Object _array;
    private final Array2DTracer _tracer;

    public PrimitiveArray2DVisualizer(Object array, String name) {
        this._array = array;
        this._tracer = new Array2DTracer(name);
        if (array != null) updateDisplay();
    }

    @Override
    public void lateInit(Object value) {
        this._array = value;
        updateDisplay();
    }

    @Override
    public void onRead(Object target, Object[] args) {
        if (target == _array) return; // top-level access, no-op
        int row = findRowIndex(target);
        if (row >= 0) {
            int col = (Integer) args[0];
            _tracer.select(row, col);
            Tracer.delay();
            _tracer.deselect(row, col);
        }
    }

    @Override
    public void onWrite(Object target, Object[] args) {
        if (target == _array) return;
        int row = findRowIndex(target);
        if (row >= 0) {
            int col = (Integer) args[0];
            Object value = args[1];
            _tracer.patch(row, col, value);
            updateDisplay();
            _tracer.depatch(row, col);
        }
    }

    public int findRowIndex(Object rowArray) {
        if (_array == null || !_array.getClass().isArray()) return -1;
        int len = Array.getLength(_array);
        for (int i = 0; i < len; i++) {
            if (Array.get(_array, i) == rowArray) return i;
        }
        return -1;
    }

    /** Returns all row sub-arrays for eager registration. */
    public Object[] getRows() {
        if (_array == null || !_array.getClass().isArray()) return new Object[0];
        int len = Array.getLength(_array);
        Object[] rows = new Object[len];
        for (int i = 0; i < len; i++) {
            rows[i] = Array.get(_array, i);
        }
        return rows;
    }

    @Override
    public void refresh() {
        updateDisplay();
    }

    private void updateDisplay() {
        Object[][] boxed = to2DBoxedArray(_array);
        _tracer.set(boxed);
        Tracer.delay();
    }

    private Object[][] to2DBoxedArray(Object array) {
        if (array instanceof Object[][]) return (Object[][]) array;
        if (!array.getClass().isArray()) return new Object[0][0];
        int rows = Array.getLength(array);
        Object[][] result = new Object[rows][];
        for (int i = 0; i < rows; i++) {
            Object row = Array.get(array, i);
            int cols = Array.getLength(row);
            result[i] = new Object[cols];
            for (int j = 0; j < cols; j++) {
                Object v = Array.get(row, j);
                result[i][j] = (v instanceof Character) ? String.valueOf(v) : v;
            }
        }
        return result;
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
