package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.util.IdentityHashMap;
import java.util.Map;

public class PrimitiveArray2DVisualizer implements Visualizer {

    private final Object _array;
    private final Array2DTracer _tracer;
    private final Map<Object, RowVisualizer> _rowVisualizers = new IdentityHashMap<>();

    public PrimitiveArray2DVisualizer(Object array, String name) {
        this._array = array;
        this._tracer = new Array2DTracer(name);
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
        if (_array instanceof Object[][] arr) {
            for (int i = 0; i < arr.length; i++) {
                if (arr[i] == rowArray) return i;
            }
        } else if (_array instanceof int[][] arr) {
            for (int i = 0; i < arr.length; i++) {
                if (arr[i] == rowArray) return i;
            }
        }
        return -1;
    }

    private void updateDisplay() {
        Object[][] boxed = to2DBoxedArray(_array);
        _tracer.set(boxed);
        Tracer.delay();
    }

    private Object[][] to2DBoxedArray(Object array) {
        if (array instanceof int[][] arr) {
            Object[][] result = new Object[arr.length][];
            for (int i = 0; i < arr.length; i++) {
                result[i] = java.util.Arrays.stream(arr[i]).boxed().toArray();
            }
            return result;
        } else if (array instanceof Object[][]) {
            return (Object[][]) array;
        }
        return new Object[0][0];
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
