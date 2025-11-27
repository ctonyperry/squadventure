/**
 * Magic module - spell slots, spellcasting tools
 */

export {
  // Spell slot progression tables
  FULL_CASTER_SLOTS,
  HALF_CASTER_SLOTS,
  CLASS_SPELLCASTING_ABILITY,
  CLASS_CASTER_TYPE,
  WIZARD_CANTRIPS_KNOWN,
  CLERIC_CANTRIPS_KNOWN,
  // Types
  type CasterType,
  // Functions
  createEmptySpellSlots,
  getSpellSlotsForClass,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  createSpellcasting,
  canCastSpell,
  consumeSpellSlot,
  restoreAllSpellSlots,
  restoreSpellSlotLevels,
  formatSpellSlots,
} from './spell-slots.js';

export {
  type SpellToolContext,
  createCastSpellTool,
  createCheckSpellSlotsTool,
  createPrepareSpellsTool,
  createLearnCantripTool,
  createSpellTools,
} from './spell-tools.js';
