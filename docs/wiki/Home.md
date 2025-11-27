# Squadventure Wiki

Welcome to the Squadventure developer wiki! This documentation covers the architecture, implementation details, and development practices for contributing to Squadventure—an AI-powered Dungeon Master for tabletop RPGs.

## Quick Navigation

### Getting Started
- [Installation](getting-started/Installation.md) - Full development environment setup
- [Quick Start](getting-started/Quick-Start.md) - First game walkthrough (player-focused)
- [Configuration](getting-started/Configuration.md) - Environment variables and options

### Architecture
- [System Overview](architecture/Overview.md) - High-level architecture with diagrams
- [Package Structure](architecture/Package-Structure.md) - Monorepo organization
- [Domain Model](architecture/Domain-Model.md) - Core entities and relationships
- [Data Flow](architecture/Data-Flow.md) - Player message lifecycle
- [LLM Integration](architecture/LLM-Integration.md) - OpenAI adapter and tool calling
- [Persistence](architecture/Persistence.md) - SQLite and snapshot management

### Core Systems
- [Game System Abstraction](core-systems/Game-System-Abstraction.md) - `GameSystem` interface
- [D&D 5e Implementation](core-systems/DnD-5e-Implementation.md) - SRD rules implementation
- [Combat System](core-systems/Combat-System.md) - Initiative, attacks, conditions
- [Character System](core-systems/Character-System.md) - Character creation and progression
- [Magic System](core-systems/Magic-System.md) - Spellcasting and spell slots
- [Inventory System](core-systems/Inventory-System.md) - Items, equipment, currency
- [Knowledge Base](core-systems/Knowledge-Base.md) - RAG for rules lookup
- [Conditions Manager](core-systems/Conditions-Manager.md) - Status effects
- [DM Personas](core-systems/DM-Personas.md) - AI personality system

### World Building
- [World Model](world-building/World-Model.md) - Locations, NPCs, lore
- [World Overlay System](world-building/World-Overlay-System.md) - Setting adaptation
- [Procedural Generation](world-building/Procedural-Generation.md) - Encounters, treasure
- [Campaign System](world-building/Campaign-System.md) - Story arcs and chapters
- [NPC Relationships](world-building/NPC-Relationships.md) - Memory and factions

### Development
- [Contributing](development/Contributing.md) - How to contribute
- [Development Setup](development/Development-Setup.md) - Dev environment
- [Code Conventions](development/Code-Conventions.md) - TypeScript patterns
- [Testing](development/Testing.md) - AI player archetypes
- [Building](development/Building.md) - Build process

### API Reference
- [API Documentation Strategy](api-reference/README.md) - TypeDoc setup
- [DM Tools Reference](api-reference/DM-Tools.md) - Tool documentation with examples

### Reference
- [SRD Content](reference/SRD-Content.md) - Included D&D content
- [Commands](reference/Commands.md) - REPL commands
- [Glossary](reference/Glossary.md) - Terms and definitions

### Project
- [Changelog](project/Changelog.md) - Version history
- [License](project/License.md) - BSL-1.1 + OGL acknowledgments
- [Roadmap](../Roadmap.md) - Project phases and status

## Project Status

**Current Phase:** Phase 8 - Session Flow & Core Loop

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | ✅ Complete | Core conversation loop |
| Phase 2: Mechanics | ✅ Complete | Combat, dice, character sheets |
| Phase 2.5: Extended | ✅ Complete | Spells, rests, XP, death saves |
| Phase 3: Abstraction | ✅ Complete | GameSystem interface |
| Phase 4: Procedural Gen | ✅ Complete | Content generators |
| Phase 5: World Overlay | ✅ Complete | Campaign settings |
| Phase 6: World Gen | ✅ Complete | Agent-driven world creation |
| Phase 7: Polish & Scale | ✅ Complete | API, multiplayer, voice foundation |
| Phase 8: Session Flow | 📋 Planned | Session setup, character flow |
| Phase 9: Web UI | 📋 Planned | Shared-screen multiplayer UI |

See the full [Roadmap](../Roadmap.md) for detailed phase information.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | TypeScript 5.x | Type-safe development |
| Runtime | Node.js 20+ | Async-first for LLM calls |
| Package Manager | pnpm | Efficient monorepo support |
| LLM | OpenAI SDK | GPT-4o-mini with tool calling |
| Validation | Zod | Runtime schema validation |
| CLI | Ink | Rich terminal UI |
| Persistence | SQLite | Local session storage |

## Contributing

We welcome contributions! See the [Contributing Guide](development/Contributing.md) for how to get started.

## Quick Links

- [GitHub Repository](https://github.com/ctonyperry/squadventure)
- [GitHub Issues](https://github.com/ctonyperry/squadventure/issues)
- [GitHub Projects](https://github.com/users/ctonyperry/projects)
