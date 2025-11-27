<div align="center">
  <img src="assets/logo.png" alt="Squadventure" width="400">

  # Squadventure

  **AI Dungeon Master for Kids**

  A voice-driven AI game guide with real-time speech interaction, adaptive storytelling, and a modular rules engine inspired by classic tabletop RPGs.

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

---

## Features

### Core Systems
- **AI Dungeon Master** - LLM-powered game master that narrates, adjudicates rules, and controls NPCs
- **Combat System** - Full D&D 5e combat with initiative, conditions, advantage/disadvantage, and death saves
- **Inventory & Equipment** - Complete item management with weapons, armor, consumables, and currency
- **Character Creation** - Build characters with SRD races, classes, and backgrounds
- **RAG Knowledge Base** - Rules lookup for spells, monsters, conditions, and game mechanics
- **Session Persistence** - Save and load game sessions

### DM Tools
The AI has access to tools for:
- Rolling dice with proper notation (1d20+5, 2d6, etc.)
- Combat management (initiative, attacks, damage, conditions)
- Inventory management (give/take items, equip, use consumables)
- Rules lookup (spells, monsters, conditions)
- World state queries (NPCs, locations, lore)

### Supported Content (SRD)
- **Races**: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
- **Classes**: Fighter, Rogue, Wizard, Cleric
- **Weapons**: Simple & Martial (daggers, longswords, bows, etc.)
- **Armor**: Light, Medium, Heavy, and Shields
- **Monsters**: Goblin, Skeleton, Wolf, Zombie, Orc, Giant Spider, Ogre, Owlbear
- **Spells**: Fireball, Magic Missile, Shield, Healing Word, Sleep, and more

## Architecture

```
packages/
├── shared/        # Type definitions and schemas
├── domain/        # Core game logic (combat, inventory, characters)
├── infrastructure/# LLM adapters, persistence
├── application/   # Session orchestration, snapshot management
└── cli/           # Interactive REPL interface
```

### Design Principles
- **Domain-Driven Design** - Clean separation of concerns
- **Type Safety** - Strict TypeScript with branded types for IDs
- **Testable** - AI player archetypes for automated testing
- **Extensible** - Easy to add new worlds, personas, and content

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/ctonyperry/squadventure.git
cd squadventure

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Configuration

Create a `.env` file in the root:

```env
OPENAI_API_KEY=your-api-key-here
```

### Running the Game

```bash
# Start the interactive REPL
pnpm start

# Or run in development mode
pnpm dev
```

### Commands

In the game REPL:
- `/help` - Show available commands
- `/save [label]` - Save the current game
- `/load` - List and load saved games
- `/scene` - Describe the current scene
- `/quit` - Exit the game

## Development

```bash
# Build all packages
pnpm build

# Watch mode for development
pnpm dev

# Run type checking
pnpm typecheck
```

### Project Structure

| Package | Description |
|---------|-------------|
| `@ai-dm/shared` | Shared types, schemas, and utilities |
| `@ai-dm/domain` | Game logic: combat, inventory, characters, knowledge |
| `@ai-dm/infrastructure` | LLM adapters (OpenAI), file persistence |
| `@ai-dm/application` | Session orchestration, state management |
| `@ai-dm/cli` | Command-line interface and REPL |

## AI Testing

The project includes an AI player testing framework with different player archetypes:
- Combat Optimizer
- Roleplay Enthusiast
- Curious Explorer
- Puzzle Solver
- Chaos Agent
- New Player

These can be used to automatically test game scenarios and DM responses.

## License

MIT

## Acknowledgments

- D&D 5e SRD content used under the Open Gaming License
- Built with Claude (Anthropic) assistance
