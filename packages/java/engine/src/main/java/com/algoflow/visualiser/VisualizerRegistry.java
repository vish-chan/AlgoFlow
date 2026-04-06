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
    private static volatile boolean _processing = false;
    private static final Deque<List<TreeVisualizer>> _tempTreeStack = new ArrayDeque<>();

    private static final IdentityHashMap<Object, ObjectVisualizer> _iteratorToVisualizer = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, Object[]> _iteratorToGraphNode = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, int[]> _iteratorIndex = new IdentityHashMap<>();
    private static final IdentityHashMap<Object, HashMapVisualizer> _iteratorToMapVisualizer = new IdentityHashMap<>();
    // Secondary index — avoids re-entrant access on _objectToVisualizer during instrumented iterator calls.
    private static final IdentityHashMap<Object, HashMapVisualizer> _mapIndex = new IdentityHashMap<>();

    // ── Guard ────────────────────────────────────────────────────────────

    private static boolean enter() { if (_processing) return false; _processing = true; return true; }
    private static void exit() { _processing = false; }

    // ── Query ────────────────────────────────────────────────────────────

    public static boolean isRegistered(Object obj) {
        return _objectToVisualizer.containsKey(obj)
                || _treeVisualizers.stream().anyMatch(t -> t.isTrackedNode(obj))
                || _linkedListVisualizers.stream().anyMatch(l -> l.isTrackedNode(obj));
    }

    // ── Registration ─────────────────────────────────────────────────────

    public static void register(ObjectVisualizer visualizer, Object... objects) {
        _visualizers.add(visualizer.getCommander());
        for (Object obj : objects) _objectToVisualizer.put(obj, visualizer);
        registerChildren(visualizer);
    }

    public static void registerGraph(GraphVisualizer visualizer, Object graphObj) {
        _visualizers.add(visualizer.getCommander());
        if (graphObj != null) {
            _objectToVisualizer.put(graphObj, visualizer);
            for (Object row : visualizer.getRows()) _objectToVisualizer.put(row, visualizer);
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

    private static void registerChildren(ObjectVisualizer visualizer) {
        if (visualizer instanceof PrimitiveArray2DVisualizer vis2D) {
            for (Object row : vis2D.getRows()) _objectToVisualizer.put(row, vis2D);
        } else if (visualizer instanceof Array2DVisualiser vis2D) {
            for (Object row : vis2D.getRows()) _objectToVisualizer.put(row, vis2D);
        }
    }

    public static void deferField(Object owner, String fieldName, ObjectVisualizer visualizer) {
        _deferredFields.computeIfAbsent(owner, k -> new HashMap<>()).put(fieldName, visualizer);
    }

    public static void deferStaticField(String className, String fieldName, ObjectVisualizer visualizer) {
        _deferredStaticFields.put(className + "." + fieldName, visualizer);
    }

    // ── Array events ─────────────────────────────────────────────────────

    public static void onArrayGet(Object a, Object[] args) { if (enter()) try { doArrayGet(a, args); } finally { exit(); } }
    public static void onArraySet(Object a, Object[] args) { if (enter()) try { doArraySet(a, args); } finally { exit(); } }

    private static void doArrayGet(Object array, Object[] args) {
        if (args.length > 1 && args[1] instanceof Integer ln) highlightLine(ln);
        ObjectVisualizer vis = _objectToVisualizer.get(array);
        if (vis != null) vis.onRead(array, args);
    }

    private static void doArraySet(Object array, Object[] args) {
        if (args.length > 2 && args[2] instanceof Integer ln) highlightLine(ln);
        ObjectVisualizer vis = _objectToVisualizer.get(array);
        if (vis != null) vis.onWrite(array, args);
    }

    // ── Collection events ────────────────────────────────────────────────

    public static void onGet(Object o, Object[] args)      { if (enter()) try { doGet(o, args); } finally { exit(); } }
    public static void onSet(Object o, Object[] args)      { if (enter()) try { doSet(o, args); } finally { exit(); } }
    public static void onAdd(Object o, Object[] args)      { if (enter()) try { doAdd(o, args); } finally { exit(); } }
    public static void onRemove(Object o, Object[] args)   { if (enter()) try { doRemove(o, args); } finally { exit(); } }
    public static void onClear(Object o)                    { if (enter()) try { doClear(o); } finally { exit(); } }
    public static void onContains(Object o, Object[] args)  { if (enter()) try { doContains(o, args); } finally { exit(); } }

    private static void doGet(Object object, Object[] args) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(object);
        if (vis != null) vis.onRead(object, args);
    }

    private static void doSet(Object object, Object[] args) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(object);
        if (vis != null) vis.onWrite(object, args);
    }

    private static void doAdd(Object object, Object[] args) {
        highlightLine(getCallerLineNumber());

        GraphVisualizer graphVis = findParentGraphForList(object);
        if (graphVis != null) {
            Object node = graphVis.findNodeForList(object);
            if (node != null && args.length > 0) graphVis.onNeighborAdd(node, args[0]);
            return;
        }
        HashMapVisualizer mapVis = findParentMapForValue(object);
        if (mapVis != null) { mapVis.onValueMutated(); return; }

        ObjectVisualizer vis = _objectToVisualizer.get(object);
        if (vis instanceof ListVisualizer lv) lv.onAdd(args);
    }

    private static void doRemove(Object object, Object[] args) {
        highlightLine(getCallerLineNumber());

        GraphVisualizer graphVis = findParentGraphForList(object);
        if (graphVis != null) {
            Object node = graphVis.findNodeForList(object);
            if (node != null && args.length > 0) graphVis.onNeighborRemove(node, args[0]);
            return;
        }
        HashMapVisualizer mapVis = findParentMapForValue(object);
        if (mapVis != null) { mapVis.onValueMutated(); return; }

        ObjectVisualizer vis = _objectToVisualizer.get(object);
        if (vis instanceof ListVisualizer lv) lv.onRemove(args);
    }

    private static void doClear(Object object) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(object);
        if (vis instanceof ListVisualizer lv) lv.onClear();
    }

    private static void doContains(Object object, Object[] args) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(object);
        if (vis instanceof ListVisualizer lv) lv.onContains(args[0]);
    }

    // ── Map events ───────────────────────────────────────────────────────

    public static void onMapPut(Object m, Object[] args)    { if (enter()) try { doMapPut(m, args); } finally { exit(); } }
    public static void onMapGet(Object m, Object[] args)    { if (enter()) try { doMapGet(m, args); } finally { exit(); } }
    public static void onMapRemove(Object m, Object[] args) { if (enter()) try { doMapRemove(m, args); } finally { exit(); } }
    public static void onMapClear(Object m)                  { if (enter()) try { doMapClear(m); } finally { exit(); } }

    private static void doMapPut(Object map, Object[] args) {
        highlightLine(getCallerLineNumber());
        String phase = (String) args[2];
        ObjectVisualizer vis = _objectToVisualizer.get(map);
        if (vis instanceof GraphVisualizer g && g.isAdjList()) {
            if ("after".equals(phase)) g.onMapPut(args[0], args[1]);
        } else if (vis instanceof HashMapVisualizer mv) {
            mv.onPut(args[0], args[1], phase);
        }
    }

    private static void doMapGet(Object map, Object[] args) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(map);
        if (vis instanceof GraphVisualizer g && g.isAdjList()) g.visit(args[0]);
        else if (vis instanceof HashMapVisualizer mv) mv.onGet(args[0]);
    }

    private static void doMapRemove(Object map, Object[] args) {
        highlightLine(getCallerLineNumber());
        String phase = (String) args[1];
        ObjectVisualizer vis = _objectToVisualizer.get(map);
        if (vis instanceof GraphVisualizer g && g.isAdjList()) {
            if ("after".equals(phase)) g.onMapRemove(args[0]);
        } else if (vis instanceof HashMapVisualizer mv) {
            mv.onRemove(args[0], phase);
        }
    }

    private static void doMapClear(Object map) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(map);
        if (vis instanceof HashMapVisualizer mv) mv.onClear();
    }

    // ── Iterator events ──────────────────────────────────────────────────

    public static void onIteratorCreated(Object c, Object it) { if (enter()) try { doIteratorCreated(c, it); } finally { exit(); } }
    public static void onIteratorNext(Object it)               { if (enter()) try { doIteratorNext(it); } finally { exit(); } }

    private static void doIteratorCreated(Object collection, Object iterator) {
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
    }

    private static void doIteratorNext(Object iterator) {
        highlightLine(getCallerLineNumber());

        Object[] graphInfo = _iteratorToGraphNode.get(iterator);
        if (graphInfo != null) {
            ((GraphVisualizer) graphInfo[0]).onNeighborIterate(graphInfo[1], _iteratorIndex.get(iterator)[0]++);
            return;
        }

        ObjectVisualizer vis = _iteratorToVisualizer.get(iterator);
        if (vis instanceof ListVisualizer lv) {
            int[] idx = _iteratorIndex.get(iterator);
            lv.onGet(new Object[]{idx[0]++});
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
        if (mapVis != null) mapVis.onIterateIndex(_iteratorIndex.get(iterator)[0]++);
    }

    // ── Field events ─────────────────────────────────────────────────────

    public static void onFieldSet(Object o, String f, int ln)              { if (enter()) try { doFieldSet(o, f, ln); } finally { exit(); } }
    public static void onStaticFieldSet(String c, String f, int ln)        { if (enter()) try { doStaticFieldSet(c, f, ln); } finally { exit(); } }
    public static void onFieldGet(Object o, String f, int ln)              { if (enter()) try { doFieldGet(o, f, ln); } finally { exit(); } }

    private static void doFieldSet(Object owner, String fieldName, int lineNumber) {
        if (lineNumber > 0) highlightLine(lineNumber);
        // Check all tree/LL visualizers — both for tracked nodes and root owner updates
        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.onFieldSet(owner, fieldName)) return;
        }
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.onFieldSet(owner, fieldName)) return;
        }
        var fields = _deferredFields.get(owner);
        if (fields != null) {
            ObjectVisualizer vis = fields.get(fieldName);
            if (vis != null) {
                try {
                    java.lang.reflect.Field f = owner.getClass().getDeclaredField(fieldName);
                    f.setAccessible(true);
                    Object value = f.get(owner);
                    if (value != null) initDeferred(vis, value);
                } catch (Exception ignored) {}
            }
        }
    }

    private static void doStaticFieldSet(String className, String fieldName, int lineNumber) {
        if (lineNumber > 0) highlightLine(lineNumber);
        String key = className + "." + fieldName;
        ObjectVisualizer vis = _deferredStaticFields.get(key);
        if (vis != null) {
            try {
                Class<?> clazz = Class.forName(className);
                java.lang.reflect.Field f = clazz.getDeclaredField(fieldName);
                f.setAccessible(true);
                Object value = f.get(null);
                if (value != null) initDeferred(vis, value);
            } catch (Exception ignored) {}
        }
    }

    private static void doFieldGet(Object owner, String fieldName, int lineNumber) {
        if (lineNumber > 0) highlightLine(lineNumber);
        for (TreeVisualizer tv : _treeVisualizers) {
            if (tv.isTrackedNode(owner) && tv.onFieldGet(owner, fieldName)) return;
        }
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.isTrackedNode(owner) && lv.onFieldGet(owner, fieldName)) return;
        }
    }

    // ── Print events ─────────────────────────────────────────────────────

    public static void onPrintln(String msg) { if (enter()) try { doPrintln(msg); } finally { exit(); } }
    public static void onPrint(String msg)   { if (enter()) try { doPrint(msg); } finally { exit(); } }

    private static void doPrintln(String message) {
        if (!isCalledFromRunner("println")) return;
        highlightLine(getCallerLineNumber());
        if (_logVisualizer != null) _logVisualizer.println(message);
    }

    private static void doPrint(String message) {
        if (!isCalledFromRunner("print")) return;
        highlightLine(getCallerLineNumber());
        if (_logVisualizer != null) _logVisualizer.print(message);
    }

    // ── API mutate ───────────────────────────────────────────────────────

    public static void onApiMutate(Object t) { if (enter()) try { doApiMutate(t); } finally { exit(); } }

    private static void doApiMutate(Object target) {
        highlightLine(getCallerLineNumber());
        ObjectVisualizer vis = _objectToVisualizer.get(target);
        if (vis != null) vis.refresh();
    }

    // ── Method enter/exit ────────────────────────────────────────────────

    public static void onMethodEnter(String n, Object[] a) { if (enter()) try { doMethodEnter(n, a); } finally { exit(); } }
    public static void onMethodExit(String n, Object r)    { if (enter()) try { doMethodExit(n, r); } finally { exit(); } }

    private static void doMethodEnter(String methodName, Object[] args) {
        highlightLine(getCallerCallerLineNumber());
        ensureCallStackVisualizer();
        _callStackVisualizer.onEnter(methodName, args);
        ensureLocalVariablesVisualizer();
        _localVariablesVisualizer.pushFrame(methodName);
        _tempTreeStack.push(handleTreeArgs(methodName, args));
        highlightLine(getCallerLineNumber());
    }

    private static void doMethodExit(String methodName, Object result) {
        if (_callStackVisualizer == null) return;
        highlightLine(getCallerLineNumber());
        _callStackVisualizer.onExit(methodName, result);
        if (_localVariablesVisualizer != null) _localVariablesVisualizer.popFrame();

        if (!_tempTreeStack.isEmpty()) {
            List<TreeVisualizer> tempTrees = _tempTreeStack.pop();
            for (TreeVisualizer tv : tempTrees) {
                _treeVisualizers.remove(tv);
                _visualizers.remove(tv.getCommander());
            }
            if (!tempTrees.isEmpty()) setLayout();
        }
        for (LinkedListVisualizer lv : _linkedListVisualizers) lv.clearLocals();
        highlightLine(getCallerCallerLineNumber());
    }

    // ── Local variable tracking ──────────────────────────────────────────

    public static void onLocalVariableUpdate(String methodKey, int slotIndex, Object value) {
        String variableName = LocalVariablesVisualizer.getSlotName(methodKey, slotIndex);
        if (variableName == null) return;

        boolean consumedByLL = false;
        for (LinkedListVisualizer lv : _linkedListVisualizers) {
            if (lv.onLocalUpdate(variableName, value)) { consumedByLL = true; break; }
        }
        if (!consumedByLL && value != null) consumedByLL = tryAutoRegisterNode(variableName, value);
        if (VisualizerInitializer.registerLocalValue(variableName, value)) return;

        highlightLine(getCallerLineNumber());
        ensureLocalVariablesVisualizer();
        _localVariablesVisualizer.onVariableUpdate(variableName, value);
    }

    // ── Deferred init / eviction ─────────────────────────────────────────

    private static void initDeferred(ObjectVisualizer vis, Object value) {
        evictExisting(value);
        _objectToVisualizer.put(value, vis);
        vis.lateInit(value);
        if (vis instanceof PrimitiveArray2DVisualizer v) {
            for (Object row : v.getRows()) _objectToVisualizer.put(row, v);
        } else if (vis instanceof GraphVisualizer g) {
            for (Object row : g.getRows()) _objectToVisualizer.put(row, g);
        }
    }

    private static void evictExisting(Object value) {
        ObjectVisualizer removed = _objectToVisualizer.remove(value);
        _mapIndex.remove(value);
        if (removed != null) { _visualizers.remove(removed.getCommander()); setLayout(); }
    }

    // ── Tree / linked list helpers ───────────────────────────────────────

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
            if (tv.isTrackedNode(value)) { tv.visit(value); return; }
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

    private static boolean tryAutoRegisterNode(String varName, Object value) {
        if (value == null) return false;
        Class<?> clazz = value.getClass();
        if (!clazz.getPackageName().startsWith("com.algoflow.runner")) return false;
        for (LinkedListVisualizer lv : _linkedListVisualizers) if (lv.getNodeClass() == clazz) return false;
        for (TreeVisualizer tv : _treeVisualizers) if (tv.getNodeClass() == clazz) return false;

        NodeStructure ns = NodeStructure.of(clazz);
        if (ns.isLinkedList()) {
            LinkedListVisualizer vis = new LinkedListVisualizer(varName, value, clazz);
            registerLinkedList(vis);
            setLayout();
            return true;
        } else if (ns.isTree()) {
            TreeVisualizer vis = new TreeVisualizer(varName, value, clazz);
            registerTree(vis);
            setLayout();
            return true;
        }
        return false;
    }

    // ── Code / layout ────────────────────────────────────────────────────

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
        if (_logVisualizer == null) _logVisualizer = new LogVisualizer();
        List<Commander> allCommanders = new ArrayList<>(_visualizers);
        allCommanders.add(_logVisualizer.getCommander());
        Layout.setRoot(new VerticalLayout(allCommanders.toArray(Commander[]::new)));
        Tracer.delay();
    }

    // ── Lookup helpers ───────────────────────────────────────────────────

    private static GraphVisualizer findParentGraphForList(Object list) {
        for (ObjectVisualizer vis : _objectToVisualizer.values()) {
            if (vis instanceof GraphVisualizer g && g.isAdjList() && g.findNodeForList(list) != null) return g;
        }
        return null;
    }

    private static HashMapVisualizer findParentMapForValue(Object value) {
        for (ObjectVisualizer vis : _objectToVisualizer.values()) {
            if (vis instanceof HashMapVisualizer mv && mv.containsValue(value)) return mv;
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
                    if (owner != null) return _mapIndex.get(owner);
                } catch (NoSuchFieldException e) { clazz = clazz.getSuperclass(); }
            }
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    // ── Utility ──────────────────────────────────────────────────────────

    private static int getCallerLineNumber() { return getRunnerLineNumber(0); }
    private static int getCallerCallerLineNumber() { return getRunnerLineNumber(1); }

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
