/**
 * Spell slot progression tables for D&D 5e caster classes
 */

import type { SpellSlots, CharacterSpellcasting, AbilityScores } from '@ai-dm/shared';

/**
 * Spell slot progression by level for full casters (Wizard, Cleric, etc.)
 * Index is character level - 1, value is array of slots per spell level
 */
export const FULL_CASTER_SLOTS: SpellSlots['max'][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 3
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 4
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 5
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 6
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 8
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 9
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 10
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // Level 11
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // Level 12
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // Level 13
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // Level 14
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // Level 15
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // Level 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // Level 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // Level 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // Level 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // Level 20
];

/**
 * Half caster progression (Paladin, Ranger) - starts at level 2
 */
export const HALF_CASTER_SLOTS: SpellSlots['max'][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1 (no spells)
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 3
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 4
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 5
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 6
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 7
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 8
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 9
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 10
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 11
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 12
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 13
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 14
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 15
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 16
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 17
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 18
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 19
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 20
];

/**
 * Spellcasting ability by class
 */
export const CLASS_SPELLCASTING_ABILITY: Record<string, keyof AbilityScores> = {
  wizard: 'intelligence',
  cleric: 'wisdom',
  druid: 'wisdom',
  bard: 'charisma',
  sorcerer: 'charisma',
  warlock: 'charisma',
  paladin: 'charisma',
  ranger: 'wisdom',
};

/**
 * Caster type by class
 */
export type CasterType = 'full' | 'half' | 'none';

export const CLASS_CASTER_TYPE: Record<string, CasterType> = {
  wizard: 'full',
  cleric: 'full',
  druid: 'full',
  bard: 'full',
  sorcerer: 'full',
  warlock: 'full', // Actually pact magic, but simplified
  paladin: 'half',
  ranger: 'half',
  fighter: 'none',
  rogue: 'none',
  barbarian: 'none',
  monk: 'none',
};

/**
 * Cantrips known by level for various classes
 */
export const WIZARD_CANTRIPS_KNOWN: number[] = [
  3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
];

export const CLERIC_CANTRIPS_KNOWN: number[] = [
  3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
];

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
  const casterType = CLASS_CASTER_TYPE[className.toLowerCase()] ?? 'none';

  if (casterType === 'none' || level < 1) {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  const clampedLevel = Math.min(level, 20);
  const progression = casterType === 'full' ? FULL_CASTER_SLOTS : HALF_CASTER_SLOTS;

  return progression[clampedLevel - 1] ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/**
 * Calculate spell save DC
 */
export function calculateSpellSaveDC(
  abilityScore: number,
  proficiencyBonus: number
): number {
  const abilityMod = Math.floor((abilityScore - 10) / 2);
  return 8 + proficiencyBonus + abilityMod;
}

/**
 * Calculate spell attack bonus
 */
export function calculateSpellAttackBonus(
  abilityScore: number,
  proficiencyBonus: number
): number {
  const abilityMod = Math.floor((abilityScore - 10) / 2);
  return proficiencyBonus + abilityMod;
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
  const casterType = CLASS_CASTER_TYPE[className.toLowerCase()];
  if (!casterType || casterType === 'none') {
    return undefined;
  }

  const spellcastingAbility = CLASS_SPELLCASTING_ABILITY[className.toLowerCase()];
  if (!spellcastingAbility) {
    return undefined;
  }

  const abilityScore = abilityScores[spellcastingAbility];
  const maxSlots = getSpellSlotsForClass(className, level);

  // Calculate max prepared spells for prepared casters
  const abilityMod = Math.floor((abilityScore - 10) / 2);
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
