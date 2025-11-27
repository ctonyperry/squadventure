export * from './world/index.js';
export * from './persona/index.js';
export * from './tools/index.js';
export * from './combat/index.js';
export * from './character/index.js';
export * from './knowledge/index.js';
export * from './testing/index.js';
export * from './inventory/index.js';
export * from './magic/index.js';
export * from './progression/index.js';
// Conditions module - explicit exports to avoid CONDITION_EFFECTS conflict with combat module
export {
  ConditionManager,
  createConditionManager,
  type ConditionType,
  type DurationType,
  type ConditionInstance,
  type ConditionCheckResult,
} from './conditions/index.js';

// System module - explicit exports to avoid CasterType conflict with magic module
export type {
  GameSystem,
  RaceDefinition,
  ClassDefinition,
  BackgroundDefinition,
  ClassFeature,
  SkillChoices,
  BackgroundFeature,
  ProgressionSystem,
  MagicSystem,
  CombatSystem,
  CreatureSize,
  AbilityBonuses,
  SpellSlotTable,
  RacesConfig,
  ClassesConfig,
  BackgroundsConfig,
  ProgressionConfig,
  SpellSlotsConfig,
  SystemConfig,
} from './system/index.js';

export {
  Dnd5eGameSystem,
  getDnd5eSystem,
  createDnd5eSystem,
} from './system/index.js';

export * from './overlay/index.js';
export * from './campaign/index.js';
export * from './npc/index.js';
