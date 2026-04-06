package com.algoflow.visualiser;

import org.algorithm_visualizer.*;
import java.util.*;

public class Array2DVisualiser implements ListVisualizer {

    private final List<List<?>> _matrix;
    private final Array2DTracer _tracer;

    public Array2DVisualiser(Object list, String name) {
        this._matrix = (List<List<?>>) list;
        this._tracer = new Array2DTracer(name);
        Object[][] array = _matrix.stream().map(List::toArray).toArray(Object[][]::new);
        _tracer.set(array);
        Tracer.delay();
    }

    @Override
    public void onRead(Object target, Object[] args) {
        int row = findRowIndex(target);
        if (row >= 0) {
            int col = (Integer) args[0];
            _tracer.select(row, col);
            Tracer.delay();
            _tracer.deselect(row, col);
        }
        // top-level get is no-op
    }

    @Override
    public void onWrite(Object target, Object[] args) {
        int row = findRowIndex(target);
        if (row >= 0) {
            int col = (Integer) args[0];
            Object value = args[1];
            _tracer.patch(row, col, value);
            Tracer.delay();
            _tracer.depatch(row, col);
        }
        // top-level set is no-op
    }

    @Override
    public void onGet(Object[] args) {}

    @Override
    public void onSet(Object[] args) {}

    @Override
    public void onAdd(Object[] args) {
        refreshDisplay();
    }

    @Override
    public void onRemove(Object[] args) {
        refreshDisplay();
    }

    @Override
    public void onClear() {
        _tracer.set(new Object[0][0]);
        Tracer.delay();
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }

    public int findRowIndex(Object nestedList) {
        for (int i = 0; i < _matrix.size(); i++) {
            if (_matrix.get(i) == nestedList) {
                return i;
            }
        }
        return -1;
    }

    /** Returns all nested lists for eager registration. */
    public List<?> getRows() {
        return _matrix;
    }

    private void refreshDisplay() {
        Object[][] array = _matrix.stream().map(List::toArray).toArray(Object[][]::new);
        _tracer.set(array);
        Tracer.delay();
    }
}
