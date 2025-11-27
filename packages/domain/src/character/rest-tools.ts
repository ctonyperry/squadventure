/**
 * DM Tools for rest mechanics
 */

import type { ToolDefinition } from '../tools/tool-registry.js';
import type { CharacterSheet } from '@ai-dm/shared';
import {
  performShortRest,
  performLongRest,
  spendHitDie,
  formatHitDice,
  canBenefitFromShortRest,
  canBenefitFromLongRest,
} from './rest-mechanics.js';

/**
 * Context for rest tools
 */
export interface RestToolContext {
  getPlayerCharacter: () => CharacterSheet | undefined;
  updatePlayerCharacter: (character: CharacterSheet) => void;
}

/**
 * Create short rest tool
 */
export function createShortRestTool(
  getContext: () => RestToolContext
): ToolDefinition<{ hitDiceToSpend?: number }, string> {
  return {
    tool: {
      name: 'short_rest',
      description: `Perform a short rest (1 hour). Can spend hit dice to recover HP. Specify hitDiceToSpend to automatically spend that many hit dice.`,
      parameters: {
        type: 'object',
        properties: {
          hitDiceToSpend: {
            type: 'number',
            description: 'Number of hit dice to spend for healing (optional, default 0)',
          },
        },
        required: [],
      },
    },
    handler: async ({ hitDiceToSpend }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const diceToSpend = hitDiceToSpend ?? 0;
      const result = performShortRest(character, diceToSpend);
      updatePlayerCharacter(character);

      const lines: string[] = [`${character.name} takes a short rest.`];

      if (result.hitDiceSpent > 0) {
        lines.push(`Spent ${result.hitDiceSpent} hit ${result.hitDiceSpent === 1 ? 'die' : 'dice'}, recovered ${result.hpHealed} HP.`);
      }

      lines.push(`Current HP: ${result.newHp}/${character.stats.hitPoints.max}`);
      lines.push(`Hit Dice remaining: ${formatHitDice(character.hitDice)}`);

      if (canBenefitFromShortRest(character)) {
        lines.push(`(Can spend more hit dice for additional healing)`);
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create long rest tool
 */
export function createLongRestTool(
  getContext: () => RestToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'long_rest',
      description: `Perform a long rest (8 hours). Restores all HP, recovers half of total hit dice (minimum 1), and restores all spell slots.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const result = performLongRest(character);
      updatePlayerCharacter(character);

      const lines: string[] = [`${character.name} completes a long rest.`];

      if (result.hpRestored > 0) {
        lines.push(`HP fully restored (+${result.hpRestored} HP).`);
      } else {
        lines.push(`HP was already at maximum.`);
      }

      if (result.hitDiceRecovered > 0) {
        lines.push(`Recovered ${result.hitDiceRecovered} hit ${result.hitDiceRecovered === 1 ? 'die' : 'dice'}.`);
      }

      lines.push(`Hit Dice available: ${formatHitDice(character.hitDice)}`);

      if (result.spellSlotsRestored) {
        lines.push(`All spell slots restored.`);
      }

      lines.push(`\n${character.name} is refreshed and ready for adventure!`);

      return lines.join('\n');
    },
  };
}

/**
 * Create spend hit die tool
 */
export function createSpendHitDieTool(
  getContext: () => RestToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'spend_hit_die',
      description: `Spend one hit die during a short rest to recover HP. Rolls the hit die + CON modifier.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (character.hitDice.current <= 0) {
        return `${character.name} has no hit dice remaining.`;
      }

      const previousHp = character.stats.hitPoints.current;
      const healing = spendHitDie(character);
      updatePlayerCharacter(character);

      const conMod = Math.floor((character.stats.abilityScores.constitution - 10) / 2);
      const conModStr = conMod >= 0 ? `+${conMod}` : `${conMod}`;

      const lines: string[] = [
        `${character.name} spends a hit die (1d${character.hitDice.dieType}${conModStr}).`,
        `Healed ${healing} HP (${previousHp} → ${character.stats.hitPoints.current}/${character.stats.hitPoints.max}).`,
        `Hit Dice remaining: ${formatHitDice(character.hitDice)}`,
      ];

      return lines.join('\n');
    },
  };
}

/**
 * Create check rest status tool
 */
export function createCheckRestStatusTool(
  getContext: () => RestToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'check_rest_status',
      description: `Check the character's current HP, hit dice, and whether they would benefit from resting.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const { getPlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const hp = character.stats.hitPoints;
      const conMod = Math.floor((character.stats.abilityScores.constitution - 10) / 2);
      const conModStr = conMod >= 0 ? `+${conMod}` : `${conMod}`;

      const lines: string[] = [
        `=== ${character.name}'s REST STATUS ===`,
        `HP: ${hp.current}/${hp.max}`,
        `Hit Dice: ${formatHitDice(character.hitDice)}`,
        `CON Modifier: ${conModStr}`,
        ``,
      ];

      if (canBenefitFromShortRest(character)) {
        lines.push(`✓ Would benefit from SHORT REST (can spend hit dice)`);
      }

      if (canBenefitFromLongRest(character)) {
        lines.push(`✓ Would benefit from LONG REST`);
      }

      if (!canBenefitFromShortRest(character) && !canBenefitFromLongRest(character)) {
        lines.push(`Character is fully rested.`);
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create all rest tools
 */
export function createRestTools(
  getContext: () => RestToolContext
): ToolDefinition<any, any>[] {
  return [
    createShortRestTool(getContext),
    createLongRestTool(getContext),
    createSpendHitDieTool(getContext),
    createCheckRestStatusTool(getContext),
  ];
}
