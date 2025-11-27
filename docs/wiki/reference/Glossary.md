# Glossary

Definitions of terms used throughout Squadventure documentation.

## Game Terms

### AC (Armor Class)
A number representing how hard a creature is to hit. Attackers must roll equal to or higher than this number to hit.

### Ability Check
A d20 roll + ability modifier to determine success at a task. May include skill proficiency.

### Ability Modifier
Derived from ability scores: (score - 10) / 2, rounded down. A 14 gives +2, an 8 gives -1.

### Ability Score
One of six attributes defining a character: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. Range 1-20 (typically 3-18 for starting characters).

### Advantage
Roll 2d20 and take the higher result. Granted by beneficial circumstances.

### Cantrip
A level 0 spell that can be cast at will without expending spell slots.

### CR (Challenge Rating)
A monster's relative difficulty. A CR 1 creature is a fair challenge for a party of four level 1 characters.

### Concentration
Maintaining a spell that requires focus. Taking damage may break concentration.

### Condition
A status effect like blinded, poisoned, or prone that modifies a creature's capabilities.

### DC (Difficulty Class)
The number a d20 roll must meet or beat for success. Spell Save DC = 8 + proficiency + ability modifier.

### Disadvantage
Roll 2d20 and take the lower result. Imposed by unfavorable circumstances.

### Hit Dice
Dice used to recover HP during short rests. Type varies by class (d6-d12).

### HP (Hit Points)
A measure of how much damage a creature can take before falling unconscious or dying.

### Initiative
A d20 roll + DEX modifier to determine turn order in combat.

### Proficiency Bonus
A bonus added to rolls you're trained in. Increases with level (+2 at level 1, +6 at level 20).

### Saving Throw
A d20 roll to resist or avoid an effect. Roll ≥ DC to succeed.

### Spell Slot
A resource consumed when casting spells of 1st level or higher. Recovered on long rest.

## Technical Terms

### Branded Type
A TypeScript pattern that makes string types distinguishable at compile time (e.g., `EntityId` vs `LocationId`).

### CLI
Command Line Interface. The terminal-based way to interact with Squadventure.

### DM (Dungeon Master)
The game facilitator who describes scenes, controls NPCs, and adjudicates rules. In Squadventure, this is the AI.

### Entity
Any object in the game world: NPCs, creatures, items, or factions.

### LLM (Large Language Model)
The AI model (e.g., GPT-4) that powers the DM's responses and decision-making.

### Monorepo
A single repository containing multiple packages. Squadventure uses pnpm workspaces.

### NPC (Non-Player Character)
Characters controlled by the DM rather than players.

### Overlay
A configuration that adapts the base game system to a different setting (e.g., sci-fi reskin).

### Persona
An AI personality configuration that affects how the DM speaks and makes rulings.

### RAG (Retrieval-Augmented Generation)
Using a knowledge base to provide accurate information to the LLM for better responses.

### REPL
Read-Eval-Print Loop. The interactive command prompt interface.

### Session
A continuous play period. Sessions can be saved and loaded.

### Snapshot
A complete save of game state including world, characters, and conversation history.

### SRD (System Reference Document)
The subset of D&D 5e rules available under the Open Gaming License.

### Tool Calling
LLM feature allowing the AI to request execution of specific functions (e.g., roll dice, look up rules).

### World State
The complete data structure representing the game world: locations, entities, flags, and lore.

## Package Names

### @ai-dm/shared
TypeScript type definitions shared across all packages.

### @ai-dm/domain
Core game logic including combat, inventory, and character systems.

### @ai-dm/infrastructure
External service integrations: LLM API, database, file storage.

### @ai-dm/application
Session orchestration connecting domain logic with infrastructure.

### @ai-dm/cli
Command-line interface for playing the game.

## Abbreviations

| Abbrev | Meaning |
|--------|---------|
| AC | Armor Class |
| API | Application Programming Interface |
| CHA | Charisma |
| CON | Constitution |
| CR | Challenge Rating |
| DC | Difficulty Class |
| DEX | Dexterity |
| DM | Dungeon Master |
| DMG | Dungeon Master's Guide (D&D rulebook) |
| HP | Hit Points |
| INT | Intelligence |
| LLM | Large Language Model |
| NPC | Non-Player Character |
| OGL | Open Gaming License |
| PC | Player Character |
| PHB | Player's Handbook (D&D rulebook) |
| RAG | Retrieval-Augmented Generation |
| REPL | Read-Eval-Print Loop |
| SRD | System Reference Document |
| STR | Strength |
| WIS | Wisdom |
| XP | Experience Points |

## Related Documentation

- [SRD Content](SRD-Content.md) - What's included from D&D
- [Domain Model](../architecture/Domain-Model.md) - Technical data structures
- [Game System Abstraction](../core-systems/Game-System-Abstraction.md) - System interface
