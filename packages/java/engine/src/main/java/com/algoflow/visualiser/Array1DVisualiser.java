package com.algoflow.visualiser;

import org.algorithm_visualizer.*;
import java.util.*;

public class Array1DVisualiser implements ListVisualizer {

    private final Object _list;
    private final Array1DTracer _tracer;
    private int _lastSelected = -1;

    public Array1DVisualiser(Object list, String name) {
        this._list = list;
        this._tracer = new Array1DTracer(name);
        _tracer.set(((Collection<?>) list).toArray());

        Tracer.delay();
    }

    @Override
    public void onGet(Object[] args) {
        if (_lastSelected != -1) {
            _tracer.deselect(_lastSelected);
        }
        int idx = (Integer) args[0];
        _tracer.select(idx);
        Tracer.delay();
        _lastSelected = idx;
    }

    @Override
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

    @Override
    public void onAdd(Object[] args) {
        _tracer.set(((Collection<?>) _list).toArray());
        Tracer.delay();
    }

    @Override
    public void onRemove(Object[] args) {
        _tracer.set(((Collection<?>) _list).toArray());
        Tracer.delay();
    }

    @Override
    public void onClear() {
        _tracer.set(((Collection<?>) _list).toArray());
        Tracer.delay();
    }

    public void refresh() {
        _tracer.set(((java.util.Collection<?>) _list).toArray());
        Tracer.delay();
    }

    @Override
    public void onContains(Object element) {
        int i = 0;
        for (Object e : (Collection<?>) _list) {
            if (java.util.Objects.equals(e, element)) {
                _tracer.select(i);
                Tracer.delay();
                _tracer.deselect(i);
                Tracer.delay();
                return;
            }
            i++;
        }
        Tracer.delay();
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
