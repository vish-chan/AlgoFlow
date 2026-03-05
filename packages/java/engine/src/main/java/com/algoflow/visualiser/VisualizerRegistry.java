package com.algoflow.visualiser;

import org.algorithm_visualizer.Commander;
import org.algorithm_visualizer.Layout;
import org.algorithm_visualizer.VerticalLayout;

import java.util.*;

public class VisualizerRegistry {

    private static final List<Commander> _visualizers = new ArrayList<>();
    private static final Map<Object, ListVisualizer> _objectToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, PrimitiveArray1DVisualizer> _arrayToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, PrimitiveArray2DVisualizer> _array2DToVisualizer = new IdentityHashMap<>();
    private static LogVisualizer _logVisualizer;
    private static final Map<String, RecursionTreeVisualizer> _recursionVisualizers = new HashMap<>();
    private static final Map<String, LocalVariablesVisualizer> _localVariablesVisualizers = new HashMap<>();

    public static void register(Visualizer visualizer, Object... objects) {
        if (visualizer instanceof ListVisualizer listVis) {
            _visualizers.add(visualizer.getCommander());
            for (Object obj : objects) {
                _objectToVisualizer.put(obj, listVis);
            }
        } else if (visualizer instanceof PrimitiveArray2DVisualizer array2DVis) {
            _visualizers.add(visualizer.getCommander());
            for (Object obj : objects) {
                _array2DToVisualizer.put(obj, array2DVis);
            }
        } else if (visualizer instanceof PrimitiveArray1DVisualizer arrayVis) {
            _visualizers.add(visualizer.getCommander());
            for (Object obj : objects) {
                _arrayToVisualizer.put(obj, arrayVis);
            }
        } else if (visualizer instanceof LogVisualizer logVis) {
            _logVisualizer = logVis;
        }
    }
    
    public static void registerRecursion(String methodName, RecursionTreeVisualizer visualizer) {
        _recursionVisualizers.put(methodName, visualizer);
        _visualizers.add(visualizer.getCommander());
    }
    
    public static void registerLocalVariables(String methodKey, LocalVariablesVisualizer visualizer) {
        _localVariablesVisualizers.put(methodKey, visualizer);
        _visualizers.add(visualizer.getCommander());
    }
    
    public static void onArrayGet(Object array, Object[] args) {
        if (!isCalledFromRunner()) return;
        
        // Check for row visualizer (2D array access)
        for (PrimitiveArray2DVisualizer vis2D : _array2DToVisualizer.values()) {
            PrimitiveArray2DVisualizer.RowVisualizer rowVis = vis2D.getRowVisualizer(array);
            if (rowVis != null) {
                rowVis.onGet(args);
                return;
            }
        }
        
        // Check for 2D array
        PrimitiveArray2DVisualizer array2DVis = _array2DToVisualizer.get(array);
        if (array2DVis != null) {
            array2DVis.onGet(args);
            return;
        }
        
        // Check for 1D array
        PrimitiveArray1DVisualizer arrayVis = _arrayToVisualizer.get(array);
        if (arrayVis != null) {
            arrayVis.onGet(args);
        }
    }
    
    public static void onArraySet(Object array, Object[] args) {
        if (!isCalledFromRunner()) return;
        
        // Check for row visualizer (2D array access)
        for (PrimitiveArray2DVisualizer vis2D : _array2DToVisualizer.values()) {
            PrimitiveArray2DVisualizer.RowVisualizer rowVis = vis2D.getRowVisualizer(array);
            if (rowVis != null) {
                rowVis.onSet(args);
                return;
            }
        }
        
        // Check for 2D array
        PrimitiveArray2DVisualizer array2DVis = _array2DToVisualizer.get(array);
        if (array2DVis != null) {
            array2DVis.onSet(args);
            return;
        }
        
        // Check for 1D array
        PrimitiveArray1DVisualizer arrayVis = _arrayToVisualizer.get(array);
        if (arrayVis != null) {
            arrayVis.onSet(args);
        }
    }
    
    public static void onGet(Object object, Object[] args) {
        if (!isCalledFromRunner()) return;
        
        ListVisualizer visualizer = _objectToVisualizer.computeIfAbsent(object, VisualizerRegistry::findVisualizer);
        if (visualizer != null) {
            visualizer.onGet(args);
        }
    }
    
    public static void onSet(Object object, Object[] args) {
        if (!isCalledFromRunner()) return;
        
        ListVisualizer visualizer = _objectToVisualizer.computeIfAbsent(object, VisualizerRegistry::findVisualizer);
        if (visualizer != null) {
            visualizer.onSet(args);
        }
    }

    public static void onAdd(Object object, Object[] args) {
        if (!isCalledFromRunner()) return;
        
        ListVisualizer visualizer = _objectToVisualizer.get(object);
        if (visualizer != null) {
            visualizer.onAdd(args);
        }
    }

    public static void onClear(Object object) {
        if (!isCalledFromRunner()) return;
        
        ListVisualizer visualizer = _objectToVisualizer.get(object);
        if (visualizer != null) {
            visualizer.onClear();
        }
    }

    public static void onLog(String message) {
        if (!isCalledFromRunner()) return;
        if (_logVisualizer != null) {
            _logVisualizer.log(message);
        }
    }
    
    public static void onRecursionEnter(String methodName, Object[] args) {
        RecursionTreeVisualizer visualizer = _recursionVisualizers.get(methodName);
        if (visualizer != null) {
            visualizer.onEnter(methodName, args);
        }
    }
    
    public static void onRecursionExit(String methodName, Object result) {
        RecursionTreeVisualizer visualizer = _recursionVisualizers.get(methodName);
        if (visualizer != null) {
            visualizer.onExit(methodName, result);
        }
    }

    public static void onLocalVariableUpdate(String methodKey, Object[] value) {
        LocalVariablesVisualizer visualizer = _localVariablesVisualizers.get(methodKey);
        if (visualizer != null) {
            String variableName = LocalVariablesVisualizer.getSlotName(methodKey, (Integer) value[0]);
            Object variableValue = value[1];
            visualizer.onVariableUpdate(variableName, variableValue);
        }
    }
    
    private static boolean isCalledFromRunner() {
        StackWalker walker = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE);
        return walker.walk(frames -> 
            frames.skip(3)
                  .findFirst()
                  .map(f -> f.getClassName().startsWith("com.algoflow.runner"))
                  .orElse(false)
        );
    }

    public static void setLayout() {
        if (_logVisualizer == null) {
            _logVisualizer = new LogVisualizer();
        }
        
        List<Commander> allCommanders = new ArrayList<>(_visualizers);
        allCommanders.add(_logVisualizer.getCommander());
        
        System.out.println("Setting layout with " + allCommanders.size() + " visualizers:");
        for (int i = 0; i < allCommanders.size(); i++) {
            System.out.println("  [" + i + "] " + allCommanders.get(i).getClass().getSimpleName());
        }
        Layout.setRoot(new VerticalLayout(allCommanders.toArray(Commander[]::new)));
    }
    
    private static ListVisualizer findVisualizer(Object object) {
        for (ListVisualizer visualizer : _objectToVisualizer.values()) {
            if (visualizer instanceof Array2DVisualiser array2D) {
                int rowIndex = array2D.findRowIndex(object);
                if (rowIndex != -1) {
                    return array2D.createNestedVisualizer(object, rowIndex);
                }
            }
        }
        return null;
    }
}
