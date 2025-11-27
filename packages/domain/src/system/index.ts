/**
 * Game System Module
 *
 * Provides abstraction layer for game system mechanics.
 * Default implementation: D&D 5e SRD
 */

// Types and interfaces
export type {
  GameSystem,
  RaceDefinition,
  ClassDefinition,
  BackgroundDefinition,
  SubclassDefinition,
  SubclassFeature,
  ClassFeature,
  SkillChoices,
  BackgroundFeature,
  ProgressionSystem,
  MagicSystem,
  CombatSystem,
  CasterType,
  CreatureSize,
  AbilityBonuses,
  SpellSlotTable,
  RacesConfig,
  ClassesConfig,
  BackgroundsConfig,
  SubclassesConfig,
  ProgressionConfig,
  SpellSlotsConfig,
  SystemConfig,
} from './game-system.js';

// D&D 5e implementation
export {
  Dnd5eGameSystem,
  getDnd5eSystem,
  createDnd5eSystem,
} from './dnd5e-system.js';
