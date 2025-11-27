# Data Flow

This document describes how a player message flows through the Squadventure system from input to response.

## Message Lifecycle Overview

```mermaid
sequenceDiagram
    participant Player
    participant CLI as CLI (REPL)
    participant Orch as SessionOrchestrator
    participant LLM as OpenAI Adapter
    participant Tools as DM Tools
    participant World as World State
    
    Player->>CLI: "I attack the goblin"
    CLI->>Orch: processPlayerInput(message, persona)
    
    Orch->>Orch: Build context (scene, history)
    Orch->>LLM: sendMessage(messages, tools)
    
    LLM->>LLM: Generate response with tool calls
    LLM-->>Orch: { content: null, toolCalls: [...] }
    
    loop For each tool call
        Orch->>Tools: execute(toolName, args)
        Tools->>World: Query/modify state
        World-->>Tools: Result
        Tools-->>Orch: Tool result
    end
    
    Orch->>LLM: sendMessage(toolResults)
    LLM-->>Orch: { content: "DM response", finishReason: "stop" }
    
    Orch->>Orch: Update conversation history
    Orch-->>CLI: DM response text
    CLI-->>Player: Display response
```

## Detailed Flow

### 1. Player Input

The REPL captures player input:

```typescript
// cli/src/repl.ts
const response = await this.orchestrator.processPlayerInput(
  trimmed,
  this.persona
);
```

### 2. Context Building

The orchestrator builds the LLM context:

```typescript
// application/src/session/orchestrator.ts
const messages: LLMMessage[] = [
  { role: 'system', content: this.buildSystemPrompt(persona) },
  ...this.conversationHistory,
  { role: 'user', content: playerInput }
];
```

The system prompt includes:
- DM persona definition and style
- Current scene description
- World state summary
- Player character stats
- Active combat state (if any)

### 3. LLM Request

The message is sent to OpenAI:

```typescript
// infrastructure/src/llm/openai-adapter.ts
const response = await this.client.chat.completions.create({
  model: this.model,
  messages,
  tools: this.formatTools(tools),
  temperature: this.temperature,
});
```

### 4. Tool Calling Loop

If the LLM requests tool calls, they're executed:

```mermaid
flowchart TD
    A[LLM Response] --> B{Has Tool Calls?}
    B -->|Yes| C[Execute Each Tool]
    C --> D[Collect Results]
    D --> E[Send Results to LLM]
    E --> A
    B -->|No| F[Return Response]
```

Tool execution example:

```typescript
// For an attack roll
const result = await toolHandler({
  attackerId: 'player-1',
  targetId: 'goblin-1',
  attackBonus: 5,
  damageNotation: '1d8+3',
  damageType: 'slashing'
});
```

### 5. State Updates

Tools may modify game state:

```typescript
// Combat attack modifies HP
combatManager.applyDamage(targetId, damage);

// Inventory changes
worldState.entities.set(item.id, item);
character.inventory.backpack.push(item.id);
```

### 6. Response Delivery

Final response is returned to the player:

```typescript
// Orchestrator returns final content
return response.content;

// REPL displays it
console.log(chalk.yellow.bold('DM: ') + chalk.white(message));
```

## Tool Call Flow Detail

```mermaid
sequenceDiagram
    participant LLM
    participant Orch as Orchestrator
    participant Registry as Tool Registry
    participant Handler as Tool Handler
    participant State as Game State
    
    LLM->>Orch: toolCalls: [{ name: "roll_dice", args: {...} }]
    Orch->>Registry: getHandler("roll_dice")
    Registry-->>Orch: handler function
    Orch->>Handler: execute(args)
    Handler->>State: Query or modify
    State-->>Handler: Result
    Handler-->>Orch: { notation: "1d20+5", total: 18, ... }
    Orch->>LLM: Tool result message
```

## Combat Flow Example

A complete combat turn:

```mermaid
sequenceDiagram
    participant P as Player
    participant DM as AI DM
    participant C as Combat System
    participant W as World State
    
    P->>DM: "I swing my sword at the goblin"
    
    DM->>DM: attack_roll tool call
    DM->>C: makeAttack(player, goblin, +5, 1d8+3)
    C->>C: Roll d20, compare to AC
    C->>W: applyDamage(goblin, 7)
    W-->>C: HP updated
    C-->>DM: { hit: true, damage: 7, ... }
    
    DM->>DM: next_turn tool call
    DM->>C: nextTurn()
    C-->>DM: "Goblin's turn"
    
    DM-->>P: "Your blade bites deep into the goblin! It's now the goblin's turn..."
```

## Streaming (Optional)

For longer responses, streaming provides incremental output:

```mermaid
sequenceDiagram
    participant CLI
    participant LLM
    
    CLI->>LLM: Request (stream: true)
    loop For each chunk
        LLM-->>CLI: Delta content
        CLI->>CLI: Display chunk
    end
    LLM-->>CLI: done
```

## Error Handling

```mermaid
flowchart TD
    A[Process Input] --> B{LLM Error?}
    B -->|Yes| C[Log Error]
    C --> D[Return Fallback Response]
    B -->|No| E{Tool Error?}
    E -->|Yes| F[Return Error to LLM]
    F --> G[LLM Handles Gracefully]
    E -->|No| H[Return Success]
```

## Related Documentation

- [Overview](Overview.md) - System architecture
- [LLM Integration](LLM-Integration.md) - OpenAI adapter details
- [DM Tools Reference](../api-reference/DM-Tools.md) - Tool documentation
