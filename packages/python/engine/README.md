# AlgoFlow Python Engine

AST rewriting engine that auto-visualizes algorithms with zero manual instrumentation.

## What It Does

Write normal Python code — the engine rewrites the AST at runtime to intercept list access, dict operations, attribute mutations, and function calls to produce step-by-step visualization data.

```python
arr = [5, 2, 8, 1]
arr[0] = 10                     # ← automatically visualized

graph = {0: [1, 2], 1: [0, 3]}  # ← auto-detected as graph

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

root = TreeNode(1)
root.left = TreeNode(2)         # ← tree updates in real time
```

No SDKs, no decorators, no manual tracing.

## Run Standalone

```bash
python3 engine/runner.py <file.py>
```

Outputs JSON to stdout — an array of tracer commands consumed by the frontend.

## Supported Data Structures

| Type | Declaration | Detection | Visualizer |
|------|-------------|-----------|------------|
| Lists | `arr = [1, 2, 3]` | Auto | Array1DTracer |
| 2D Lists | `grid = [[1,2],[3,4]]` | Auto | Array2DTracer |
| Dicts | `d = {"a": 1}` | Auto | Array2DTracer |
| Sets | `s = {1, 2, 3}` | Auto | Array1DTracer |
| Graphs | `g = {0: [1, 2]}` | Auto (dict with list values) or `# @graph` | GraphTracer |
| Trees | `root = TreeNode(1)` | Auto (`left`/`right`/`val` attrs) | GraphTracer (tree layout) |
| Linked Lists | `head = ListNode(1)` | Auto (`next`/`val` attrs) | Array1DTracer |
| Charts | `arr = [5, 2, 8]  # @chart` | `# @chart` annotation | ChartTracer |

## Comment Annotations

For explicit control over visualization type:

```python
graph = {0: [1, 2], 1: [3]}           # @graph
graph = {0: [[1, 5]], 1: [[3, 2]]}    # @graph(directed=True, weighted=True)
arr = [5, 2, 8, 1]                    # @chart
root = TreeNode(1)                     # @tree
head = ListNode(1)                     # @linkedlist
```

Annotations are optional — graphs, trees, and linked lists are auto-detected by structure. Use annotations when auto-detection doesn't apply (e.g. forcing a dict to render as a graph, or a list as a bar chart).

## Auto-Tracked Panels

- **CallStack** — function enter/exit with arguments, return values (`add(1, 2) → 3`), recursive labels
- **Locals** — local variable updates with patch highlighting on changes
- **Console** — `print()` calls redirected to log tracer
- **Line Tracker** — highlights the currently executing line (deduplicated)

## Intercepted Operations

| Operation | Example | Event |
|-----------|---------|-------|
| Subscript read | `arr[i]` | select (with lastSelected tracking) |
| Subscript write | `arr[i] = v` | patch/depatch |
| 2D subscript | `grid[r][c] = v` | patch(row, col) |
| Tuple swap | `arr[i], arr[j] = arr[j], arr[i]` | patch per element |
| Append/insert/extend | `arr.append(x)` | refresh |
| Pop/remove | `arr.pop()` | refresh |
| Dict set/get/delete | `d[k] = v`, `d[k]`, `del d[k]` | select/refresh |
| Set add/discard | `s.add(x)` | refresh |
| `in` operator | `if x in arr` | contains |
| For-loop iteration | `for x in arr` | select per element |
| While-loop condition | `while curr:` | attr/subscript reads |
| Attribute set | `node.left = TreeNode(2)` | tree rebuild / list rebuild |
| Attribute get | `curr = node.left` | visit (tree) / select (linked list) |
| Tuple attr assign | `node.left, node.right = ...` | attr set per element |
| Graph subscript | `graph[node]` | visit node |
| Graph neighbor iter | `for n in graph[node]` | visit(neighbor, node) |
| Graph neighbor append | `graph[node].append(x)` | addEdge + visit |
| Adjacency matrix read | `matrix[r][c]` | visit(col, row) |
| Adjacency matrix write | `matrix[r][c] = v` | addEdge/removeEdge |
| `print()` | `print("hello")` | console log + delay |
| Local variable | `x = 5` (in function) | locals panel patch |
| Linked list pointer | `curr = head` (in function) | select on existing visualizer |

## Architecture

### Rewriter (`engine/rewriter.py`)

AST transformer that injects visualization callbacks before/after user statements.

- Parses `# @graph`, `# @chart` comment annotations
- Injects `_r.highlight_line(N)` before each statement
- Extracts attribute reads from assignments, call args, if/while conditions, for iterables
- Handles tuple assignments with attribute targets (`node.left, node.right = ...`)
- Routes dict subscript writes through `on_graph_dict_set` for graph-aware handling

### Registry (`engine/registry.py`)

Central dispatch — receives all events from rewritten code and translates them into tracer commands.

- `_VisEntry` — uniform wrapper for all registered visualizers (kind, vis, ref, state)
- `_TreeVis` — binary tree visualizer with BFS walk, rebuild on mutation, leaveLastSource tracking
- `_LinkedListVis` — linked list visualizer with pointer tracking, SinglyLinkedList/DoublyLinkedList labels
- Graph support — adjacency list (dict) and adjacency matrix (2D list), visit/leave with source→target
- CallStack — return value display, recursive detection, patch on return
- Layout ordering — CallStack and Locals always appear as the topmost panels

### Runner (`engine/runner.py`)

Entry point — parses user code, applies AST rewriting, executes with `sys.settrace` for call/return tracking (including return values).

## Snapshot Tests

Regression tests using golden snapshots, mirroring the Java engine's approach:

```bash
cd test/snapshot

# Extract examples from frontend
python3 extract_examples.py

# Generate golden snapshots
./snapshot_test.sh generate

# Verify against golden snapshots
./snapshot_test.sh verify

# Run a single example
./snapshot_test.sh run bubble_sort
```

24 examples covering sorting, searching, graphs, trees, linked lists, dynamic programming, and data structures.

## Limitations

- `sys.settrace` only tracks call/return — line-level tracking is done via AST rewriting
- Tree/linked list auto-detection relies on attribute naming conventions (`left`/`right`/`val`, `next`/`val`)
- Graph auto-detection assumes dict with list values is an adjacency list
