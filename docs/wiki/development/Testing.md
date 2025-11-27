# Testing

This document describes testing strategies and practices for Squadventure.

## Testing Philosophy

1. **Unit test game logic** - Combat, spells, inventory calculations
2. **Integration test tool handlers** - Verify tools produce correct results
3. **Archetype test AI behavior** - Test with simulated player types

## Test Structure

```
packages/
├── domain/
│   └── src/
│       ├── combat/
│       │   ├── combat-manager.ts
│       │   └── combat-manager.test.ts
│       └── magic/
│           ├── spell-slots.ts
│           └── spell-slots.test.ts
└── cli/
    └── src/
        └── test-ai-players.ts
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @ai-dm/domain test

# Run with watch mode
pnpm --filter @ai-dm/domain test -- --watch

# Run specific test file
pnpm --filter @ai-dm/domain test combat-manager.test.ts
```

## Unit Testing

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CombatManager } from './combat-manager.js';

describe('CombatManager', () => {
  let manager: CombatManager;
  
  beforeEach(() => {
    manager = new CombatManager();
  });
  
  describe('startCombat', () => {
    it('should initialize combat state', () => {
      // Arrange
      const participants = [
        { entityId: 'player-1', name: 'Hero', isPlayer: true, stats: mockStats },
        { entityId: 'goblin-1', name: 'Goblin', isPlayer: false, stats: mockStats },
      ];
      
      // Act
      const state = manager.startCombat(participants);
      
      // Assert
      expect(state.isActive).toBe(true);
      expect(state.round).toBe(1);
      expect(state.participants).toHaveLength(2);
    });
    
    it('should sort by initiative', () => {
      // ...
    });
  });
  
  describe('makeAttack', () => {
    it('should hit when roll + bonus >= AC', () => {
      // ...
    });
    
    it('should always hit on natural 20', () => {
      // ...
    });
    
    it('should always miss on natural 1', () => {
      // ...
    });
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock random for deterministic tests
vi.mock('./dice', () => ({
  rollD20: vi.fn(() => 15),
  rollDamage: vi.fn(() => 8),
}));

// Mock external services
vi.mock('@ai-dm/infrastructure', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue({ content: 'Mock response' }),
  })),
}));
```

### Test Fixtures

```typescript
// test/fixtures/characters.ts
export const mockFighter: CharacterSheet = {
  id: createEntityId('char-fighter'),
  name: 'Test Fighter',
  race: 'human',
  class: 'fighter',
  level: 5,
  stats: {
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 14,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
    },
    armorClass: 18,
    hitPoints: { current: 44, max: 44 },
    speed: 30,
  },
  // ...
};
```

## Integration Testing

### Tool Handler Tests

```typescript
describe('roll_dice tool', () => {
  it('should parse standard notation', async () => {
    const tool = createRollDiceTool();
    
    const result = await tool.handler({
      notation: '2d6+3',
      purpose: 'damage',
    });
    
    expect(result.notation).toBe('2d6+3');
    expect(result.results).toHaveLength(2);
    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(result.total).toBeLessThanOrEqual(15);
  });
  
  it('should handle advantage', async () => {
    const tool = createRollDiceTool();
    
    const result = await tool.handler({
      notation: '1d20 advantage',
      purpose: 'attack',
    });
    
    expect(result.notation).toContain('advantage');
  });
});
```

### State Management Tests

```typescript
describe('Session persistence', () => {
  it('should save and restore session', async () => {
    const store = new InMemoryStore();
    const manager = new SnapshotManager(store);
    
    // Create session
    const session = createTestSession();
    const snapshot = await manager.createSnapshot(session, worldState);
    
    // Load it back
    const loaded = await manager.loadSnapshot(snapshot.id);
    
    expect(loaded?.sessionState).toEqual(session);
  });
});
```

## AI Player Archetypes

Test AI DM behavior with simulated player types:

```typescript
// cli/src/test-ai-players.ts

interface AIPlayerArchetype {
  name: string;
  style: string;
  sampleActions: string[];
}

const ARCHETYPES: AIPlayerArchetype[] = [
  {
    name: 'Combat Optimizer',
    style: 'Focuses on tactical advantage and optimal moves',
    sampleActions: [
      'I ready my action to attack when an enemy comes into range',
      'What is the goblin\'s AC?',
      'I use my bonus action to Disengage',
    ],
  },
  {
    name: 'Roleplayer',
    style: 'Emphasizes character voice and narrative',
    sampleActions: [
      '"Barkeep, what troubles plague this village?"',
      'I inspect the painting, looking for hidden meanings',
      'Aldric kneels beside the wounded soldier, offering comfort',
    ],
  },
  {
    name: 'Chaos Agent',
    style: 'Makes unexpected choices, tests boundaries',
    sampleActions: [
      'I try to befriend the dragon',
      'Can I climb the inside of the chimney?',
      'I cast Prestidigitation to make the king\'s wine taste like mud',
    ],
  },
  {
    name: 'New Player',
    style: 'Asks questions, needs guidance',
    sampleActions: [
      'What can I do on my turn?',
      'How do I cast a spell?',
      'I want to attack but I don\'t know how',
    ],
  },
];

async function runArchetypeTests(): Promise<void> {
  for (const archetype of ARCHETYPES) {
    console.log(`\nTesting: ${archetype.name}`);
    console.log(`Style: ${archetype.style}`);
    
    for (const action of archetype.sampleActions) {
      const response = await orchestrator.processPlayerInput(action, persona);
      
      // Verify response is appropriate
      validateResponse(response, archetype);
    }
  }
}
```

### Running Archetype Tests

```bash
pnpm --filter @ai-dm/cli test-ai
```

## Coverage

```bash
# Generate coverage report
pnpm test -- --coverage

# Coverage thresholds (vitest.config.ts)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
```

## Testing Best Practices

### Arrange-Act-Assert

```typescript
it('should apply damage correctly', () => {
  // Arrange
  const character = createCharacter({ hp: 50 });
  
  // Act
  applyDamage(character, 15);
  
  // Assert
  expect(character.stats.hitPoints.current).toBe(35);
});
```

### Test Edge Cases

```typescript
describe('applyDamage', () => {
  it('should not reduce HP below 0', () => {
    const character = createCharacter({ hp: 10 });
    applyDamage(character, 100);
    expect(character.stats.hitPoints.current).toBe(0);
  });
  
  it('should handle 0 damage', () => {
    const character = createCharacter({ hp: 50 });
    applyDamage(character, 0);
    expect(character.stats.hitPoints.current).toBe(50);
  });
});
```

### Descriptive Test Names

```typescript
// ✅ Good - Describes behavior
it('should grant advantage when attacker is invisible')
it('should double damage dice on critical hit')

// ❌ Bad - Vague
it('should work correctly')
it('test attack')
```

## Related Documentation

- [Development Setup](Development-Setup.md) - Environment setup
- [Code Conventions](Code-Conventions.md) - Style guide
- [Building](Building.md) - Build process
