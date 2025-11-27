# Project Roadmap

## Overview

Squadventure is being developed in phases, each building on the previous to create a fully-featured AI Dungeon Master system.

---

## Current Status Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | ✅ Complete | Core conversation loop, basic world model |
| Phase 2: Mechanics | ✅ Complete | Combat, dice rolls, character sheets |
| Phase 2.5: Extended Mechanics | ✅ Complete | Spells, rests, XP, death saves, monsters |
| **Phase 3: Game System Abstraction** | 🔄 In Progress | Extract D&D 5e to configs |
| [Phase 4: Procedural Generation](https://github.com/users/ctonyperry/projects/3) | 📋 Planned | Content generators |
| [Phase 5: World Overlay System](https://github.com/users/ctonyperry/projects/4) | 📋 Planned | Campaign settings |
| [Phase 6: World & Campaign Generation](https://github.com/users/ctonyperry/projects/5) | 📋 Planned | Agent-driven world creation |
| [Phase 7: Polish & Scale](https://github.com/users/ctonyperry/projects/6) | 📋 Planned | API, multiplayer, optimization |

---

## Phase Details

### Phase 1: Foundation ✅ COMPLETE

**Goal**: Single conversation with DM that feels right

**Completed**:
- ✅ Project setup (TypeScript, pnpm monorepo)
- ✅ LLM client with streaming and tool calling
- ✅ Minimal world model (locations, NPCs)
- ✅ DM persona system with Spencer-style personality
- ✅ Basic tool calling (`roll_dice`, `lookup_npc`, `query_location`)
- ✅ CLI interface with colored output
- ✅ Session snapshot save/load

**Deliverable**: Engaging conversation with AI DM in a tavern setting

---

### Phase 2: Mechanics ✅ COMPLETE

**Goal**: Real D&D gameplay works

**Completed**:
- ✅ Rules engine (ability checks, attack rolls, saving throws)
- ✅ Character sheets with full stats
- ✅ Combat system (initiative, turns, HP tracking)
- ✅ Combat tools (`attack_roll`, `ability_check`, `modify_hp`)
- ✅ Enemy encounters (goblins, etc.)

**Deliverable**: Full combat encounters with proper D&D mechanics

---

### Phase 2.5: Extended Mechanics ✅ COMPLETE

**Goal**: Full D&D 5e core mechanics

**Completed**:
- ✅ **Spell Slots** - Tracking and expenditure ([#1](https://github.com/ctonyperry/squadventure/issues/1))
- ✅ **Rest Mechanics** - Short/long rest recovery ([#2](https://github.com/ctonyperry/squadventure/issues/2))
- ✅ **XP & Leveling** - Experience and progression ([#3](https://github.com/ctonyperry/squadventure/issues/3))
- ✅ **Death Saves** - Dying and stabilization ([#4](https://github.com/ctonyperry/squadventure/issues/4))
- ✅ **Monster Stat Blocks** - Standard creature templates ([#5](https://github.com/ctonyperry/squadventure/issues/5))

**Deliverable**: Complete core D&D 5e ruleset implementation

---

### Phase 3: Game System Abstraction 🔄 IN PROGRESS

**Goal**: Extract D&D 5e specifics to enable extension

**Progress**:
- ✅ JSON config files created (`data/systems/dnd5e/`)
  - `races.json` - 9 SRD races
  - `classes.json` - 4 SRD classes (Fighter, Rogue, Wizard, Cleric)
  - `backgrounds.json` - 5 SRD backgrounds
  - `progression.json` - XP tables, proficiency bonuses
  - `spell-slots.json` - Caster slot progression tables
  - `system.json` - System metadata
- ✅ `GameSystem` interface defined
- ✅ `Dnd5eGameSystem` implementation complete
- 🔄 [#18: Migrate existing code to use GameSystem](https://github.com/ctonyperry/squadventure/issues/18)

**Key Interfaces**:
```typescript
interface GameSystem {
  races: Record<string, RaceDefinition>;
  classes: Record<string, ClassDefinition>;
  backgrounds: Record<string, BackgroundDefinition>;
  progression: ProgressionSystem;
  magic: MagicSystem;
  combat: CombatSystem;
}
```

**Usage**:
```typescript
import { getDnd5eSystem } from '@ai-dm/domain';
const system = getDnd5eSystem();
const wizard = system.getClass('wizard');
const spellSlots = system.magic.getSpellSlots('wizard', 5);
```

**Deliverable**: All D&D 5e specifics loadable from config, GameSystem injectable

---

### [Phase 4: Procedural Generation](https://github.com/users/ctonyperry/projects/3) 📋 PLANNED

**Goal**: Algorithmic content generation for consistent quality

**Planned Components**:
- **Encounter Generator** - Balanced encounters using CR math
- **Treasure Generator** - DMG-accurate loot tables
- **NPC Generator** - Stats + LLM personality
- **Settlement Generator** - Towns, cities, services
- **Quest Generator** - Plot templates with complications

**Design Philosophy**: Algorithms generate structure, LLM adds flavor

**Issues**:
- [#6: Session Persistence (SQLite)](https://github.com/ctonyperry/squadventure/issues/6) - **Foundational**
- [#10: Conditions Manager (Status Effects)](https://github.com/ctonyperry/squadventure/issues/10)
- [#12: Expand Spell Knowledge Base](https://github.com/ctonyperry/squadventure/issues/12)
- [#13: Encounter Difficulty Calculator](https://github.com/ctonyperry/squadventure/issues/13)
- [#14: Subclass Features](https://github.com/ctonyperry/squadventure/issues/14)
- [#15: Treasure & Loot Tables](https://github.com/ctonyperry/squadventure/issues/15)
- [#17: Environmental Effects](https://github.com/ctonyperry/squadventure/issues/17)

---

### [Phase 5: World Overlay System](https://github.com/users/ctonyperry/projects/4) 📋 PLANNED

**Goal**: Support different campaign settings

**Architecture**:
```
┌─────────────────────────────────────┐
│  WORLD LAYER (Content)              │
│  - Locations, NPCs, lore, factions  │
├─────────────────────────────────────┤
│  ADAPTATION LAYER (Bridge)          │
│  - Terminology mapping              │
│  - Feature restrictions/reskins     │
├─────────────────────────────────────┤
│  RULES LAYER (Mechanics)            │
│  - Core game system (D&D 5e)        │
└─────────────────────────────────────┘
```

**Features**:
- Terminology mapping (gold → credits)
- Race/class restrictions for settings
- DM guidance injection for tone
- Custom monsters, items, spells per setting

**Issues**: None yet - architecture design phase

---

### [Phase 6: World & Campaign Generation](https://github.com/users/ctonyperry/projects/5) 📋 PLANNED

**Goal**: Agent-driven complete world creation

**Components**:
- RAG infrastructure (pgvector, embeddings)
- Campaign structure generator (arcs, BBEG, factions)
- World population using procedural generators
- React Dashboard for visualization

**Issues**:
- [#7: Campaign & Story Arc Types](https://github.com/ctonyperry/squadventure/issues/7)
- [#8: React Dashboard for Game State Visibility](https://github.com/ctonyperry/squadventure/issues/8)
- [#9: World Generation Agent Architecture](https://github.com/ctonyperry/squadventure/issues/9)
- [#16: NPC Memory & Relationships](https://github.com/ctonyperry/squadventure/issues/16)

---

### [Phase 7: Polish & Scale](https://github.com/users/ctonyperry/projects/6) 📋 PLANNED

**Goal**: Production-ready, multiplayer-capable

**Components**:
- Web API (Fastify REST + WebSocket)
- Multi-model tiering for cost optimization
- Multiplayer support (party mode)
- Voice integration prep

**Issues**:
- [#11: Multi-Player Party Support](https://github.com/ctonyperry/squadventure/issues/11) - Multiple players, one DM, shared party

---

## Future Phases (Long-term)

### Automated Overlay Generation
- Pipeline to generate overlays from source material
- Research → Analyze → Map → Generate → Validate

### Multi-System Support
- Pathfinder 2e implementation
- OSR systems
- Custom homebrew systems

---

## GitHub Issues

### Core Features
| Issue | Title | Status |
|-------|-------|--------|
| [#1](https://github.com/ctonyperry/squadventure/issues/1) | Spell Slots | ✅ Closed |
| [#2](https://github.com/ctonyperry/squadventure/issues/2) | Rest Mechanics | ✅ Closed |
| [#3](https://github.com/ctonyperry/squadventure/issues/3) | XP & Leveling | ✅ Closed |
| [#4](https://github.com/ctonyperry/squadventure/issues/4) | Death Saves | ✅ Closed |
| [#5](https://github.com/ctonyperry/squadventure/issues/5) | Monster Stat Blocks | ✅ Closed |

### Planned Features
| Issue | Title | Phase |
|-------|-------|-------|
| [#18](https://github.com/ctonyperry/squadventure/issues/18) | Migrate to GameSystem | 3 |
| [#6](https://github.com/ctonyperry/squadventure/issues/6) | Session Persistence (SQLite) | 4 |
| [#10](https://github.com/ctonyperry/squadventure/issues/10) | Conditions Manager | 4 |
| [#12](https://github.com/ctonyperry/squadventure/issues/12) | Expand Spell Knowledge Base | 4 |
| [#13](https://github.com/ctonyperry/squadventure/issues/13) | Encounter Difficulty Calculator | 4 |
| [#14](https://github.com/ctonyperry/squadventure/issues/14) | Subclass Features | 4 |
| [#15](https://github.com/ctonyperry/squadventure/issues/15) | Treasure & Loot Tables | 4 |
| [#17](https://github.com/ctonyperry/squadventure/issues/17) | Environmental Effects | 4 |
| [#7](https://github.com/ctonyperry/squadventure/issues/7) | Campaign & Story Arc Types | 6 |
| [#8](https://github.com/ctonyperry/squadventure/issues/8) | React Dashboard (Zustand) | 6 |
| [#9](https://github.com/ctonyperry/squadventure/issues/9) | World Generation Agent | 6 |
| [#16](https://github.com/ctonyperry/squadventure/issues/16) | NPC Memory & Relationships | 6 |
| [#11](https://github.com/ctonyperry/squadventure/issues/11) | Multi-Player Party Mode | 7 |

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript 5.x | Type safety, unified ecosystem |
| Runtime | Node.js 20+ | Async-first for LLM calls |
| Package Manager | pnpm | Efficient monorepo support |
| LLM | OpenAI SDK (gpt-4o-mini) | Good function calling |
| Validation | Zod | Runtime schema validation |
| CLI | Ink | Rich terminal UI |

---

*Last updated: November 27, 2024*
