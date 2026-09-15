# AlgoFlow for VS Code

Visualize the algorithm in the file you are already editing. Press <kbd>Cmd</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd> (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd> on Windows/Linux) on a Java or Python file and a visualizer opens beside it, walking a highlight down your source as the algorithm runs.

## What it does

- **Runs locally.** Your code never leaves your machine — the extension spawns `javac`/`java` or `python3` itself. There is no backend and no network call.
- **Leaves your file alone.** Java has to be compiled into a specific package for the tracing agent to see it, but the rewrite is line- and column-preserving, so the highlight lands on the line you actually wrote and `git status` stays clean.
- **Works on unsaved buffers.** The current editor contents are what run, not the last save.
- **Visualizes arrays, 2D grids, graphs, trees, linked lists, hash maps, bar charts, recursion trees, locals and fields.**

## Requirements

| | Minimum | Notes |
|---|---|---|
| Java | JDK **21** | A full JDK, not a JRE — `javac` is run as a subprocess. |
| Python | **3.10** | The engine's AST rewriter uses 3.10+ syntax. |

Nothing else: the tracing engines ship inside the extension.

The JDK is looked up in this order, and each candidate is validated by running it: `algoflow.java.home` → `java.jdt.ls.java.home` (from the Java extension) → `java.configuration.runtimes` → `JAVA_HOME` → `PATH`. Python prefers whatever environment you have selected in the Python extension, so virtualenvs and conda work with no extra configuration.

## Commands

| Command | Keybinding |
|---|---|
| AlgoFlow: Visualize This File | <kbd>Cmd/Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd> |
| AlgoFlow: Step Forward | <kbd>Alt</kbd>+<kbd>→</kbd> |
| AlgoFlow: Step Backward | <kbd>Alt</kbd>+<kbd>←</kbd> |
| AlgoFlow: Play / Pause | <kbd>Cmd/Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>P</kbd> |
| AlgoFlow: Reset Playback | — |
| AlgoFlow: Open Visualizer Panel | — |

The transport keybindings are only active while a trace is loaded, so <kbd>Alt</kbd>+<kbd>←</kbd> keeps its usual meaning the rest of the time.

## Annotating what to show

Annotate a field and the visualizer picks the right view. Typing `@` in a Java file offers these with the import added automatically.

```java
public class Main {
    @Graph(directed = true, weighted = true)
    int[][] adjacency = {{0, 4, 0}, {4, 0, 8}, {0, 8, 0}};

    @Chart
    int[] heights = {5, 2, 9, 1};

    @Tree
    TreeNode root;
}
```

Python uses the `algorithm_visualizer` tracer API directly; see the examples under `packages/python/engine/test/snapshot/examples/`.

## Settings

| Setting | Default | |
|---|---|---|
| `algoflow.java.home` | `""` | JDK 21+ to use. Empty means auto-detect. |
| `algoflow.java.vmArgs` | `["-Xmx512m"]` | Extra JVM arguments for the traced run. |
| `algoflow.python.interpreterPath` | `""` | Python 3.10+ to use. Empty means auto-detect. |
| `algoflow.execution.timeoutMs` | `10000` | Kill the run after this long. |
| `algoflow.execution.maxTraceBytes` | `67108864` | Refuse traces larger than this. |
| `algoflow.playback.speedMs` | `500` | Delay between steps. |
| `algoflow.playback.autoPlayOnRun` | `true` | Start playing as soon as the trace is ready. |
| `algoflow.highlight.enabled` | `true` | Highlight the current line in the editor. |
| `algoflow.highlight.followCursor` | `true` | Scroll to keep the highlight visible. |
| `algoflow.trace.keepScratchDir` | `false` | Keep compiled output for debugging. |

`algoflow.java.enginePath` and `algoflow.python.enginePath` override the bundled engines; they exist for working on the engines themselves.

## Notes and limits

- **Java must be a single self-contained file** with one `public class` and a `main`. Multi-file projects are not supported yet.
- An infinite loop is killed at the timeout. Java writes its trace from a JVM shutdown hook, which survives `SIGTERM`, so you usually still get a **partial trace** with a warning rather than nothing.
- Editing the file invalidates the highlight (the status bar says so) because the recorded line numbers no longer describe the text on screen. Playback keeps working; re-run to re-sync.

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) and [docs/vscode-extension.md](../../../docs/vscode-extension.md) in the repository root.

## License

Apache-2.0 — see `LICENSE`.

The bundled Java engine embeds [tracers.java](https://github.com/algorithm-visualizer/tracers.java) (MIT, © Jinseo Jason Park), Byte Buddy and Gson (both Apache-2.0). `THIRD-PARTY-NOTICES.md`, which ships alongside this file, has the details and the license texts.
