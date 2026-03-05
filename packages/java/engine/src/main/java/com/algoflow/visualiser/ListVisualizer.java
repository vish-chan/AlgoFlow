package com.algoflow.visualiser;

public interface ListVisualizer extends Visualizer {
    void onGet(Object[] args);
    void onSet(Object[] args);
    void onAdd(Object[] args);
    void onClear();
}