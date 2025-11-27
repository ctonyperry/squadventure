/**
 * D&D 5e Experience Point and Leveling System
 */

import type { CharacterSheet, CharacterExperience } from '@ai-dm/shared';
import { getSpellSlotsForClass, CLASS_CASTER_TYPE } from '../magic/index.js';
import { CLASS_HIT_DIE } from '../character/rest-mechanics.js';
import { SRD_CLASSES } from '../character/character-builder.js';

/**
 * XP thresholds per level (D&D 5e standard)
 * Index is level - 1, value is XP needed to reach that level
 */
export const XP_THRESHOLDS: number[] = [
  0,      // Level 1
  300,    // Level 2
  900,    // Level 3
  2700,   // Level 4
  6500,   // Level 5
  14000,  // Level 6
  23000,  // Level 7
  34000,  // Level 8
  48000,  // Level 9
  64000,  // Level 10
  85000,  // Level 11
  100000, // Level 12
  120000, // Level 13
  140000, // Level 14
  165000, // Level 15
  195000, // Level 16
  225000, // Level 17
  265000, // Level 18
  305000, // Level 19
  355000, // Level 20
];

/**
 * Proficiency bonus by level
 */
export const PROFICIENCY_BONUS_BY_LEVEL: number[] = [
  2, 2, 2, 2, // Levels 1-4
  3, 3, 3, 3, // Levels 5-8
  4, 4, 4, 4, // Levels 9-12
  5, 5, 5, 5, // Levels 13-16
  6, 6, 6, 6, // Levels 17-20
];

/**
 * XP rewards by Challenge Rating
 */
export const CR_XP_REWARDS: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

/**
 * Get XP threshold for a level
 */
export function getXPThreshold(level: number): number {
  if (level < 1 || level > 20) {
    return 0;
  }
  return XP_THRESHOLDS[level - 1] ?? 0;
}

/**
 * Get XP needed for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= 20) {
    return Infinity; // Max level reached
  }
  return XP_THRESHOLDS[currentLevel] ?? Infinity;
}

/**
 * Get proficiency bonus for a level
 */
export function getProficiencyBonus(level: number): number {
  if (level < 1) return 2;
  if (level > 20) return 6;
  return PROFICIENCY_BONUS_BY_LEVEL[level - 1] ?? 2;
}

/**
 * Get XP reward for a CR
 */
export function getXPForCR(cr: string | number): number {
  const crStr = String(cr);
  return CR_XP_REWARDS[crStr] ?? 0;
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

  // Update spellcasting if applicable
  let spellSlotsUpdated = false;
  if (character.spellcasting) {
    const classKey = Object.entries(SRD_CLASSES).find(
      ([_, c]) => c.name === character.class
    )?.[0];

    if (classKey) {
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
  }

  // Get new class features
  const classKey = Object.entries(SRD_CLASSES).find(
    ([_, c]) => c.name === character.class
  )?.[0];

  const newFeatures: string[] = [];
  if (classKey) {
    const classData = SRD_CLASSES[classKey];
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
