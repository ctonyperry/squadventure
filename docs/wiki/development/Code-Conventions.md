# Code Conventions

This document describes the coding standards and patterns used in Squadventure.

## TypeScript Guidelines

### Strict Mode

All packages use strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Branded Types

Use branded types for IDs to prevent mixing:

```typescript
// ✅ Good - Branded types
type EntityId = string & { readonly __brand: 'EntityId' };
type LocationId = string & { readonly __brand: 'LocationId' };

function createEntityId(id: string): EntityId {
  return id as EntityId;
}

// ✅ Type-safe
function getEntity(id: EntityId): Entity { ... }
const entity = getEntity(createEntityId('npc-1'));

// ❌ Compile error - prevents mixing
const entity = getEntity(createLocationId('loc-1'));
```

### Interfaces vs Types

Prefer interfaces for object shapes:

```typescript
// ✅ Good - Interface for objects
interface Character {
  name: string;
  level: number;
}

// ✅ Good - Type for unions/primitives
type EntityType = 'npc' | 'creature' | 'item';
type AttitudeLevel = 'hostile' | 'neutral' | 'friendly';
```

### Explicit Return Types

Always specify return types for public functions:

```typescript
// ✅ Good - Explicit return type
function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ❌ Bad - Implicit return type
function calculateModifier(score: number) {
  return Math.floor((score - 10) / 2);
}
```

### Readonly Properties

Use readonly for immutable data:

```typescript
interface GameSystem {
  readonly id: string;
  readonly name: string;
  readonly races: Readonly<Record<string, RaceDefinition>>;
}
```

## Naming Conventions

### Files

```
kebab-case.ts          # Regular files
PascalCase.ts          # Class files (optional)
*.test.ts              # Test files
index.ts               # Barrel exports
```

### Variables and Functions

```typescript
// camelCase for variables and functions
const playerCharacter = getCharacter();
function calculateDamage() { ... }

// UPPER_SNAKE_CASE for constants
const MAX_LEVEL = 20;
const DEFAULT_AC = 10;

// PascalCase for classes and types
class CombatManager { ... }
interface CharacterSheet { ... }
type EntityType = ...;
```

### Interfaces

```typescript
// Don't prefix with "I"
// ✅ Good
interface Character { ... }

// ❌ Bad
interface ICharacter { ... }
```

## Code Organization

### Module Structure

```typescript
// 1. Imports (external, then internal)
import { z } from 'zod';
import type { EntityId } from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';

// 2. Type definitions
interface ToolContext { ... }

// 3. Constants
const CONDITION_EFFECTS = { ... };

// 4. Main exports
export class ConditionManager { ... }

// 5. Helper functions (private)
function calculateBonus() { ... }
```

### Barrel Exports

Each package has an `index.ts` that re-exports public API:

```typescript
// packages/domain/src/index.ts
export * from './combat/index.js';
export * from './character/index.js';
export * from './system/index.js';
// ...
```

## Error Handling

### Use Explicit Errors

```typescript
// ✅ Good - Descriptive error
if (!character) {
  throw new Error(`Character not found: ${characterId}`);
}

// ✅ Good - Return null for expected "not found"
function getCharacter(id: EntityId): Character | null {
  return this.characters.get(id) ?? null;
}
```

### Result Types for Expected Failures

```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function equipItem(itemId: EntityId): Result<void> {
  if (!item) {
    return { success: false, error: 'Item not found' };
  }
  // ...
  return { success: true };
}
```

## Documentation

### JSDoc for Public APIs

```typescript
/**
 * Calculate the ability modifier for a given score.
 * 
 * @param score - The ability score (1-30)
 * @returns The modifier (-5 to +10)
 * 
 * @example
 * ```typescript
 * calculateModifier(14); // returns 2
 * calculateModifier(8);  // returns -1
 * ```
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
```

### Inline Comments

```typescript
// ✅ Good - Explains why, not what
// DMG p.82: Encounter multiplier accounts for action economy
const multiplier = getEncounterMultiplier(monsterCount);

// ❌ Bad - States the obvious
// Add one to the counter
counter++;
```

## Async/Await

### Always Use Async/Await

```typescript
// ✅ Good
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}

// ❌ Avoid raw promises
function fetchData(): Promise<Data> {
  return fetch(url).then(r => r.json());
}
```

### Handle Errors

```typescript
async function processInput(input: string): Promise<string> {
  try {
    const response = await llm.complete(input);
    return response.content;
  } catch (error) {
    if (error instanceof RateLimitError) {
      await delay(1000);
      return this.processInput(input);
    }
    throw error;
  }
}
```

## Immutability

### Prefer Immutable Operations

```typescript
// ✅ Good - Returns new array
function addItem(inventory: EntityId[], item: EntityId): EntityId[] {
  return [...inventory, item];
}

// ❌ Avoid mutations
function addItem(inventory: EntityId[], item: EntityId): void {
  inventory.push(item);
}
```

### Use Readonly Types

```typescript
function processEntities(entities: readonly Entity[]): void {
  // entities.push() would be a compile error
}
```

## Testing Patterns

See [Testing](Testing.md) for detailed testing guidelines.

```typescript
// Tests use describe/it structure
describe('CombatManager', () => {
  describe('makeAttack', () => {
    it('should hit when roll exceeds AC', () => {
      // Arrange
      const manager = createCombatManager();
      
      // Act
      const result = manager.makeAttack(...);
      
      // Assert
      expect(result.hit).toBe(true);
    });
  });
});
```

## Related Documentation

- [Development Setup](Development-Setup.md) - Environment setup
- [Testing](Testing.md) - Test guidelines
- [Building](Building.md) - Build process
