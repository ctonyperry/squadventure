# Contributing

Thank you for your interest in contributing to Squadventure! This guide will help you get started.

## Ways to Contribute

### 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/ctonyperry/squadventure/issues/new) with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)

### 💡 Feature Requests

Have an idea? Check [existing issues](https://github.com/ctonyperry/squadventure/issues) first, then open a new one with:
- Clear description of the feature
- Use cases and benefits
- Any implementation ideas

### 📖 Documentation

Help improve our docs:
- Fix typos or unclear explanations
- Add examples
- Improve API documentation
- Translate content

### 🔧 Code Contributions

Ready to code? Here's the process:

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Make changes**: Follow our [code conventions](Code-Conventions.md)
4. **Write tests**: If applicable
5. **Submit a PR**: With a clear description

## Development Setup

See [Development Setup](Development-Setup.md) for full instructions.

Quick start:
```bash
git clone https://github.com/ctonyperry/squadventure.git
cd squadventure
pnpm install
pnpm build
pnpm dev
```

## Code Guidelines

### TypeScript

- Use strict mode
- Prefer interfaces over types for objects
- Use branded types for IDs
- Document public APIs with JSDoc

### Style

- Use Prettier for formatting
- Follow existing patterns in the codebase
- Keep functions small and focused
- Prefer explicit over implicit

See [Code Conventions](Code-Conventions.md) for details.

## Pull Request Process

1. **Update docs**: If you changed behavior, update documentation
2. **Add tests**: For new features or bug fixes
3. **Run checks**: `pnpm build && pnpm test && pnpm typecheck`
4. **Describe changes**: Clear PR description with motivation
5. **Link issues**: Reference related issues with `Fixes #123`

### PR Template

```markdown
## Description
[What does this PR do?]

## Motivation
[Why is this change needed?]

## Changes
- [List of changes]

## Testing
[How was this tested?]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Build passes
```

## Project Structure

```
squadventure/
├── packages/
│   ├── shared/          # Type definitions
│   ├── domain/          # Game logic
│   ├── infrastructure/  # LLM, persistence
│   ├── application/     # Session orchestration
│   └── cli/             # REPL interface
├── data/
│   ├── systems/         # Game system configs
│   └── overlays/        # World overlays
└── docs/
    └── wiki/            # Documentation
```

See [Package Structure](../architecture/Package-Structure.md) for details.

## Areas for Contribution

### Good First Issues

Look for issues tagged [`good first issue`](https://github.com/ctonyperry/squadventure/labels/good%20first%20issue).

### Current Focus Areas

1. **Phase 7: Polish & Scale**
   - API development
   - Performance optimization
   - Multiplayer support

2. **Documentation**
   - API reference improvements
   - Tutorial content
   - Example campaigns

3. **Content**
   - SRD spell database
   - Monster stat blocks
   - Sample worlds

## Community Guidelines

### Be Respectful
- Treat everyone with respect
- Be constructive in feedback
- Assume good intentions

### Be Helpful
- Help newcomers get started
- Share knowledge
- Review others' PRs

### Be Patient
- Maintainers are volunteers
- Quality takes time
- Complex changes need discussion

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/ctonyperry/squadventure/discussions)
- **Bugs**: Open an [Issue](https://github.com/ctonyperry/squadventure/issues)
- **Chat**: [Discord](#) (coming soon)

## Recognition

Contributors are recognized in:
- Release notes
- README contributors section
- Special mentions for significant contributions

Thank you for contributing! 🎲
