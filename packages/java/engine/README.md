# AlgoFlow Engine

Bytecode transformation engine that auto-visualizes algorithms with zero manual instrumentation.

## What It Does

Write normal Java code — the engine intercepts array access, collection operations, field mutations, and method calls at the bytecode level to produce step-by-step visualization data. Java only.

```java
// No SDKs, no annotations on operations, no manual tracing.
// Just declare your data structures and write your algorithm.

int[] arr = {5, 2, 8, 1};
arr[0] = 10;  // ← automatically visualized
```

## Build

```bash
mvn clean package
```

## Run Standalone

```bash
java -javaagent:target/algo-transformer-1.0-SNAPSHOT.jar \
     -cp target/algo-transformer-1.0-SNAPSHOT.jar \
     --add-opens java.base/java.util=ALL-UNNAMED \
     com.algoflow.runner.YourExample
```

Outputs `visualization.json` — an array of tracer commands consumed by the frontend.

## Supported Data Structures

| Type | Declaration | Visualizer |
|------|-------------|------------|
| 1D arrays | `int[] arr` | Array1DTracer |
| 2D arrays | `int[][] matrix` | Array2DTracer |
| Graphs | `@Graph int[][] adj` | GraphTracer |
| Graphs (adj list) | `@Graph Map<K, List<V>> adj` | GraphTracer |
| Binary trees | `@Tree TreeNode root` | GraphTracer + layoutTree |
| Linked lists | `@LinkedList ListNode head` | Array1DTracer |
| Lists | `List<Integer> list` | Array1DTracer |
| 2D Lists | `List<List<Integer>> grid` | Array2DTracer |
| Maps | `Map<K, V> map` | Array2DTracer |
| Queues/Deques | `Queue<Integer> q` | Array1DTracer |
| PriorityQueues | `PriorityQueue<Integer> pq` | Array1DTracer |
| Charts | `@Chart int[] data` | ChartTracer |

### `@Graph`

```java
@Graph                                    // undirected, unweighted
@Graph(directed = true)                   // directed
@Graph(weighted = true)                   // weighted
@Graph(directed = true, weighted = true)  // both
```

Supports `int[][]` adjacency matrices and `Map<K, List<V>>` adjacency lists.

### `@Tree`

```java
@Tree TreeNode root;
```

Zero-config — auto-detects `val`, `left`, `right` fields from the node class. Any class with two self-referential fields (children) and a non-self field (value) works. Root can start as `null`.

### `@LinkedList`

```java
@LinkedList ListNode head;
```

Auto-detects `val` and `next` fields from the node class. Any class with at least one self-referential field (next pointer) and a non-self field (value) works. Singly linked (1 self-ref field) and doubly linked (2 self-ref fields) are both supported.

Linked list nodes created as local variables (without `@LinkedList`) are also auto-detected and visualized.

### `@Chart`

```java
@Chart int[] data;
```

Renders a bar chart that updates as array values change.

## Auto-Tracked Panels

- **CallStack** — method enter/exit for runner classes
- **Locals** — local variable updates within methods
- **Console** — `System.out.println` calls from runner code
- **Line Tracker** — highlights the currently executing line

## Architecture

### Agent Layer (`agent/`)

Bytecode transformers wired by `VisualizerAgent` via ByteBuddy at class load time.

| File | What it intercepts |
|------|--------------------|
| `ArrayAccessWrapper` | `IALOAD`/`IASTORE` etc. → array read/write events |
| `FieldAccessWrapper` | `GETFIELD`/`PUTFIELD` → tree/linked list node field access |
| `CollectionInterceptor` | `add`/`remove`/`clear`/`offer`/`poll`/`push`/`pop` |
| `ListInterceptor` | `get`/`set` (index-based) |
| `MapInterceptor` | `put`/`get`/`remove`/`clear` on Maps |
| `IteratorInterceptor` | `iterator()`/`next()` on collections |
| `PrintStreamInterceptor` | `writeln`/`write` on PrintStream |
| `RecursionInterceptor` | Method enter/exit for call stack tracking |
| `ConstructorInterceptor` | Triggers field auto-scan after object construction |
| `StaticInitInterceptor` | Static field scanning |
| `LocalVariableTrackerWrapper` | Local variable store instructions |

### Visualizer Layer (`visualiser/`)

Receives events from the agent layer and translates them into tracer commands.

| File | Role |
|------|------|
| `VisualizerRegistry` | Central dispatch — routes all events to the right visualizer |
| `VisualizerInitializer` | Auto-scans fields on construction, creates visualizers |
| `PrimitiveArray1DVisualizer` | `int[]`/`boolean[]` → Array1DTracer |
| `PrimitiveArray2DVisualizer` | `int[][]` → Array2DTracer |
| `Array1DVisualiser` | `List`/`Queue`/`Deque` → Array1DTracer |
| `Array2DVisualiser` | `List<List>` → Array2DTracer |
| `GraphVisualizer` | Adjacency matrix/list → GraphTracer |
| `TreeVisualizer` | Binary tree → GraphTracer with `layoutTree` |
| `LinkedListVisualizer` | Linked list → Array1DTracer |
| `HashMapVisualizer` | `Map<K, V>` → Array2DTracer |
| `ChartVisualizer` | Primitive arrays → ChartTracer |
| `CallStackVisualizer` | Method call stack |
| `LocalVariablesVisualizer` | Local variable table |
| `LogVisualizer` | Console output |
| `CodeVisualizer` | Line highlighting |

### Annotations (`annotation/`)

| Annotation | Target | Purpose |
|------------|--------|---------|
| `@Graph` | Field | Marks `int[][]` or `Map<K, List<V>>` as graph |
| `@Tree` | Field | Marks a field as binary tree root |
| `@LinkedList` | Field | Marks a field as linked list head |
| `@Chart` | Field | Marks a primitive array as bar chart |

## Limitations

- `@Tree` auto-detection requires exactly two self-referential fields in the node class
