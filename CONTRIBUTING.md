# Contributing to AlgoFlow

Thanks for your interest in contributing! Here's how to get started.

## Bug Reports

- Use the [issue tracker](https://github.com/vish-chan/AlgoFlow/issues)
- Include steps to reproduce, expected vs actual behavior
- Provide the Java code that caused the issue

## Feature Requests

- Check existing issues first
- Describe the use case and expected behavior
- Consider if it fits AlgoFlow's educational focus

## Development Setup

```bash
git clone https://github.com/vish-chan/AlgoFlow.git
cd AlgoFlow
./start.sh
```

Or manually:

```bash
# Install node dependencies (npm workspaces — always from the repo root)
npm install

# Build the engine
cd packages/java/engine && mvn clean package

# Start the backend
cd apps/api/backend && mvn spring-boot:run

# Start the frontend (separate terminal)
npm run dev -w algo-frontend
```

### Repository layout

This is an npm workspace monorepo. Run `npm install` from the **repo root**, never
from inside a workspace.

| Path | Package | What it is |
|------|---------|------------|
| `packages/java/engine` | `com.algoflow:algo-transformer` | ByteBuddy agent that traces Java execution |
| `packages/python/engine` | — | AST rewriter that traces Python execution |
| `packages/shared/visualizer` | `@algoflow/visualizer` | Trace interpreter + canvas renderer, shared by all UIs |
| `apps/api/backend` | `com.algoflow:backend` | Spring Boot service the web app calls |
| `apps/web/frontend` | `algo-frontend` | React + Monaco playground |
| `apps/vscode/extension` | `algoflow-vscode` | VS Code extension; runs the engines locally |

### The shared visualizer

`packages/shared/visualizer` is consumed as **TypeScript source** (its `exports` point
at `.ts` files); there is no build step. It is imported by more than one UI, so keep it
free of host-specific dependencies — no Monaco, no `import.meta.env`, no VS Code APIs,
no backend client. Host-specific concerns belong in the consumer:

- `.` — core: `SimpleEngine`, `SimpleRenderer`, the playback transport, the theme. No React.
- `./react` — `VisualizerCanvas`. React is an optional peer dependency.

Its snapshot tests compare against the engines' golden traces in
`packages/{java/engine/src,python/engine}/test/snapshot/snapshots/`.

### The VS Code extension

```bash
npm install                              # repo root
npm run build -w algoflow-vscode         # vite (webview) + esbuild (extension host)
code apps/vscode/extension               # then press F5
```

The extension host and the webview are separate bundles with separate tsconfigs, and
`src/protocol.ts` is the only file both compile — keep it import-free so neither side
drags in the other's `lib`. In the Extension Development Host, **AlgoFlow: Load Golden
Trace** replays an engine snapshot with no JDK or Python required; it only appears when
the extension is running from a checkout of this repo.

[docs/vscode-extension.md](docs/vscode-extension.md) covers the rest: the two-bundle
build, the rules that are load-bearing (why `exec/**` must not import `vscode`, why the
Java package rewrite preserves lines), the backend bugs deliberately not ported, and
packaging.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend URL for frontend |
| `SERVER_PORT` | `8080` | Backend port |


## Guidelines

- **Java and Python**: Follow standard conventions, meaningful variable names
- **Frontend**: React + TypeScript, follow existing component patterns
- **Commits**: Conventional messages (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Add tests for new features when possible

## Pull Requests

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Submit a PR with a clear description
