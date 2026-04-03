# AlgoFlow Python Engine

AST rewriting engine that auto-visualizes algorithms with zero manual instrumentation.

## What It Does

Write normal Python code — the engine rewrites the AST at runtime to intercept list access, dict operations, set mutations, and function calls to produce step-by-step visualization data. Python only.

```python
# No SDKs, no decorators, no manual tracing.
# Just declare your data structures and write your algorithm.

arr = [5, 2, 8, 1]
arr[0] = 10  # ← automatically visualized
```

## Run Standalone

```bash
python3 engine/runner.py <file.py>
```

Outputs JSON to stdout — an array of tracer commands consumed by the frontend.

## Supported Data Structures

| Type | Declaration | Visualizer |
|------|-------------|------------|
| Lists | `arr = [1, 2, 3]` | Array1DTracer |
| 2D Lists | `grid = [[1,2],[3,4]]` | Array2DTracer |
| Dicts | `d = {"a": 1}` | Array2DTracer |
| Sets | `s = {1, 2, 3}` | Array1DTracer |

All data structures are auto-detected on assignment — no annotations needed.

## Auto-Tracked Panels

- **CallStack** — function enter/exit with arguments
- **Locals** — local variable updates within functions (all frames, newest first)
- **Console** — `print()` calls redirected to log tracer
- **Line Tracker** — highlights the currently executing line

## Intercepted Operations

| Operation | Example | Event |
|-----------|---------|-------|
| Subscript read | `arr[i]` in comparisons | select |
| Subscript write | `arr[i] = v` | patch |
| 2D subscript | `grid[r][c] = v` | patch(row, col) |
| Tuple swap | `arr[i], arr[j] = arr[j], arr[i]` | patch per element |
| Append/insert/extend | `arr.append(x)` | refresh |
| Pop/remove | `arr.pop()` | refresh |
| Clear | `arr.clear()` | refresh |
| Dict set | `d[k] = v` | select key+value |
| Dict get | `d[k]` in comparisons | select key+value |
| Dict delete | `del d[k]` | refresh |
| Set add/discard | `s.add(x)` | refresh |
| `in` operator | `if x in arr` | contains |
| For-loop iteration | `for x in arr` | select per element |
| `print()` | `print("hello")` | console log |
| Local variable | `x = 5` (in function) | locals panel update |

## Architecture

### Rewriter (`engine/rewriter.py`)

AST transformer that injects visualization callbacks before/after user statements.

| Transform | What it does |
|-----------|-------------|
| Line highlight | Injects `_r.highlight_line(N)` before each statement |
| Assignments | Registers data structures + tracks locals in functions |
| Subscript writes | Emits `on_list_set` / `on_dict_set` after write |
| Subscript reads | Emits `on_list_get` / `on_dict_get` for reads in comparisons |
| Tuple swaps | Emits patch events per swapped element |
| Method calls | Emits `on_list_append` / `on_list_remove` / `on_set_add` etc. |
| `print()` | Redirects to `_r.on_print()` |
| `del` | Emits `on_dict_delete` after deletion |
| `in` operator | Emits `on_contains` for membership tests |
| For loops | Emits `on_iter_start` + `on_iter_next` per iteration |
| Local variables | Emits `on_local_update` for assignments in functions |

### Registry (`engine/registry.py`)

Central dispatch — receives all events from rewritten code and translates them into tracer commands.

| Component | Role |
|-----------|------|
| `register` | Auto-detects type (list, 2D list, dict, set) and creates visualizer |
| `on_list_*` | List select/patch/refresh operations |
| `on_list2d_*` | 2D list select/patch operations |
| `on_dict_*` | Dict key+value highlighting and refresh |
| `on_set_*` | Set refresh and contains |
| `on_contains` | Routes `in` operator to the right type handler |
| `on_iter_start/next` | Tracks iteration index per collection |
| `on_call/on_return` | Call stack + locals frame management |
| `on_print` | Console output |
| `highlight_line` | Line tracking |

### Runner (`engine/runner.py`)

Entry point — parses user code, applies AST rewriting, executes with `sys.settrace` for call/return tracking.

## Limitations

- No annotation system — all data structures are auto-detected by type
- Trees, graphs, and linked lists are not yet supported (Java engine only)
- `sys.settrace` only tracks call/return — line-level tracking is done via AST rewriting
