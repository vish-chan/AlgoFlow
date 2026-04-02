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
# Build the engine
cd packages/java/engine && mvn clean package

# Start the backend
cd apps/api/backend && mvn spring-boot:run

# Start the frontend (separate terminal)
cd apps/web/frontend && npm install && npm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend URL for frontend |
| `SERVER_PORT` | `8080` | Backend port |

## Architecture

The system has three components:

1. **Java Agent** (`packages/java/engine/`) — bytecode transformation using ByteBuddy. Intercepts array ops, collection methods, field mutations, and method calls
2. **Backend API** (`apps/api/backend/`) — Spring Boot service that compiles and runs user code with the agent attached
3. **Frontend** (`apps/web/frontend/`) — React + TypeScript app with Monaco editor and Canvas-based visualization

## Supported Data Structures

| Type | Declaration | Notes |
|------|-------------|-------|
| 1D arrays | `int[] arr` | Auto-tracked |
| 2D arrays | `int[][] matrix` | Auto-tracked |
| Graphs | `@Graph int[][] adj` | Supports `directed`, `weighted` options |
| Binary trees | `@Tree TreeNode root` | Auto-detects `val`, `left`, `right` fields |
| Lists | `List<Integer> list` | Auto-tracked |
| 2D Lists | `List<List<Integer>> grid` | Auto-tracked |
| Queues/Deques | `Queue<Integer> q` | Auto-tracked |
| PriorityQueues | `PriorityQueue<Integer> pq` | Auto-tracked |

## Guidelines

- **Java**: Follow standard conventions, meaningful variable names
- **Frontend**: React + TypeScript, follow existing component patterns
- **Commits**: Conventional messages (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Add tests for new features when possible

## Pull Requests

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Submit a PR with a clear description
