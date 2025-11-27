# API Reference

This directory contains API documentation for Squadventure.

## Documentation Strategy

### Auto-Generated API Docs

The `docs/api/` directory contains TypeDoc-generated API documentation from source code.

To generate API docs:

```bash
pnpm docs:api
```

This runs TypeDoc with the configuration in `typedoc.json` and outputs Markdown files to `docs/api/`.

### Hand-Written Documentation

Complex APIs that benefit from examples and context are documented manually:

- [DM Tools Reference](DM-Tools.md) - Comprehensive tool documentation with examples

## TypeDoc Configuration

The project uses TypeDoc with the markdown plugin:

```json
// typedoc.json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": [
    "packages/shared/src/index.ts",
    "packages/domain/src/index.ts",
    "packages/infrastructure/src/index.ts",
    "packages/application/src/index.ts"
  ],
  "entryPointStrategy": "expand",
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "githubPages": false,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "hideGenerator": true
}
```

## Package APIs

### @ai-dm/shared

Type definitions and schemas shared across packages:

- Branded ID types (EntityId, LocationId, etc.)
- World model types (Location, Entity, NPCEntity)
- Character types (CharacterSheet, AbilityScores)
- Session types (GameSession, Turn, CombatState)
- Zod schemas for runtime validation

### @ai-dm/domain

Game logic and mechanics:

- `GameSystem` - Game rules abstraction
- `CombatManager` - Combat handling
- `ConditionManager` - Status effects
- `InventoryManager` - Item management
- DM Tools - Tool definitions and handlers
- World builders and sample worlds

### @ai-dm/infrastructure

External service integrations:

- `LLMAdapter` - LLM interface
- `OpenAIAdapter` - OpenAI implementation
- `SnapshotStore` - File-based persistence
- `SQLiteSessionStore` - Database persistence

### @ai-dm/application

Session orchestration:

- `SessionOrchestrator` - Main session controller
- `SnapshotManager` - Save/load handling

## Generating Docs

```bash
# One-time generation
pnpm docs:api

# Watch mode for development
pnpm docs:api:watch
```

## Related Documentation

- [DM Tools Reference](DM-Tools.md) - Hand-written tool documentation
- [Domain Model](../architecture/Domain-Model.md) - Core types explained
- [Package Structure](../architecture/Package-Structure.md) - Package overview
