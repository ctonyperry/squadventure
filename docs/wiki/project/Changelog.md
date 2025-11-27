# Changelog

All notable changes to Squadventure will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Phase 8 planning: Session Flow & Core Loop (issues #40-48)
- Phase 9 planning: Multiplayer Web UI (issues #49-60)

### Changed
- (None yet)

### Fixed
- (None yet)

### Removed
- (None yet)

---

## [0.7.0] - 2024-11-27

### Added
- **Phase 7 Complete**: Polish & Scale
  - Web API Integration (Game Engine Bridge, Events, Commands)
  - Multi-Player Infrastructure (Rooms, Identity, Turn Coordination)
  - Cost Optimization (Model Routing, Cost Tracking)
  - Voice Integration Foundation (STT, TTS, Voice Channels)
- Comprehensive wiki documentation (40+ pages)
- TypeDoc configuration for API documentation
- Logo and README updates with gameplay demo
- BSL-1.1 license (changed from MIT)

---

## [0.6.0] - 2024-XX-XX

### Added
- World Generation Agent with layered creation pipeline
- Campaign & Story Arc types and management
- NPC Memory & Relationships system with faction intelligence
- React Dashboard foundation

### Changed
- Improved session orchestration for world generation

---

## [0.5.0] - 2024-XX-XX

### Added
- World Overlay System architecture
- Terminology mapping (currency, magic, races, classes)
- DM Guidance injection (tone, themes, vocabulary)
- Dark Fantasy and Sci-Fi overlay examples

---

## [0.4.0] - 2024-XX-XX

### Added
- SQLite session persistence
- Conditions Manager for status effects
- Expanded SRD spell knowledge base
- DMG-accurate encounter calculator
- Subclass features for SRD classes
- Treasure generator with loot tables
- Environmental effects system

---

## [0.3.0] - 2024-XX-XX

### Added
- `GameSystem` interface for rules abstraction
- `Dnd5eGameSystem` implementation
- JSON configuration files for races, classes, backgrounds
- Spell slot progression tables
- XP and leveling system

### Changed
- Migrated hardcoded D&D rules to configuration

---

## [0.2.5] - 2024-XX-XX

### Added
- Spell slot tracking and expenditure
- Rest mechanics (short/long rest recovery)
- XP awards and level progression
- Death saves and stabilization
- Monster stat block templates

---

## [0.2.0] - 2024-XX-XX

### Added
- Rules engine for ability checks and attacks
- Full character sheets with stats
- Combat system with initiative and turns
- Combat tools (attack_roll, ability_check, modify_hp)
- Enemy encounter support

---

## [0.1.0] - 2024-XX-XX

### Added
- Initial project setup with TypeScript and pnpm monorepo
- LLM client with streaming and tool calling
- Minimal world model (locations, NPCs)
- DM persona system with Spencer-style personality
- Basic tools (roll_dice, lookup_npc, query_location)
- CLI interface with colored output
- Session snapshot save/load

---

## Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes
```

---

*For the complete roadmap, see [Roadmap](../../Roadmap.md).*
