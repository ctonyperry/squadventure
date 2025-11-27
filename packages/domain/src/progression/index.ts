/**
 * Progression module - XP tracking and level-up mechanics
 */

export {
  // XP Tables
  XP_THRESHOLDS,
  PROFICIENCY_BONUS_BY_LEVEL,
  CR_XP_REWARDS,
  // Functions
  getXPThreshold,
  getXPForNextLevel,
  getProficiencyBonus,
  getXPForCR,
  createExperience,
  canLevelUp,
  awardXP,
  processLevelUp,
  getXPProgress,
  formatXPProgress,
  // Types
  type LevelUpResult,
} from './xp-system.js';

export {
  type XPToolContext,
  createAwardXPTool,
  createAwardCombatXPTool,
  createCheckXPTool,
  createLevelUpTool,
  createXPTools,
} from './xp-tools.js';
