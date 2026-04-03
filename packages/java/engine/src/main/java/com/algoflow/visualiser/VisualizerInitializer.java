package com.algoflow.visualiser;

import com.algoflow.annotation.Chart;
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

        scanStatics(instance.getClass());
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
                if (registerField(field, value, instance, clazz)) {
                    registered = true;
                }
            } catch (IllegalAccessException e) {
                // skip inaccessible fields
            }
        }

        if (registered)
            VisualizerRegistry.setLayout();
    }

    private static boolean registerField(Field field, Object value, Object instance, Class<?> clazz) {
        String name = field.getName();

        // Check for @Chart annotation
        if (field.isAnnotationPresent(Chart.class)) {
            if (value != null && !value.getClass().isArray()) {
                System.err.println("[AlgoFlow] @Chart on '" + name + "': unsupported type. Supported: primitive arrays");
                return false;
            }
            ChartVisualizer vis = new ChartVisualizer(value, name);
            VisualizerRegistry.registerChart(vis, value);
            if (value == null) deferNull(instance, clazz, name, vis);
            return true;
        }

        // Check for @Graph annotation
        if (field.isAnnotationPresent(Graph.class)) {
            Graph annotation = field.getAnnotation(Graph.class);
            if (value != null && !isSupportedGraphType(value)) {
                System.err.println("[AlgoFlow] @Graph on '" + name + "': unsupported type. Supported: int[][], Map<K, List<V>>");
                return false;
            }
            GraphVisualizer vis = new GraphVisualizer(name, value, annotation.directed(), annotation.weighted());
            VisualizerRegistry.registerGraph(vis, value);
            if (value == null) deferNull(instance, clazz, name, vis);
            return true;
        }

        // Check for @Tree annotation
        if (field.isAnnotationPresent(Tree.class)) {
            TreeVisualizer vis = new TreeVisualizer(name, value, field.getType());
            vis.setRootOwner(instance, name);
            VisualizerRegistry.registerTree(vis);
            return true;
        }

        // Check for @LinkedList annotation
        if (field.isAnnotationPresent(com.algoflow.annotation.LinkedList.class)) {
            LinkedListVisualizer vis = new LinkedListVisualizer(name, value, field.getType());
            vis.setRootOwner(instance, name);
            VisualizerRegistry.registerLinkedList(vis);
            return true;
        }

        if (value == null) {
            // Register null fields eagerly so they appear in the layout
            Class<?> type = field.getType();
            if (type.isArray()) {
                if (type.getComponentType().isArray()) {
                    var vis = new PrimitiveArray2DVisualizer(null, "int[][]: " + name);
                    VisualizerRegistry.register(vis);
                    deferNull(instance, clazz, name, vis);
                } else {
                    var vis = new PrimitiveArray1DVisualizer(null, "int[]: " + name);
                    VisualizerRegistry.register(vis);
                    deferNull(instance, clazz, name, vis);
                }
                return true;
            }
            return false;
        }

        return registerValue(name, value, is2DList(field));
    }

    public static boolean registerLocalValue(String name, Object value) {
        if (value == null)
            return false;
        if (VisualizerRegistry.isRegistered(value))
            return false;

        // Check if it's a tree node — delegate to registry for temp registration
        VisualizerRegistry.handleTreeLocalVariable(name, value);

        boolean is2D = (value instanceof List<?> list) && !list.isEmpty() && list.getFirst() instanceof List;
        if (!registerValue(name, value, is2D))
            return false;
        VisualizerRegistry.setLayout();
        return true;
    }

    private static String typedName(String name, Object value) {
        String prefix = switch (value) {
            case Stack<?> objects -> "Stack";
            case LinkedList<?> objects -> "LinkedList";
            case ArrayList<?> objects -> "ArrayList";
            case ArrayDeque<?> objects -> "Deque";
            case PriorityQueue<?> objects -> "PriorityQueue";
            case java.util.TreeSet<?> objects -> "TreeSet";
            case java.util.LinkedHashSet<?> objects -> "LinkedHashSet";
            case java.util.HashSet<?> objects -> "HashSet";
            case null, default -> "Collection";
        };
        return prefix + ": " + name;
    }

    private static boolean registerValue(String name, Object value, boolean is2DList) {
        if (value instanceof java.util.Map<?, ?> map) {
            HashMapVisualizer vis = new HashMapVisualizer(map, "Map: " + name);
            VisualizerRegistry.registerMap(vis, map);
            return true;
        } else if (value instanceof List<?> list) {
            ListVisualizer vis = is2DList ? new Array2DVisualiser(list, name) : new Array1DVisualiser(list, typedName(name, value));
            VisualizerRegistry.register(vis, list);
            return true;
        } else if (value instanceof Collection<?> collection) {
            VisualizerRegistry.register(new Array1DVisualiser(collection, typedName(name, value)), collection);
            return true;
        } else if (value.getClass().isArray()) {
            if (is2DArray(value)) {
                VisualizerRegistry.register(new PrimitiveArray2DVisualizer(value, "int[][]: " + name), value);
            } else {
                VisualizerRegistry.register(new PrimitiveArray1DVisualizer(value, "int[]: " + name), value);
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

    private static void deferNull(Object instance, Class<?> clazz, String fieldName, Visualizer vis) {
        if (instance != null) {
            VisualizerRegistry.deferField(instance, fieldName, vis);
        } else {
            VisualizerRegistry.deferStaticField(clazz.getName(), fieldName, vis);
        }
    }

    private static boolean isSupportedGraphType(Object value) {
        return value instanceof int[][] || value instanceof java.util.Map;
    }
}
