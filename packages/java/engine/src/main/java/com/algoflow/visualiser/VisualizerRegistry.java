package com.algoflow.visualiser;

import org.algorithm_visualizer.Commander;
import org.algorithm_visualizer.Layout;
import org.algorithm_visualizer.Tracer;
import org.algorithm_visualizer.VerticalLayout;

import java.util.*;

public class VisualizerRegistry {

    private static final List<Commander> _visualizers = new ArrayList<>();
    private static final Map<Object, ObjectVisualizer> _objectToVisualizer = new IdentityHashMap<>();
    private static final Map<Object, Map<String, ObjectVisualizer>> _deferredFields = new IdentityHashMap<>();
    private static final Map<String, ObjectVisualizer> _deferredStaticFields = new HashMap<>();
    private static final List<TreeVisualizer> _treeVisualizers = new ArrayList<>();
    private static final List<LinkedListVisualizer> _linkedListVisualizers = new ArrayList<>();
    private static LogVisualizer _logVisualizer;
    private static LocalVariablesVisualizer _localVariablesVisualizer;
    private static CallStackVisualizer _callStackVisualizer;
    private static CodeVisualizer _codeVisualizer;

    public static boolean isRegistered(Object obj) {
        return _objectToVisualizer.containsKey(obj)
                || _treeVisualizers.stream().anyMatch(t -> t.isTrackedNode(obj))
                || _linkedListVisualizers.stream().anyMatch(l -> l.isTrackedNode(obj));
    }

    // --- Registration ---

    public static void register(ObjectVisualizer visualizer, Object... objects) {
        _visualizers.add(visualizer.getCommander());
        for (Object obj : objects) {
            _objectToVisualizer.put(obj, visualizer);
        }
        registerChildren(visualizer, objects);
    }

    public static void registerGraph(GraphVisualizer visualizer, Object graphObj) {
        _visualizers.add(visualizer.getCommander());
        if (graphObj != null) {
            _objectToVisualizer.put(graphObj, visualizer);
            for (Object row : visualizer.getRows()) {
                _objectToVisualizer.put(row, visualizer);
            }
        }
    }

    public static void registerChart(ChartVisualizer visualizer, Object arrayObj) {
        _visualizers.add(visualizer.getCommander());
        if (arrayObj != null) _objectToVisualizer.put(arrayObj, visualizer);
    }

    public static void registerMap(HashMapVisualizer visualizer, Object mapObj) {
        _visualizers.add(visualizer.getCommander());
        _objectToVisualizer.put(mapObj, visualizer);
        _mapIndex.put(mapObj, visualizer);
    }

    public static void registerTree(TreeVisualizer visualizer) {
        _visualizers.add(visualizer.getCommander());
        _treeVisualizers.add(visualizer);
    }

    public static void registerLinkedList(LinkedListVisualizer visualizer) {
        _visualizers.add(visualizer.getCommander());
        _linkedListVisualizers.add(visualizer);
    }

    public static void register(Visualizer visualizer) {
        _visualizers.add(visualizer.getCommander());
    }

    /** Register child objects (rows of 2D arrays/lists) pointing to the same visualizer. */
    private static void registerChildren(ObjectVisualizer visualizer, Object... parents) {
        if (visualizer instanceof PrimitiveArray2DVisualizer vis2D) {
            for (Object row : vis2D.getRows()) {
                _objectToVisualizer.put(row, vis2D);
            }
        } else if (visualizer instanceof Array2DVisualiser vis2D) {
            for (Object row : vis2D.getRows()) {
                _objectToVisualizer.put(row, vis2D);
            }
        }
    }

    public static void deferField(Object owner, String fieldName, ObjectVisualizer visualizer) {
        _deferredFields.computeIfAbsent(owner, k -> new HashMap<>()).put(fieldName, visualizer);
    }

    public static void deferStaticField(String className, String fieldName, ObjectVisualizer visualizer) {
        _deferredStaticFields.put(className + "." + fieldName, visualizer);
    }

    // --- Array events ---

    public static void onArrayGet(Object array, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            if (args.length > 1 && args[1] instanceof Integer lineNumber) {
                highlightLine(lineNumber);
            }
            ObjectVisualizer vis = _objectToVisualizer.get(array);
            if (vis != null) {
                vis.onRead(array, args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onArraySet(Object array, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            if (args.length > 2 && args[2] instanceof Integer lineNumber) {
                highlightLine(lineNumber);
            }
            ObjectVisualizer vis = _objectToVisualizer.get(array);
            if (vis != null) {
                vis.onWrite(array, args);
            }
        } finally {
            _processing = false;
        }
    }

    // --- Collection events ---

    public static void onGet(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(object);
            if (vis != null) {
                vis.onRead(object, args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onSet(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(object);
            if (vis != null) {
                vis.onWrite(object, args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onAdd(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());

            // Check if this list belongs to a graph adj list
            GraphVisualizer graphVis = findParentGraphForList(object);
            if (graphVis != null) {
                Object node = graphVis.findNodeForList(object);
                if (node != null && args.length > 0) {
                    graphVis.onNeighborAdd(node, args[0]);
                }
                return;
            }

            // Check if this is a value inside a tracked map
            HashMapVisualizer mapVis = findParentMapForValue(object);
            if (mapVis != null) {
                mapVis.onValueMutated();
                return;
            }

            ObjectVisualizer vis = _objectToVisualizer.get(object);
            if (vis instanceof ListVisualizer listVis) {
                listVis.onAdd(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onRemove(Object object, Object[] args) {
        if (_processing) return;
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

            ObjectVisualizer vis = _objectToVisualizer.get(object);
            if (vis instanceof ListVisualizer listVis) {
                listVis.onRemove(args);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onClear(Object object) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(object);
            if (vis instanceof ListVisualizer listVis) {
                listVis.onClear();
            }
        } finally {
            _processing = false;
        }
    }

    public static void onContains(Object object, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(object);
            if (vis instanceof ListVisualizer listVis) {
                listVis.onContains(args[0]);
            }
        } finally {
            _processing = false;
        }
    }

    // --- Map events ---

    public static void onMapPut(Object map, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            String phase = (String) args[2];
            ObjectVisualizer vis = _objectToVisualizer.get(map);
            if (vis instanceof GraphVisualizer graphVis && graphVis.isAdjList()) {
                if ("after".equals(phase)) {
                    graphVis.onMapPut(args[0], args[1]);
                }
            } else if (vis instanceof HashMapVisualizer mapVis) {
                mapVis.onPut(args[0], args[1], phase);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onMapGet(Object map, Object[] args) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(map);
            if (vis instanceof GraphVisualizer graphVis && graphVis.isAdjList()) {
                graphVis.visit(args[0]);
            } else if (vis instanceof HashMapVisualizer mapVis) {
                mapVis.onGet(args[0]);
            }
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
            ObjectVisualizer vis = _objectToVisualizer.get(map);
            if (vis instanceof GraphVisualizer graphVis && graphVis.isAdjList()) {
                if ("after".equals(phase)) {
                    graphVis.onMapRemove(args[0]);
                }
            } else if (vis instanceof HashMapVisualizer mapVis) {
                mapVis.onRemove(args[0], phase);
            }
        } finally {
            _processing = false;
        }
    }

    public static void onMapClear(Object map) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(map);
            if (vis instanceof HashMapVisualizer mapVis) {
                mapVis.onClear();
            }
        } finally {
            _processing = false;
        }
    }

    // --- Iterator events ---

    private static final IdentityHashMap<Object, ObjectVisualizer> _iteratorToVisualizer = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, Object[]> _iteratorToGraphNode = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, int[]> _iteratorIndex = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, HashMapVisualizer> _iteratorToMapVisualizer = new IdentityHashMap<>();
    // Secondary index for map visualizers — needed by findMapVisualizerForIterator to avoid
    // re-entrant access on the main _objectToVisualizer map during instrumented iterator calls.
    private static final IdentityHashMap<Object, HashMapVisualizer> _mapIndex = new IdentityHashMap<>();

    public static void onIteratorCreated(Object collection, Object iterator) {
        if (_processing) return;
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

            ObjectVisualizer vis = _objectToVisualizer.get(collection);
            if (vis instanceof ListVisualizer) {
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
            highlightLine(getCallerLineNumber());

            Object[] graphInfo = _iteratorToGraphNode.get(iterator);
            if (graphInfo != null) {
                GraphVisualizer graphVis = (GraphVisualizer) graphInfo[0];
                Object node = graphInfo[1];
                int[] idx = _iteratorIndex.get(iterator);
                graphVis.onNeighborIterate(node, idx[0]);
                idx[0]++;
                return;
            }

            ObjectVisualizer vis = _iteratorToVisualizer.get(iterator);
            if (vis instanceof ListVisualizer listVis) {
                int[] idx = _iteratorIndex.get(iterator);
                listVis.onGet(new Object[]{idx[0]});
                idx[0]++;
                return;
            }

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

    // --- Field events ---

    public static void onFieldSet(Object owner, String fieldName, int lineNumber) {
        if (_processing) return;
        _processing = true;
        try {
            if (lineNumber > 0) highlightLine(lineNumber);
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
            var fields = _deferredFields.get(owner);
            if (fields != null) {
                ObjectVisualizer vis = fields.get(fieldName);
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

    public static void onStaticFieldSet(String className, String fieldName, int lineNumber) {
        if (_processing) return;
        _processing = true;
        try {
            if (lineNumber > 0) highlightLine(lineNumber);
            String key = className + "." + fieldName;
            ObjectVisualizer vis = _deferredStaticFields.get(key);
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
        if (_processing) return;
        _processing = true;
        try {
            if (lineNumber > 0) highlightLine(lineNumber);
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

    // --- Deferred init / eviction ---

    private static void initDeferred(ObjectVisualizer vis, Object value) {
        evictExisting(value);
        _objectToVisualizer.put(value, vis);
        vis.lateInit(value);
        // Register children for 2D types
        if (vis instanceof PrimitiveArray2DVisualizer vis2D) {
            for (Object row : vis2D.getRows()) {
                _objectToVisualizer.put(row, vis2D);
            }
        } else if (vis instanceof GraphVisualizer graphVis) {
            for (Object row : graphVis.getRows()) {
                _objectToVisualizer.put(row, graphVis);
            }
        }
    }

    private static void evictExisting(Object value) {
        ObjectVisualizer removed = _objectToVisualizer.remove(value);
        _mapIndex.remove(value);
        if (removed != null) {
            _visualizers.remove(removed.getCommander());
            setLayout();
        }
    }

    // --- Print events ---

    public static void onPrintln(String message) {
        if (_processing) return;
        _processing = true;
        try {
            if (!isCalledFromRunner("println")) return;
            highlightLine(getCallerLineNumber());
            if (_logVisualizer != null) _logVisualizer.println(message);
        } finally {
            _processing = false;
        }
    }

    public static void onPrint(String message) {
        if (_processing) return;
        _processing = true;
        try {
            if (!isCalledFromRunner("print")) return;
            highlightLine(getCallerLineNumber());
            if (_logVisualizer != null) _logVisualizer.print(message);
        } finally {
            _processing = false;
        }
    }

    // --- API mutate ---

    public static void onApiMutate(Object target) {
        if (_processing) return;
        _processing = true;
        try {
            highlightLine(getCallerLineNumber());
            ObjectVisualizer vis = _objectToVisualizer.get(target);
            if (vis != null) {
                vis.refresh();
            }
        } finally {
            _processing = false;
        }
    }

    // --- Method enter/exit (recursion tracking) ---

    private static volatile boolean _processing = false;
    private static final Deque<List<TreeVisualizer>> _tempTreeStack = new ArrayDeque<>();

    public static void onMethodEnter(String methodName, Object[] args) {
        if (_processing) return;
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
        if (_processing) return;
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

    // --- Local variable tracking ---

    public static void onLocalVariableUpdate(String methodKey, int slotIndex, Object value) {
        String variableName = LocalVariablesVisualizer.getSlotName(methodKey, slotIndex);
        if (variableName == null) return;

        boolean consumedByLL = false;
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.onLocalUpdate(variableName, value)) {
                consumedByLL = true;
                break;
            }
        }

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

    // --- Tree helpers ---

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

        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.isTrackedNode(value)) {
                tv.visit(value);
                return;
            }
        }

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

    private static boolean tryAutoRegisterLinkedList(String varName, Object value) {
        if (value == null) return false;
        Class<?> clazz = value.getClass();
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.getNodeClass() == clazz) return false;
        }
        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.getNodeClass() == clazz) return false;
        }
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

    // --- Code / layout ---

    public static void autoRegisterCodeVisualizer() {
        if (_codeVisualizer == null) {
            _codeVisualizer = new CodeVisualizer("Line Tracker");
            _visualizers.add(_codeVisualizer.getCommander());
            setLayout();
        }
    }

    private static void highlightLine(int lineNumber) {
        if (lineNumber <= 0) return;
        if (_codeVisualizer == null) autoRegisterCodeVisualizer();
        _codeVisualizer.highlightLine(lineNumber);
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

    public static void setLayout() {
        if (_logVisualizer == null) {
            _logVisualizer = new LogVisualizer();
        }
        List<Commander> allCommanders = new ArrayList<>(_visualizers);
        allCommanders.add(_logVisualizer.getCommander());
        Layout.setRoot(new VerticalLayout(allCommanders.toArray(Commander[]::new)));
        Tracer.delay();
    }

    // --- Lookup helpers ---

    private static GraphVisualizer findParentGraphForList(Object list) {
        // Iterate only graph visualizers in the unified map
        for (ObjectVisualizer vis : _objectToVisualizer.values()) {
            if (vis instanceof GraphVisualizer graphVis && graphVis.isAdjList() && graphVis.findNodeForList(list) != null) {
                return graphVis;
            }
        }
        return null;
    }

    private static HashMapVisualizer findParentMapForValue(Object value) {
        for (ObjectVisualizer vis : _objectToVisualizer.values()) {
            if (vis instanceof HashMapVisualizer mapVis && mapVis.containsValue(value)) {
                return mapVis;
            }
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
                        return _mapIndex.get(owner);
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

    // --- Utility ---

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
}
