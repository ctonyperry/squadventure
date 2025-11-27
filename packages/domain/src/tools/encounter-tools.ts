/**
 * Encounter Building DM Tools
 *
 * Tools for calculating encounter difficulty and building balanced encounters.
 */

import type { ToolDefinition } from './tool-registry.js';
import {
  calculateEncounterDifficulty,
  suggestEncounters,
  getEncounterSummary,
  getAdventuringDayXPBudget,
  getRecommendedCRRange,
  getPartyXPThresholds,
  formatXP,
  type PartyComposition,
  type EncounterMonster,
  type EncounterDifficulty,
} from '../combat/encounter-calculator.js';

/**
 * Arguments for calculate_encounter_difficulty tool
 */
interface CalculateEncounterDifficultyArgs {
  /** Array of character levels in the party */
  party_levels: number[];
  /** Monsters in the encounter */
  monsters: Array<{
    /** Challenge Rating (e.g., "1/4", "2", "10") */
    cr: string;
    /** Number of this monster type */
    count: number;
    /** Optional name for display */
    name?: string;
  }>;
}

/**
 * Result for calculate_encounter_difficulty tool
 */
interface CalculateEncounterDifficultyResult {
  success: boolean;
  difficulty: EncounterDifficulty;
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  thresholds: {
    easy: number;
    medium: number;
    hard: number;
    deadly: number;
  };
  xpReward: number;
  xpPerCharacter: number;
  summary: string;
}

/**
 * Create the calculate_encounter_difficulty tool
 */
export function createCalculateEncounterDifficultyTool(): ToolDefinition<
  CalculateEncounterDifficultyArgs,
  CalculateEncounterDifficultyResult
> {
  return {
    tool: {
      name: 'calculate_encounter_difficulty',
      description:
        'Calculate the difficulty of an encounter based on party composition and monsters. ' +
        'Returns difficulty rating (trivial/easy/medium/hard/deadly), XP values, and tactical advice.',
      parameters: {
        type: 'object' as const,
        properties: {
          party_levels: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of character levels in the party (e.g., [5, 5, 4, 5] for a 4-person level 5 party)',
          },
          monsters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cr: {
                  type: 'string',
                  description: 'Challenge Rating (e.g., "1/4", "1/2", "1", "5", "10")',
                },
                count: {
                  type: 'number',
                  description: 'Number of monsters of this type',
                },
                name: {
                  type: 'string',
                  description: 'Optional monster name for display',
                },
              },
              required: ['cr', 'count'],
            },
            description: 'Array of monster types and counts in the encounter',
          },
        },
        required: ['party_levels', 'monsters'],
      },
    },
    handler: async (args) => {
      const party: PartyComposition = { levels: args.party_levels };
      const monsters: EncounterMonster[] = args.monsters.map((m) => {
        const monster: EncounterMonster = {
          cr: m.cr,
          count: m.count,
        };
        if (m.name) {
          monster.name = m.name;
        }
        return monster;
      });

      const result = calculateEncounterDifficulty(party, monsters);
      const summary = getEncounterSummary(party, monsters);

      return {
        success: true,
        difficulty: result.difficulty,
        baseXP: result.baseXP,
        adjustedXP: result.adjustedXP,
        multiplier: result.multiplier,
        thresholds: result.thresholds,
        xpReward: result.xpReward,
        xpPerCharacter: Math.floor(result.xpReward / party.levels.length),
        summary,
      };
    },
  };
}

/**
 * Arguments for suggest_encounter tool
 */
interface SuggestEncounterArgs {
  /** Array of character levels in the party */
  party_levels: number[];
  /** Target difficulty level */
  target_difficulty: EncounterDifficulty;
  /** Minimum number of monsters (optional, default 1) */
  min_monsters?: number;
  /** Maximum number of monsters (optional, default 8) */
  max_monsters?: number;
}

/**
 * Result for suggest_encounter tool
 */
interface SuggestEncounterResult {
  success: boolean;
  suggestions: Array<{
    monsters: Array<{ cr: string; count: number }>;
    difficulty: EncounterDifficulty;
    baseXP: number;
    adjustedXP: number;
  }>;
  partyInfo: {
    averageLevel: number;
    recommendedCRRange: { minCR: string; maxCR: string; soloMonsterCR: string };
    dailyXPBudget: number;
  };
  message: string;
}

/**
 * Create the suggest_encounter tool
 */
export function createSuggestEncounterTool(): ToolDefinition<
  SuggestEncounterArgs,
  SuggestEncounterResult
> {
  return {
    tool: {
      name: 'suggest_encounter',
      description:
        'Suggest balanced encounter compositions for a target difficulty. ' +
        'Returns multiple options with different monster counts and CRs.',
      parameters: {
        type: 'object' as const,
        properties: {
          party_levels: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of character levels in the party',
          },
          target_difficulty: {
            type: 'string',
            enum: ['trivial', 'easy', 'medium', 'hard', 'deadly'],
            description: 'Target difficulty level for the encounter',
          },
          min_monsters: {
            type: 'number',
            description: 'Minimum number of monsters (default: 1)',
          },
          max_monsters: {
            type: 'number',
            description: 'Maximum number of monsters (default: 8)',
          },
        },
        required: ['party_levels', 'target_difficulty'],
      },
    },
    handler: async (args) => {
      const party: PartyComposition = { levels: args.party_levels };
      const options: { minMonsters?: number; maxMonsters?: number } = {};
      if (args.min_monsters !== undefined) {
        options.minMonsters = args.min_monsters;
      }
      if (args.max_monsters !== undefined) {
        options.maxMonsters = args.max_monsters;
      }
      const suggestions = suggestEncounters(party, args.target_difficulty, options);

      const crRange = getRecommendedCRRange(party);
      const dailyBudget = getAdventuringDayXPBudget(party);
      const avgLevel = Math.round(
        args.party_levels.reduce((a, b) => a + b, 0) / args.party_levels.length
      );

      const message =
        suggestions.length > 0
          ? `Found ${suggestions.length} ${args.target_difficulty} encounter suggestions for party of ${args.party_levels.length} (avg level ${avgLevel}).`
          : `No suitable encounters found for ${args.target_difficulty} difficulty. Try adjusting monster count constraints.`;

      return {
        success: suggestions.length > 0,
        suggestions,
        partyInfo: {
          averageLevel: avgLevel,
          recommendedCRRange: crRange,
          dailyXPBudget: dailyBudget,
        },
        message,
      };
    },
  };
}

/**
 * Arguments for get_adventuring_day_budget tool
 */
interface GetAdventuringDayBudgetArgs {
  /** Array of character levels in the party */
  party_levels: number[];
}

/**
 * Result for get_adventuring_day_budget tool
 */
interface GetAdventuringDayBudgetResult {
  success: boolean;
  dailyXPBudget: number;
  thresholds: {
    easy: number;
    medium: number;
    hard: number;
    deadly: number;
  };
  recommendedEncounters: {
    easy: number;
    medium: number;
    hard: number;
  };
  message: string;
}

/**
 * Create the get_adventuring_day_budget tool
 */
export function createGetAdventuringDayBudgetTool(): ToolDefinition<
  GetAdventuringDayBudgetArgs,
  GetAdventuringDayBudgetResult
> {
  return {
    tool: {
      name: 'get_adventuring_day_budget',
      description:
        'Get the adventuring day XP budget and encounter recommendations for a party. ' +
        'Helps plan how many encounters of each difficulty the party can handle in a day.',
      parameters: {
        type: 'object' as const,
        properties: {
          party_levels: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of character levels in the party',
          },
        },
        required: ['party_levels'],
      },
    },
    handler: async (args) => {
      const party: PartyComposition = { levels: args.party_levels };
      const dailyBudget = getAdventuringDayXPBudget(party);
      const thresholds = getPartyXPThresholds(party);

      // Calculate recommended number of encounters
      // These are rough guidelines based on DMG recommendations
      const recommendedEncounters = {
        easy: Math.floor(dailyBudget / thresholds.easy),
        medium: Math.floor(dailyBudget / thresholds.medium),
        hard: Math.floor(dailyBudget / thresholds.hard),
      };

      const avgLevel = Math.round(
        args.party_levels.reduce((a, b) => a + b, 0) / args.party_levels.length
      );

      const message = [
        `Adventuring Day Budget for ${args.party_levels.length} characters (avg level ${avgLevel}):`,
        ``,
        `Daily XP Budget: ${formatXP(dailyBudget)} adjusted XP`,
        ``,
        `Encounter Thresholds:`,
        `  Easy: ${formatXP(thresholds.easy)} | Medium: ${formatXP(thresholds.medium)}`,
        `  Hard: ${formatXP(thresholds.hard)} | Deadly: ${formatXP(thresholds.deadly)}`,
        ``,
        `Recommended Encounters per Day:`,
        `  ~${recommendedEncounters.easy} Easy encounters, OR`,
        `  ~${recommendedEncounters.medium} Medium encounters, OR`,
        `  ~${recommendedEncounters.hard} Hard encounters`,
        ``,
        `Note: Mix difficulties for variety. 6-8 Medium/Hard encounters is typical.`,
      ].join('\n');

      return {
        success: true,
        dailyXPBudget: dailyBudget,
        thresholds,
        recommendedEncounters,
        message,
      };
    },
  };
}

/**
 * Get all encounter tools
 */
export function getEncounterTools(): ToolDefinition<Record<string, unknown>, unknown>[] {
  return [
    createCalculateEncounterDifficultyTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createSuggestEncounterTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createGetAdventuringDayBudgetTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
  ];
}
