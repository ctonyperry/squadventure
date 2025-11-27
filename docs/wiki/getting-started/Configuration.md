# Configuration

Complete reference for Squadventure configuration options.

## Environment Variables

Create a `.env` file in the repository root or set these environment variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-proj-xxx...` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `OPENAI_TEMPERATURE` | `0.8` | Response creativity (0.0-1.0) |
| `OPENAI_MAX_TOKENS` | `2048` | Maximum response length |
| `LOG_LEVEL` | `info` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `SAVE_PATH` | `./.ai-dm-saves` | Directory for game saves |
| `DATABASE_PATH` | `./.ai-dm/sessions.db` | SQLite database location |

## OpenAI Configuration

### Model Selection

The default model is `gpt-4o-mini`, which provides a good balance of quality and cost. You can use other models:

```bash
# For highest quality
OPENAI_MODEL=gpt-4o

# For faster, cheaper responses
OPENAI_MODEL=gpt-4o-mini

# For older API compatibility
OPENAI_MODEL=gpt-4-turbo
```

### Temperature

Controls response randomness:
- `0.0` - Deterministic, consistent responses
- `0.8` - Default, good balance of creativity
- `1.0` - Maximum creativity/variability

For combat and rules, lower temperatures provide more consistent rulings. For narrative and roleplay, higher temperatures add variety.

## Game Configuration

### Save Files

Game saves are stored as JSON files in the save directory. Each save includes:
- World state (locations, NPCs, items)
- Session state (current scene, combat)
- Conversation history
- Player character data

### Database

SQLite is used for session persistence across restarts. The database stores:
- Session metadata
- World state snapshots
- Turn logs

## DM Persona Configuration

The DM persona affects the AI's personality and style. Current personas:

| Persona | Style | Best For |
|---------|-------|----------|
| Spencer | Improvisational, comedic | Casual games, experienced players |
| Classic | Traditional narrator | New players, serious campaigns |

See [DM Personas](../core-systems/DM-Personas.md) for creating custom personas.

## World Overlay Configuration

World overlays adapt the D&D 5e mechanics to different settings:

| Overlay | Setting | Changes |
|---------|---------|---------|
| `dark-fantasy` | Grimdark | Harsher tones, modified rules |
| `sci-fi-reskin` | Space opera | Reskinned terminology |

See [World Overlay System](../world-building/World-Overlay-System.md) for details.

## Development Configuration

### TypeScript

The `tsconfig.json` in each package extends the root configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### pnpm Workspace

Packages are linked via `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
```

## Runtime Configuration

Some settings can be changed at runtime via REPL commands:

| Command | Description |
|---------|-------------|
| `/save [label]` | Save current game |
| `/load` | List and load saves |
| `/scene` | Redescribe current scene |

See [Commands Reference](../reference/Commands.md) for all commands.
