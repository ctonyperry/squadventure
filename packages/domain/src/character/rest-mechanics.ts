/**
 * Rest mechanics for D&D 5e - Short and Long rests
 */

import type { CharacterSheet, HitDice } from '@ai-dm/shared';
import { restoreAllSpellSlots } from '../magic/index.js';

/**
 * Hit die type by class
 */
export const CLASS_HIT_DIE: Record<string, 6 | 8 | 10 | 12> = {
  wizard: 6,
  sorcerer: 6,
  cleric: 8,
  bard: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  barbarian: 12,
};

/**
 * Create hit dice for a character
 */
export function createHitDice(
  className: string,
  level: number
): HitDice {
  const dieType = CLASS_HIT_DIE[className.toLowerCase()] ?? 8;
  return {
    current: level,
    max: level,
    dieType,
  };
}

/**
 * Roll a hit die for healing
 * Returns the amount healed
 */
export function rollHitDie(
  dieType: 6 | 8 | 10 | 12,
  constitutionModifier: number
): number {
  const roll = Math.floor(Math.random() * dieType) + 1;
  // Minimum of 1 HP regained
  return Math.max(1, roll + constitutionModifier);
}

/**
 * Spend a hit die during short rest
 * Returns the amount healed, or 0 if no hit dice available
 */
export function spendHitDie(character: CharacterSheet): number {
  if (character.hitDice.current <= 0) {
    return 0;
  }

  const conMod = Math.floor((character.stats.abilityScores.constitution - 10) / 2);
  const healing = rollHitDie(character.hitDice.dieType, conMod);

  // Consume the hit die
  character.hitDice.current--;

  // Apply healing (don't exceed max HP)
  const currentHp = character.stats.hitPoints.current;
  const maxHp = character.stats.hitPoints.max;
  const newHp = Math.min(currentHp + healing, maxHp);
  const actualHealing = newHp - currentHp;

  character.stats.hitPoints.current = newHp;

  return actualHealing;
}

/**
 * Result of a short rest
 */
export interface ShortRestResult {
  hitDiceSpent: number;
  hpHealed: number;
  newHp: number;
  hitDiceRemaining: number;
}

/**
 * Perform a short rest
 * Can optionally spend multiple hit dice
 */
export function performShortRest(
  character: CharacterSheet,
  hitDiceToSpend: number = 0
): ShortRestResult {
  const startHp = character.stats.hitPoints.current;
  let totalHealing = 0;
  let diceSpent = 0;

  // Spend requested hit dice
  const maxToSpend = Math.min(hitDiceToSpend, character.hitDice.current);
  for (let i = 0; i < maxToSpend; i++) {
    const healing = spendHitDie(character);
    if (healing > 0) {
      totalHealing += healing;
      diceSpent++;
    }
  }

  return {
    hitDiceSpent: diceSpent,
    hpHealed: totalHealing,
    newHp: character.stats.hitPoints.current,
    hitDiceRemaining: character.hitDice.current,
  };
}

/**
 * Result of a long rest
 */
export interface LongRestResult {
  hpRestored: number;
  hitDiceRecovered: number;
  spellSlotsRestored: boolean;
  newHp: number;
  hitDiceAvailable: number;
}

/**
 * Perform a long rest
 * - Restores all HP
 * - Recovers half of max hit dice (minimum 1)
 * - Restores all spell slots
 */
export function performLongRest(character: CharacterSheet): LongRestResult {
  const startHp = character.stats.hitPoints.current;
  const maxHp = character.stats.hitPoints.max;

  // Restore all HP
  character.stats.hitPoints.current = maxHp;
  const hpRestored = maxHp - startHp;

  // Recover half of max hit dice (minimum 1)
  const hitDiceToRecover = Math.max(1, Math.floor(character.hitDice.max / 2));
  const actualRecovered = Math.min(
    hitDiceToRecover,
    character.hitDice.max - character.hitDice.current
  );
  character.hitDice.current += actualRecovered;

  // Restore spell slots if character has spellcasting
  let spellSlotsRestored = false;
  if (character.spellcasting) {
    restoreAllSpellSlots(character.spellcasting);
    spellSlotsRestored = true;
  }

  return {
    hpRestored,
    hitDiceRecovered: actualRecovered,
    spellSlotsRestored,
    newHp: maxHp,
    hitDiceAvailable: character.hitDice.current,
  };
}

/**
 * Format hit dice for display
 */
export function formatHitDice(hitDice: HitDice): string {
  return `${hitDice.current}/${hitDice.max}d${hitDice.dieType}`;
}

/**
 * Check if character needs healing
 */
export function needsHealing(character: CharacterSheet): boolean {
  return character.stats.hitPoints.current < character.stats.hitPoints.max;
}

/**
 * Check if character can benefit from short rest
 */
export function canBenefitFromShortRest(character: CharacterSheet): boolean {
  return needsHealing(character) && character.hitDice.current > 0;
}

/**
 * Check if character can benefit from long rest
 */
export function canBenefitFromLongRest(character: CharacterSheet): boolean {
  const needsHp = needsHealing(character);
  const needsHitDice = character.hitDice.current < character.hitDice.max;
  const needsSpellSlots = character.spellcasting
    ? character.spellcasting.slots.current.some((c, i) => c < (character.spellcasting?.slots.max[i] ?? 0))
    : false;

  return needsHp || needsHitDice || needsSpellSlots;
}
