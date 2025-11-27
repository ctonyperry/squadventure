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

**Architecture Overview**:
```
┌─────────────────────────────────────────────────────────────────────┐
│                         WEB LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  React Client   │  │  React Client   │  │  React Client   │     │
│  │   (Player 1)    │  │   (Player 2)    │  │   (Player N)    │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Fastify Server (WebSocket + REST)               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ Room Manager │  │ Player Auth  │  │ State Sync   │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────┼───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Game Engine Bridge                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ Event Router │  │ Command API  │  │ State Sync   │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  SessionOrchestrator                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │Turn Manager  │  │CombatManager │  │ Tool Registry│       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────┼───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Model Router │  │ SQLite Store │  │  LLM Adapter │              │
│  │ (Fast/Med/   │  │ (Sessions,   │  │  (OpenAI,    │              │
│  │  Powerful)   │  │  Snapshots)  │  │   Anthropic) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### Phase 7a: Web API Integration 🔌

**Goal**: Connect web dashboard to actual game engine

**Issues**:
- [#22: Game Engine Bridge](#22) - Connect SessionOrchestrator to web server
- [#23: Real-time Event System](#23) - Event router for state changes
- [#24: Command Execution API](#24) - REST/WebSocket endpoints for game commands
- [#25: Session Management API](#25) - Load/save/list sessions via API

**Key Components**:
```
packages/web/server/src/
├── bridge/
│   ├── game-bridge.ts      # SessionOrchestrator wrapper
│   ├── event-router.ts     # Route game events to WebSocket
│   └── state-serializer.ts # Serialize state for transmission
├── api/
│   ├── sessions.ts         # Session CRUD endpoints
│   ├── commands.ts         # Game command execution
│   └── state.ts            # State query endpoints
```

**Dependencies**: None (foundational)

---

#### Phase 7b: Multi-Player Infrastructure 👥

**Goal**: Support multiple players in a single game session

**Issues**:
- [#11: Multi-Player Party Support](#11) - Core multiplayer architecture (existing)
- [#26: Player Identity System](#26) - Authentication and character binding
- [#27: Game Room Management](#27) - Room creation, joining, player tracking
- [#28: Turn Coordination](#28) - Multi-player turn management
- [#29: State Synchronization](#29) - Broadcast state to all players
- [#30: Player-Specific Communication](#30) - Private messages and rolls

**Key Components**:
```
packages/web/server/src/
├── players/
│   ├── player-session.ts   # Player identity and session
│   ├── player-character.ts # Character-player binding
│   └── auth.ts             # Simple token auth
├── rooms/
│   ├── room-manager.ts     # Game room lifecycle
│   ├── room-state.ts       # Room-level state
│   └── player-roster.ts    # Track players in room
├── multiplayer/
│   ├── turn-coordinator.ts # Manage turn order
│   ├── state-sync.ts       # Sync state to clients
│   └── private-channel.ts  # Player-specific messages
```

**Dependencies**: Phase 7a (Web API Integration)

---

#### Phase 7c: Cost Optimization 💰

**Goal**: Intelligent model routing for cost efficiency

**Issues**:
- [#31: Task Classification System](#31) - Categorize requests by complexity
- [#32: Enhanced Model Router](#32) - Route to appropriate model tier
- [#33: Cost Tracking & Budgets](#33) - Track tokens and enforce limits
- [#34: Quality Monitoring](#34) - Ensure response quality per tier

**Key Components**:
```
packages/infrastructure/src/llm/
├── task-classifier.ts    # Classify task complexity
├── model-router.ts       # Enhanced routing logic (exists)
├── cost-tracker.ts       # Token usage and costs
└── quality-monitor.ts    # Response quality checks

Task Types:
- SIMPLE_LOOKUP: Use fast tier (rules, spells)
- NARRATIVE: Use balanced tier (scene descriptions)
- COMPLEX_DECISION: Use powerful tier (plot decisions)
- TOOL_HEAVY: Route based on tool count
```

**Dependencies**: None (can parallelize with 7a/7b)

---

#### Phase 7d: Voice Integration Foundation 🎤

**Goal**: Prepare infrastructure for voice input/output

**Issues**:
- [#35: Audio Capture Infrastructure](#35) - Browser audio capture and streaming
- [#36: Speech-to-Text Integration](#36) - STT service abstraction
- [#37: Text-to-Speech Integration](#37) - TTS service abstraction
- [#38: Voice Session Management](#38) - Voice channel coordination

**Key Components**:
```
packages/web/
├── client/src/voice/
│   ├── audio-capture.ts    # MediaRecorder wrapper
│   ├── voice-activity.ts   # VAD for push-to-talk
│   └── audio-playback.ts   # TTS audio queue
├── server/src/voice/
│   ├── stt-adapter.ts      # Whisper/Deepgram abstraction
│   ├── tts-adapter.ts      # ElevenLabs/Azure abstraction
│   └── voice-session.ts    # Voice channel management
```

**Dependencies**: Phase 7b (benefits from player identification)

---

#### Phase 7 Issue Summary

| Sub-Phase | Issues | Priority | Dependencies |
|-----------|--------|----------|--------------|
| 7a: Web API Integration | #22-25 | **High** | None |
| 7b: Multi-Player | #11, #26-30 | **High** | 7a |
| 7c: Cost Optimization | #31-34 | Medium | None |
| 7d: Voice Foundation | #35-38 | Low | 7b |

**Recommended Order**:
1. 7a + 7c in parallel (independent)
2. 7b after 7a completes
3. 7d after 7b completes (or in parallel if resources allow)

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

### Phase 6 Features (Complete)
| Issue | Title | Status |
|-------|-------|--------|
| [#7](https://github.com/ctonyperry/squadventure/issues/7) | Campaign & Story Arc Types | ✅ Closed |
| [#8](https://github.com/ctonyperry/squadventure/issues/8) | React Dashboard (Zustand) | ✅ Closed |
| [#9](https://github.com/ctonyperry/squadventure/issues/9) | World Generation Agent | ✅ Closed |
| [#16](https://github.com/ctonyperry/squadventure/issues/16) | NPC Memory & Relationships | ✅ Closed |

### Phase 7 Features (Planned)
| Issue | Title | Sub-Phase | Priority |
|-------|-------|-----------|----------|
| [#11](https://github.com/ctonyperry/squadventure/issues/11) | Multi-Player Party Support | 7b | High |
| #22 | Game Engine Bridge | 7a | High |
| #23 | Real-time Event System | 7a | High |
| #24 | Command Execution API | 7a | High |
| #25 | Session Management API | 7a | High |
| #26 | Player Identity System | 7b | High |
| #27 | Game Room Management | 7b | High |
| #28 | Turn Coordination | 7b | High |
| #29 | State Synchronization | 7b | High |
| #30 | Player-Specific Communication | 7b | High |
| #31 | Task Classification System | 7c | Medium |
| #32 | Enhanced Model Router | 7c | Medium |
| #33 | Cost Tracking & Budgets | 7c | Medium |
| #34 | Quality Monitoring | 7c | Medium |
| #35 | Audio Capture Infrastructure | 7d | Low |
| #36 | Speech-to-Text Integration | 7d | Low |
| #37 | Text-to-Speech Integration | 7d | Low |
| #38 | Voice Session Management | 7d | Low |

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
