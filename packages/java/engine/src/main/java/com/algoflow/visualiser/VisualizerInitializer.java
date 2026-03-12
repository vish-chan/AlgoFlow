package com.algoflow.visualiser;

import com.algoflow.annotation.Graph;
import com.algoflow.annotation.Tree;

import java.lang.reflect.Field;
import java.util.*;

public class VisualizerInitializer {

    private static final Map<Object, Boolean> _scanned = new IdentityHashMap<>();
    private static final Set<Class<?>> _scannedClasses = new HashSet<>();

    public static void autoScan(Object instance) {
        if (instance == null || _scanned.containsKey(instance))
            return;
        _scanned.put(instance, true);

        scanFields(instance.getClass(), instance);
    }

    public static void scanStatics(Class<?> clazz) {
        if (!_scannedClasses.add(clazz))
            return;

        scanFields(clazz, null);
    }

    private static void scanFields(Class<?> clazz, Object instance) {
        boolean registered = false;

        boolean scanStatic = (instance == null);

        for (Field field : clazz.getDeclaredFields()) {
            if (scanStatic != java.lang.reflect.Modifier.isStatic(field.getModifiers()))
                continue;

            field.setAccessible(true);
            try {
                Object value = field.get(instance);
                if (registerField(field, value, instance)) {
                    registered = true;
                }
            } catch (IllegalAccessException e) {
                // skip inaccessible fields
            }
        }

        if (registered)
            VisualizerRegistry.setLayout();
    }

    private static boolean registerField(Field field, Object value, Object instance) {
        String name = field.getName();

        // Check for @Graph annotation first
        if (field.isAnnotationPresent(Graph.class)) {
            Graph annotation = field.getAnnotation(Graph.class);
            if (!isSupportedGraphType(value)) {
                System.err.println("[AlgoFlow] @Graph on '" + name + "': unsupported type. Supported: int[][]");
                return false;
            }
            GraphVisualizer vis = new GraphVisualizer(name, value, annotation.directed(), annotation.weighted());
            VisualizerRegistry.registerGraph(vis, value);
            return true;
        }

        // Check for @Tree annotation
        if (field.isAnnotationPresent(Tree.class)) {
            TreeVisualizer vis = new TreeVisualizer(name, value, field.getType());
            vis.setRootOwner(instance, name);
            VisualizerRegistry.registerTree(vis, field.getType());
            return true;
        }

        return value != null && registerValue(name, value, is2DList(field));
    }

    public static boolean registerLocalValue(String name, Object value) {
        if (value == null)
            return false;
        // Skip isRegistered check for tree nodes to allow multiple tree visualizers
        if (!VisualizerRegistry.isKnownTreeNodeClass(value.getClass().getName()) && VisualizerRegistry.isRegistered(value))
            return false;
        boolean is2D = (value instanceof List<?> list) && !list.isEmpty() && list.getFirst() instanceof List;
        if (!registerValue(name, value, is2D))
            return false;
        VisualizerRegistry.setLayout();
        return true;
    }

    private static boolean registerValue(String name, Object value, boolean is2DList) {
        // Check if it's a known tree node class first
        if (VisualizerRegistry.isKnownTreeNodeClass(value.getClass().getName())) {
            String treeName = name + "_tree";
            TreeVisualizer treeVis = new TreeVisualizer(treeName, value, value.getClass());
            VisualizerRegistry.registerTree(treeVis, value.getClass());
            return true;
        }
        
        if (value instanceof List<?> list) {
            ListVisualizer vis = is2DList ? new Array2DVisualiser(list, name) : new Array1DVisualiser(list, name);
            VisualizerRegistry.register(vis, list);
            return true;
        } else if (value instanceof Collection<?> collection) {
            VisualizerRegistry.register(new Array1DVisualiser(collection, name), collection);
            return true;
        } else if (value.getClass().isArray()) {
            if (is2DArray(value)) {
                VisualizerRegistry.register(new PrimitiveArray2DVisualizer(value, name), value);
            } else {
                VisualizerRegistry.register(new PrimitiveArray1DVisualizer(value, name), value);
            }
            return true;
        }
        return false;
    }

    private static boolean is2DList(Field field) {
        var genericType = field.getGenericType();
        if (genericType instanceof java.lang.reflect.ParameterizedType paramType) {
            var typeArgs = paramType.getActualTypeArguments();
            if (typeArgs.length > 0 && typeArgs[0] instanceof java.lang.reflect.ParameterizedType innerType) {
                return innerType.getRawType().equals(List.class);
            }
        }
        return false;
    }

    private static boolean is2DArray(Object value) {
        Class<?> clazz = value.getClass();
        return clazz.isArray() && clazz.getComponentType().isArray();
    }

    private static boolean isSupportedGraphType(Object value) {
        return value instanceof int[][];
    }
}
