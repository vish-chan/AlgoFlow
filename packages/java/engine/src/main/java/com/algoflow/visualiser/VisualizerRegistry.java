package com.algoflow.visualiser;

import org.algorithm_visualizer.Commander;
import org.algorithm_visualizer.Layout;
import org.algorithm_visualizer.Tracer;
import org.algorithm_visualizer.VerticalLayout;

import java.util.*;

public class VisualizerRegistry {

    private static final List<Commander> _visualizers = new ArrayList<>();
    private static final Map<Object, ListVisualizer> _objectToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, PrimitiveArray1DVisualizer> _arrayToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, ChartVisualizer> _chartToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, PrimitiveArray2DVisualizer> _array2DToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, GraphVisualizer> _graphToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, HashMapVisualizer> _mapToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, Map<String, Visualizer>> _deferredFields = new IdentityHashMap<>();
    private static final Map<String, Visualizer> _deferredStaticFields = new HashMap<>();
    private static final List<TreeVisualizer> _treeVisualizers = new ArrayList<>();
    private static final List<LinkedListVisualizer> _linkedListVisualizers = new ArrayList<>();
    private static LogVisualizer _logVisualizer;
    private static LocalVariablesVisualizer _localVariablesVisualizer;
    private static CallStackVisualizer _callStackVisualizer;
    private static CodeVisualizer _codeVisualizer;

    public static boolean isRegistered(Object obj) {
        return _objectToVisualizer.containsKey(obj) || _arrayToVisualizer.containsKey(obj)
                || _array2DToVisualizer.containsKey(obj) || _graphToVisualizer.containsKey(obj)
                || _chartToVisualizer.containsKey(obj) || _mapToVisualizer.containsKey(obj)
                || _treeVisualizers.stream().anyMatch(t -> t.isTrackedNode(obj))
                || _linkedListVisualizers.stream().anyMatch(l -> l.isTrackedNode(obj));
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

    public static void registerTree(TreeVisualizer visualizer) {
        _visualizers.add(visualizer.getCommander());
        _treeVisualizers.add(visualizer);
    }

    public static void registerLinkedList(LinkedListVisualizer visualizer) {
        _visualizers.add(visualizer.getCommander());
        _linkedListVisualizers.add(visualizer);
    }

    public static void registerGraph(GraphVisualizer visualizer, Object graphObj) {
        _visualizers.add(visualizer.getCommander());
        if (graphObj != null) _graphToVisualizer.put(graphObj, visualizer);
    }

    public static void registerChart(ChartVisualizer visualizer, Object arrayObj) {
        _visualizers.add(visualizer.getCommander());
        if (arrayObj != null) _chartToVisualizer.put(arrayObj, visualizer);
    }

    public static void register(Visualizer visualizer) {
        _visualizers.add(visualizer.getCommander());
    }

    public static void deferField(Object owner, String fieldName, Visualizer visualizer) {
        _deferredFields.computeIfAbsent(owner, k -> new HashMap<>()).put(fieldName, visualizer);
    }

    public static void deferStaticField(String className, String fieldName, Visualizer visualizer) {
        _deferredStaticFields.put(className + "." + fieldName, visualizer);
    }

    public static void registerMap(HashMapVisualizer visualizer, Object mapObj) {
        _visualizers.add(visualizer.getCommander());
        _mapToVisualizer.put(mapObj, visualizer);
    }

    public static void autoRegisterCodeVisualizer() {
        if (_codeVisualizer == null) {
            _codeVisualizer = new CodeVisualizer("Line Tracker");
            _visualizers.add(_codeVisualizer.getCommander());
            setLayout();
        }
    }

    private static void highlightLine(int lineNumber) {
        if (lineNumber <= 0)
            return;
        if (_codeVisualizer == null)
            autoRegisterCodeVisualizer();
        _codeVisualizer.highlightLine(lineNumber);
    }



    private static int getCallerLineNumber() {
        return getRunnerLineNumber(0);
    }

    private static int getCallerCallerLineNumber() {
        return getRunnerLineNumber(1);
    }

    private static int getRunnerLineNumber(int skip) {
        return StackWalker.getInstance()
                .walk(frames -> frames.filter(f -> f.getClassName().startsWith("com.algoflow.runner")).skip(skip)
                        .findFirst().map(StackWalker.StackFrame::getLineNumber).orElse(-1));
    }

    public static void onMethodEnter(String methodName, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerCallerLineNumber());
            ensureCallStackVisualizer();
            _callStackVisualizer.onEnter(methodName, args);
            ensureLocalVariablesVisualizer();
            _localVariablesVisualizer.pushFrame(methodName);

            List<TreeVisualizer> tempTrees = handleTreeArgs(methodName, args);
            _tempTreeStack.push(tempTrees);

            highlightLine(getCallerLineNumber());
        } finally {
            _processing = false;
        }
    }

    public static void onMethodExit(String methodName, Object result) {
        if (_processing)
            return;
        _processing = true;
        try {
            if (_callStackVisualizer != null) {
                highlightLine(getCallerLineNumber());
                _callStackVisualizer.onExit(methodName, result);
                if (_localVariablesVisualizer != null) {
                    _localVariablesVisualizer.popFrame();
                }

                if (!_tempTreeStack.isEmpty()) {
                    List<TreeVisualizer> tempTrees = _tempTreeStack.pop();
                    for (TreeVisualizer tv : tempTrees) {
                        _treeVisualizers.remove(tv);
                        _visualizers.remove(tv.getCommander());
                    }
                    if (!tempTrees.isEmpty()) setLayout();
                }

                for (LinkedListVisualizer lv : _linkedListVisualizers) {
                    lv.clearLocals();
                }

                highlightLine(getCallerCallerLineNumber());
            }
        } finally {
            _processing = false;
        }
    }

    private static List<TreeVisualizer> handleTreeArgs(String methodName, Object[] args) {
        if (args == null) return new ArrayList<>();
        int depth = _tempTreeStack.size();
        List<TreeVisualizer> tempTrees = new ArrayList<>();
        for (int i = 0; i < args.length; i++) {
            String name = methodName + " → arg" + i;
            if (depth > 0) name += " #" + depth;
            handleTreeValue(args[i], name, tempTrees);
        }
        return tempTrees;
    }

    public static void handleTreeLocalVariable(String varName, Object value) {
        if (value == null || _tempTreeStack.isEmpty()) return;
        String name = varName;
        int depth = _tempTreeStack.size() - 1;
        if (depth > 0) name += " #" + depth;
        handleTreeValue(value, name, _tempTreeStack.peek());
    }



    private static void handleTreeValue(Object value, String name, List<TreeVisualizer> tempTrees) {
        if (value == null) return;

        // Already tracked → visit it
        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.isTrackedNode(value)) {
                tv.visit(value);
                return;
            }
        }

        // Matches a known tree node class but untracked → temp register
        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.getNodeClass() == value.getClass()) {
                TreeVisualizer tempVis = new TreeVisualizer(name, value, value.getClass());
                registerTree(tempVis);
                setLayout();
                tempTrees.add(tempVis);
                return;
            }
        }
    }

    private static void ensureCallStackVisualizer() {
        if (_callStackVisualizer == null) {
            _callStackVisualizer = new CallStackVisualizer("CallStack");
            _visualizers.add(0, _callStackVisualizer.getCommander());
            setLayout();
        }
    }

    private static void ensureLocalVariablesVisualizer() {
        if (_localVariablesVisualizer == null) {
            _localVariablesVisualizer = new LocalVariablesVisualizer("Locals");
            int idx = _callStackVisualizer != null ? _visualizers.indexOf(_callStackVisualizer.getCommander()) + 1 : 0;
            _visualizers.add(idx, _localVariablesVisualizer.getCommander());
            setLayout();
        }
    }

    private static volatile boolean _processing = false;
    private static final Deque<List<TreeVisualizer>> _tempTreeStack = new ArrayDeque<>();

    public static void onArrayGet(Object array, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            doArrayGet(array, args);
        } finally {
            _processing = false;
        }
    }

    private static void doArrayGet(Object array, Object[] args) {
        if (args.length > 1 && args[1] instanceof Integer lineNumber) {
            highlightLine(lineNumber);
        }

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
            return;
        }

        ChartVisualizer chartVis = _chartToVisualizer.get(array);
        if (chartVis != null) {
            chartVis.onGet(args);
        }
    }

    public static void onArraySet(Object array, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            doArraySet(array, args);
        } finally {
            _processing = false;
        }
    }

    private static void doArraySet(Object array, Object[] args) {
        if (args.length > 2 && args[2] instanceof Integer lineNumber) {
            highlightLine(lineNumber);
        }

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
                int value = (Integer) args[1];
                if (value != 0) {
                    parentGraph.addEdge(row, col, value);
                } else {
                    parentGraph.removeEdge(row, col);
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
            return;
        }

        ChartVisualizer chartVis = _chartToVisualizer.get(array);
        if (chartVis != null) {
            chartVis.onSet(args);
        }
    }

    public static void onGet(Object object, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            ListVisualizer visualizer = _objectToVisualizer.computeIfAbsent(object, VisualizerRegistry::findVisualizer);
            if (visualizer != null) {
                visualizer.onGet(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onSet(Object object, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            ListVisualizer visualizer = _objectToVisualizer.computeIfAbsent(object, VisualizerRegistry::findVisualizer);
            if (visualizer != null) {
                visualizer.onSet(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onAdd(Object object, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            GraphVisualizer graphVis = findParentGraphForList(object);
            if (graphVis != null) {
                Object node = graphVis.findNodeForList(object);
                if (node != null && args.length > 0) {
                    graphVis.onNeighborAdd(node, args[0]);
                }
                return;
            }

            HashMapVisualizer mapVis = findParentMapForValue(object);
            if (mapVis != null) {
                mapVis.onValueMutated();
                return;
            }

            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onAdd(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onRemove(Object object, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            GraphVisualizer graphVis = findParentGraphForList(object);
            if (graphVis != null) {
                Object node = graphVis.findNodeForList(object);
                if (node != null && args.length > 0) {
                    graphVis.onNeighborRemove(node, args[0]);
                }
                return;
            }

            HashMapVisualizer mapVis = findParentMapForValue(object);
            if (mapVis != null) {
                mapVis.onValueMutated();
                return;
            }

            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onRemove(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onClear(Object object) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onClear();
            }
        } finally {
            _processing = false;
        }
    }

    public static void onContains(Object object, Object[] args) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ListVisualizer visualizer = _objectToVisualizer.get(object);
            if (visualizer != null) {
                visualizer.onContains(args[0]);
            }
        } finally {
            _processing = false;
        }
    }

    private static final IdentityHashMap<Object, ListVisualizer> _iteratorToVisualizer = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, Object[]> _iteratorToGraphNode = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, int[]> _iteratorIndex = new IdentityHashMap<>();

    public static void onIteratorCreated(Object collection, Object iterator) {
        if (_processing)
            return;
        _processing = true;
        try {
            // Check if this is a neighbor list in a @Graph adj list
            GraphVisualizer graphVis = findParentGraphForList(collection);
            if (graphVis != null) {
                Object node = graphVis.findNodeForList(collection);
                if (node != null) {
                    _iteratorToGraphNode.put(iterator, new Object[]{graphVis, node});
                    _iteratorIndex.put(iterator, new int[]{0});
                }
                return;
            }

            ListVisualizer vis = _objectToVisualizer.get(collection);
            if (vis != null) {
                _iteratorToVisualizer.put(iterator, vis);
                _iteratorIndex.put(iterator, new int[]{0});
            }
        } finally {
            _processing = false;
        }
    }

    private static final IdentityHashMap<Object, HashMapVisualizer> _iteratorToMapVisualizer = new IdentityHashMap<>();

    public static void onIteratorNext(Object iterator) {
        if (_processing)
            return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            // Check graph neighbor iteration
            Object[] graphInfo = _iteratorToGraphNode.get(iterator);
            if (graphInfo != null) {
                GraphVisualizer graphVis = (GraphVisualizer) graphInfo[0];
                Object node = graphInfo[1];
                int[] idx = _iteratorIndex.get(iterator);
                graphVis.onNeighborIterate(node, idx[0]);
                idx[0]++;
                return;
            }

            ListVisualizer vis = _iteratorToVisualizer.get(iterator);
            if (vis != null) {
                int[] idx = _iteratorIndex.get(iterator);
                vis.onGet(new Object[]{idx[0]});
                idx[0]++;
                return;
            }

            // Check map iterator via this$0
            HashMapVisualizer mapVis = _iteratorToMapVisualizer.get(iterator);
            if (mapVis == null) {
                mapVis = findMapVisualizerForIterator(iterator);
                if (mapVis != null) {
                    _iteratorToMapVisualizer.put(iterator, mapVis);
                    _iteratorIndex.put(iterator, new int[]{0});
                }
            }
            if (mapVis != null) {
                int[] idx = _iteratorIndex.get(iterator);
                mapVis.onIterateIndex(idx[0]);
                idx[0]++;
            }
        } finally {
            _processing = false;
        }
    }

    public static void onMapPut(Object map, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            String phase = (String) args[2];
            GraphVisualizer graphVis = _graphToVisualizer.get(map);
            if (graphVis != null && graphVis.isAdjList()) {
                if ("after".equals(phase)) {
                    graphVis.onMapPut(args[0], args[1]);
                }
                return;
            }
            HashMapVisualizer vis = _mapToVisualizer.get(map);
            if (vis != null) vis.onPut(args[0], args[1], phase);
        } finally {
            _processing = false;
        }
    }

    public static void onMapGet(Object map, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            GraphVisualizer graphVis = _graphToVisualizer.get(map);
            if (graphVis != null && graphVis.isAdjList()) {
                graphVis.visit(args[0]);
                return;
            }
            HashMapVisualizer vis = _mapToVisualizer.get(map);
            if (vis != null) vis.onGet(args[0]);
        } finally {
            _processing = false;
        }
    }

    public static void onMapRemove(Object map, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            String phase = (String) args[1];
            GraphVisualizer graphVis = _graphToVisualizer.get(map);
            if (graphVis != null && graphVis.isAdjList()) {
                if ("after".equals(phase)) {
                    graphVis.onMapRemove(args[0]);
                }
                return;
            }
            HashMapVisualizer vis = _mapToVisualizer.get(map);
            if (vis != null) vis.onRemove(args[0], phase);
        } finally {
            _processing = false;
        }
    }

    public static void onMapClear(Object map) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            HashMapVisualizer vis = _mapToVisualizer.get(map);
            if (vis != null) vis.onClear();
        } finally {
            _processing = false;
        }
    }

    public static void onPrintln(String message) {
        if (_processing)
            return;
        _processing = true;
        try {
            if (!isCalledFromRunner("println"))
                return;
            highlightLine(getCallerLineNumber());
            if (_logVisualizer != null)
                _logVisualizer.println(message);
        } finally {
            _processing = false;
        }
    }

    public static void onFieldSet(Object owner, String fieldName, int lineNumber) {
        if (_processing)
            return;
        _processing = true;
        try {
            if (lineNumber > 0)
                highlightLine(lineNumber);
            for (TreeVisualizer tv : _treeVisualizers) {
                if (tv.isTrackedNode(owner)) {
                    tv.onFieldSet(owner, fieldName);
                    return;
                }
            }
            for (LinkedListVisualizer lv : _linkedListVisualizers) {
                if (lv.isTrackedNode(owner)) {
                    lv.onFieldSet(owner, fieldName);
                    return;
                }
            }
            // Check deferred fields: null → non-null transition
            var fields = _deferredFields.get(owner);
            if (fields != null) {
                Visualizer vis = fields.get(fieldName);
                if (vis != null) {
                    try {
                        java.lang.reflect.Field f = owner.getClass().getDeclaredField(fieldName);
                        f.setAccessible(true);
                        Object value = f.get(owner);
                        if (value != null) {
                            initDeferred(vis, value);
                        }
                    } catch (Exception ignored) {}
                }
            }
        } finally {
            _processing = false;
        }
    }

    private static void initDeferred(Visualizer vis, Object value) {
        evictExisting(value);
        if (vis instanceof GraphVisualizer g) {
            _graphToVisualizer.put(value, g);
            g.lateInit(value);
        } else if (vis instanceof ChartVisualizer c) {
            _chartToVisualizer.put(value, c);
            c.lateInit(value);
        } else if (vis instanceof PrimitiveArray1DVisualizer a) {
            _arrayToVisualizer.put(value, a);
            a.lateInit(value);
        } else if (vis instanceof PrimitiveArray2DVisualizer a) {
            _array2DToVisualizer.put(value, a);
            a.lateInit(value);
        }
    }

    private static void evictExisting(Object value) {
        Commander old = null;
        Visualizer removed;
        if ((removed = _arrayToVisualizer.remove(value)) != null) old = removed.getCommander();
        else if ((removed = _array2DToVisualizer.remove(value)) != null) old = removed.getCommander();
        else if ((removed = _graphToVisualizer.remove(value)) != null) old = removed.getCommander();
        else if ((removed = _chartToVisualizer.remove(value)) != null) old = removed.getCommander();
        else if ((removed = _mapToVisualizer.remove(value)) != null) old = removed.getCommander();
        else {
            ListVisualizer lv = _objectToVisualizer.remove(value);
            if (lv != null) old = lv.getCommander();
        }
        if (old != null) {
            _visualizers.remove(old);
            setLayout();
        }
    }

    public static void onStaticFieldSet(String className, String fieldName, int lineNumber) {
        if (_processing) return;
        _processing = true;
        try {
            if (lineNumber > 0) highlightLine(lineNumber);
            String key = className + "." + fieldName;
            Visualizer vis = _deferredStaticFields.get(key);
            if (vis != null) {
                try {
                    Class<?> clazz = Class.forName(className);
                    java.lang.reflect.Field f = clazz.getDeclaredField(fieldName);
                    f.setAccessible(true);
                    Object value = f.get(null);
                    if (value != null) {
                        initDeferred(vis, value);
                    }
                } catch (Exception ignored) {}
            }
        } finally {
            _processing = false;
        }
    }

    public static void onFieldGet(Object owner, String fieldName, int lineNumber) {
        if (_processing)
            return;
        _processing = true;
        try {
            if (lineNumber > 0)
                highlightLine(lineNumber);
            for (TreeVisualizer tv : _treeVisualizers) {
                if (tv.isTrackedNode(owner)) {
                    tv.onFieldGet(owner, fieldName);
                    return;
                }
            }
            for (LinkedListVisualizer lv : _linkedListVisualizers) {
                if (lv.isTrackedNode(owner)) {
                    lv.onFieldGet(owner, fieldName);
                    return;
                }
            }
        } finally {
            _processing = false;
        }
    }

    public static void onPrint(String message) {
        if (_processing)
            return;
        _processing = true;
        try {
            if (!isCalledFromRunner("print"))
                return;
            highlightLine(getCallerLineNumber());
            if (_logVisualizer != null)
                _logVisualizer.print(message);
        } finally {
            _processing = false;
        }
    }

    public static void onLocalVariableUpdate(String methodKey, int slotIndex, Object value) {
        String variableName = LocalVariablesVisualizer.getSlotName(methodKey, slotIndex);
        if (variableName == null)
            return;

        // Check if a linked list visualizer wants this local
        boolean consumedByLL = false;
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.onLocalUpdate(variableName, value)) {
                consumedByLL = true;
                break;
            }
        }

        // If no existing LL visualizer claimed it, try auto-registering as a new linked list
        if (!consumedByLL && value != null) {
            consumedByLL = tryAutoRegisterLinkedList(variableName, value);
        }

        if (VisualizerInitializer.registerLocalValue(variableName, value)) {
            return;
        }

        highlightLine(getCallerLineNumber());

        ensureLocalVariablesVisualizer();
        _localVariablesVisualizer.onVariableUpdate(variableName, value);
    }

    private static boolean tryAutoRegisterLinkedList(String varName, Object value) {
        if (value == null) return false;
        Class<?> clazz = value.getClass();
        // Already tracked by an existing LL visualizer?
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.getNodeClass() == clazz) return false;
        }
        // Already tracked by a tree visualizer?
        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.getNodeClass() == clazz) return false;
        }
        // Check if it looks like a linked list node: at least one self-referential field + one value field
        int selfRefCount = 0;
        boolean hasValue = false;
        for (java.lang.reflect.Field f : clazz.getDeclaredFields()) {
            if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) continue;
            if (f.getType() == clazz) selfRefCount++;
            else hasValue = true;
        }
        if (selfRefCount == 0 || !hasValue) return false;
        LinkedListVisualizer vis = new LinkedListVisualizer(varName, value, clazz);
        registerLinkedList(vis);
        setLayout();
        return true;
    }

    public static void onApiMutate(Object target) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            PrimitiveArray1DVisualizer a1 = _arrayToVisualizer.get(target);
            if (a1 != null) { a1.refresh(); return; }
            PrimitiveArray2DVisualizer a2 = _array2DToVisualizer.get(target);
            if (a2 != null) { a2.refresh(); return; }
            ListVisualizer lv = _objectToVisualizer.get(target);
            if (lv instanceof Array1DVisualiser a1d) { a1d.refresh(); return; }
        } finally {
            _processing = false;
        }
    }

    private static GraphVisualizer findParentGraph(Object subarray) {
        for (GraphVisualizer graphVis : _graphToVisualizer.values()) {
            if (graphVis.findRowIndex(subarray) >= 0)
                return graphVis;
        }
        return null;
    }

    private static GraphVisualizer findParentGraphForList(Object list) {
        for (GraphVisualizer graphVis : _graphToVisualizer.values()) {
            if (graphVis.isAdjList() && graphVis.findNodeForList(list) != null)
                return graphVis;
        }
        return null;
    }

    private static HashMapVisualizer findParentMapForValue(Object value) {
        for (HashMapVisualizer vis : _mapToVisualizer.values()) {
            if (vis.containsValue(value)) return vis;
        }
        return null;
    }

    private static HashMapVisualizer findMapVisualizerForIterator(Object iterator) {
        try {
            Class<?> clazz = iterator.getClass();
            while (clazz != null) {
                try {
                    java.lang.reflect.Field f = clazz.getDeclaredField("this$0");
                    f.setAccessible(true);
                    Object owner = f.get(iterator);
                    if (owner != null) {
                        return _mapToVisualizer.get(owner);
                    }
                } catch (NoSuchFieldException e) {
                    clazz = clazz.getSuperclass();
                }
            }
        } catch (Exception e) {
            // ignore
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

        Layout.setRoot(new VerticalLayout(allCommanders.toArray(Commander[]::new)));
        Tracer.delay();
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
