# AlgoFlow

Write Java algorithms — see them execute step by step. No SDKs, no manual tracing. Java only.

**🚀 Try it live: [algopad.up.railway.app](https://algopad.up.railway.app/)**

```java
int[] arr = {5, 2, 8, 1};
arr[0] = 10;  // ← automatically visualized
```

The engine intercepts array access, collection operations, field mutations, and method calls at the bytecode level to produce visualization data. The frontend replays it as an interactive animation.

## Project Structure

```
apps/
  api/backend/     → Spring Boot API (compiles & runs user code with the engine)
  web/frontend/    → React + Monaco editor + visualization canvas
packages/
  java/engine/     → Bytecode transformation engine (Java agent)
```

## Quick Start

```bash
./start.sh
```

This builds the engine, starts the backend on `:8080`, and the frontend on `:5173`.

## Supported Data Structures

| Type | Declaration |
|------|-------------|
| 1D arrays | `int[] arr` |
| 2D arrays | `int[][] matrix` |
| Graphs | `@Graph int[][] adj` |
| Binary trees | `@Tree TreeNode root` |
| Lists | `List<Integer> list` |
| 2D Lists | `List<List<Integer>> grid` |
| Queues/Deques/PriorityQueues | `Queue<Integer> q` |

## Auto-Tracked Panels

- **CallStack** — method enter/exit
- **Locals** — local variable updates
- **Console** — `System.out.println` output
- **Line Tracker** — highlights the currently executing line

## Deploy

Dockerfiles are provided for Railway (or any Docker host):

```
Dockerfile.backend    → Builds engine + Spring Boot, runs on Corretto 21
Dockerfile.frontend   → Builds React app, serves with nginx
```

See each package's README for details.

## License

[Apache-2.0](LICENSE)
