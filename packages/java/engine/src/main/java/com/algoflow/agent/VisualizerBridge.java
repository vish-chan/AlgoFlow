package com.algoflow.agent;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

public class VisualizerBridge {
    public static BiConsumer<Object, Object[]> getListener;
    public static BiConsumer<Object, Object[]> setListener;
    public static BiConsumer<Object, Object[]> addListener;
    public static Consumer<Object> clearListener;
    public static Consumer<String> printlnListener;
    public static Consumer<String> printListener;
    public static BiConsumer<Object, Object[]> removeListener;
    public static java.util.function.Consumer<Object> iteratorNextListener;
    public static BiConsumer<Object, Object> iteratorCreatedListener;
    public static BiConsumer<Object, Object[]> mapPutListener;
    public static BiConsumer<Object, Object[]> mapGetListener;
    public static BiConsumer<Object, Object[]> mapRemoveListener;
    public static Consumer<Object> mapClearListener;
    public static BiConsumer<Object, Object[]> containsListener;
    public static Consumer<Object> apiMutateListener;
    public static volatile int apiCallDepth;
}
