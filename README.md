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

AlgoFlow automatically visualizes algorithm execution by intercepting operations at the bytecode (Java) and AST (Python) level. Perfect for computer science education, coding interviews, and algorithm learning.

AlgoFlow is the engine behind **[AlgoPad](https://www.algopad.dev/)** — **[Try it live →](https://www.algopad.dev/)**

![AlgoFlow Demo](docs/demo.gif)

## Why AlgoFlow?

Unlike algorithm visualization tools that require manual instrumentation or special APIs, AlgoFlow works with normal code. No need to learn visualization libraries or modify your algorithms.

## Features

Just write normal code — AlgoFlow automatically visualizes:
- **Arrays** — 1D/2D with step highlighting
- **Trees** — binary trees (Java: `@Tree`, Python: auto-detected)
- **Graphs** — directed/undirected (Java: `@Graph`, Python: adjacency lists)
- **Collections** — Lists, Queues, Stacks, Sets
- **Call Stack** — recursion tracking



## Quick Start

**Prerequisites:** Java 21+, Python 3.10+, Node.js 18+

```bash
git clone https://github.com/vish-chan/AlgoFlow.git
cd AlgoFlow
./start.sh
```

## In VS Code

The same visualizer runs inside VS Code, on the file you already have open —
<kbd>Cmd/Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd> opens a panel beside the editor and
walks a highlight down your source. Execution is entirely local (no backend, no network)
and the engines ship with the extension, so all you need is a JDK 21+ or Python 3.10+.

```bash
npm install
npm run build -w algoflow-vscode
code apps/vscode/extension        # then press F5
```

See [apps/vscode/extension/README.md](apps/vscode/extension/README.md) for usage and
[docs/vscode-extension.md](docs/vscode-extension.md) for how it is built.

## How It Works

- **Java** — ByteBuddy agent intercepts bytecode operations
- **Python** — AST transformer injects visualization callbacks
- **Frontend** — React + Monaco editor with canvas visualizer



## Deployment

```bash
docker-compose up --build
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache-2.0](LICENSE)

The Java engine builds on [tracers.java](https://github.com/algorithm-visualizer/tracers.java) (MIT) and ships it, Byte Buddy and Gson inside its shaded jar — see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).


