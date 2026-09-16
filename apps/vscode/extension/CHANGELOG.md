# Changelog

## [0.1.0] — 2026-09-16

First release. Brings the AlgoFlow visualizer into VS Code.

### Added

- **AlgoFlow: Visualize This File** (<kbd>Cmd/Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) runs the Java or Python file in the active editor and renders the trace in a panel beside it.
- The current trace line is highlighted in the real editor via a theme-aware decoration, with an overview-ruler mark. Editing the document pauses playback and drops the highlight, since the recorded lines no longer match the text on screen; the trace is kept so it can still be scrubbed.
- Transport commands and keybindings — step forward/backward, play/pause, reset — gated so they are inert while no trace is loaded.
- Java compile errors are surfaced as editor diagnostics on the correct line and column.
- Completions for `@Graph`, `@Tree`, `@Chart` and `@LinkedList`, adding the import automatically.
- Status bar item showing progress and current line during playback.
- `algoflow.execution.timeoutMs` (30 s) starts counting once the Java tracing agent reports itself installed, so the time it spends rewriting JDK classes is not charged to your program — on a loaded machine that was enough to kill a short, finite run and blame it for looping forever.
- The Java and Python engines ship inside the extension; only a JDK 21+ or Python 3.10+ is needed. `algoflow.java.enginePath` / `algoflow.python.enginePath` override them for engine development.
- JDK discovery via `algoflow.java.home`, the Java extension's settings, `JAVA_HOME`, then `PATH`; Python discovery follows the environment selected in the Python extension.

### Notes

- Execution is entirely local — no network requests, and `ALGORITHM_VISUALIZER=true` is always set so the upstream tracer cannot upload traces.
- Java support covers single self-contained files.
