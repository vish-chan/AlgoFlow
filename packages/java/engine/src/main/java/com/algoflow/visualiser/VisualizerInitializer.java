package com.algoflow.visualiser;

import com.algoflow.annotation.Visualize;
import com.algoflow.annotation.TrackRecursion;
import com.algoflow.annotation.VisualizeLocals;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.IdentityHashMap;
import java.util.Map;

public class VisualizerInitializer {
    
    private static final Map<Object, Boolean> _scanned = new IdentityHashMap<>();
    
    public static void autoScan(Object instance) {
        if (instance == null || _scanned.containsKey(instance)) return;
        _scanned.put(instance, true);
        
        Class<?> clazz = instance.getClass();
        
        // Scan @Visualize fields
        for (Field field : clazz.getDeclaredFields()) {
            if (field.isAnnotationPresent(Visualize.class)) {
                Visualize annotation = field.getAnnotation(Visualize.class);
                String name = annotation.value();
                if (name.isEmpty()) {
                    name = field.getName();
                }
                field.setAccessible(true);
                try {
                    Object value = field.get(instance);
                    if (value instanceof List<?> list) {
                        ListVisualizer visualizer;
                        if (is2DList(field)) {
                            visualizer = new Array2DVisualiser(list, name);
                        } else {
                            visualizer = new Array1DVisualiser(list, name);
                        }
                        VisualizerRegistry.register(visualizer, list);
                    } else if (value != null && value.getClass().isArray()) {
                        if (is2DArray(value)) {
                            PrimitiveArray2DVisualizer visualizer = new PrimitiveArray2DVisualizer(value, name);
                            VisualizerRegistry.register(visualizer, value);
                        } else {
                            PrimitiveArray1DVisualizer visualizer = new PrimitiveArray1DVisualizer(value, name);
                            VisualizerRegistry.register(visualizer, value);
                        }
                    }
                } catch (IllegalAccessException e) {
                    throw new RuntimeException("Failed to access field: " + field.getName(), e);
                }
            }
        }
        
        // Scan @TrackRecursion / @VisualizeLocals methods
        for (Method method : clazz.getDeclaredMethods()) {
            if (method.isAnnotationPresent(TrackRecursion.class)) {
                TrackRecursion annotation = method.getAnnotation(TrackRecursion.class);
                String name = annotation.value();
                if (name.isEmpty()) {
                    name = "RecursionViewer - " + method.getName();
                }
                RecursionTreeVisualizer visualizer = new RecursionTreeVisualizer(name);
                // Recursion tracking remains keyed only by method name for now.
                VisualizerRegistry.registerRecursion(method.getName(), visualizer);
            }
            
            if (method.isAnnotationPresent(VisualizeLocals.class)) {
                VisualizeLocals annotation = method.getAnnotation(VisualizeLocals.class);
                String name = annotation.name();
                if (name.isEmpty()) {
                    name = "LocalsVariables - " + method.getName();
                }
                String[] variableNames = annotation.value();
                LocalVariablesVisualizer visualizer = new LocalVariablesVisualizer(name, variableNames);
                String methodKey = buildMethodKey(clazz, method);
                VisualizerRegistry.registerLocalVariables(methodKey, visualizer);
            }
        }
        
        VisualizerRegistry.setLayout();
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

    /**
     * Builds a stable identifier for a method that is unique across overloads.
     * Format: fully.qualified.ClassName#methodName(paramDescriptor1paramDescriptor2...)
     * where descriptors use the JVM descriptor format (e.g. I, Ljava/lang/String;, [I).
     */
    private static String buildMethodKey(Class<?> clazz, Method method) {
        StringBuilder sb = new StringBuilder();
        sb.append(clazz.getName())
          .append("#")
          .append(method.getName())
          .append("(");
        Class<?>[] params = method.getParameterTypes();
        for (Class<?> param : params) {
            sb.append(typeToDescriptor(param));
        }
        sb.append(")");
        return sb.toString();
    }

    private static String typeToDescriptor(Class<?> type) {
        if (type.isPrimitive()) {
            if (type == void.class) return "V";
            if (type == boolean.class) return "Z";
            if (type == byte.class) return "B";
            if (type == char.class) return "C";
            if (type == short.class) return "S";
            if (type == int.class) return "I";
            if (type == long.class) return "J";
            if (type == float.class) return "F";
            if (type == double.class) return "D";
        }
        if (type.isArray()) {
            // For arrays, Class#getName already returns a descriptor-like string (e.g. [I, [Ljava.lang.String;)
            return type.getName().replace('.', '/');
        }
        // Object type
        return "L" + type.getName().replace('.', '/') + ";";
    }
}
