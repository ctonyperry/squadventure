# Installation

Complete guide to setting up Squadventure for development.

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 10+** - Package manager for monorepos
- **Git** - Version control
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

### Installing pnpm

```bash
# Using npm
npm install -g pnpm

# Or using corepack (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

## Clone the Repository

```bash
git clone https://github.com/ctonyperry/squadventure.git
cd squadventure
```

## Install Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo.

## Environment Setup

Create a `.env` file in the repository root:

```bash
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional - defaults shown
OPENAI_MODEL=gpt-4o-mini
LOG_LEVEL=info
SAVE_PATH=./.ai-dm-saves
```

See [Configuration](Configuration.md) for all available options.

## Build the Project

```bash
pnpm build
```

This builds all packages in dependency order:
1. `@ai-dm/shared` - Type definitions
2. `@ai-dm/domain` - Game logic
3. `@ai-dm/infrastructure` - LLM adapters
4. `@ai-dm/application` - Session orchestration
5. `@ai-dm/cli` - REPL interface

## Run the Game

```bash
pnpm dev
```

This starts the CLI REPL. You should see:

```
═══════════════════════════════════════════════════════════
                   AI DUNGEON MASTER                        
═══════════════════════════════════════════════════════════

DM Persona: Spencer
Type your actions or dialogue. Commands: /help, /quit, /save

DM: [Initial scene description...]

You: 
```

## Verify Installation

Run the test suite to verify everything is working:

```bash
pnpm test
```

Run type checking:

```bash
pnpm typecheck
```

## Troubleshooting

### "Module not found" errors

Ensure all packages are built:
```bash
pnpm build
```

### OpenAI API errors

1. Verify your API key is set correctly
2. Check you have API credits available
3. Ensure the model name is valid

### pnpm errors

Try clearing the cache:
```bash
pnpm store prune
rm -rf node_modules
pnpm install
```

## Next Steps

- [Quick Start](Quick-Start.md) - Play your first game
- [Development Setup](../development/Development-Setup.md) - Set up your dev environment
- [Architecture Overview](../architecture/Overview.md) - Understand the codebase
