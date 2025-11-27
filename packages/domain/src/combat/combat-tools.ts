import type { EntityId, DiceRoll, AbilityScores } from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';
import type { ToolDefinition } from '../tools/tool-registry.js';
import type { CombatManager, Condition, AttackResult, SavingThrowResult } from './combat-manager.js';

/**
 * Context for combat tools
 */
export interface CombatToolContext {
  combatManager: CombatManager;
  getEntityStats: (id: EntityId) => {
    name: string;
    armorClass: number;
    hitPoints: { current: number; max: number };
    abilityScores: AbilityScores;
    proficiencyBonus?: number;
  } | null;
}

/**
 * Start combat tool
 */
export function createStartCombatTool(
  getContext: () => CombatToolContext
): ToolDefinition<
  { participants: Array<{ entityId: string; name: string; isPlayer: boolean }> },
  string
> {
  return {
    tool: {
      name: 'start_combat',
      description: `Start a combat encounter. Rolls initiative for all participants and establishes turn order.
Use this when combat begins. Provide all combatants (players and enemies).`,
      parameters: {
        type: 'object',
        properties: {
          participants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: { type: 'string', description: 'Entity ID' },
                name: { type: 'string', description: 'Display name' },
                isPlayer: { type: 'boolean', description: 'Whether this is a player character' },
              },
              required: ['entityId', 'name', 'isPlayer'],
            },
            description: 'All participants in the combat',
          },
        },
        required: ['participants'],
      },
    },
    handler: async ({ participants }) => {
      const { combatManager, getEntityStats } = getContext();

      const combatParticipants = participants.map((p) => {
        const entityId = createEntityId(p.entityId);
        const stats = getEntityStats(entityId);

        if (!stats) {
          throw new Error(`Entity ${p.entityId} not found`);
        }

        return {
          entityId,
          name: p.name,
          isPlayer: p.isPlayer,
          stats: {
            abilityScores: stats.abilityScores,
            armorClass: stats.armorClass,
            hitPoints: stats.hitPoints,
            speed: 30,
          },
        };
      });

      const state = combatManager.startCombat(combatParticipants);
      const current = combatManager.getCurrentParticipant();

      let result = '⚔️ COMBAT BEGINS!\n\nInitiative Order:\n';
      state.participants.forEach((p, i) => {
        const marker = i === 0 ? ' ← FIRST' : '';
        result += `  ${p.initiative}: ${p.name}${p.isPlayer ? ' (Player)' : ''}${marker}\n`;
      });
      result += `\nIt is ${current?.name}'s turn.`;

      return result;
    },
  };
}

/**
 * End combat tool
 */
export function createEndCombatTool(
  getContext: () => CombatToolContext
): ToolDefinition<{ reason?: string }, string> {
  return {
    tool: {
      name: 'end_combat',
      description: `End the current combat encounter. Use when combat is resolved (victory, defeat, flee, or negotiation).`,
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Why combat ended (victory, defeat, flee, surrender)',
          },
        },
        required: [],
      },
    },
    handler: async ({ reason }) => {
      const { combatManager } = getContext();
      combatManager.endCombat();
      return `⚔️ Combat has ended${reason ? `: ${reason}` : ''}.`;
    },
  };
}

/**
 * Next turn tool
 */
export function createNextTurnTool(
  getContext: () => CombatToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'next_turn',
      description: `Advance to the next combatant's turn. Use after a combatant completes their turn.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const { combatManager } = getContext();
      const state = combatManager.getState();

      if (!state) {
        return 'No combat is active.';
      }

      const next = combatManager.nextTurn();
      const newState = combatManager.getState();

      if (!next || !newState) {
        return 'Combat has ended.';
      }

      let result = '';
      if (newState.round > state.round) {
        result += `\n=== ROUND ${newState.round} ===\n\n`;
      }

      result += `It is now ${next.name}'s turn.`;

      if (next.conditions.length > 0) {
        result += `\nConditions: ${next.conditions.join(', ')}`;
      }

      return result;
    },
  };
}

/**
 * Attack roll tool
 */
export function createAttackRollTool(
  getContext: () => CombatToolContext
): ToolDefinition<
  {
    attackerId: string;
    targetId: string;
    attackBonus: number;
    damageNotation: string;
    damageType: string;
    advantage?: boolean;
    disadvantage?: boolean;
  },
  AttackResult
> {
  return {
    tool: {
      name: 'attack_roll',
      description: `Make an attack roll against a target. Automatically determines hit/miss and rolls damage on hit.
Handles advantage/disadvantage based on conditions. Use for melee and ranged attacks.`,
      parameters: {
        type: 'object',
        properties: {
          attackerId: { type: 'string', description: 'Entity ID of attacker' },
          targetId: { type: 'string', description: 'Entity ID of target' },
          attackBonus: { type: 'number', description: 'Total attack bonus (ability mod + proficiency + other)' },
          damageNotation: { type: 'string', description: 'Damage dice notation (e.g., "1d8+3", "2d6+4")' },
          damageType: { type: 'string', description: 'Type of damage (slashing, piercing, fire, etc.)' },
          advantage: { type: 'boolean', description: 'Force advantage on the roll' },
          disadvantage: { type: 'boolean', description: 'Force disadvantage on the roll' },
        },
        required: ['attackerId', 'targetId', 'attackBonus', 'damageNotation', 'damageType'],
      },
    },
    handler: async ({ attackerId, targetId, attackBonus, damageNotation, damageType, advantage, disadvantage }) => {
      const { combatManager } = getContext();

      const options: { advantage?: boolean; disadvantage?: boolean } = {};
      if (advantage !== undefined) options.advantage = advantage;
      if (disadvantage !== undefined) options.disadvantage = disadvantage;

      const result = combatManager.makeAttack(
        createEntityId(attackerId),
        createEntityId(targetId),
        attackBonus,
        damageNotation,
        damageType,
        options
      );

      return result;
    },
  };
}

/**
 * Saving throw tool
 */
export function createSavingThrowTool(
  getContext: () => CombatToolContext
): ToolDefinition<
  {
    entityId: string;
    ability: string;
    dc: number;
    advantage?: boolean;
    disadvantage?: boolean;
  },
  SavingThrowResult
> {
  return {
    tool: {
      name: 'saving_throw',
      description: `Make a saving throw for an entity. Use for spell effects, hazards, or other situations requiring a save.`,
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Entity ID making the save' },
          ability: { type: 'string', enum: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'], description: 'Ability for the save' },
          dc: { type: 'number', description: 'Difficulty Class to meet or beat' },
          advantage: { type: 'boolean', description: 'Has advantage on the save' },
          disadvantage: { type: 'boolean', description: 'Has disadvantage on the save' },
        },
        required: ['entityId', 'ability', 'dc'],
      },
    },
    handler: async ({ entityId, ability, dc, advantage, disadvantage }) => {
      const { combatManager } = getContext();

      const options: { advantage?: boolean; disadvantage?: boolean } = {};
      if (advantage !== undefined) options.advantage = advantage;
      if (disadvantage !== undefined) options.disadvantage = disadvantage;

      const result = combatManager.makeSavingThrow(
        createEntityId(entityId),
        ability as keyof AbilityScores,
        dc,
        options
      );

      return result;
    },
  };
}

/**
 * Apply condition tool
 */
export function createApplyConditionTool(
  getContext: () => CombatToolContext
): ToolDefinition<{ entityId: string; condition: string }, string> {
  return {
    tool: {
      name: 'apply_condition',
      description: `Apply a condition to a combatant (blinded, prone, stunned, etc.). Returns the condition's effects.`,
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Entity ID to apply condition to' },
          condition: {
            type: 'string',
            enum: [
              'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
              'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
              'prone', 'restrained', 'stunned', 'unconscious', 'concentrating',
            ],
            description: 'Condition to apply',
          },
        },
        required: ['entityId', 'condition'],
      },
    },
    handler: async ({ entityId, condition }) => {
      const { combatManager } = getContext();
      return combatManager.applyCondition(createEntityId(entityId), condition as Condition);
    },
  };
}

/**
 * Remove condition tool
 */
export function createRemoveConditionTool(
  getContext: () => CombatToolContext
): ToolDefinition<{ entityId: string; condition: string }, string> {
  return {
    tool: {
      name: 'remove_condition',
      description: `Remove a condition from a combatant.`,
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Entity ID to remove condition from' },
          condition: { type: 'string', description: 'Condition to remove' },
        },
        required: ['entityId', 'condition'],
      },
    },
    handler: async ({ entityId, condition }) => {
      const { combatManager } = getContext();
      return combatManager.removeCondition(createEntityId(entityId), condition as Condition);
    },
  };
}

/**
 * Apply damage tool
 */
export function createApplyDamageTool(
  getContext: () => CombatToolContext
): ToolDefinition<{ entityId: string; damage: number }, string> {
  return {
    tool: {
      name: 'apply_damage',
      description: `Apply damage to a combatant. Tracks HP and applies unconscious/death as appropriate.`,
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Entity ID to damage' },
          damage: { type: 'number', description: 'Amount of damage to apply' },
        },
        required: ['entityId', 'damage'],
      },
    },
    handler: async ({ entityId, damage }) => {
      const { combatManager } = getContext();
      return combatManager.applyDamage(createEntityId(entityId), damage);
    },
  };
}

/**
 * Apply healing tool
 */
export function createApplyHealingTool(
  getContext: () => CombatToolContext
): ToolDefinition<{ entityId: string; healing: number }, string> {
  return {
    tool: {
      name: 'apply_healing',
      description: `Apply healing to a combatant. Cannot exceed max HP.`,
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Entity ID to heal' },
          healing: { type: 'number', description: 'Amount of healing to apply' },
        },
        required: ['entityId', 'healing'],
      },
    },
    handler: async ({ entityId, healing }) => {
      const { combatManager } = getContext();
      return combatManager.applyHealing(createEntityId(entityId), healing);
    },
  };
}

/**
 * Get combat status tool
 */
export function createCombatStatusTool(
  getContext: () => CombatToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'combat_status',
      description: `Get the current combat status including initiative order, HP, and conditions.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const { combatManager } = getContext();
      return combatManager.getSummary();
    },
  };
}
