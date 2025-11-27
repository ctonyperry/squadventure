/**
 * D&D 5e Experience Point and Leveling System
 *
 * Delegates to GameSystem for all data lookups.
 */

import type { CharacterSheet, CharacterExperience } from '@ai-dm/shared';
import { getSpellSlotsForClass } from '../magic/index.js';
import { getDnd5eSystem } from '../system/index.js';

/**
 * Get the game system singleton
 */
const getSystem = () => getDnd5eSystem();

/**
 * XP thresholds - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().progression.xpThresholds instead
 */
export const XP_THRESHOLDS = new Proxy([] as number[], {
  get: (_, prop) => {
    if (prop === 'length') return 20;
    const idx = Number(prop);
    if (!isNaN(idx)) return getSystem().progression.xpThresholds[idx];
    return undefined;
  },
});

/**
 * Proficiency bonus by level - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().progression.proficiencyByLevel instead
 */
export const PROFICIENCY_BONUS_BY_LEVEL = new Proxy([] as number[], {
  get: (_, prop) => {
    if (prop === 'length') return 20;
    const idx = Number(prop);
    if (!isNaN(idx)) return getSystem().progression.proficiencyByLevel[idx];
    return undefined;
  },
});

/**
 * XP rewards by CR - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().progression.crXpRewards instead
 */
export const CR_XP_REWARDS = new Proxy({} as Record<string, number>, {
  get: (_, key: string) => getSystem().progression.crXpRewards[key],
  ownKeys: () => Object.keys(getSystem().progression.crXpRewards),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getSystem().progression.crXpRewards[key as string],
  }),
});

/**
 * Get XP threshold for a level
 */
export function getXPThreshold(level: number): number {
  return getSystem().progression.getXPThreshold(level);
}

/**
 * Get XP needed for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  return getSystem().progression.getXPForNextLevel(currentLevel);
}

/**
 * Get proficiency bonus for a level
 */
export function getProficiencyBonus(level: number): number {
  return getSystem().progression.getProficiencyBonus(level);
}

/**
 * Get XP reward for a CR
 */
export function getXPForCR(cr: string | number): number {
  return getSystem().progression.getXPForCR(cr);
}

/**
 * Create initial experience for a character
 */
export function createExperience(level: number = 1): CharacterExperience {
  return {
    current: getXPThreshold(level),
    nextLevelAt: getXPForNextLevel(level),
  };
}

/**
 * Check if character can level up
 */
export function canLevelUp(character: CharacterSheet): boolean {
  if (character.level >= 20) {
    return false;
  }
  return character.experience.current >= character.experience.nextLevelAt;
}

/**
 * Award XP to a character
 * Returns true if the character leveled up
 */
export function awardXP(character: CharacterSheet, xp: number): boolean {
  character.experience.current += xp;
  return canLevelUp(character);
}

/**
 * Level up result
 */
export interface LevelUpResult {
  newLevel: number;
  hpGained: number;
  newMaxHp: number;
  proficiencyBonus: number;
  newFeatures: string[];
  spellSlotsUpdated: boolean;
  hitDiceGained: number;
}

/**
 * Roll a hit die for level-up HP
 */
function rollHitDie(dieType: number): number {
  return Math.floor(Math.random() * dieType) + 1;
}

/**
 * Get average HP for a hit die (used for "take average" option)
 */
function getAverageHitDieRoll(dieType: number): number {
  // 5e uses average rounded up: (die/2) + 1
  return Math.floor(dieType / 2) + 1;
}

/**
 * Process a level up
 * @param character The character to level up
 * @param rollForHp If true, roll for HP. If false, take the average
 */
export function processLevelUp(
  character: CharacterSheet,
  rollForHp: boolean = false
): LevelUpResult | null {
  if (!canLevelUp(character)) {
    return null;
  }

  const oldLevel = character.level;
  const newLevel = oldLevel + 1;

  // Update level
  character.level = newLevel;
  character.experience.nextLevelAt = getXPForNextLevel(newLevel);

  // Calculate HP gain
  const hitDie = character.hitDice.dieType;
  const conMod = Math.floor((character.stats.abilityScores.constitution - 10) / 2);
  const hpRoll = rollForHp ? rollHitDie(hitDie) : getAverageHitDieRoll(hitDie);
  const hpGained = Math.max(1, hpRoll + conMod); // Minimum 1 HP per level

  // Update HP
  character.stats.hitPoints.max += hpGained;
  character.stats.hitPoints.current += hpGained; // Also heal by the amount gained

  // Update hit dice
  character.hitDice.max = newLevel;
  character.hitDice.current += 1; // Gain one hit die

  // Update proficiency bonus
  const newProfBonus = getProficiencyBonus(newLevel);
  character.stats.proficiencyBonus = newProfBonus;

  // Get class data from GameSystem
  const system = getSystem();
  const classKey = Object.entries(system.classes).find(
    ([_, c]) => c.name === character.class
  )?.[0];

  // Update spellcasting if applicable
  let spellSlotsUpdated = false;
  if (character.spellcasting && classKey) {
    const newSlots = getSpellSlotsForClass(classKey, newLevel);
    character.spellcasting.slots.max = newSlots;
    // Current slots stay the same (not auto-restored on level up)

    // Update spell save DC and attack bonus
    const abilityScore = character.stats.abilityScores[character.spellcasting.ability];
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    character.spellcasting.spellSaveDC = 8 + newProfBonus + abilityMod;
    character.spellcasting.spellAttackBonus = newProfBonus + abilityMod;

    // Update max prepared spells
    character.spellcasting.maxPreparedSpells = Math.max(1, newLevel + abilityMod);

    spellSlotsUpdated = true;
  }

  // Get new class features
  const newFeatures: string[] = [];
  if (classKey) {
    const classData = system.getClass(classKey);
    if (classData) {
      const levelFeatures = classData.features.filter(f => f.level === newLevel);
      for (const feature of levelFeatures) {
        const featureStr = `${feature.name}: ${feature.description}`;
        newFeatures.push(featureStr);
        character.features.push(featureStr);
      }
    }
  }

  return {
    newLevel,
    hpGained,
    newMaxHp: character.stats.hitPoints.max,
    proficiencyBonus: newProfBonus,
    newFeatures,
    spellSlotsUpdated,
    hitDiceGained: 1,
  };
}

/**
 * Calculate XP progress percentage to next level
 */
export function getXPProgress(character: CharacterSheet): number {
  if (character.level >= 20) {
    return 100;
  }

  const currentThreshold = getXPThreshold(character.level);
  const nextThreshold = character.experience.nextLevelAt;
  const xpInLevel = character.experience.current - currentThreshold;
  const xpNeededForLevel = nextThreshold - currentThreshold;

  if (xpNeededForLevel <= 0) {
    return 100;
  }

  return Math.min(100, Math.floor((xpInLevel / xpNeededForLevel) * 100));
}

/**
 * Format XP for display
 */
export function formatXPProgress(character: CharacterSheet): string {
  const current = character.experience.current;
  const next = character.experience.nextLevelAt;
  const progress = getXPProgress(character);

  if (character.level >= 20) {
    return `Level 20 (Max) - ${current.toLocaleString()} XP`;
  }

  return `Level ${character.level} - ${current.toLocaleString()} / ${next.toLocaleString()} XP (${progress}%)`;
}
