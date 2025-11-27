/**
 * DM Tools for XP and leveling
 */

import type { ToolDefinition } from '../tools/tool-registry.js';
import type { CharacterSheet } from '@ai-dm/shared';
import {
  awardXP,
  canLevelUp,
  processLevelUp,
  formatXPProgress,
  getXPProgress,
  getXPForCR,
} from './xp-system.js';

/**
 * Context for XP tools
 */
export interface XPToolContext {
  getPlayerCharacter: () => CharacterSheet | undefined;
  updatePlayerCharacter: (character: CharacterSheet) => void;
}

/**
 * Create award XP tool
 */
export function createAwardXPTool(
  getContext: () => XPToolContext
): ToolDefinition<{ amount: number; reason?: string }, string> {
  return {
    tool: {
      name: 'award_xp',
      description: `Award experience points to the player character. Automatically checks for level up.`,
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Amount of XP to award',
          },
          reason: {
            type: 'string',
            description: 'Reason for the XP award (e.g., "Defeated goblin", "Clever puzzle solution")',
          },
        },
        required: ['amount'],
      },
    },
    handler: async ({ amount, reason }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (amount <= 0) {
        return 'XP amount must be positive.';
      }

      const previousXP = character.experience.current;
      const triggersLevelUp = awardXP(character, amount);
      updatePlayerCharacter(character);

      const lines: string[] = [];

      if (reason) {
        lines.push(`${character.name} earns ${amount.toLocaleString()} XP for: ${reason}`);
      } else {
        lines.push(`${character.name} earns ${amount.toLocaleString()} XP!`);
      }

      lines.push(`XP: ${previousXP.toLocaleString()} → ${character.experience.current.toLocaleString()}`);

      if (triggersLevelUp) {
        lines.push(``);
        lines.push(`🎉 LEVEL UP AVAILABLE! ${character.name} can advance to level ${character.level + 1}!`);
        lines.push(`Use the level_up tool to process the level up.`);
      } else {
        const progress = getXPProgress(character);
        lines.push(`Progress to next level: ${progress}%`);
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create award combat XP tool
 */
export function createAwardCombatXPTool(
  getContext: () => XPToolContext
): ToolDefinition<{ cr: string; enemyName?: string }, string> {
  return {
    tool: {
      name: 'award_combat_xp',
      description: `Award XP for defeating an enemy based on their Challenge Rating. Common CRs: 0, 1/8, 1/4, 1/2, 1, 2, 3, etc.`,
      parameters: {
        type: 'object',
        properties: {
          cr: {
            type: 'string',
            description: 'Challenge Rating of the defeated enemy (e.g., "1/4", "2", "5")',
          },
          enemyName: {
            type: 'string',
            description: 'Name of the defeated enemy for the log',
          },
        },
        required: ['cr'],
      },
    },
    handler: async ({ cr, enemyName }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const xpAmount = getXPForCR(cr);
      if (xpAmount === 0) {
        return `Unknown Challenge Rating: ${cr}. Use standard CR values (0, 1/8, 1/4, 1/2, 1, 2, 3, etc.)`;
      }

      const reason = enemyName ? `Defeated ${enemyName} (CR ${cr})` : `Defeated CR ${cr} enemy`;
      const triggersLevelUp = awardXP(character, xpAmount);
      updatePlayerCharacter(character);

      const lines: string[] = [
        `${character.name} earns ${xpAmount.toLocaleString()} XP for: ${reason}`,
        formatXPProgress(character),
      ];

      if (triggersLevelUp) {
        lines.push(``);
        lines.push(`🎉 LEVEL UP AVAILABLE!`);
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create check XP tool
 */
export function createCheckXPTool(
  getContext: () => XPToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'check_xp',
      description: `View the player character's current XP, level, and progress to next level.`,
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

      const progress = getXPProgress(character);
      const progressBar = createProgressBar(progress);

      const lines: string[] = [
        `=== ${character.name}'s EXPERIENCE ===`,
        `Level: ${character.level}`,
        `XP: ${character.experience.current.toLocaleString()}`,
      ];

      if (character.level < 20) {
        lines.push(`Next Level: ${character.experience.nextLevelAt.toLocaleString()} XP`);
        lines.push(`Progress: ${progressBar} ${progress}%`);

        if (canLevelUp(character)) {
          lines.push(``);
          lines.push(`✨ Ready to level up! Use the level_up tool.`);
        }
      } else {
        lines.push(`(Maximum level reached)`);
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create level up tool
 */
export function createLevelUpTool(
  getContext: () => XPToolContext
): ToolDefinition<{ rollForHp?: boolean }, string> {
  return {
    tool: {
      name: 'level_up',
      description: `Process a level up for the player character. By default takes average HP, set rollForHp to true to roll for HP instead.`,
      parameters: {
        type: 'object',
        properties: {
          rollForHp: {
            type: 'boolean',
            description: 'If true, roll for HP. If false, take the average (default: false)',
          },
        },
        required: [],
      },
    },
    handler: async ({ rollForHp }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (!canLevelUp(character)) {
        const xpNeeded = character.experience.nextLevelAt - character.experience.current;
        return `${character.name} doesn't have enough XP to level up. Need ${xpNeeded.toLocaleString()} more XP.`;
      }

      const result = processLevelUp(character, rollForHp ?? false);
      if (!result) {
        return 'Failed to process level up.';
      }

      updatePlayerCharacter(character);

      const lines: string[] = [
        `🎉 ${character.name} advances to LEVEL ${result.newLevel}!`,
        ``,
        `HP: +${result.hpGained} (new max: ${result.newMaxHp})`,
        `Hit Dice: +1 (now ${character.hitDice.max}d${character.hitDice.dieType})`,
      ];

      if (result.proficiencyBonus > (result.newLevel === 5 || result.newLevel === 9 || result.newLevel === 13 || result.newLevel === 17 ? result.proficiencyBonus - 1 : result.proficiencyBonus)) {
        // Proficiency increased at this level
      }
      lines.push(`Proficiency Bonus: +${result.proficiencyBonus}`);

      if (result.spellSlotsUpdated) {
        lines.push(`Spell slots updated for level ${result.newLevel}.`);
      }

      if (result.newFeatures.length > 0) {
        lines.push(``);
        lines.push(`New Features:`);
        for (const feature of result.newFeatures) {
          lines.push(`  • ${feature}`);
        }
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create a simple text progress bar
 */
function createProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

/**
 * Create all XP tools
 */
export function createXPTools(
  getContext: () => XPToolContext
): ToolDefinition<any, any>[] {
  return [
    createAwardXPTool(getContext),
    createAwardCombatXPTool(getContext),
    createCheckXPTool(getContext),
    createLevelUpTool(getContext),
  ];
}
