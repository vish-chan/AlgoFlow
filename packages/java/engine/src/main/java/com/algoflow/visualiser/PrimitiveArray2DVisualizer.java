package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.lang.reflect.Array;
import java.util.IdentityHashMap;
import java.util.Map;

public class PrimitiveArray2DVisualizer implements Visualizer {

    private Object _array;
    private final Array2DTracer _tracer;
    private final Map<Object, RowVisualizer> _rowVisualizers = new IdentityHashMap<>();

    public PrimitiveArray2DVisualizer(Object array, String name) {
        this._array = array;
        this._tracer = new Array2DTracer(name);
        if (array != null) updateDisplay();
    }

    void lateInit(Object array) {
        this._array = array;
        updateDisplay();
    }

    public void onGet(Object[] args) {
        // NOOP
    }

    public void onSet(Object[] args) {
        // NOOP
    }

    public RowVisualizer getRowVisualizer(Object rowArray) {
        return _rowVisualizers.computeIfAbsent(rowArray, this::createRowVisualizer);
    }

    private RowVisualizer createRowVisualizer(Object rowArray) {
        int rowIndex = findRowIndex(rowArray);
        return new RowVisualizer(rowIndex);
    }

    private int findRowIndex(Object rowArray) {
        if (_array == null || !_array.getClass().isArray()) return -1;
        int len = Array.getLength(_array);
        for (int i = 0; i < len; i++) {
            if (Array.get(_array, i) == rowArray) return i;
        }
        return -1;
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

    public class RowVisualizer {
        private final int rowIndex;

        public RowVisualizer(int rowIndex) {
            this.rowIndex = rowIndex;
        }

        public void onGet(Object[] args) {
            int col = (Integer) args[0];
            _tracer.select(rowIndex, col);
            Tracer.delay();
            _tracer.deselect(rowIndex, col);
        }

        public void onSet(Object[] args) {
            int col = (Integer) args[0];
            Object value = args[1];
            _tracer.patch(rowIndex, col, value);
            updateDisplay();
            _tracer.depatch(rowIndex, col);
        }
    }
}
