# Architecture Overview

Squadventure is built as a layered monorepo architecture with clear separation of concerns. This document provides a high-level view of the system design.

## System Architecture

```mermaid
graph TB
    subgraph Presentation["Presentation Layer"]
        CLI["@ai-dm/cli<br/>REPL Interface"]
        WEB["@ai-dm/web<br/>(Future) Dashboard"]
    end
    subgraph Application["Application Layer"]
        APP["@ai-dm/application<br/>Session Orchestration"]
    end
    subgraph Core["Core Layer"]
        DOMAIN["@ai-dm/domain<br/>Game Logic"]
        SHARED["@ai-dm/shared<br/>Types & Schemas"]
    end
    subgraph Infrastructure["Infrastructure Layer"]
        INFRA["@ai-dm/infrastructure<br/>LLM & Persistence"]
    end
    subgraph External["External Services"]
        OPENAI["OpenAI API<br/>GPT-4o-mini"]
        SQLITE["SQLite<br/>Local Storage"]
    end
    CLI --> APP
    WEB -.-> APP
    APP --> DOMAIN
    APP --> INFRA
    DOMAIN --> SHARED
    INFRA --> SHARED
    INFRA --> OPENAI
    INFRA --> SQLITE
```

## Layer Responsibilities

### Presentation Layer
- **CLI (`@ai-dm/cli`)**: Interactive REPL interface using Node.js readline
- **Web** (planned): React-based dashboard for game state visualization

### Application Layer
- **Session Orchestrator**: Coordinates game sessions, manages conversation flow
- **Snapshot Manager**: Handles save/load functionality

### Core Layer
- **Domain (`@ai-dm/domain`)**: All game logic, rules, and mechanics
- **Shared (`@ai-dm/shared`)**: TypeScript types, Zod schemas, branded IDs

### Infrastructure Layer
- **LLM Adapter**: OpenAI API integration with streaming and tool calling
- **Persistence**: SQLite for sessions, file-based snapshots

## Package Dependencies

```mermaid
graph LR
    CLI["@ai-dm/cli"] --> APP["@ai-dm/application"]
    APP --> DOMAIN["@ai-dm/domain"]
    APP --> INFRA["@ai-dm/infrastructure"]
    DOMAIN --> SHARED["@ai-dm/shared"]
    INFRA --> SHARED
```

## Domain Module Structure

```mermaid
graph TB
    subgraph Domain["@ai-dm/domain"]
        WORLD["world/<br/>World Builder"]
        COMBAT["combat/<br/>Combat Manager"]
        MAGIC["magic/<br/>Spell System"]
        CHAR["character/<br/>Character Builder"]
        INV["inventory/<br/>Item Management"]
        COND["conditions/<br/>Status Effects"]
        KNOW["knowledge/<br/>RAG System"]
        PERS["persona/<br/>DM Personalities"]
        TOOLS["tools/<br/>DM Tools"]
        SYSTEM["system/<br/>Game System"]
        OVERLAY["overlay/<br/>World Overlays"]
        CAMP["campaign/<br/>Story Arcs"]
        NPC["npc/<br/>NPC Memory"]
        PROG["progression/<br/>XP & Leveling"]
    end
    
    COMBAT --> COND
    MAGIC --> KNOW
    CHAR --> SYSTEM
    INV --> WORLD
    OVERLAY --> SYSTEM
    CAMP --> WORLD
    NPC --> WORLD
```

## World Layer Architecture

The game world is organized in three layers:

```mermaid
graph TB
    subgraph World["WORLD LAYER (Content)"]
        LOC["Locations"]
        NPCS["NPCs"]
        LORE["Lore"]
        FACTIONS["Factions"]
    end
    
    subgraph Adaptation["ADAPTATION LAYER (Overlay)"]
        TERM["Terminology Mapping"]
        REST["Feature Restrictions"]
        GUID["DM Guidance"]
    end
    
    subgraph Rules["RULES LAYER (GameSystem)"]
        DND["D&D 5e SRD"]
        FUTURE["Future: Other Systems"]
    end
    
    World --> Adaptation
    Adaptation --> Rules
```

## Extension Points

The architecture provides several extension points for future development:

1. **Game Systems**: Add new rule systems (Pathfinder, OSR) via the `GameSystem` interface
2. **World Overlays**: Create custom settings by defining terminology and restrictions
3. **DM Personas**: Define new AI personalities with custom prompts
4. **LLM Providers**: Swap OpenAI for other LLM providers
5. **Persistence Backends**: Add cloud storage or different databases

## Design Principles

### Dependency Inversion
Higher layers depend on abstractions defined in lower layers. Infrastructure implements interfaces, domain defines them.

### Single Responsibility
Each package and module has one clear purpose. Combat logic stays in combat, persistence in infrastructure.

### Immutable State
World state is treated as immutable. Changes create new snapshots rather than mutating existing state.

### Type Safety
Branded types (EntityId, LocationId) prevent mixing up IDs. Zod schemas validate runtime data.

## Related Documentation

- [Package Structure](Package-Structure.md) - Detailed package breakdown
- [Domain Model](Domain-Model.md) - Core entities
- [Data Flow](Data-Flow.md) - Message lifecycle
- [LLM Integration](LLM-Integration.md) - AI system details
