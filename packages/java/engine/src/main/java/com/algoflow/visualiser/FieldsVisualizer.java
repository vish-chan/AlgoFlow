package com.algoflow.visualiser;

import org.algorithm_visualizer.*;

import java.lang.reflect.Array;
import java.util.*;

public class FieldsVisualizer implements Visualizer {

    private final Array2DTracer _tracer;
    private final Map<String, Object[]> _fields = new LinkedHashMap<>();

    public FieldsVisualizer(String name) {
        this._tracer = new Array2DTracer(name);
    }

    public void onFieldUpdate(String fieldName, Object value) {
        _fields.put(fieldName, sanitizeEntry(value));
        updateDisplay(fieldName);
    }

    public void setField(String fieldName, Object value) {
        _fields.put(fieldName, sanitizeEntry(value));
    }

    public void flush() {
        updateDisplay(null);
    }

    /** Returns [displayValue, refId] where refId is identityHashCode for objects, empty string for primitives/null. */
    static Object[] sanitizeEntry(Object value) {
        if (value == null) return new Object[]{"null", ""};
        if (value instanceof Number || value instanceof String
                || value instanceof Boolean || value instanceof Character) {
            return new Object[]{value, ""};
        }
        return new Object[]{displayLabel(value), System.identityHashCode(value)};
    }

    static String displayLabel(Object value) {
        if (value == null) return "null";
        Class<?> clazz = value.getClass();
        if (clazz.isArray()) {
            String type = clazz.getComponentType().isArray()
                    ? clazz.getComponentType().getComponentType().getSimpleName() + "[][]"
                    : clazz.getComponentType().getSimpleName() + "[]";
            return type + "(" + Array.getLength(value) + ")";
        }
        if (value instanceof Collection<?> c) {
            String type = switch (value) {
                case Stack<?> ignored -> "Stack";
                case LinkedList<?> ignored -> "LinkedList";
                case ArrayList<?> ignored -> "ArrayList";
                case ArrayDeque<?> ignored -> "Deque";
                case PriorityQueue<?> ignored -> "PriorityQueue";
                case TreeSet<?> ignored -> "TreeSet";
                case LinkedHashSet<?> ignored -> "LinkedHashSet";
                case HashSet<?> ignored -> "HashSet";
                default -> "Collection";
            };
            return type + "(" + c.size() + ")";
        }
        if (value instanceof Map<?, ?> m) {
            return "Map(" + m.size() + ")";
        }
        return clazz.getSimpleName();
    }

    private void updateDisplay(String patchedField) {
        List<Object[]> rows = new ArrayList<>();
        int patchedRow = -1;
        int rowIdx = 0;

        for (Map.Entry<String, Object[]> entry : _fields.entrySet()) {
            Object[] val = entry.getValue();
            rows.add(new Object[]{entry.getKey(), val[0], val[1]});
            if (entry.getKey().equals(patchedField)) {
                patchedRow = rowIdx;
            }
            rowIdx++;
        }

        _tracer.set(rows.toArray(Object[][]::new));
        if (patchedRow >= 0) {
            _tracer.patch(patchedRow, 1);
            Tracer.delay();
            _tracer.depatch(patchedRow, 1);
        } else {
            Tracer.delay();
        }
    }

    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
