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
    private static final Map<Object, GraphVisualizer> _graphToVisualizer = new IdentityHashMap<>();
    private static LogVisualizer _logVisualizer;
    private static final Map<String, LocalVariablesVisualizer> _localVariablesVisualizers = new HashMap<>();
    private static CallStackVisualizer _callStackVisualizer;

    public static boolean isRegistered(Object obj) {
        return _objectToVisualizer.containsKey(obj) || _arrayToVisualizer.containsKey(obj)
                || _array2DToVisualizer.containsKey(obj) || _graphToVisualizer.containsKey(obj);
    }

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
        } else if (visualizer instanceof GraphVisualizer graphVis) {
            _visualizers.add(visualizer.getCommander());
            for (Object obj : objects) {
                _graphToVisualizer.put(obj, graphVis);
            }
        }
    }
    
    public static void registerGraph(GraphVisualizer visualizer, Object graphObj) {
        _visualizers.add(visualizer.getCommander());
        _graphToVisualizer.put(graphObj, visualizer);
    }
    
    public static void onMethodEnter(String methodName, Object[] args) {
        if (_callStackVisualizer == null) {
            _callStackVisualizer = new CallStackVisualizer("CallStack");
            _visualizers.add(_callStackVisualizer.getCommander());
            setLayout();
        }
        _callStackVisualizer.onEnter(methodName, args);
    }
    
    public static void onMethodExit(String methodName, Object result) {
        if (_callStackVisualizer != null) {
            _callStackVisualizer.onExit(methodName, result);
        }
    }
    
    public static void registerLocalVariables(String methodKey, LocalVariablesVisualizer visualizer) {
        _localVariablesVisualizers.put(methodKey, visualizer);
        _visualizers.add(visualizer.getCommander());
    }
    
    private static volatile boolean _processing = false;
    
    public static void onArrayGet(Object array, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            doArrayGet(array, args);
        } finally {
            _processing = false;
        }
    }
    
    private static void doArrayGet(Object array, Object[] args) {
        
        // Check if this array is a graph (int[][] adjacency matrix)
        GraphVisualizer graphVis = _graphToVisualizer.get(array);
        if (graphVis != null) {
            // Top-level access: adjMatrix[row] — no-op, wait for subarray access
            return;
        }
        
        // Check if this is a subarray (row) of a graph
        GraphVisualizer parentGraph = findParentGraph(array);
        if (parentGraph != null) {
            int row = parentGraph.findRowIndex(array);
            if (row >= 0) {
                int col = (Integer) args[0];
                if (((int[]) array)[col] != 0) {
                    parentGraph.visit(row, col);
                }
                return;
            }
        }
        
        // Check for row visualizer (2D array access)
        for (PrimitiveArray2DVisualizer vis2D : _array2DToVisualizer.values()) {
            PrimitiveArray2DVisualizer.RowVisualizer rowVis = vis2D.getRowVisualizer(array);
            if (rowVis != null) {
                rowVis.onGet(args);
                return;
            }
        }
        
        PrimitiveArray2DVisualizer array2DVis = _array2DToVisualizer.get(array);
        if (array2DVis != null) {
            array2DVis.onGet(args);
            return;
        }
        
        PrimitiveArray1DVisualizer arrayVis = _arrayToVisualizer.get(array);
        if (arrayVis != null) {
            arrayVis.onGet(args);
        }
    }
    
    public static void onArraySet(Object array, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            doArraySet(array, args);
        } finally {
            _processing = false;
        }
    }
    
    private static void doArraySet(Object array, Object[] args) {
        
        // Check if this array is a graph (int[][] adjacency matrix)
        GraphVisualizer graphVis = _graphToVisualizer.get(array);
        if (graphVis != null) {
            // Top-level set on adjacency matrix — no-op
            return;
        }
        
        // Check if this is a subarray (row) of a graph
        GraphVisualizer parentGraph = findParentGraph(array);
        if (parentGraph != null) {
            int row = parentGraph.findRowIndex(array);
            if (row >= 0) {
                int col = (Integer) args[0];
                if (((int[]) array)[col] != 0) {
                    parentGraph.visit(row, col);
                }
                return;
            }
        }
        
        // Check for row visualizer (2D array access)
        for (PrimitiveArray2DVisualizer vis2D : _array2DToVisualizer.values()) {
            PrimitiveArray2DVisualizer.RowVisualizer rowVis = vis2D.getRowVisualizer(array);
            if (rowVis != null) {
                rowVis.onSet(args);
                return;
            }
        }
        
        PrimitiveArray2DVisualizer array2DVis = _array2DToVisualizer.get(array);
        if (array2DVis != null) {
            array2DVis.onSet(args);
            return;
        }
        
        PrimitiveArray1DVisualizer arrayVis = _arrayToVisualizer.get(array);
        if (arrayVis != null) {
            arrayVis.onSet(args);
        }
    }
    
    public static void onGet(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer visualizer = _objectToVisualizer.computeIfAbsent(object, VisualizerRegistry::findVisualizer);
            if (visualizer != null) {
                visualizer.onGet(args);
            }
        } finally {
            _processing = false;
        }
    }
    
    public static void onSet(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer visualizer = _objectToVisualizer.computeIfAbsent(object, VisualizerRegistry::findVisualizer);
            if (visualizer != null) {
                visualizer.onSet(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onAdd(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onAdd(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onRemove(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onRemove(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onClear(Object object) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onClear();
            }
        } finally {
            _processing = false;
        }
    }

    private static final IdentityHashMap<Object, ListVisualizer> _iteratorToVisualizer = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, int[]> _iteratorIndex = new IdentityHashMap<>();

    public static void onIteratorCreated(Object collection, Object iterator) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer vis = _objectToVisualizer.get(collection);
            if (vis != null) {
                _iteratorToVisualizer.put(iterator, vis);
                _iteratorIndex.put(iterator, new int[]{0});
            }
        } finally {
            _processing = false;
        }
    }

    public static void onIteratorNext(Object iterator) {
        if (_processing) return;
        _processing = true;
        try {
            ListVisualizer vis = _iteratorToVisualizer.get(iterator);
            if (vis != null) {
                int[] idx = _iteratorIndex.get(iterator);
                vis.onGet(new Object[]{idx[0]});
                idx[0]++;
            }
        } finally {
            _processing = false;
        }
    }

    public static void onLog(String message) {
        if (!isCalledFromRunner("println")) return;
        if (_logVisualizer != null) {
            _logVisualizer.log(message);
        }
    }
    


    public static void onLocalVariableUpdate(String methodKey, int slotIndex, Object value) {
        String variableName = LocalVariablesVisualizer.getSlotName(methodKey, slotIndex);
        if (variableName == null) return;
        
        if (value != null && VisualizerInitializer.registerLocalValue(variableName, value)) {
            return;
        }
        
        LocalVariablesVisualizer visualizer = _localVariablesVisualizers.get(methodKey);
        if (visualizer == null) {
            String methodName = methodKey.substring(methodKey.lastIndexOf('#') + 1, methodKey.lastIndexOf('('));
            visualizer = new LocalVariablesVisualizer("Locals - " + methodName);
            registerLocalVariables(methodKey, visualizer);
            setLayout();
        }
        visualizer.onVariableUpdate(variableName, value);
    }
    
    private static GraphVisualizer findParentGraph(Object subarray) {
        for (GraphVisualizer graphVis : _graphToVisualizer.values()) {
            if (graphVis.findRowIndex(subarray) >= 0) return graphVis;
        }
        return null;
    }



    private static boolean isCalledFromRunner(String callerMethod) {
        return StackWalker.getInstance().walk(frames -> {
            var it = frames.iterator();
            while (it.hasNext()) {
                if (it.next().getMethodName().equals(callerMethod)) {
                    return it.hasNext() && it.next().getClassName().startsWith("com.algoflow.runner");
                }
            }
            return false;
        });
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
