/**
 * World Overlay System
 *
 * Defines interfaces and types for campaign setting overlays that adapt
 * the base game system (D&D 5e) to different worlds and genres.
 *
 * Architecture:
 * ┌─────────────────────────────────────┐
 * │  WORLD LAYER (Content)              │
 * │  - Locations, NPCs, lore, factions  │
 * ├─────────────────────────────────────┤
 * │  ADAPTATION LAYER (Overlay)         │
 * │  - Terminology mapping              │
 * │  - Feature restrictions/reskins     │
 * │  - DM guidance injection            │
 * ├─────────────────────────────────────┤
 * │  RULES LAYER (GameSystem)           │
 * │  - Core mechanics (D&D 5e)          │
 * └─────────────────────────────────────┘
 */

import type { AbilityScores } from '@ai-dm/shared';

// ============================================================================
// Terminology Mapping Types
// ============================================================================

/**
 * Maps base game terms to setting-specific terms
 * e.g., "gold" → "credits", "spell" → "power"
 */
export interface TerminologyMap {
  /** Currency terms (gold, silver, copper, etc.) */
  currency: Record<string, string>;
  /** Magic terminology (spell, cantrip, arcane, divine, etc.) */
  magic: Record<string, string>;
  /** Race display names (elf → space elf, dwarf → belter) */
  races: Record<string, string>;
  /** Class display names (wizard → technomancer) */
  classes: Record<string, string>;
  /** Item categories (potion → stim, scroll → datapad) */
  items: Record<string, string>;
  /** Equipment types (armor → exosuit, shield → barrier) */
  equipment: Record<string, string>;
  /** Condition names (poisoned → contaminated) */
  conditions: Record<string, string>;
  /** Custom/misc terms */
  custom: Record<string, string>;
}

// ============================================================================
// Race/Class Modifications
// ============================================================================

/**
 * Reskin a race without changing mechanics
 */
export interface RaceReskin {
  /** New display name */
  displayName: string;
  /** Updated description for the setting */
  description: string;
  /** Renamed traits (original trait name → new name) */
  renamedTraits?: Record<string, string>;
  /** Additional flavor text for traits */
  traitFlavor?: Record<string, string>;
}

/**
 * Reskin a class without changing mechanics
 */
export interface ClassReskin {
  /** New display name */
  displayName: string;
  /** Updated description for the setting */
  description: string;
  /** Renamed features (original feature name → new name) */
  renamedFeatures?: Record<string, string>;
  /** Additional flavor text for features */
  featureFlavor?: Record<string, string>;
}

/**
 * Restrictions on character options
 */
export interface CharacterRestrictions {
  /** Allowed race keys (empty = all allowed) */
  allowedRaces: string[];
  /** Allowed class keys (empty = all allowed) */
  allowedClasses: string[];
  /** Allowed background keys (empty = all allowed) */
  allowedBackgrounds: string[];
  /** Subclass restrictions by class (classKey → allowed subclass keys) */
  allowedSubclasses: Record<string, string[]>;
  /** Starting level constraints */
  levelRange?: {
    min: number;
    max: number;
  };
}

// ============================================================================
// DM Guidance Types
// ============================================================================

/**
 * Tone preset for the setting
 */
export type SettingTone =
  | 'heroic'
  | 'grimdark'
  | 'comedic'
  | 'horror'
  | 'mystery'
  | 'intrigue'
  | 'adventure'
  | 'survival'
  | 'custom';

/**
 * Naming convention for NPCs and places
 */
export interface NamingConvention {
  /** Cultural region or group this applies to */
  culture: string;
  /** Description of naming patterns */
  description: string;
  /** Example names */
  examples: string[];
  /** Common prefixes */
  prefixes?: string[];
  /** Common suffixes */
  suffixes?: string[];
}

/**
 * Theme guidance for the DM
 */
export interface ThemeGuidance {
  /** Core themes to emphasize */
  primaryThemes: string[];
  /** Secondary themes to weave in */
  secondaryThemes: string[];
  /** Topics to avoid or handle carefully */
  sensitiveTopics: string[];
  /** Recurring motifs */
  motifs: string[];
}

/**
 * Vocabulary guidance for consistent terminology
 */
export interface VocabularyGuidance {
  /** Words/phrases to use frequently */
  preferredTerms: string[];
  /** Words/phrases to avoid */
  avoidedTerms: string[];
  /** Setting-specific jargon with definitions */
  settingJargon: Record<string, string>;
}

/**
 * Complete DM guidance for a setting
 */
export interface DMGuidance {
  /** Overall tone of the setting */
  tone: SettingTone;
  /** Custom tone description (for 'custom' tone) */
  toneDescription?: string;
  /** World rules and assumptions */
  settingRules: string[];
  /** Cultural naming conventions */
  namingConventions: NamingConvention[];
  /** Theme guidance */
  themes: ThemeGuidance;
  /** Vocabulary preferences */
  vocabulary: VocabularyGuidance;
  /** Free-form custom instructions */
  customInstructions: string;
  /** Roleplay guidance */
  roleplayGuidance?: string;
}

// ============================================================================
// Custom Content Types
// ============================================================================

/**
 * Custom monster definition for the overlay
 */
export interface CustomMonster {
  id: string;
  name: string;
  /** Base monster to modify (if reskinning) */
  baseMonsterId?: string;
  /** Full stat block if not reskinning */
  stats?: {
    size: string;
    type: string;
    alignment: string;
    armorClass: number;
    hitPoints: number;
    hitDice: string;
    speed: string;
    abilities: AbilityScores;
    skills?: Record<string, number>;
    damageResistances?: string[];
    damageImmunities?: string[];
    conditionImmunities?: string[];
    senses: string;
    languages: string;
    challengeRating: string;
    traits?: Array<{ name: string; description: string }>;
    actions?: Array<{ name: string; description: string }>;
  };
  /** Flavor/description for the setting */
  description: string;
}

/**
 * Custom item definition for the overlay
 */
export interface CustomItem {
  id: string;
  name: string;
  /** Base item to modify (if reskinning) */
  baseItemId?: string;
  /** Item properties if new */
  properties?: {
    type: string;
    rarity?: string;
    attunement?: boolean;
    value?: number;
    weight?: number;
    damage?: string;
    armorClass?: number;
    properties?: string[];
    description: string;
  };
  /** Setting flavor */
  flavor: string;
}

/**
 * Custom spell definition for the overlay
 */
export interface CustomSpell {
  id: string;
  name: string;
  /** Base spell to modify (if reskinning) */
  baseSpellId?: string;
  /** Spell properties if new */
  properties?: {
    level: number;
    school: string;
    castingTime: string;
    range: string;
    components: string;
    duration: string;
    description: string;
    higherLevels?: string;
    classes: string[];
  };
  /** Setting flavor */
  flavor: string;
}

// ============================================================================
// World Overlay Interface
// ============================================================================

/**
 * Complete world overlay configuration
 */
export interface WorldOverlay {
  /** Unique identifier for this overlay */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Long-form setting description for DM context */
  settingDescription: string;
  /** Version of this overlay */
  version: string;
  /** Author/creator */
  author?: string;
  /** Base game system this overlays (e.g., "dnd5e") */
  baseSystem: string;
  /** Parent overlay to inherit from (for overlay chaining) */
  parentOverlay?: string;

  // Terminology
  terminology: TerminologyMap;

  // Character modifications
  restrictions: CharacterRestrictions;
  raceReskins: Record<string, RaceReskin>;
  classReskins: Record<string, ClassReskin>;

  // Custom content
  customMonsters: CustomMonster[];
  customItems: CustomItem[];
  customSpells: CustomSpell[];

  // DM guidance
  dmGuidance: DMGuidance;

  // Metadata
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Overlay Config (for JSON loading)
// ============================================================================

/**
 * JSON config schema for overlay files
 */
export interface WorldOverlayConfig {
  version: string;
  overlay: WorldOverlay;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty terminology map
 */
export function createEmptyTerminologyMap(): TerminologyMap {
  return {
    currency: {},
    magic: {},
    races: {},
    classes: {},
    items: {},
    equipment: {},
    conditions: {},
    custom: {},
  };
}

/**
 * Create default DM guidance
 */
export function createDefaultDMGuidance(): DMGuidance {
  return {
    tone: 'adventure',
    settingRules: [],
    namingConventions: [],
    themes: {
      primaryThemes: [],
      secondaryThemes: [],
      sensitiveTopics: [],
      motifs: [],
    },
    vocabulary: {
      preferredTerms: [],
      avoidedTerms: [],
      settingJargon: {},
    },
    customInstructions: '',
  };
}

/**
 * Create default character restrictions (no restrictions)
 */
export function createDefaultRestrictions(): CharacterRestrictions {
  return {
    allowedRaces: [],
    allowedClasses: [],
    allowedBackgrounds: [],
    allowedSubclasses: {},
  };
}

/**
 * Create a blank world overlay template
 */
export function createBlankOverlay(id: string, name: string): WorldOverlay {
  return {
    id,
    name,
    description: '',
    settingDescription: '',
    version: '1.0.0',
    baseSystem: 'dnd5e',
    terminology: createEmptyTerminologyMap(),
    restrictions: createDefaultRestrictions(),
    raceReskins: {},
    classReskins: {},
    customMonsters: [],
    customItems: [],
    customSpells: [],
    dmGuidance: createDefaultDMGuidance(),
  };
}
