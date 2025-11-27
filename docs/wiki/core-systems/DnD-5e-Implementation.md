# D&D 5e Implementation

Squadventure implements the D&D 5th Edition System Reference Document (SRD) as its default game system.

## Overview

The D&D 5e SRD implementation includes:
- 9 playable races
- 4 base classes with subclasses
- 5 backgrounds
- Complete spell slot progression
- XP and leveling tables
- Combat rules and conditions

## Included Content

### Races

| Race | Ability Bonuses | Size | Speed | Key Traits |
|------|-----------------|------|-------|------------|
| Human | +1 all | Medium | 30 | Extra language |
| Elf | +2 DEX | Medium | 30 | Darkvision, Fey Ancestry, Trance |
| Dwarf | +2 CON | Medium | 25 | Darkvision, Dwarven Resilience |
| Halfling | +2 DEX | Small | 25 | Lucky, Brave, Nimble |
| Dragonborn | +2 STR, +1 CHA | Medium | 30 | Breath Weapon, Damage Resistance |
| Gnome | +2 INT | Small | 25 | Darkvision, Gnome Cunning |
| Half-Elf | +2 CHA, +1 (2) | Medium | 30 | Darkvision, Fey Ancestry, Skills |
| Half-Orc | +2 STR, +1 CON | Medium | 30 | Darkvision, Relentless, Savage |
| Tiefling | +2 CHA, +1 INT | Medium | 30 | Darkvision, Hellish Resistance |

### Classes

| Class | Hit Die | Primary | Saves | Caster Type |
|-------|---------|---------|-------|-------------|
| Fighter | d10 | STR/DEX | STR, CON | None |
| Rogue | d8 | DEX | DEX, INT | None |
| Wizard | d6 | INT | INT, WIS | Full |
| Cleric | d8 | WIS | WIS, CHA | Full |

### Subclasses

**Fighter**:
- Champion (level 3)

**Rogue**:
- Thief (level 3)

**Wizard**:
- School of Evocation (level 2)

**Cleric**:
- Life Domain (level 1)

### Backgrounds

- Acolyte
- Criminal
- Folk Hero
- Noble
- Sage

## Implementation Details

### Loading the System

```typescript
import { getDnd5eSystem, createDnd5eSystem } from '@ai-dm/domain';

// Use singleton instance
const system = getDnd5eSystem();

// Or create new instance with custom config path
const customSystem = createDnd5eSystem('/path/to/custom/data');
```

### Configuration Structure

```
data/systems/dnd5e/
├── system.json       # Metadata and mechanics
├── races.json        # Race definitions
├── classes.json      # Class definitions
├── subclasses.json   # Subclass features
├── backgrounds.json  # Background options
├── progression.json  # XP and proficiency tables
└── spell-slots.json  # Spell slot progression
```

### Example: races.json

```json
{
  "version": "1.0.0",
  "races": {
    "human": {
      "name": "Human",
      "abilityBonuses": {
        "strength": 1,
        "dexterity": 1,
        "constitution": 1,
        "intelligence": 1,
        "wisdom": 1,
        "charisma": 1
      },
      "size": "Medium",
      "speed": 30,
      "traits": ["Extra Language"],
      "languages": ["Common"]
    }
  }
}
```

### Example: classes.json

```json
{
  "version": "1.0.0",
  "classes": {
    "wizard": {
      "name": "Wizard",
      "hitDie": 6,
      "primaryAbility": "intelligence",
      "savingThrows": ["intelligence", "wisdom"],
      "armorProficiencies": [],
      "weaponProficiencies": ["dagger", "dart", "sling", "quarterstaff", "light crossbow"],
      "skillChoices": {
        "count": 2,
        "options": ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]
      },
      "features": [
        {
          "level": 1,
          "name": "Spellcasting",
          "description": "You can cast wizard spells."
        },
        {
          "level": 1,
          "name": "Arcane Recovery",
          "description": "Recover spell slots during short rest."
        }
      ],
      "startingEquipment": ["quarterstaff", "spellbook"]
    }
  }
}
```

### Progression Tables

XP thresholds for leveling:

| Level | XP Required | Proficiency |
|-------|-------------|-------------|
| 1 | 0 | +2 |
| 2 | 300 | +2 |
| 3 | 900 | +2 |
| 4 | 2,700 | +2 |
| 5 | 6,500 | +3 |
| ... | ... | ... |
| 20 | 355,000 | +6 |

### Spell Slots (Full Caster)

| Level | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
|-------|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 1 | 2 | - | - | - | - | - | - | - | - |
| 2 | 3 | - | - | - | - | - | - | - | - |
| 3 | 4 | 2 | - | - | - | - | - | - | - |
| 4 | 4 | 3 | - | - | - | - | - | - | - |
| 5 | 4 | 3 | 2 | - | - | - | - | - | - |

## SRD Limitations

The SRD only includes a subset of D&D 5e content:
- One subclass per class
- Limited spell list
- Limited monster selection
- No copyrighted settings

For full content, licensed D&D books would need to be integrated (not included).

## Mechanics Implementation

### Ability Modifier

```typescript
calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
```

### Spell Save DC

```typescript
calculateSpellSaveDC(abilityScore: number, proficiencyBonus: number): number {
  return 8 + proficiencyBonus + Math.floor((abilityScore - 10) / 2);
}
```

### Proficiency Bonus

```typescript
getProficiencyBonus(level: number): number {
  return this.proficiencyByLevel[level - 1] ?? 2;
}
```

## Related Documentation

- [Game System Abstraction](Game-System-Abstraction.md) - Interface details
- [SRD Content Reference](../reference/SRD-Content.md) - Complete content list
- [Character System](Character-System.md) - Using these options
