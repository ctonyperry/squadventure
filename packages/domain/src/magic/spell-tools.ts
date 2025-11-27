/**
 * DM Tools for spellcasting
 */

import type { ToolDefinition } from '../tools/tool-registry.js';
import type { CharacterSheet, CharacterSpellcasting } from '@ai-dm/shared';
import {
  canCastSpell,
  consumeSpellSlot,
  formatSpellSlots,
} from './spell-slots.js';

/**
 * Context for spell tools
 */
export interface SpellToolContext {
  getPlayerCharacter: () => CharacterSheet | undefined;
  updatePlayerCharacter: (character: CharacterSheet) => void;
}

/**
 * Create cast spell tool
 */
export function createCastSpellTool(
  getContext: () => SpellToolContext
): ToolDefinition<{ spellName: string; spellLevel: number; upcastLevel?: number }, string> {
  return {
    tool: {
      name: 'cast_spell',
      description: `Cast a spell, consuming the appropriate spell slot. For cantrips, spellLevel should be 0. Use upcastLevel to cast at a higher level than the spell's base level.`,
      parameters: {
        type: 'object',
        properties: {
          spellName: {
            type: 'string',
            description: 'Name of the spell being cast',
          },
          spellLevel: {
            type: 'number',
            description: 'Base level of the spell (0 for cantrips)',
          },
          upcastLevel: {
            type: 'number',
            description: 'Level to cast the spell at (for upcasting)',
          },
        },
        required: ['spellName', 'spellLevel'],
      },
    },
    handler: async ({ spellName, spellLevel, upcastLevel }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (!character.spellcasting) {
        return `${character.name} cannot cast spells.`;
      }

      const castLevel = upcastLevel ?? spellLevel;

      // Validate upcast level
      if (castLevel < spellLevel) {
        return `Cannot cast ${spellName} at a level lower than its base level (${spellLevel}).`;
      }

      // Check if can cast
      if (!canCastSpell(character.spellcasting, castLevel)) {
        if (castLevel === 0) {
          return `${character.name} doesn't know the ${spellName} cantrip.`;
        }
        return `${character.name} has no ${castLevel}${getOrdinalSuffix(castLevel)} level spell slots remaining.`;
      }

      // Consume the slot
      if (castLevel > 0) {
        consumeSpellSlot(character.spellcasting, castLevel);
        updatePlayerCharacter(character);
      }

      // Build response
      let response = `${character.name} casts ${spellName}`;
      if (castLevel === 0) {
        response += ' (cantrip).';
      } else if (upcastLevel && upcastLevel > spellLevel) {
        response += ` at ${castLevel}${getOrdinalSuffix(castLevel)} level (upcast from ${spellLevel}${getOrdinalSuffix(spellLevel)}).`;
        const remaining = character.spellcasting.slots.current[castLevel - 1];
        response += ` (${remaining} ${castLevel}${getOrdinalSuffix(castLevel)} level slots remaining)`;
      } else {
        response += ` at ${castLevel}${getOrdinalSuffix(castLevel)} level.`;
        const remaining = character.spellcasting.slots.current[castLevel - 1];
        response += ` (${remaining} ${castLevel}${getOrdinalSuffix(castLevel)} level slots remaining)`;
      }

      return response;
    },
  };
}

/**
 * Create check spell slots tool
 */
export function createCheckSpellSlotsTool(
  getContext: () => SpellToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'check_spell_slots',
      description: `View the player character's current spell slots, spellcasting ability, and prepared spells.`,
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

      if (!character.spellcasting) {
        return `${character.name} cannot cast spells.`;
      }

      return formatSpellSlots(character.spellcasting);
    },
  };
}

/**
 * Create prepare spells tool
 */
export function createPrepareSpellsTool(
  getContext: () => SpellToolContext
): ToolDefinition<{ spells: string[] }, string> {
  return {
    tool: {
      name: 'prepare_spells',
      description: `Set the list of prepared spells for a prepared caster (Wizard, Cleric, etc.). This replaces the current prepared spell list.`,
      parameters: {
        type: 'object',
        properties: {
          spells: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of spell names to prepare',
          },
        },
        required: ['spells'],
      },
    },
    handler: async ({ spells }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (!character.spellcasting) {
        return `${character.name} cannot cast spells.`;
      }

      const maxPrepared = character.spellcasting.maxPreparedSpells;
      if (spells.length > maxPrepared) {
        return `Cannot prepare ${spells.length} spells. Maximum is ${maxPrepared}.`;
      }

      character.spellcasting.preparedSpells = [...spells];
      updatePlayerCharacter(character);

      return `${character.name} has prepared ${spells.length} spells:\n${spells.map(s => `  • ${s}`).join('\n')}`;
    },
  };
}

/**
 * Create add cantrip tool
 */
export function createLearnCantripTool(
  getContext: () => SpellToolContext
): ToolDefinition<{ cantrip: string }, string> {
  return {
    tool: {
      name: 'learn_cantrip',
      description: `Add a cantrip to the character's known cantrips.`,
      parameters: {
        type: 'object',
        properties: {
          cantrip: {
            type: 'string',
            description: 'Name of the cantrip to learn',
          },
        },
        required: ['cantrip'],
      },
    },
    handler: async ({ cantrip }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      if (!character.spellcasting) {
        return `${character.name} cannot cast spells.`;
      }

      if (character.spellcasting.cantripsKnown.includes(cantrip)) {
        return `${character.name} already knows ${cantrip}.`;
      }

      character.spellcasting.cantripsKnown.push(cantrip);
      updatePlayerCharacter(character);

      return `${character.name} learned the ${cantrip} cantrip.`;
    },
  };
}

/**
 * Get ordinal suffix for a number
 */
function getOrdinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

/**
 * Create all spell tools
 */
export function createSpellTools(
  getContext: () => SpellToolContext
): ToolDefinition<any, any>[] {
  return [
    createCastSpellTool(getContext),
    createCheckSpellSlotsTool(getContext),
    createPrepareSpellsTool(getContext),
    createLearnCantripTool(getContext),
  ];
}
