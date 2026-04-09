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
