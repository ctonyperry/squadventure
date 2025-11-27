/**
 * Spell slot progression tables for D&D 5e caster classes
 *
 * Delegates to GameSystem for all data lookups.
 */

import type { SpellSlots, CharacterSpellcasting, AbilityScores } from '@ai-dm/shared';
import { getDnd5eSystem } from '../system/index.js';

/**
 * Get the game system singleton
 */
const getSystem = () => getDnd5eSystem();

/**
 * Caster type - re-export from system
 */
export type CasterType = 'full' | 'half' | 'none';

/**
 * Full caster spell slots - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().magic.fullCasterSlots instead
 */
export const FULL_CASTER_SLOTS = new Proxy([] as SpellSlots['max'][], {
  get: (_, prop) => {
    if (prop === 'length') return 20;
    const idx = Number(prop);
    if (!isNaN(idx)) return getSystem().magic.fullCasterSlots[idx];
    return undefined;
  },
});

/**
 * Half caster spell slots - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().magic.halfCasterSlots instead
 */
export const HALF_CASTER_SLOTS = new Proxy([] as SpellSlots['max'][], {
  get: (_, prop) => {
    if (prop === 'length') return 20;
    const idx = Number(prop);
    if (!isNaN(idx)) return getSystem().magic.halfCasterSlots[idx];
    return undefined;
  },
});

/**
 * Spellcasting ability by class - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().magic.spellcastingAbility instead
 */
export const CLASS_SPELLCASTING_ABILITY = new Proxy({} as Record<string, keyof AbilityScores>, {
  get: (_, key: string) => getSystem().magic.spellcastingAbility[key],
  ownKeys: () => Object.keys(getSystem().magic.spellcastingAbility),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getSystem().magic.spellcastingAbility[key as string],
  }),
});

/**
 * Caster type by class - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().magic.casterTypes instead
 */
export const CLASS_CASTER_TYPE = new Proxy({} as Record<string, CasterType>, {
  get: (_, key: string) => getSystem().magic.casterTypes[key],
  ownKeys: () => Object.keys(getSystem().magic.casterTypes),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getSystem().magic.casterTypes[key as string],
  }),
});

/**
 * Cantrips known by level for wizard - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().magic.cantripsKnown.wizard instead
 */
export const WIZARD_CANTRIPS_KNOWN = new Proxy([] as number[], {
  get: (_, prop) => {
    if (prop === 'length') return 20;
    const idx = Number(prop);
    if (!isNaN(idx)) return getSystem().magic.cantripsKnown['wizard']?.[idx];
    return undefined;
  },
});

/**
 * Cantrips known by level for cleric - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().magic.cantripsKnown.cleric instead
 */
export const CLERIC_CANTRIPS_KNOWN = new Proxy([] as number[], {
  get: (_, prop) => {
    if (prop === 'length') return 20;
    const idx = Number(prop);
    if (!isNaN(idx)) return getSystem().magic.cantripsKnown['cleric']?.[idx];
    return undefined;
  },
});

/**
 * Create empty spell slots
 */
export function createEmptySpellSlots(): SpellSlots {
  return {
    current: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    max: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/**
 * Get spell slots for a class at a given level
 */
export function getSpellSlotsForClass(
  className: string,
  level: number
): SpellSlots['max'] {
  const system = getSystem();
  return system.magic.getSpellSlots(className, level) as SpellSlots['max'];
}

/**
 * Calculate spell save DC
 */
export function calculateSpellSaveDC(
  abilityScore: number,
  proficiencyBonus: number
): number {
  return getSystem().combat.calculateSpellSaveDC(abilityScore, proficiencyBonus);
}

/**
 * Calculate spell attack bonus
 */
export function calculateSpellAttackBonus(
  abilityScore: number,
  proficiencyBonus: number
): number {
  return getSystem().combat.calculateSpellAttackBonus(abilityScore, proficiencyBonus);
}

/**
 * Create spellcasting for a character
 */
export function createSpellcasting(
  className: string,
  level: number,
  abilityScores: AbilityScores,
  proficiencyBonus: number
): CharacterSpellcasting | undefined {
  const system = getSystem();
  const casterType = system.magic.getCasterType(className);
  if (casterType === 'none') {
    return undefined;
  }

  const spellcastingAbility = system.magic.getSpellcastingAbility(className);
  if (!spellcastingAbility) {
    return undefined;
  }

  const abilityScore = abilityScores[spellcastingAbility];
  const maxSlots = getSpellSlotsForClass(className, level);

  // Calculate max prepared spells for prepared casters
  const abilityMod = system.calculateAbilityModifier(abilityScore);
  const maxPrepared = Math.max(1, level + abilityMod);

  return {
    ability: spellcastingAbility,
    spellSaveDC: calculateSpellSaveDC(abilityScore, proficiencyBonus),
    spellAttackBonus: calculateSpellAttackBonus(abilityScore, proficiencyBonus),
    slots: {
      current: [...maxSlots] as SpellSlots['current'],
      max: maxSlots,
    },
    cantripsKnown: [],
    spellsKnown: [],
    preparedSpells: [],
    maxPreparedSpells: maxPrepared,
  };
}

/**
 * Check if a character can cast a spell at a given level
 */
export function canCastSpell(
  spellcasting: CharacterSpellcasting,
  spellLevel: number
): boolean {
  if (spellLevel === 0) {
    return true; // Cantrips are always castable
  }

  if (spellLevel < 1 || spellLevel > 9) {
    return false;
  }

  const currentSlots = spellcasting.slots.current[spellLevel - 1];
  return currentSlots !== undefined && currentSlots > 0;
}

/**
 * Consume a spell slot
 */
export function consumeSpellSlot(
  spellcasting: CharacterSpellcasting,
  spellLevel: number
): boolean {
  if (spellLevel === 0) {
    return true; // Cantrips don't consume slots
  }

  if (spellLevel < 1 || spellLevel > 9) {
    return false;
  }

  const slotIndex = spellLevel - 1;
  const currentSlots = spellcasting.slots.current[slotIndex];
  if (currentSlots === undefined || currentSlots <= 0) {
    return false;
  }

  // TypeScript tuple indexing workaround - we validated the index is 0-8 above
  const slots = spellcasting.slots.current;
  slots[slotIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]--;
  return true;
}

/**
 * Restore all spell slots to maximum
 */
export function restoreAllSpellSlots(spellcasting: CharacterSpellcasting): void {
  spellcasting.slots.current = [...spellcasting.slots.max] as SpellSlots['current'];
}

/**
 * Restore specific number of spell slot levels (for Arcane Recovery, etc.)
 */
export function restoreSpellSlotLevels(
  spellcasting: CharacterSpellcasting,
  totalLevels: number,
  maxSpellLevel: number = 5
): number {
  let levelsRestored = 0;
  let remaining = totalLevels;

  // Restore highest level slots first (up to maxSpellLevel)
  for (let level = Math.min(maxSpellLevel, 9); level >= 1 && remaining > 0; level--) {
    const slotIndex = level - 1;
    const maxSlot = spellcasting.slots.max[slotIndex] ?? 0;
    const currentSlot = spellcasting.slots.current[slotIndex] ?? 0;
    const missing = maxSlot - currentSlot;

    if (missing > 0 && remaining >= level) {
      const toRestore = Math.min(missing, Math.floor(remaining / level));
      // TypeScript tuple indexing workaround - slotIndex is 0-8
      const slots = spellcasting.slots.current;
      slots[slotIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] += toRestore;
      remaining -= toRestore * level;
      levelsRestored += toRestore * level;
    }
  }

  return levelsRestored;
}

/**
 * Format spell slots for display
 */
export function formatSpellSlots(spellcasting: CharacterSpellcasting): string {
  const lines: string[] = ['=== SPELL SLOTS ==='];
  lines.push(`Spellcasting Ability: ${spellcasting.ability.toUpperCase()}`);
  lines.push(`Spell Save DC: ${spellcasting.spellSaveDC}`);
  lines.push(`Spell Attack: +${spellcasting.spellAttackBonus}`);
  lines.push('');

  let hasSlots = false;
  for (let i = 0; i < 9; i++) {
    const max = spellcasting.slots.max[i] ?? 0;
    if (max > 0) {
      hasSlots = true;
      const current = spellcasting.slots.current[i] ?? 0;
      const level = i + 1;
      const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
      lines.push(`${level}${suffix} Level: ${'●'.repeat(current)}${'○'.repeat(max - current)} (${current}/${max})`);
    }
  }

  if (!hasSlots) {
    lines.push('No spell slots available.');
  }

  if (spellcasting.preparedSpells.length > 0) {
    lines.push('');
    lines.push(`Prepared Spells (${spellcasting.preparedSpells.length}/${spellcasting.maxPreparedSpells}):`);
    for (const spell of spellcasting.preparedSpells) {
      lines.push(`  • ${spell}`);
    }
  }

  return lines.join('\n');
}
