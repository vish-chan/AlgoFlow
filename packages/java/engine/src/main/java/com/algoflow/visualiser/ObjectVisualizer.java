package com.algoflow.visualiser;

public interface ObjectVisualizer extends Visualizer {
    void onRead(Object target, Object[] args);
    void onWrite(Object target, Object[] args);
    default void lateInit(Object value) {}
    default void refresh() {}
}
