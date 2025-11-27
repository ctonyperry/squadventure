import type {
  WorldState,
  Entity,
  EntityId,
  Location,
  LocationId,
  NPCEntity,
  DiceRoll,
} from '@ai-dm/shared';
import { createEntityId, createLocationId } from '@ai-dm/shared';
import type { ToolDefinition } from './tool-registry.js';

/**
 * Context provided to DM tools
 */
export interface DMToolContext {
  worldState: WorldState;
  currentLocationId: LocationId;
}

/**
 * Create dice roll tool
 */
export function createRollDiceTool(): ToolDefinition<
  { notation: string; purpose: string },
  DiceRoll
> {
  return {
    tool: {
      name: 'roll_dice',
      description: `Roll dice using standard notation (e.g., "1d20", "2d6+3", "4d6kh3").
Use this for any uncertain outcome: attacks, saving throws, ability checks, damage, etc.
Always specify the purpose so results can be narrated appropriately.`,
      parameters: {
        type: 'object',
        properties: {
          notation: {
            type: 'string',
            description: 'Dice notation (e.g., "1d20+5", "2d6", "1d20 advantage")',
          },
          purpose: {
            type: 'string',
            description: 'What the roll is for (e.g., "attack roll", "perception check", "damage")',
          },
        },
        required: ['notation', 'purpose'],
      },
    },
    handler: async ({ notation, purpose }) => {
      const result = parseDiceNotation(notation);
      return { ...result, purpose };
    },
  };
}

/**
 * Parse and roll dice notation
 */
function parseDiceNotation(notation: string): Omit<DiceRoll, 'purpose'> {
  // Handle advantage/disadvantage
  const lowerNotation = notation.toLowerCase();
  const hasAdvantage = lowerNotation.includes('advantage');
  const hasDisadvantage = lowerNotation.includes('disadvantage');

  // Remove advantage/disadvantage text for parsing
  let cleanNotation = notation
    .replace(/\s*(with\s+)?(advantage|disadvantage)/gi, '')
    .trim();

  // Parse basic notation: XdY+Z or XdY-Z
  const match = cleanNotation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    // Handle keep highest/lowest (e.g., 4d6kh3)
    const keepMatch = cleanNotation.match(/^(\d+)d(\d+)(k[hl])(\d+)$/i);
    if (keepMatch) {
      return rollWithKeep(
        parseInt(keepMatch[1]!),
        parseInt(keepMatch[2]!),
        keepMatch[3]!.toLowerCase() as 'kh' | 'kl',
        parseInt(keepMatch[4]!)
      );
    }
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const numDice = parseInt(match[1]!);
  const dieSize = parseInt(match[2]!);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  // Roll dice
  let results: number[];

  if (hasAdvantage && numDice === 1 && dieSize === 20) {
    // Roll twice, take higher
    const roll1 = rollDie(dieSize);
    const roll2 = rollDie(dieSize);
    results = [Math.max(roll1, roll2)];
  } else if (hasDisadvantage && numDice === 1 && dieSize === 20) {
    // Roll twice, take lower
    const roll1 = rollDie(dieSize);
    const roll2 = rollDie(dieSize);
    results = [Math.min(roll1, roll2)];
  } else {
    results = Array.from({ length: numDice }, () => rollDie(dieSize));
  }

  const subtotal = results.reduce((sum, r) => sum + r, 0);
  const total = subtotal + modifier;

  return {
    notation: cleanNotation + (hasAdvantage ? ' (advantage)' : hasDisadvantage ? ' (disadvantage)' : ''),
    results,
    total,
  };
}

/**
 * Roll with keep highest/lowest
 */
function rollWithKeep(
  numDice: number,
  dieSize: number,
  keepType: 'kh' | 'kl',
  keepCount: number
): Omit<DiceRoll, 'purpose'> {
  const allResults = Array.from({ length: numDice }, () => rollDie(dieSize));
  const sorted = [...allResults].sort((a, b) =>
    keepType === 'kh' ? b - a : a - b
  );
  const kept = sorted.slice(0, keepCount);
  const total = kept.reduce((sum, r) => sum + r, 0);

  return {
    notation: `${numDice}d${dieSize}${keepType}${keepCount}`,
    results: allResults,
    total,
  };
}

/**
 * Roll a single die
 */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Create NPC lookup tool
 */
export function createLookupNPCTool(
  getContext: () => DMToolContext
): ToolDefinition<{ identifier: string }, NPCEntity | string> {
  return {
    tool: {
      name: 'lookup_npc',
      description: `Look up an NPC by name or ID. Returns the NPC's full profile including
personality, knowledge, motivation, and stats. Use this before roleplaying an NPC to ensure
accurate characterization.`,
      parameters: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'NPC name or entity ID',
          },
        },
        required: ['identifier'],
      },
    },
    handler: async ({ identifier }) => {
      const { worldState } = getContext();

      // Try direct ID lookup
      const byId = worldState.entities.get(createEntityId(identifier));
      if (byId && byId.type === 'npc') {
        return byId;
      }

      // Search by name (case-insensitive)
      const searchLower = identifier.toLowerCase();
      for (const entity of worldState.entities.values()) {
        if (
          entity.type === 'npc' &&
          entity.name.toLowerCase().includes(searchLower)
        ) {
          return entity;
        }
      }

      return `NPC "${identifier}" not found in current world.`;
    },
  };
}

/**
 * Create location query tool
 */
export function createQueryLocationTool(
  getContext: () => DMToolContext
): ToolDefinition<{ identifier?: string }, Location | string> {
  return {
    tool: {
      name: 'query_location',
      description: `Query information about a location. Returns the canonical description,
connections, present entities, and ambiance. Call with no identifier to get the current
location.`,
      parameters: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Location name or ID. Omit for current location.',
          },
        },
        required: [],
      },
    },
    handler: async ({ identifier }) => {
      const { worldState, currentLocationId } = getContext();

      // Use current location if no identifier
      if (!identifier) {
        const location = worldState.locations.get(currentLocationId);
        return location ?? `Current location not found.`;
      }

      // Try direct ID lookup
      const byId = worldState.locations.get(createLocationId(identifier));
      if (byId) {
        return byId;
      }

      // Search by name (case-insensitive)
      const searchLower = identifier.toLowerCase();
      for (const location of worldState.locations.values()) {
        if (location.name.toLowerCase().includes(searchLower)) {
          return location;
        }
      }

      return `Location "${identifier}" not found in current world.`;
    },
  };
}

/**
 * Create entity list tool for current location
 */
export function createListEntitiesInLocationTool(
  getContext: () => DMToolContext
): ToolDefinition<{ locationId?: string }, Entity[] | string> {
  return {
    tool: {
      name: 'list_entities_in_location',
      description: `List all entities present in a location. Includes NPCs, creatures,
and items. Use to understand what's available to interact with.`,
      parameters: {
        type: 'object',
        properties: {
          locationId: {
            type: 'string',
            description: 'Location ID. Omit for current location.',
          },
        },
        required: [],
      },
    },
    handler: async ({ locationId }) => {
      const { worldState, currentLocationId } = getContext();
      const locId = locationId
        ? createLocationId(locationId)
        : currentLocationId;

      const location = worldState.locations.get(locId);
      if (!location) {
        return `Location not found.`;
      }

      const entities: Entity[] = [];
      for (const entityId of location.presentEntities) {
        const entity = worldState.entities.get(entityId);
        if (entity) {
          entities.push(entity);
        }
      }

      return entities;
    },
  };
}

/**
 * Create lore lookup tool
 */
export function createLookupLoreTool(
  getContext: () => DMToolContext
): ToolDefinition<{ query: string; includeSecrets?: boolean }, string[]> {
  return {
    tool: {
      name: 'lookup_lore',
      description: `Search the world lore for relevant information. Returns matching
lore entries. Set includeSecrets to true only if the character has legitimately
discovered the information.`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for lore',
          },
          includeSecrets: {
            type: 'boolean',
            description: 'Whether to include non-public knowledge',
          },
        },
        required: ['query'],
      },
    },
    handler: async ({ query, includeSecrets }) => {
      const { worldState } = getContext();
      const queryLower = query.toLowerCase();

      const results: string[] = [];
      for (const entry of worldState.lore) {
        if (!entry.isPublicKnowledge && !includeSecrets) {
          continue;
        }
        if (
          entry.content.toLowerCase().includes(queryLower) ||
          entry.category.toLowerCase().includes(queryLower)
        ) {
          results.push(`[${entry.category}]: ${entry.content}`);
        }
      }

      return results.length > 0
        ? results
        : [`No lore found matching "${query}".`];
    },
  };
}
