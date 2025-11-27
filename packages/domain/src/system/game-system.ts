/**
 * Game System Abstraction Layer
 *
 * This module defines interfaces for game system mechanics that can be
 * swapped or extended. The default implementation is D&D 5e SRD.
 */

import type { AbilityScores } from '@ai-dm/shared';

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * Ability score bonuses that can be partial
 */
export type AbilityBonuses = Partial<AbilityScores>;

/**
 * Size categories
 */
export type CreatureSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

/**
 * Caster type classification
 */
export type CasterType = 'full' | 'half' | 'third' | 'pact' | 'none';

// ============================================================================
// Race Definitions
// ============================================================================

export interface RaceDefinition {
  name: string;
  abilityBonuses: AbilityBonuses;
  size: CreatureSize;
  speed: number;
  traits: string[];
  languages: string[];
  /** For races with flexible bonuses (like Half-Elf) */
  additionalAbilityBonuses?: {
    count: number;
    amount: number;
    excludes?: (keyof AbilityScores)[];
  };
}

// ============================================================================
// Class Definitions
// ============================================================================

export interface ClassFeature {
  level: number;
  name: string;
  description: string;
}

export interface SkillChoices {
  count: number;
  options: string[];
}

export interface ClassDefinition {
  name: string;
  hitDie: number;
  primaryAbility: keyof AbilityScores;
  savingThrows: (keyof AbilityScores)[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  skillChoices: SkillChoices;
  features: ClassFeature[];
  startingEquipment: string[];
}

// ============================================================================
// Subclass Definitions
// ============================================================================

export interface SubclassFeature {
  level: number;
  name: string;
  description: string;
}

export interface SubclassDefinition {
  name: string;
  description: string;
  /** Character level at which this subclass is chosen */
  levelRequired: number;
  /** Features gained from this subclass */
  features: SubclassFeature[];
  /** Additional proficiencies granted */
  bonusProficiencies: string[];
  /** Domain/circle spells for caster subclasses (level -> spell names) */
  domainSpells?: Record<string, string[]>;
}

// ============================================================================
// Background Definitions
// ============================================================================

export interface BackgroundFeature {
  name: string;
  description: string;
}

export interface BackgroundDefinition {
  name: string;
  skillProficiencies: string[];
  toolProficiencies: string[];
  languages: number;
  equipment: string[];
  feature: BackgroundFeature;
  traits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
}

// ============================================================================
// Progression System
// ============================================================================

export interface ProgressionSystem {
  /** Maximum character level */
  maxLevel: number;
  /** XP needed to reach each level (index 0 = level 1) */
  xpThresholds: number[];
  /** Proficiency bonus at each level (index 0 = level 1) */
  proficiencyByLevel: number[];
  /** XP rewards by Challenge Rating */
  crXpRewards: Record<string, number>;
  /** Standard ability score array */
  standardArray: number[];

  /** Get XP threshold for a level */
  getXPThreshold(level: number): number;
  /** Get XP needed for next level */
  getXPForNextLevel(currentLevel: number): number;
  /** Get proficiency bonus for a level */
  getProficiencyBonus(level: number): number;
  /** Get XP reward for a CR */
  getXPForCR(cr: string | number): number;
}

// ============================================================================
// Magic System
// ============================================================================

/**
 * Spell slot progression table (9 levels, 20 character levels)
 */
export type SpellSlotTable = number[][];

export interface MagicSystem {
  /** Maximum spell level (9 for D&D 5e) */
  spellLevels: number;
  /** Spell slot progression for full casters */
  fullCasterSlots: SpellSlotTable;
  /** Spell slot progression for half casters */
  halfCasterSlots: SpellSlotTable;
  /** Caster type by class */
  casterTypes: Record<string, CasterType>;
  /** Spellcasting ability by class */
  spellcastingAbility: Record<string, keyof AbilityScores>;
  /** Cantrips known by level for each class */
  cantripsKnown: Record<string, number[]>;

  /** Get spell slots for a class at a given level */
  getSpellSlots(className: string, level: number): number[];
  /** Get caster type for a class */
  getCasterType(className: string): CasterType;
  /** Get spellcasting ability for a class */
  getSpellcastingAbility(className: string): keyof AbilityScores | undefined;
}

// ============================================================================
// Combat System
// ============================================================================

export interface CombatSystem {
  /** Damage types available in this system */
  damageTypes: string[];
  /** Conditions available in this system */
  conditions: string[];
  /** Dice types used (d4, d6, etc.) */
  diceTypes: number[];

  /** Calculate ability modifier from score */
  calculateAbilityModifier(score: number): number;
  /** Calculate spell save DC */
  calculateSpellSaveDC(abilityScore: number, proficiencyBonus: number): number;
  /** Calculate spell attack bonus */
  calculateSpellAttackBonus(abilityScore: number, proficiencyBonus: number): number;
}

// ============================================================================
// Game System Interface
// ============================================================================

/**
 * GameSystem defines all ruleset-specific mechanics.
 * Default implementation: D&D 5e SRD
 * Future: Pathfinder, OSR, homebrew systems
 */
export interface GameSystem {
  /** System identifier */
  readonly id: string;
  /** System display name */
  readonly name: string;
  /** System version */
  readonly version: string;
  /** System description */
  readonly description: string;

  // Character Creation Data
  readonly races: Record<string, RaceDefinition>;
  readonly classes: Record<string, ClassDefinition>;
  readonly backgrounds: Record<string, BackgroundDefinition>;
  readonly subclasses: Record<string, Record<string, SubclassDefinition>>;

  // Subsystems
  readonly progression: ProgressionSystem;
  readonly magic: MagicSystem;
  readonly combat: CombatSystem;

  // Utility methods
  calculateAbilityModifier(score: number): number;
  calculateProficiencyBonus(level: number): number;

  // Lookup methods
  getRace(raceKey: string): RaceDefinition | undefined;
  getClass(classKey: string): ClassDefinition | undefined;
  getBackground(backgroundKey: string): BackgroundDefinition | undefined;
  getSubclass(classKey: string, subclassKey: string): SubclassDefinition | undefined;
  getSubclassesForClass(classKey: string): Record<string, SubclassDefinition>;
}

// ============================================================================
// Config File Schemas (for JSON loading)
// ============================================================================

export interface RacesConfig {
  version: string;
  races: Record<string, RaceDefinition>;
}

export interface ClassesConfig {
  version: string;
  classes: Record<string, ClassDefinition>;
}

export interface BackgroundsConfig {
  version: string;
  backgrounds: Record<string, BackgroundDefinition>;
}

export interface SubclassesConfig {
  version: string;
  subclasses: Record<string, Record<string, SubclassDefinition>>;
}

export interface ProgressionConfig {
  version: string;
  maxLevel: number;
  xpThresholds: number[];
  proficiencyByLevel: number[];
  crXpRewards: Record<string, number>;
  standardArray: number[];
}

export interface SpellSlotsConfig {
  version: string;
  spellLevels: number;
  fullCasterSlots: number[][];
  halfCasterSlots: number[][];
  casterTypes: Record<string, CasterType>;
  spellcastingAbility: Record<string, keyof AbilityScores>;
  cantripsKnown: Record<string, number[]>;
}

export interface SystemConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  source: string;
  files: {
    races: string;
    classes: string;
    backgrounds: string;
    progression: string;
    spellSlots: string;
  };
  mechanics: {
    abilityScores: string[];
    diceTypes: number[];
    maxLevel: number;
    baseProficiencyBonus: number;
    maxSpellLevel: number;
  };
  damageTypes: string[];
  conditions: string[];
}
