# Project Roadmap

## Overview

Squadventure is being developed in phases, each building on the previous to create a fully-featured AI Dungeon Master system with a focus on shared-screen multiplayer voice interaction.

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
| Phase 6: World & Campaign Generation | ✅ Complete | Agent-driven world creation |
| Phase 7: Polish & Scale | ✅ Complete | API, multiplayer infrastructure, voice foundation |
| **[Phase 8: Session Flow & Core Loop](https://github.com/users/ctonyperry/projects/11)** | 📋 Planned | Session setup, character flow, persistence |
| **[Phase 9: Multiplayer Web UI](https://github.com/users/ctonyperry/projects/12)** | 📋 Planned | Shared-screen game interface |
| Phase 10: Voice Foundation | 📋 Future | Speaker diarization, voice enrollment |
| Phase 11: Emotion & Prosody | 📋 Future | Emotion recognition, expressive TTS |

---

## Vision

The ultimate goal is a **web-based D&D experience** where multiple players sit around the same screen (TV or monitor), interacting with an AI Dungeon Master through:

- **Speaker Diarization** - System knows WHO is speaking
- **Emotional Prosody** - DM speaks with appropriate emotion
- **Emotion Recognition** - System understands HOW players feel
- **Immersive Narration** - Different voices for NPCs

```
┌─────────────────────────────────────────────────────────────┐
│                    THE EXPERIENCE                            │
│                                                              │
│  Players gather around a shared screen (TV/monitor)          │
│  ↓                                                           │
│  Voice input captured from shared microphone                 │
│  ↓                                                           │
│  System identifies who is speaking (diarization)            │
│  ↓                                                           │
│  DM responds with emotional narration (TTS)                 │
│  ↓                                                           │
│  UI shows character status, narrative, dice rolls           │
└─────────────────────────────────────────────────────────────┘
```

---

## Completed Phases

### Phase 1-6: Foundation through World Generation ✅

All core mechanics, game system abstraction, procedural generation, world overlay system, and world generation are complete. See previous roadmap versions for details.

### Phase 7: Polish & Scale ✅ COMPLETE

**Goal**: Production-ready infrastructure with multiplayer foundation

**Completed Sub-phases**:
- ✅ **7a: Web API Integration** (#22-25) - Game engine bridge, events, commands
- ✅ **7b: Multi-Player Infrastructure** (#26-30) - Rooms, identity, turn coordination
- ✅ **7c: Cost Optimization** (#31-34) - Model routing, cost tracking
- ✅ **7d: Voice Integration Foundation** (#35-38) - STT, TTS, voice channels

**Key Deliverables**:
- Fastify server with WebSocket support
- Game engine bridge connecting web layer to session orchestrator
- Multi-player room management
- Real-time state synchronization
- Model routing for cost optimization
- Voice service abstractions (STT/TTS)
- Voice channel management

---

## Active Development

### [Phase 8: Session Flow & Core Loop](https://github.com/users/ctonyperry/projects/11) 📋 PLANNED

**Goal**: Complete session lifecycle from setup through save/load

**The "Sitting Down" Experience**:
```
1. Welcome Screen → "How many heroes gather today?"
2. Player Registration → Each player identifies themselves
3. Character Selection → Load existing or create new
4. Campaign Selection → New adventure or continue
5. Session Recap → "Previously on..." for continuing games
6. Adventure Begins → Full gameplay loop
```

**Issues**:
| Issue | Title | Priority |
|-------|-------|----------|
| [#40](https://github.com/ctonyperry/squadventure/issues/40) | Session Setup Wizard - Party Formation Flow | High |
| [#41](https://github.com/ctonyperry/squadventure/issues/41) | Character Selection & Loading System | High |
| [#42](https://github.com/ctonyperry/squadventure/issues/42) | Guided Character Creation Flow | High |
| [#43](https://github.com/ctonyperry/squadventure/issues/43) | Campaign & Session State Persistence | High |
| [#44](https://github.com/ctonyperry/squadventure/issues/44) | "Previously On..." Session Recap Generation | Medium |
| [#45](https://github.com/ctonyperry/squadventure/issues/45) | Session State Machine & Turn Management | High |
| [#46](https://github.com/ctonyperry/squadventure/issues/46) | Party Composition & Role Awareness | Medium |
| [#47](https://github.com/ctonyperry/squadventure/issues/47) | Quick Start & Pre-built Adventures | Low |
| [#48](https://github.com/ctonyperry/squadventure/issues/48) | Active Player Indicator & Addressing | Medium |

---

### [Phase 9: Multiplayer Web UI](https://github.com/users/ctonyperry/projects/12) 📋 PLANNED

**Goal**: Shared-screen game interface optimized for TV/large monitor

**Layout**:
```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER: Logo, Session Name, Settings                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    NARRATIVE PANEL                          │ │
│  │  (DM text, descriptions, dialogue, dice results)           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │  PLAYER 1   │  PLAYER 2   │  PLAYER 3   │  PLAYER 4   │      │
│  │  Mini-sheet │  Mini-sheet │  Mini-sheet │  Mini-sheet │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ACTION BAR: Input, Dice, Quick Actions                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Issues**:
| Issue | Title | Priority |
|-------|-------|----------|
| [#49](https://github.com/ctonyperry/squadventure/issues/49) | Shared-Screen Game Layout | High |
| [#50](https://github.com/ctonyperry/squadventure/issues/50) | Narrative Display Panel | High |
| [#51](https://github.com/ctonyperry/squadventure/issues/51) | Player Card Components | High |
| [#52](https://github.com/ctonyperry/squadventure/issues/52) | Expanded Character Sheet Modal | Medium |
| [#53](https://github.com/ctonyperry/squadventure/issues/53) | Action Bar & Input System | High |
| [#54](https://github.com/ctonyperry/squadventure/issues/54) | Dice Rolling UI & Animations | Medium |
| [#55](https://github.com/ctonyperry/squadventure/issues/55) | Combat Tracker UI | High |
| [#56](https://github.com/ctonyperry/squadventure/issues/56) | Real-time State Sync (WebSocket) | High |
| [#57](https://github.com/ctonyperry/squadventure/issues/57) | Settings & Preferences Panel | Low |
| [#58](https://github.com/ctonyperry/squadventure/issues/58) | Session Header & Status Bar | Medium |
| [#59](https://github.com/ctonyperry/squadventure/issues/59) | Inventory & Equipment Quick View | Medium |
| [#60](https://github.com/ctonyperry/squadventure/issues/60) | Visual Theme & Design System | Medium |

---

## Future Phases

### Phase 10: Voice Foundation 📋 FUTURE

**Goal**: Enable voice input with speaker identification

**Key Features**:
- **Voice Activity Detection (VAD)** - Detect when someone is speaking
- **Speaker Enrollment** - Each player registers their voice
- **Speaker Diarization** - Identify who is speaking from shared mic
- **Voice-to-Action** - Transcribed speech becomes game commands

**Architecture**:
```
Shared Mic → VAD → Speaker Embedding → Player Matching → Transcription → Game Action
```

**Technologies**:
- WebRTC for browser audio capture
- pyannote.audio or Resemblyzer for speaker embeddings
- Whisper/Deepgram for transcription

---

### Phase 11: Emotion & Prosody 📋 FUTURE

**Goal**: Understand player emotion, express DM emotion

**Emotion Recognition**:
```
Audio → Feature Extraction → Emotion Classification
         │
         ├── Pitch (F0) contour
         ├── Speaking rate
         ├── Volume/energy
         └── Voice quality
                  │
                  ▼
         Emotion: excited, frustrated, nervous, bored, happy
```

**Expressive TTS**:
```typescript
interface DMUtterance {
  text: string;
  emotion: 'dramatic' | 'mysterious' | 'cheerful' | 'menacing';
  speaker: 'narrator' | NPCId;
  pace?: 'slow' | 'normal' | 'fast';
}
```

**Use Cases**:
- Player sounds frustrated → DM offers hints
- Player sounds excited → DM heightens tension
- NPC voices with distinct personalities

---

## GitHub Issue Summary

### Completed (Phases 1-7)
| Issue Range | Phase | Status |
|-------------|-------|--------|
| #1-5 | Phase 2.5 | ✅ Complete |
| #6-18 | Phases 4-5 | ✅ Complete |
| #19-21 | Phase 5 | ✅ Complete |
| #22-38 | Phase 7 | ✅ Complete |

### Active (Phases 8-9)
| Issue Range | Phase | Status |
|-------------|-------|--------|
| #40-48 | Phase 8: Session Flow | 📋 Planned |
| #49-60 | Phase 9: Web UI | 📋 Planned |

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript 5.x | Type safety, unified ecosystem |
| Runtime | Node.js 20+ | Async-first for LLM calls |
| Package Manager | pnpm | Efficient monorepo support |
| Web Server | Fastify | Fast, WebSocket support |
| Web Client | React + Zustand | Component-based, simple state |
| LLM | OpenAI/Anthropic | Multi-model routing |
| Validation | Zod | Runtime schema validation |
| CLI | Ink | Rich terminal UI |

---

*Last updated: November 27, 2025*
