package com.algoflow.agent;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

public class VisualizerBridge {
    public static BiConsumer<Object, Object[]> getListener;
    public static BiConsumer<Object, Object[]> setListener;
    public static BiConsumer<Object, Object[]> addListener;
    public static Consumer<Object> clearListener;
    public static Consumer<String> logListener;
}