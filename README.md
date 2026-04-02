# <picture><source media="(prefers-color-scheme: dark)" srcset="apps/web/frontend/public/logo-dark.svg"><img alt="AlgoFlow" src="apps/web/frontend/public/favicon.svg" width="28" height="28" style="vertical-align: middle;"></picture> AlgoFlow

Write Java algorithms — see them execute step by step. No SDKs, no manual tracing.

**[Try it live →](https://algopad.up.railway.app/)**

<!-- Add a demo GIF/screenshot here: -->
<!-- ![AlgoFlow Demo](docs/demo.gif) -->

## Zero Instrumentation

Just write normal Java. AlgoFlow intercepts operations at the bytecode level — every array swap, tree insertion, and graph traversal is visualized automatically.

```java
int[] arr = {5, 2, 8, 1};
arr[0] = 10;                    // ← visualized

@Tree TreeNode root = new TreeNode(1);
root.left = new TreeNode(2);    // ← visualized

@Graph int[][] adj = new int[4][4];
adj[0][1] = 1;                  // ← visualized
```

## Features

- **Arrays** — 1D, 2D, bar charts with step-by-step highlighting
- **Trees** — binary trees via `@Tree` annotation
- **Graphs** — directed, undirected, weighted via `@Graph`
- **Collections** — Lists, Queues, Stacks, PriorityQueues
- **Call Stack** — method enter/exit tracking for recursion
- **Local Variables** — automatic detection and display
- **Line Highlighting** — see exactly which line is executing
- **Leetcode Practice** — curated problems with built-in editor

## Quick Start

**Prerequisites:** Java 21+, Node.js 18+, Maven 3.6+

```bash
git clone https://github.com/vish-chan/AlgoFlow.git
cd AlgoFlow
./start.sh
```

Opens at [localhost:5173](http://localhost:5173). Backend runs on `:8080`.

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Frontend   │────▶│  Spring Boot API  │────▶│  Java Agent    │
│  React +     │◀────│  Compile & Run    │◀────│  ByteBuddy     │
│  Monaco      │     │  user code        │     │  bytecode xform│
└─────────────┘     └──────────────────┘     └────────────────┘
       ▲                                              │
       │            visualization commands            │
       └──────────────────────────────────────────────┘
```

The Java agent transforms bytecode at class load time, intercepting array operations, collection methods, field mutations, and method calls. These events stream to the frontend as visualization commands.

## Project Structure

```
apps/
  api/backend/      Spring Boot API
  web/frontend/     React + Monaco + Canvas visualizer
packages/
  java/engine/      Bytecode transformation engine (Java agent)
```

## Deployment

```bash
docker-compose up --build
```

Dockerfiles provided for cloud deployment (`Dockerfile.backend`, `Dockerfile.frontend`).

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas we'd love help with:** new data structures (maps, tries, segment trees), more algorithm examples, performance optimization, and tests.

## License

[Apache-2.0](LICENSE)

---

Built with [ByteBuddy](https://bytebuddy.net/) · [Monaco Editor](https://microsoft.github.io/monaco-editor/) · [React](https://reactjs.org/)
