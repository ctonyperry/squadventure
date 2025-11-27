# DM Tools Reference

Complete reference for all DM (Dungeon Master) tools available to the AI. These tools allow the AI to interact with game mechanics.

## Overview

Tools are defined using JSON Schema for parameters and return structured results. The AI calls these tools to:
- Roll dice
- Make attacks and saves
- Manage combat
- Track inventory
- Look up rules
- Modify game state

---

## Dice & Rolls

### roll_dice

Roll dice using standard notation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notation` | string | Yes | Dice notation (e.g., "1d20+5", "2d6", "4d6kh3") |
| `purpose` | string | Yes | What the roll is for |

**Returns:** `DiceRoll`

```typescript
interface DiceRoll {
  notation: string;
  results: number[];
  total: number;
  purpose: string;
}
```

**Example:**

```json
// Tool call
{
  "name": "roll_dice",
  "arguments": {
    "notation": "2d6+3",
    "purpose": "longsword damage"
  }
}

// Result
{
  "notation": "2d6+3",
  "results": [4, 5],
  "total": 12,
  "purpose": "longsword damage"
}
```

**Supported Notation:**
- Basic: `1d20`, `2d6`, `4d8`
- With modifier: `1d20+5`, `2d6-2`
- Keep highest: `4d6kh3` (roll 4d6, keep highest 3)
- Keep lowest: `4d6kl3`
- Advantage: `1d20 advantage`
- Disadvantage: `1d20 disadvantage`

---

## Combat

### start_combat

Initialize a combat encounter with participants.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `participants` | array | Yes | List of combatants |
| `participants[].entityId` | string | Yes | Entity ID |
| `participants[].name` | string | Yes | Display name |
| `participants[].isPlayer` | boolean | Yes | Is this a player character? |

**Returns:** Combat summary string with initiative order

**Example:**

```json
{
  "name": "start_combat",
  "arguments": {
    "participants": [
      { "entityId": "player-1", "name": "Aldric", "isPlayer": true },
      { "entityId": "goblin-1", "name": "Goblin Scout", "isPlayer": false },
      { "entityId": "goblin-2", "name": "Goblin Archer", "isPlayer": false }
    ]
  }
}
```

### attack_roll

Make an attack roll against a target.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `attackerId` | string | Yes | Attacking entity ID |
| `targetId` | string | Yes | Target entity ID |
| `attackBonus` | number | Yes | Total attack bonus |
| `damageNotation` | string | Yes | Damage dice (e.g., "1d8+3") |
| `damageType` | string | Yes | Damage type (slashing, fire, etc.) |
| `advantage` | boolean | No | Force advantage |
| `disadvantage` | boolean | No | Force disadvantage |

**Returns:** `AttackResult`

```typescript
interface AttackResult {
  attackRoll: number;
  modifier: number;
  total: number;
  targetAC: number;
  hit: boolean;
  critical: boolean;
  damage?: number;
  damageType?: string;
  message: string;
}
```

**Example:**

```json
{
  "name": "attack_roll",
  "arguments": {
    "attackerId": "player-1",
    "targetId": "goblin-1",
    "attackBonus": 5,
    "damageNotation": "1d8+3",
    "damageType": "slashing"
  }
}
```

### saving_throw

Make a saving throw for an entity.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entityId` | string | Yes | Entity making the save |
| `ability` | string | Yes | Ability (strength, dexterity, etc.) |
| `dc` | number | Yes | Difficulty Class |
| `advantage` | boolean | No | Has advantage |
| `disadvantage` | boolean | No | Has disadvantage |

**Returns:** `SavingThrowResult`

### apply_condition

Apply a status condition to a combatant.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entityId` | string | Yes | Target entity ID |
| `condition` | string | Yes | Condition name |

**Valid conditions:** `blinded`, `charmed`, `deafened`, `frightened`, `grappled`, `incapacitated`, `invisible`, `paralyzed`, `petrified`, `poisoned`, `prone`, `restrained`, `stunned`, `unconscious`, `concentrating`

### apply_damage

Apply damage to a combatant.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entityId` | string | Yes | Target entity ID |
| `damage` | number | Yes | Amount of damage |

### apply_healing

Apply healing to a combatant.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entityId` | string | Yes | Target entity ID |
| `healing` | number | Yes | Amount of healing |

### next_turn

Advance to the next combatant's turn.

**Parameters:** None

### end_combat

End the current combat encounter.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `reason` | string | No | Why combat ended |

### combat_status

Get current combat status summary.

**Parameters:** None

---

## Spellcasting

### cast_spell

Cast a spell, consuming a spell slot.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `spellName` | string | Yes | Name of the spell |
| `spellLevel` | number | Yes | Base spell level (0 for cantrip) |
| `upcastLevel` | number | No | Level to cast at (for upcasting) |

**Example:**

```json
{
  "name": "cast_spell",
  "arguments": {
    "spellName": "Fireball",
    "spellLevel": 3,
    "upcastLevel": 5
  }
}
```

### check_spell_slots

View current spell slots and spellcasting info.

**Parameters:** None

### lookup_spell

Look up spell details from the knowledge base.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `spellName` | string | Yes | Name of the spell |

---

## Inventory

### give_item

Give an item to the player character.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `itemName` | string | Yes | Item name (e.g., "longsword") |
| `quantity` | number | No | Number of items (default 1) |

### equip_item

Equip an item from the backpack.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `itemName` | string | Yes | Item to equip |
| `slot` | string | No | Equipment slot |

### check_inventory

View current inventory and equipment.

**Parameters:** None

### use_consumable

Use a consumable item like a potion.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `itemName` | string | Yes | Consumable to use |

### modify_currency

Add or remove currency.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `gold` | number | No | Gold amount |
| `silver` | number | No | Silver amount |
| `copper` | number | No | Copper amount |
| `action` | string | Yes | "add" or "remove" |

---

## World Queries

### query_location

Get information about a location.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `identifier` | string | No | Location name/ID (omit for current) |

### lookup_npc

Look up an NPC's profile.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `identifier` | string | Yes | NPC name or ID |

### lookup_lore

Search world lore.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `includeSecrets` | boolean | No | Include hidden lore |

---

## Rules Lookup

### lookup_rules

Search D&D 5e rules.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Rules search query |

### lookup_condition

Look up condition effects.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `condition` | string | Yes | Condition name |

### lookup_monster

Look up monster stat block.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `monsterName` | string | Yes | Monster name |

---

## Session Management

### save_session

Save the current game state.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `label` | string | No | Save label |

### load_session

Load a saved game.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `snapshotId` | string | Yes | Snapshot ID |

---

## Related Documentation

- [Data Flow](../architecture/Data-Flow.md) - How tools are called
- [LLM Integration](../architecture/LLM-Integration.md) - Tool calling flow
- [Combat System](../core-systems/Combat-System.md) - Combat mechanics
- [Magic System](../core-systems/Magic-System.md) - Spellcasting
