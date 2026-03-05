package com.algoflow.visualiser;

import org.algorithm_visualizer.*;
import java.util.*;

public class Array2DVisualiser implements ListVisualizer {

    private final List<List<?>> _matrix;
    private final Array2DTracer _tracer;

    public Array2DVisualiser(Object list, String name) {
        this._matrix = (List<List<?>>) list;
        this._tracer = new Array2DTracer(name);
        
        // Convert List<List<?>> to Object[][]
        Object[][] array = _matrix.stream()
            .map(List::toArray)
            .toArray(Object[][]::new);
        
        _tracer.set(array);
        Tracer.delay();
    }

    @Override
    public void onGet(Object[] args) {
        // NOOP
    }

    @Override
    public void onSet(Object[] args) {
        // NOOP
    }

    @Override
    public void onAdd(Object[] args) {
        Object[][] array = _matrix.stream()
            .map(List::toArray)
            .toArray(Object[][]::new);
        _tracer.set(array);
        Tracer.delay();
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
    
    public ListVisualizer createNestedVisualizer(Object nestedList, int rowIndex) {
        return new ListVisualizer() {
            @Override
            public void onGet(Object[] args) {
                int col = (Integer) args[0];
                _tracer.select(rowIndex, col);
                Tracer.delay();
                _tracer.deselect(rowIndex, col);
            }
            
            @Override
            public void onSet(Object[] args) {
                int col = (Integer) args[0];
                Object value = args[1];
                _tracer.patch(rowIndex, col, value);
                Tracer.delay();
                _tracer.depatch(rowIndex, col);
            }
            
            @Override
            public void onAdd(Object[] args) {
                Object[][] array = _matrix.stream()
                    .map(List::toArray)
                    .toArray(Object[][]::new);
                _tracer.set(array);
                Tracer.delay();
            }
            
            @Override
            public void onClear() {
                Object[][] array = _matrix.stream()
                    .map(List::toArray)
                    .toArray(Object[][]::new);
                _tracer.set(array);
                Tracer.delay();
            }
            
            @Override
            public Commander getCommander() {
                return _tracer;
            }
        };
    }
}
