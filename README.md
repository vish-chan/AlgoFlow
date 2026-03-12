# <picture><source media="(prefers-color-scheme: dark)" srcset="logo-dark.svg"><img src="apps/web/frontend/public/favicon.svg" alt="AlgoFlow" width="32" height="32" style="vertical-align: middle;"></picture> AlgoFlow

**🚀 [Try it live](https://algopad.up.railway.app/)**

Write Java algorithms — see them execute step by step. No SDKs, no manual tracing. Java only.

```java
// No annotations on operations, no manual instrumentation
// Just declare your data structures and write your algorithm
int[] arr = {5, 2, 8, 1};
arr[0] = 10;  // ← automatically visualized

List<Integer> list = new ArrayList<>();
list.add(42); // ← automatically visualized

@Tree TreeNode root = new TreeNode(1);
root.left = new TreeNode(2); // ← automatically visualized
```

## What Makes AlgoFlow Different

- **Zero Manual Instrumentation**: Write normal Java code. The engine intercepts operations at the bytecode level
- **Comprehensive Tracking**: Arrays, collections, trees, graphs, method calls, local variables — all visualized automatically  
- **Interactive Visualization**: Step through execution, see data structure changes in real-time
- **Educational Focus**: Perfect for learning algorithms, teaching data structures, or debugging complex logic

## How It Works

AlgoFlow uses a Java agent that transforms bytecode at class load time. It intercepts:

- **Array operations**: `arr[i] = value`, `matrix[row][col]`
- **Collection methods**: `list.add()`, `queue.poll()`, `stack.push()`
- **Field mutations**: Tree node connections, object property changes
- **Method calls**: Entry/exit for call stack visualization
- **Local variables**: Automatic detection and visualization of data structures

The frontend receives this stream of events and renders them as interactive visualizations.

## Supported Data Structures

| Type | Declaration | Visualizer |
|------|-------------|------------|
| 1D arrays | `int[] arr` | Array1DTracer |
| 2D arrays | `int[][] matrix` | Array2DTracer |
| Graphs | `@Graph int[][] adj` | GraphTracer |
| Binary trees | `@Tree TreeNode root` | GraphTracer + layoutTree |
| Lists | `List<Integer> list` | Array1DTracer |
| 2D Lists | `List<List<Integer>> grid` | Array2DTracer |
| Queues/Deques | `Queue<Integer> q` | Array1DTracer |
| PriorityQueues | `PriorityQueue<Integer> pq` | Array1DTracer |

### Special Annotations

```java
@Graph                                    // undirected, unweighted
@Graph(directed = true)                   // directed
@Graph(weighted = true)                   // weighted  
@Graph(directed = true, weighted = true)  // both

@Tree TreeNode root;  // Auto-detects val, left, right fields
```

## Auto-Tracked Panels

- **CallStack** — method enter/exit for runner classes
- **Locals** — local variable updates within methods  
- **Console** — `System.out.println` calls from runner code
- **Line Tracker** — highlights the currently executing line

## Project Structure

```
apps/
  api/backend/     → Spring Boot API (compiles & runs user code with the engine)
  web/frontend/    → React + Monaco editor + visualization canvas
packages/
  java/engine/     → Bytecode transformation engine (Java agent)
```

## Quick Start

### Prerequisites
- Java 21+
- Node.js 18+
- Maven 3.6+

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/AlgoFlow.git
cd AlgoFlow

# Start all services
./start.sh
```

This builds the engine, starts the backend on `:8080`, and the frontend on `:5173`.

### Manual Setup

```bash
# Build the engine
cd packages/java/engine
mvn clean package

# Start the backend
cd ../../../apps/api/backend
mvn spring-boot:run

# Start the frontend (in another terminal)
cd ../../web/frontend
npm install
npm run dev
```

## Usage Examples

```java
// Sorting Algorithm
int[] arr = {64, 34, 25, 12, 22};
// ... bubble sort implementation
// Array swaps automatically visualized

// Binary Tree Traversal  
@Tree TreeNode root = new TreeNode(1);
root.left = new TreeNode(2);
// ... tree operations automatically visualized

// Graph Algorithm
@Graph(directed = true) int[][] graph = new int[4][4];
graph[0][1] = 1; // Edge additions visualized
// ... DFS implementation
```

[See more examples in the live demo →](https://algopad.up.railway.app/)

## Contributing

We welcome contributions! Here's how to get started:

### 🐛 Bug Reports
- Use the [issue tracker](https://github.com/vish-chan/AlgoFlow/issues)
- Include steps to reproduce, expected vs actual behavior
- Provide the Java code that caused the issue

### 💡 Feature Requests  
- Check existing issues first
- Describe the use case and expected behavior
- Consider if it fits AlgoFlow's educational focus

### 🔧 Development Contributions

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our coding standards
4. **Test thoroughly** with various algorithms
5. **Submit a pull request** with a clear description

### Areas We Need Help With

- **New Data Structures**: Support for maps, heaps, tries, segment trees
- **Algorithm Examples**: More educational examples in the frontend
- **Performance**: Optimizing bytecode transformation overhead
- **Documentation**: Tutorials, API docs, architecture guides
- **Testing**: Unit tests, integration tests, edge case coverage

### Development Guidelines

- **Java Code**: Follow standard Java conventions, use meaningful variable names
- **Frontend**: React + TypeScript, follow existing component patterns  
- **Commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Try to add tests for new features

### Architecture Overview

The system has three main components:

1. **Java Agent** (`packages/java/engine/`): Bytecode transformation using ByteBuddy
2. **Backend API** (`apps/api/backend/`): Spring Boot service that compiles and runs user code
3. **Frontend** (`apps/web/frontend/`): React app with Monaco editor and visualization canvas

See individual package READMEs for detailed architecture information.

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Railway/Cloud Deployment

Dockerfiles are provided for cloud deployment:

- `Dockerfile.backend` → Builds engine + Spring Boot, runs on Corretto 21
- `Dockerfile.frontend` → Builds React app, serves with nginx

### Environment Variables

```bash
# Backend
JAVA_OPTS="-Xmx2g"
SERVER_PORT=8080

# Frontend  
VITE_API_URL=http://localhost:8080
```

## Limitations

- **Java Only**: Currently supports Java algorithms exclusively
- **Graph Types**: `@Graph` only supports `int[][]` adjacency matrices
- **Tree Detection**: Auto-detects classes with exactly two self-referential fields
- **Performance**: Bytecode transformation adds overhead (acceptable for educational use)

## Roadmap

- [ ] Map and Heap/priority queue visualization improvements
- [ ] Support for more graph representations (adjacency lists, edge lists)
- [ ] Multi-language support (Python, C++)
- [ ] Collaborative editing features
- [ ] Algorithm performance benchmarking


## License

[Apache-2.0](LICENSE) - Feel free to use AlgoFlow in educational settings, contribute improvements, or build upon it for your own projects.

## Acknowledgments

- Built with [ByteBuddy](https://bytebuddy.net/) for bytecode transformation
- Visualization powered by [Algorithm Visualizer tracers](https://github.com/algorithm-visualizer/tracers.java)
- Frontend built with [React](https://reactjs.org/) and [Monaco Editor](https://microsoft.github.io/monaco-editor/)

---

**Made with ❤️ for computer science education**
