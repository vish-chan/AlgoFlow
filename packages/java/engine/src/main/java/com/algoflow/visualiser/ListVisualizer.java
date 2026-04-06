package com.algoflow.visualiser;

public interface ListVisualizer extends ObjectVisualizer {
    void onGet(Object[] args);
    void onSet(Object[] args);
    void onAdd(Object[] args);
    void onRemove(Object[] args);
    void onClear();
    default void onContains(Object element) {}

    @Override
    default void onRead(Object target, Object[] args) {
        onGet(args);
    }

    @Override
    default void onWrite(Object target, Object[] args) {
        onSet(args);
    }
}
