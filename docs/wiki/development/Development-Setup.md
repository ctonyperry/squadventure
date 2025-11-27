# Development Setup

Complete guide to setting up a development environment for Squadventure.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| pnpm | 10+ | Package manager |
| Git | Latest | Version control |
| VS Code | Latest | Recommended IDE |

### Installing Prerequisites

```bash
# Node.js (via nvm)
nvm install 20
nvm use 20

# pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Verify
node --version  # v20.x.x
pnpm --version  # 10.x.x
```

## Repository Setup

```bash
# Clone
git clone https://github.com/ctonyperry/squadventure.git
cd squadventure

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Environment Configuration

Create `.env` in the repository root:

```bash
# Required
OPENAI_API_KEY=sk-your-api-key

# Development options
OPENAI_MODEL=gpt-4o-mini
LOG_LEVEL=debug
SAVE_PATH=./.ai-dm-saves
```

## VS Code Setup

### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bierner.markdown-mermaid"
  ]
}
```

### Settings

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Running the Application

### CLI REPL

```bash
# Development mode (with watch)
pnpm dev

# Or run directly
pnpm --filter @ai-dm/cli dev
```

### Web Dashboard (Future)

```bash
# Start both server and client
pnpm dev:web

# Or separately
pnpm dev:server
pnpm dev:client
```

## Development Workflow

### Watch Mode

Run TypeScript compiler in watch mode:

```bash
# Watch all packages
pnpm -r --parallel exec tsc --watch

# Watch specific package
pnpm --filter @ai-dm/domain exec tsc --watch
```

### Testing Changes

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @ai-dm/domain test

# Type checking
pnpm typecheck
```

### Building

```bash
# Full build
pnpm build

# Clean and rebuild
rm -rf packages/*/dist
pnpm build
```

## Package Development

### Adding a Dependency

```bash
# Add to specific package
pnpm --filter @ai-dm/domain add lodash
pnpm --filter @ai-dm/domain add -D @types/lodash

# Add dev dependency to root
pnpm add -Dw typescript
```

### Creating a New Package

```bash
mkdir packages/new-package
cd packages/new-package

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@ai-dm/new-package",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-dm/shared": "workspace:*"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

# Create source directory
mkdir src
echo 'export const hello = "world";' > src/index.ts
```

## Debugging

### VS Code Launch Config

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@ai-dm/cli", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Current Test",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
// Use LOG_LEVEL=debug for verbose output
import { createLogger } from '@ai-dm/infrastructure';

const log = createLogger('my-module');
log.debug('Debug message');
log.info('Info message');
log.error('Error message', error);
```

## Common Tasks

### Regenerate Types

After modifying types in `@ai-dm/shared`:

```bash
pnpm --filter @ai-dm/shared build
pnpm build  # Rebuild dependents
```

### Update Game Data

Edit JSON files in `data/systems/dnd5e/`:

```bash
# Validate JSON
pnpm --filter @ai-dm/domain test
```

### Test AI Interactions

```bash
# Run AI player archetypes
pnpm --filter @ai-dm/cli test-ai
```

## Troubleshooting

### Module Resolution Issues

```bash
# Clear caches and reinstall
rm -rf node_modules packages/*/node_modules
pnpm store prune
pnpm install
pnpm build
```

### TypeScript Errors

```bash
# Check for type errors
pnpm typecheck

# With verbose output
pnpm -r exec tsc --noEmit --extendedDiagnostics
```

### OpenAI API Issues

1. Verify API key is set
2. Check API credit balance
3. Ensure model name is valid
4. Check rate limits

## Related Documentation

- [Installation](../getting-started/Installation.md) - Basic setup
- [Building](Building.md) - Build process
- [Testing](Testing.md) - Test strategies
- [Code Conventions](Code-Conventions.md) - Style guide
