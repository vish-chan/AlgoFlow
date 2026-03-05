# AlgoTransformer - Automatic Algorithm Visualization

Zero-learning-curve algorithm visualization using bytecode transformation.

## Build

```bash
mvn clean package
```

## Run

```bash
java25 -javaagent:target/algo-transformer-1.0-SNAPSHOT.jar \
     -cp target/algo-transformer-1.0-SNAPSHOT.jar \
     --add-opens java.base/java.util=ALL-UNNAMED \
     --add-opens java.base/javax.net.ssl=ALL-UNNAMED \
     com.algoflow.runner.QuickSortExample
```

## The Problem

Existing tools require manual instrumentation:
```java
array.select(i);
Tracer.delay();
array.patch(i, value);
Tracer.delay();
```

## The Solution

Write normal code, visualization happens automatically:
```java
int[] arr = {5, 2, 8, 1};
Visualizer.track(arr, "Array");

arr[0] = 10;  // Auto-visualized!
```

## How It Works

1. **ByteBuddy Agent** - Transforms bytecode at runtime
2. **Snapshot Comparison** - Detects changes to data structures
3. **Event Stream** - Renderer-agnostic visualization events
4. **Pluggable Renderers** - algorithm-visualizer, JavaFX, Web

## Architecture

See:
- `SNAPSHOT_ARCHITECTURE.md` - Snapshot-based change detection
- `RENDERER_ARCHITECTURE.md` - Pluggable renderer design

## Status

🚧 Under development - ByteBuddy implementation in progress
