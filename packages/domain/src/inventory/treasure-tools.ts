/**
 * Treasure Generation DM Tools
 *
 * Tools for generating loot and treasure rewards.
 */

import type { ToolDefinition } from '../tools/tool-registry.js';
import { TreasureGenerator } from './treasure-generator.js';
import {
  type GemOrArt,
  type TreasureHoardResult,
  type IndividualTreasureResult,
} from './treasure-tables.js';
import type { Currency } from '@ai-dm/shared';

// Singleton generator
let treasureGenerator: TreasureGenerator | null = null;

function getGenerator(): TreasureGenerator {
  if (!treasureGenerator) {
    treasureGenerator = new TreasureGenerator();
  }
  return treasureGenerator;
}

// ============================================================================
// Tool Definitions
// ============================================================================

interface GenerateIndividualTreasureArgs {
  /** Challenge Rating of the creature */
  cr: number;
  /** Number of creatures (generates treasure for each) */
  count?: number;
}

interface GenerateIndividualTreasureResult {
  success: boolean;
  coins: Currency;
  totalGoldValue: number;
  summary: string;
}

/**
 * Create the generate_individual_treasure tool
 */
export function createGenerateIndividualTreasureTool(): ToolDefinition<
  GenerateIndividualTreasureArgs,
  GenerateIndividualTreasureResult
> {
  return {
    tool: {
      name: 'generate_individual_treasure',
      description:
        'Generate random individual treasure for creatures based on their Challenge Rating. ' +
        'Returns coin loot appropriate for the creature type. Use for regular monster kills.',
      parameters: {
        type: 'object' as const,
        properties: {
          cr: {
            type: 'number',
            description: 'Challenge Rating of the creature (0-30)',
          },
          count: {
            type: 'number',
            description: 'Number of creatures to generate treasure for (default: 1)',
          },
        },
        required: ['cr'],
      },
    },
    handler: async (args) => {
      const generator = getGenerator();
      const count = args.count ?? 1;

      // Generate for multiple creatures
      let totalCoins: Currency = {
        copper: 0,
        silver: 0,
        electrum: 0,
        gold: 0,
        platinum: 0,
      };
      let totalValue = 0;

      for (let i = 0; i < count; i++) {
        const result = generator.generateIndividual(args.cr);
        totalCoins.copper += result.coins.copper;
        totalCoins.silver += result.coins.silver;
        totalCoins.electrum += result.coins.electrum;
        totalCoins.gold += result.coins.gold;
        totalCoins.platinum += result.coins.platinum;
        totalValue += result.totalGoldValue;
      }

      // Build summary
      const coinParts: string[] = [];
      if (totalCoins.platinum > 0) coinParts.push(`${totalCoins.platinum} pp`);
      if (totalCoins.gold > 0) coinParts.push(`${totalCoins.gold} gp`);
      if (totalCoins.electrum > 0) coinParts.push(`${totalCoins.electrum} ep`);
      if (totalCoins.silver > 0) coinParts.push(`${totalCoins.silver} sp`);
      if (totalCoins.copper > 0) coinParts.push(`${totalCoins.copper} cp`);

      const summary = [
        `Individual Treasure (${count}x CR ${args.cr} creature${count > 1 ? 's' : ''}):`,
        `Coins: ${coinParts.length > 0 ? coinParts.join(', ') : 'None'}`,
        `Total Value: ~${Math.floor(totalValue)} gp`,
      ].join('\n');

      return {
        success: true,
        coins: totalCoins,
        totalGoldValue: totalValue,
        summary,
      };
    },
  };
}

interface GenerateHoardTreasureArgs {
  /** Challenge Rating of the lair/boss */
  cr: number;
}

interface GenerateHoardTreasureResult {
  success: boolean;
  coins: Currency;
  gems: GemOrArt[];
  artObjects: GemOrArt[];
  magicItems: string[];
  totalGoldValue: number;
  summary: string;
}

/**
 * Create the generate_hoard_treasure tool
 */
export function createGenerateHoardTreasureTool(): ToolDefinition<
  GenerateHoardTreasureArgs,
  GenerateHoardTreasureResult
> {
  return {
    tool: {
      name: 'generate_hoard_treasure',
      description:
        'Generate a treasure hoard appropriate for a boss lair or significant encounter. ' +
        'Returns coins, gems, art objects, and potentially magic items based on CR.',
      parameters: {
        type: 'object' as const,
        properties: {
          cr: {
            type: 'number',
            description: 'Challenge Rating of the encounter (0-30)',
          },
        },
        required: ['cr'],
      },
    },
    handler: async (args) => {
      const generator = getGenerator();
      const result = generator.generateHoard(args.cr);
      const summary = generator.formatTreasure(result);

      return {
        success: true,
        coins: result.coins,
        gems: result.gems,
        artObjects: result.artObjects,
        magicItems: result.magicItems,
        totalGoldValue: result.totalGoldValue,
        summary,
      };
    },
  };
}

interface GenerateEncounterTreasureArgs {
  /** Array of creatures in the encounter */
  creatures: Array<{
    /** Challenge Rating */
    cr: number;
    /** Number of this creature type */
    count: number;
  }>;
  /** Whether to include hoard treasure (for boss/lair encounters) */
  include_hoard?: boolean;
}

interface GenerateEncounterTreasureResult {
  success: boolean;
  coins: Currency;
  gems: GemOrArt[];
  artObjects: GemOrArt[];
  magicItems: string[];
  totalGoldValue: number;
  summary: string;
}

/**
 * Create the generate_encounter_treasure tool
 */
export function createGenerateEncounterTreasureTool(): ToolDefinition<
  GenerateEncounterTreasureArgs,
  GenerateEncounterTreasureResult
> {
  return {
    tool: {
      name: 'generate_encounter_treasure',
      description:
        'Generate treasure for an entire encounter with multiple creatures. ' +
        'Optionally includes hoard treasure for boss/lair encounters.',
      parameters: {
        type: 'object' as const,
        properties: {
          creatures: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cr: {
                  type: 'number',
                  description: 'Challenge Rating of the creature',
                },
                count: {
                  type: 'number',
                  description: 'Number of this creature type',
                },
              },
              required: ['cr', 'count'],
            },
            description: 'Array of creatures in the encounter',
          },
          include_hoard: {
            type: 'boolean',
            description: 'Include hoard treasure for boss/lair encounters (default: false)',
          },
        },
        required: ['creatures'],
      },
    },
    handler: async (args) => {
      const generator = getGenerator();
      const result = generator.generateForEncounter(
        args.creatures,
        args.include_hoard ?? false
      );
      const summary = generator.formatTreasure(result);

      return {
        success: true,
        coins: result.coins,
        gems: result.gems,
        artObjects: result.artObjects,
        magicItems: result.magicItems,
        totalGoldValue: result.totalGoldValue,
        summary,
      };
    },
  };
}

/**
 * Get all treasure tools
 */
export function getTreasureTools(): ToolDefinition<Record<string, unknown>, unknown>[] {
  return [
    createGenerateIndividualTreasureTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createGenerateHoardTreasureTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createGenerateEncounterTreasureTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
  ];
}
