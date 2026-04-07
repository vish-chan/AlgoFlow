[![Stars](https://img.shields.io/github/stars/vish-chan/AlgoFlow?style=flat-square)](https://github.com/vish-chan/AlgoFlow/stargazers)
[![Forks](https://img.shields.io/github/forks/vish-chan/AlgoFlow?style=flat-square)](https://github.com/vish-chan/AlgoFlow/network/members)
[![Issues](https://img.shields.io/github/issues/vish-chan/AlgoFlow?style=flat-square)](https://github.com/vish-chan/AlgoFlow/issues)
[![License](https://img.shields.io/github/license/vish-chan/AlgoFlow?style=flat-square)](https://github.com/vish-chan/AlgoFlow/blob/main/LICENSE)
[![Java](https://img.shields.io/badge/Java-21+-orange?style=flat-square&logo=openjdk)](https://openjdk.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

# <picture><source media="(prefers-color-scheme: dark)" srcset="apps/web/frontend/public/logo-dark.svg"><img alt="AlgoFlow" src="apps/web/frontend/public/favicon.svg" width="28" height="28" style="vertical-align: middle;"></picture> AlgoFlow

Write algorithms in Java or Python — see them execute step by step. No SDKs, no manual tracing.

AlgoFlow is the engine behind **[AlgoPad](https://www.algopad.dev/)** — **[Try it live →](https://www.algopad.dev/)**

<!-- Add a demo GIF/screenshot here: -->
![AlgoFlow Demo](docs/demo.gif)

## Zero Instrumentation

Just write normal code. AlgoFlow intercepts operations automatically — every array swap, tree insertion, and graph traversal is visualized.

```java
// Java — bytecode-level interception
int[] arr = {5, 2, 8, 1};
arr[0] = 10;                    // ← visualized

@Tree TreeNode root = new TreeNode(1);
root.left = new TreeNode(2);    // ← visualized
```

```python
# Python — AST transformation
arr = [5, 2, 8, 1]
arr[0] = 10                     # ← visualized

graph = {0: [1, 2], 1: [0, 3]}
visited = set()                 # ← visualized
```

## Features

- **Arrays** — 1D, 2D, bar charts with step-by-step highlighting
- **Trees** — binary trees (Java: `@Tree` annotation, Python: auto-detected via `left`/`right`/`val` attributes)
- **Graphs** — directed, undirected, weighted (Java: `@Graph`, Python: adjacency lists/matrices, `# @graph` annotation)
- **Linked Lists** — singly/doubly linked (Java: `@LinkedList`, Python: auto-detected via `next`/`val` attributes)
- **Collections** — Lists, Queues, Stacks, Dicts, Sets
- **Charts** — bar chart visualization (Java: `@Chart`, Python: `# @chart` annotation)
- **Call Stack** — method/function enter/exit tracking for recursion
- **Local Variables** — automatic detection and display
- **Line Highlighting** — see exactly which line is executing
- **Leetcode Practice** — curated problems with built-in editor (Java & Python)

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
│   Frontend   │────▶│  Spring Boot API  │────▶│  Java Agent /  │
│  React +     │◀────│  Compile & Run    │◀────│  Python Tracer │
│  Monaco      │     │  user code        │     │                │
└─────────────┘     └──────────────────┘     └────────────────┘
       ▲                                              │
       │            visualization commands            │
       └──────────────────────────────────────────────┘
```

- **Java** — A ByteBuddy agent transforms bytecode at class load time, intercepting array operations, collection methods, field mutations, and method calls.
- **Python** — An AST transformer rewrites user code at parse time, injecting visualization callbacks for assignments, attribute access, subscript operations, and function calls.

Both produce the same visualization command stream consumed by the frontend.

## Project Structure

```
apps/
  api/backend/      Spring Boot API
  web/frontend/     React + Monaco + Canvas visualizer
packages/
  java/engine/      Bytecode transformation engine (Java agent)
  python/engine/    AST transformation engine (Python tracer)
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

Built with [ByteBuddy](https://bytebuddy.net/) · [Monaco Editor](https://microsoft.github.io/monaco-editor/) · [React](https://reactjs.org/) · [tracers.java](https://github.com/algorithm-visualizer/tracers.java)
