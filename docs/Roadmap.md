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
| Phase 3: Game System Abstraction | ✅ Complete | Extract D&D 5e to configs |
| Phase 4: Procedural Generation | ✅ Complete | Content generators |
| Phase 5: World Overlay System | ✅ Complete | Campaign settings |
| **[Phase 6: World & Campaign Generation](https://github.com/users/ctonyperry/projects/5)** | ✅ Complete | Agent-driven world creation |
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

### Phase 3: Game System Abstraction ✅ COMPLETE

**Goal**: Extract D&D 5e specifics to enable extension

**Completed**:
- ✅ JSON config files created (`data/systems/dnd5e/`)
  - `races.json` - 9 SRD races
  - `classes.json` - 4 SRD classes (Fighter, Rogue, Wizard, Cleric)
  - `backgrounds.json` - 5 SRD backgrounds
  - `progression.json` - XP tables, proficiency bonuses
  - `spell-slots.json` - Caster slot progression tables
  - `system.json` - System metadata
- ✅ `GameSystem` interface defined
- ✅ `Dnd5eGameSystem` implementation complete
- ✅ [#18: Migrate existing code to use GameSystem](https://github.com/ctonyperry/squadventure/issues/18)

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

### Phase 4: Procedural Generation ✅ COMPLETE

**Goal**: Algorithmic content generation for consistent quality

**Completed Components**:
- ✅ **Session Persistence** - SQLite-backed save/load ([#6](https://github.com/ctonyperry/squadventure/issues/6))
- ✅ **Conditions Manager** - Status effects system ([#10](https://github.com/ctonyperry/squadventure/issues/10))
- ✅ **Spell Knowledge Base** - Expanded SRD spells ([#12](https://github.com/ctonyperry/squadventure/issues/12))
- ✅ **Encounter Calculator** - DMG-accurate CR math ([#13](https://github.com/ctonyperry/squadventure/issues/13))
- ✅ **Subclass Features** - SRD subclass support ([#14](https://github.com/ctonyperry/squadventure/issues/14))
- ✅ **Treasure Generator** - DMG-accurate loot tables ([#15](https://github.com/ctonyperry/squadventure/issues/15))
- ✅ **Environmental Effects** - Hazards, terrain, weather ([#17](https://github.com/ctonyperry/squadventure/issues/17))

**Design Philosophy**: Algorithms generate structure, LLM adds flavor

**Deliverable**: Complete procedural generation toolkit for encounters, treasure, and environmental effects

---

### Phase 5: World Overlay System ✅ COMPLETE

**Goal**: Support different campaign settings

**Architecture**:
```
┌─────────────────────────────────────┐
│  WORLD LAYER (Content)              │
│  - Locations, NPCs, lore, factions  │
├─────────────────────────────────────┤
│  ADAPTATION LAYER (Overlay)         │
│  - Terminology mapping              │
│  - Feature restrictions/reskins     │
│  - DM guidance injection            │
├─────────────────────────────────────┤
│  RULES LAYER (GameSystem)           │
│  - Core mechanics (D&D 5e)          │
└─────────────────────────────────────┘
```

**Completed Components**:
- ✅ **World Overlay Architecture** - Full type system and OverlayManager ([#19](https://github.com/ctonyperry/squadventure/issues/19))
- ✅ **Terminology Mapping** - Currency, magic, races, classes, items ([#20](https://github.com/ctonyperry/squadventure/issues/20))
- ✅ **DM Guidance Injection** - Tone, themes, vocabulary, naming ([#21](https://github.com/ctonyperry/squadventure/issues/21))

**Features**:
- Terminology mapping (gold → credits, spell → power)
- Race/class restrictions and reskins for settings
- Custom monsters, items, spells per setting
- DM guidance with tone, themes, vocabulary, naming conventions
- Overlay inheritance and merging support

**Sample Overlays**:
- `dark-fantasy.json` - Grimdark tone, harsh world rules
- `sci-fi-reskin.json` - Space opera terminology for D&D mechanics

**Deliverable**: Complete overlay system for adapting D&D 5e to any campaign setting

---

### [Phase 6: World & Campaign Generation](https://github.com/users/ctonyperry/projects/5) ✅ COMPLETE

**Goal**: Agent-driven complete world creation

**Completed**:
- ✅ **Campaign & Story Arc Types** - Full campaign management system ([#7](https://github.com/ctonyperry/squadventure/issues/7))
- ✅ **NPC Memory & Relationships** - Relationship tracking and faction intelligence ([#16](https://github.com/ctonyperry/squadventure/issues/16))
- ✅ **React Dashboard** - Web-based game state visualization ([#8](https://github.com/ctonyperry/squadventure/issues/8))
- ✅ **World Generation Agent** - Layered world creation pipeline ([#9](https://github.com/ctonyperry/squadventure/issues/9))

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN PHASE                              │
│  [User Brief] → [World Gen Agent] → [World Template]        │
│                                                              │
│  - Iterative generation (geography → factions → NPCs → plots)│
│  - Validation at each step                                   │
│  - Human review/editing via Dashboard                        │
└─────────────────────────────────────────────────────────────┘
```

**Generation Layers**:
1. World Foundation (setting, history, magic level)
2. Factions & Power (political landscape, conflicts)
3. Locations (settlements, dungeons, travel network)
4. NPCs (characters, relationships, knowledge)
5. Campaign Arc (chapters, story beats, endings)
6. Encounters & Rewards (combat, treasure, random tables)

**Deliverable**: Complete world generation pipeline with validation

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
| [#18](https://github.com/ctonyperry/squadventure/issues/18) | Migrate to GameSystem | ✅ Closed |
| [#6](https://github.com/ctonyperry/squadventure/issues/6) | Session Persistence (SQLite) | ✅ Closed |
| [#10](https://github.com/ctonyperry/squadventure/issues/10) | Conditions Manager | ✅ Closed |
| [#12](https://github.com/ctonyperry/squadventure/issues/12) | Expand Spell Knowledge Base | ✅ Closed |
| [#13](https://github.com/ctonyperry/squadventure/issues/13) | Encounter Difficulty Calculator | ✅ Closed |
| [#14](https://github.com/ctonyperry/squadventure/issues/14) | Subclass Features | ✅ Closed |
| [#15](https://github.com/ctonyperry/squadventure/issues/15) | Treasure & Loot Tables | ✅ Closed |
| [#17](https://github.com/ctonyperry/squadventure/issues/17) | Environmental Effects | ✅ Closed |
| [#19](https://github.com/ctonyperry/squadventure/issues/19) | World Overlay Architecture | ✅ Closed |
| [#20](https://github.com/ctonyperry/squadventure/issues/20) | Terminology Mapping | ✅ Closed |
| [#21](https://github.com/ctonyperry/squadventure/issues/21) | DM Guidance Injection | ✅ Closed |

### Planned Features
| Issue | Title | Phase |
|-------|-------|-------|
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

*Last updated: November 27, 2025*
