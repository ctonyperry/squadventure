/**
 * World Generation Types
 *
 * Type definitions for world generation pipeline.
 */

import { z } from 'zod';
import type { LocationId, EntityId, CampaignId, ChapterId, QuestId } from '@ai-dm/shared';

// =============================================================================
// Generation Brief (Input)
// =============================================================================

/**
 * User's high-level brief for world generation
 */
export interface WorldBrief {
  /** Name of the world */
  name: string;

  /** Genre/setting type */
  genre: 'high-fantasy' | 'dark-fantasy' | 'low-fantasy' | 'sword-and-sorcery' | 'custom';

  /** Custom genre description if genre is 'custom' */
  customGenre?: string;

  /** Main themes to incorporate */
  themes: string[];

  /** Desired tone */
  tone: 'heroic' | 'gritty' | 'comedic' | 'mysterious' | 'horror';

  /** Level range for the campaign */
  levelRange: {
    min: number;
    max: number;
  };

  /** Estimated number of sessions */
  estimatedSessions?: number;

  /** Any specific requirements or constraints */
  requirements?: string[];

  /** Inspirations (books, movies, games) */
  inspirations?: string[];
}

// =============================================================================
// Layer 1: World Foundation
// =============================================================================

export interface WorldFoundation {
  id: string;
  name: string;
  settingType: string;

  /** Geographic overview */
  geography: {
    overview: string;
    climates: string[];
    majorLandmarks: string[];
    scale: 'regional' | 'continental' | 'world';
  };

  /** Historical context */
  history: {
    creationMyth?: string;
    majorEras: Array<{
      name: string;
      description: string;
      yearsAgo: number;
    }>;
    currentYear: number;
    calendarName: string;
  };

  /** Magic and technology levels */
  magicLevel: 'none' | 'low' | 'medium' | 'high' | 'epic';
  technologyLevel: 'primitive' | 'medieval' | 'renaissance' | 'magitech';

  /** World-specific rules or quirks */
  worldRules: string[];
}

// =============================================================================
// Layer 2: Factions & Power
// =============================================================================

export interface Faction {
  id: EntityId;
  name: string;
  type: 'government' | 'religious' | 'criminal' | 'guild' | 'military' | 'secret' | 'other';
  description: string;
  goals: string[];
  values: string[];
  influence: 'local' | 'regional' | 'continental' | 'world';
  headquarters?: LocationId;
  leaderIds: EntityId[];
  allies: EntityId[];
  enemies: EntityId[];
  resources: string[];
  secrets: string[];
}

export interface FactionsLayer {
  factions: Faction[];
  politicalLandscape: string;
  majorConflicts: Array<{
    name: string;
    parties: EntityId[];
    description: string;
    stakes: string;
  }>;
}

// =============================================================================
// Layer 3: Locations
// =============================================================================

export interface GeneratedLocation {
  id: LocationId;
  name: string;
  type: 'city' | 'town' | 'village' | 'dungeon' | 'wilderness' | 'landmark' | 'other';
  description: string;
  population?: number;
  government?: string;
  economy?: string;
  controllingFaction?: EntityId;
  pointsOfInterest: Array<{
    name: string;
    description: string;
    type: string;
  }>;
  connections: LocationId[];
  travelTimes: Record<string, string>; // locationId -> travel time description
  secrets: string[];
  dangerLevel: 'safe' | 'low' | 'moderate' | 'high' | 'deadly';
  suggestedLevel?: { min: number; max: number };
}

export interface LocationsLayer {
  locations: GeneratedLocation[];
  travelNetwork: string;
  hiddenLocations: LocationId[]; // Locations not initially known to players
}

// =============================================================================
// Layer 4: NPCs
// =============================================================================

export interface GeneratedNPC {
  id: EntityId;
  name: string;
  race: string;
  occupation: string;
  age?: number;
  description: string;
  personality: string[];
  motivations: string[];
  secrets: string[];
  locationId: LocationId;
  factionIds: EntityId[];
  relationships: Array<{
    npcId: EntityId;
    relationship: string;
    attitude: 'friendly' | 'neutral' | 'hostile';
  }>;
  knowledge: string[]; // What this NPC knows that players might learn
  questHooks?: string[];
  combatCapable: boolean;
  approximateCR?: number;
}

export interface NPCsLayer {
  npcs: GeneratedNPC[];
  notableRelationships: string[];
}

// =============================================================================
// Layer 5: Campaign Arc
// =============================================================================

export interface StoryBeat {
  id: string;
  title: string;
  description: string;
  type: 'introduction' | 'rising-action' | 'climax' | 'resolution' | 'optional';
  locationId?: LocationId;
  involvedNPCs: EntityId[];
  prerequisites: string[];
  outcomes: string[];
  playerChoicePoints?: string[];
}

export interface GeneratedChapter {
  id: ChapterId;
  number: number;
  name: string;
  synopsis: string;
  themes: string[];
  levelRange: { min: number; max: number };
  locations: LocationId[];
  keyNPCs: EntityId[];
  storyBeats: StoryBeat[];
  possibleEndStates: string[];
}

export interface CampaignArcLayer {
  centralConflict: string;
  antagonist: {
    id: EntityId;
    name: string;
    motivation: string;
    methods: string[];
    weaknesses: string[];
  };
  chapters: GeneratedChapter[];
  possibleEndings: Array<{
    name: string;
    description: string;
    conditions: string[];
    tone: 'triumphant' | 'bittersweet' | 'tragic' | 'ambiguous';
  }>;
  subplots: Array<{
    name: string;
    description: string;
    relatedChapters: string[];
  }>;
}

// =============================================================================
// Layer 6: Encounters & Rewards
// =============================================================================

export interface PlannedEncounter {
  id: string;
  name: string;
  type: 'combat' | 'social' | 'exploration' | 'puzzle' | 'trap';
  locationId: LocationId;
  suggestedLevel: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  description: string;
  creatures?: Array<{
    name: string;
    count: number;
    cr: number;
  }>;
  tactics?: string;
  rewards: {
    xp: number;
    gold?: number;
    items?: string[];
    information?: string[];
  };
  alternativeResolutions?: string[];
}

export interface TreasureHoard {
  id: string;
  name: string;
  locationId: LocationId;
  guardedBy?: string;
  contents: {
    coins?: { cp?: number; sp?: number; gp?: number; pp?: number };
    gems?: string[];
    artObjects?: string[];
    magicItems?: Array<{
      name: string;
      rarity: string;
      description: string;
    }>;
  };
  discoveryCondition?: string;
}

export interface EncountersLayer {
  encounters: PlannedEncounter[];
  treasureHoards: TreasureHoard[];
  randomEncounterTables: Array<{
    locationId: LocationId;
    entries: Array<{
      weight: number;
      description: string;
    }>;
  }>;
}

// =============================================================================
// Complete World Template
// =============================================================================

export interface WorldTemplate {
  id: string;
  version: string;
  createdAt: Date;
  brief: WorldBrief;
  foundation: WorldFoundation;
  factions: FactionsLayer;
  locations: LocationsLayer;
  npcs: NPCsLayer;
  campaignArc: CampaignArcLayer;
  encounters: EncountersLayer;
  metadata: {
    generatedBy: string;
    generationTimeMs: number;
    validationPassed: boolean;
    validationWarnings: string[];
  };
}

// =============================================================================
// Generation State
// =============================================================================

export type GenerationLayer =
  | 'foundation'
  | 'factions'
  | 'locations'
  | 'npcs'
  | 'campaign'
  | 'encounters';

export interface GenerationProgress {
  currentLayer: GenerationLayer;
  completedLayers: GenerationLayer[];
  errors: string[];
  warnings: string[];
  startedAt: Date;
  layerStartedAt: Date;
}

export interface GenerationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  tokensUsed?: number;
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    layer: GenerationLayer;
    path: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}
