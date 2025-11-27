# Commands Reference

Reference for all commands available in the Squadventure CLI.

## REPL Commands

Commands are prefixed with `/` in the REPL.

### General

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `/h`, `/?` | Show available commands |
| `/quit` | `/exit`, `/q` | Exit the game |
| `/scene` | — | Describe the current scene again |

### Save/Load

| Command | Description |
|---------|-------------|
| `/save [label]` | Save the current game. Optional label for identification. |
| `/load` | List available saves |
| `/load <number>` | Load a specific save by number |

## Usage Examples

### Getting Help

```
You: /help

Commands:
  /help          - Show this help
  /quit          - Exit the game
  /save [label]  - Save the current game
  /load          - List and load saved games
  /scene         - Describe the current scene again
```

### Saving Your Game

```
You: /save before_boss_fight
  [Saving game...]
✓ Game saved: snapshot-1701234567890
  Label: before_boss_fight
```

### Loading a Save

```
You: /load

Saved Games:
  1. snapshot-1701234567890 - before_boss_fight
     11/27/2024, 12:00:00 PM
  2. snapshot-1701234000000 - after_tavern
     11/27/2024, 10:00:00 AM

To load a save, use: /load <number>

You: /load 1
  [Loading game...]
✓ Loaded: before_boss_fight
  42 turns restored

Last scene:
You stand before the ancient door, its iron surface etched with
warnings in a forgotten tongue...
```

### Viewing the Scene

```
You: /scene
  [Looking around...]

DM: You find yourself in the main hall of the Rusty Dragon Inn. 
Wooden tables fill the space, lit by flickering candlelight. 
The bartender polishes glasses behind a long oak bar, while a 
mysterious figure in a dark cloak sits alone in the corner...
```

## Player Actions

Outside of commands, you interact naturally with the AI Dungeon Master.

### Movement & Exploration

```
You: I look around the tavern
You: I walk over to the mysterious stranger
You: I search the bookshelf for hidden compartments
You: I open the chest carefully
```

### Social Interaction

```
You: "Barkeep, what news of the road to the north?"
You: I try to persuade the guard to let us pass
You: I intimidate the goblin to reveal their hideout
```

### Combat Actions

```
You: I attack the goblin with my sword
You: I cast Fireball at the group of enemies
You: I try to grapple the orc
You: I disengage and move behind cover
```

### Inventory & Equipment

```
You: What's in my inventory?
You: I equip the longsword
You: I drink the healing potion
You: I give 10 gold to the beggar
```

## Tips

### Be Specific

```
# ✅ Good - Clear intent
You: I carefully examine the painting, looking for hidden mechanisms

# ❌ Vague - What painting? What are you looking for?
You: I look at stuff
```

### Use Dialogue Naturally

```
# ✅ Good - Natural dialogue
You: "My name is Aldric, and I seek the ancient artifact."

# ✅ Also good - Third person
You: I introduce myself as Aldric and ask about the artifact
```

### Ask Questions

```
You: What does my character know about dragons?
You: Is there a window I could escape through?
You: Do I recognize this symbol?
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate command history |
| `Ctrl+C` | Cancel current input |
| `Ctrl+D` | Exit (same as `/quit`) |

## Related Documentation

- [Quick Start](../getting-started/Quick-Start.md) - Getting started guide
- [Configuration](../getting-started/Configuration.md) - Configuration options
- [DM Tools](../api-reference/DM-Tools.md) - Available DM tools
