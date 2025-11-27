/**
 * DM Tools for death saving throws
 */

import type { ToolDefinition } from '../tools/tool-registry.js';
import type { CharacterSheet } from '@ai-dm/shared';
import {
  makeDeathSave,
  stabilize,
  formatDeathSaves,
  isDying,
  isDead,
  isUnconscious,
  getZeroHPStatus,
  applyDamageWhileDying,
} from './death-saves.js';

/**
 * Context for death save tools
 */
export interface DeathSaveToolContext {
  getPlayerCharacter: () => CharacterSheet | undefined;
  updatePlayerCharacter: (character: CharacterSheet) => void;
}

/**
 * Create death save tool
 */
export function createDeathSaveTool(
  getContext: () => DeathSaveToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'death_save',
      description: `Make a death saving throw for a character at 0 HP. Roll d20: 10+ success, 9- failure. Nat 20 regains 1 HP, Nat 1 counts as 2 failures.`,
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

      if (character.stats.hitPoints.current > 0) {
        return `${character.name} is not at 0 HP. Death saves are only needed when dying.`;
      }

      if (isDead(character)) {
        return `${character.name} is already dead.`;
      }

      if (isUnconscious(character)) {
        return `${character.name} is stable and unconscious. No death save needed unless they take damage.`;
      }

      const result = makeDeathSave(character);
      updatePlayerCharacter(character);

      const lines: string[] = [];

      // Describe the roll
      lines.push(`${character.name} makes a death saving throw...`);
      lines.push(`🎲 Rolled: ${result.roll}`);

      if (result.criticalSuccess) {
        lines.push(`💫 NATURAL 20! ${character.name} regains 1 HP and becomes conscious!`);
      } else if (result.criticalFailure) {
        lines.push(`💀 NATURAL 1! This counts as TWO failures!`);
      } else if (result.success) {
        lines.push(`✓ Success!`);
      } else {
        lines.push(`✗ Failure!`);
      }

      // Show current state
      if (result.outcome === 'dead') {
        lines.push(``);
        lines.push(`☠️ ${character.name} has DIED. (3 failures)`);
      } else if (result.outcome === 'stabilized') {
        lines.push(``);
        lines.push(`💤 ${character.name} has STABILIZED! (3 successes)`);
        lines.push(`They remain unconscious at 0 HP but are no longer dying.`);
      } else if (result.outcome === 'regained_consciousness') {
        lines.push(``);
        lines.push(`${character.name} is back in the fight with 1 HP!`);
      } else {
        lines.push(``);
        lines.push(`Successes: ${result.totalSuccesses}/3 | Failures: ${result.totalFailures}/3`);
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create stabilize tool
 */
export function createStabilizeTool(
  getContext: () => DeathSaveToolContext
): ToolDefinition<{ medicineCheck?: number }, string> {
  return {
    tool: {
      name: 'stabilize',
      description: `Attempt to stabilize a dying creature. Requires a DC 10 Wisdom (Medicine) check, or automatically succeeds with Spare the Dying or similar magic.`,
      parameters: {
        type: 'object',
        properties: {
          medicineCheck: {
            type: 'number',
            description: 'The result of the Medicine check (DC 10). Omit for automatic success (magic)',
          },
        },
        required: [],
      },
    },
    handler: async ({ medicineCheck }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const status = getZeroHPStatus(character);

      if (status === 'conscious') {
        return `${character.name} is conscious and doesn't need stabilization.`;
      }

      if (status === 'dead') {
        return `${character.name} is dead and cannot be stabilized.`;
      }

      if (status === 'stable') {
        return `${character.name} is already stable.`;
      }

      // Check if Medicine check passes (if provided)
      if (medicineCheck !== undefined && medicineCheck < 10) {
        return `Medicine check failed (${medicineCheck} vs DC 10). ${character.name} remains dying.`;
      }

      const success = stabilize(character);
      updatePlayerCharacter(character);

      if (success) {
        const method = medicineCheck !== undefined
          ? `with a successful Medicine check (${medicineCheck})`
          : `with magical healing`;
        return `${character.name} has been STABILIZED ${method}!\nThey remain unconscious at 0 HP but are no longer dying.`;
      } else {
        return `Failed to stabilize ${character.name}.`;
      }
    },
  };
}

/**
 * Create check death saves tool
 */
export function createCheckDeathSavesTool(
  getContext: () => DeathSaveToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'check_death_saves',
      description: `Check the current death save status of the player character.`,
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

      return formatDeathSaves(character);
    },
  };
}

/**
 * Create damage while dying tool
 */
export function createDamageWhileDyingTool(
  getContext: () => DeathSaveToolContext
): ToolDefinition<{ damage: number; isCritical?: boolean }, string> {
  return {
    tool: {
      name: 'damage_while_dying',
      description: `Apply damage to a character at 0 HP. This causes death save failures. Critical hits cause 2 failures. Massive damage (>= max HP) causes instant death.`,
      parameters: {
        type: 'object',
        properties: {
          damage: {
            type: 'number',
            description: 'Amount of damage dealt',
          },
          isCritical: {
            type: 'boolean',
            description: 'Whether this was a critical hit (causes 2 failures)',
          },
        },
        required: ['damage'],
      },
    },
    handler: async ({ damage, isCritical }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (character.stats.hitPoints.current > 0) {
        return `${character.name} is not at 0 HP. Use regular damage for conscious characters.`;
      }

      if (isDead(character)) {
        return `${character.name} is already dead.`;
      }

      const result = applyDamageWhileDying(character, damage, isCritical ?? false);
      updatePlayerCharacter(character);

      const lines: string[] = [
        `${character.name} takes ${damage} damage while dying!`,
      ];

      if (damage >= character.stats.hitPoints.max) {
        lines.push(`☠️ MASSIVE DAMAGE! (${damage} >= ${character.stats.hitPoints.max} max HP)`);
        lines.push(`${character.name} is INSTANTLY KILLED!`);
      } else if (result.dead) {
        lines.push(`This causes ${result.failuresAdded} death save failure${result.failuresAdded > 1 ? 's' : ''}.`);
        lines.push(`☠️ ${character.name} has DIED! (3 failures reached)`);
      } else {
        lines.push(`This causes ${result.failuresAdded} death save failure${result.failuresAdded > 1 ? 's' : ''}.`);
        lines.push(``);
        lines.push(formatDeathSaves(character));
      }

      return lines.join('\n');
    },
  };
}

/**
 * Create all death save tools
 */
export function createDeathSaveTools(
  getContext: () => DeathSaveToolContext
): ToolDefinition<any, any>[] {
  return [
    createDeathSaveTool(getContext),
    createStabilizeTool(getContext),
    createCheckDeathSavesTool(getContext),
    createDamageWhileDyingTool(getContext),
  ];
}
