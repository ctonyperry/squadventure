import { z } from 'zod';

// ============================================================================
// Core ID Types
// ============================================================================

export type EntityId = string & { readonly __brand: 'EntityId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type PersonaId = string & { readonly __brand: 'PersonaId' };
export type SnapshotId = string & { readonly __brand: 'SnapshotId' };
export type CampaignId = string & { readonly __brand: 'CampaignId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type ObjectiveId = string & { readonly __brand: 'ObjectiveId' };
export type QuestId = string & { readonly __brand: 'QuestId' };
export type PlayerId = string & { readonly __brand: 'PlayerId' };

export function createEntityId(id: string): EntityId {
  return id as EntityId;
}

export function createLocationId(id: string): LocationId {
  return id as LocationId;
}

export function createSessionId(id: string): SessionId {
  return id as SessionId;
}

export function createPersonaId(id: string): PersonaId {
  return id as PersonaId;
}

export function createSnapshotId(id: string): SnapshotId {
  return id as SnapshotId;
}

export function createCampaignId(id: string): CampaignId {
  return id as CampaignId;
}

export function createChapterId(id: string): ChapterId {
  return id as ChapterId;
}

export function createObjectiveId(id: string): ObjectiveId {
  return id as ObjectiveId;
}

export function createQuestId(id: string): QuestId {
  return id as QuestId;
}

export function createPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

// ============================================================================
// World Model Types
// ============================================================================

export interface CanonicalDescription {
  text: string;
  sensoryDetails?: {
    sight?: string;
    sound?: string;
    smell?: string;
    touch?: string;
  };
  hiddenDetails?: string[];
}

export interface Location {
  id: LocationId;
  name: string;
  description: CanonicalDescription;
  connections: LocationConnection[];
  presentEntities: EntityId[];
  ambiance: AmbianceProfile;
}

export interface LocationConnection {
  targetId: LocationId;
  direction: string;
  description?: string;
  isHidden?: boolean;
  requiredCondition?: string;
}

export interface AmbianceProfile {
  lighting: 'bright' | 'dim' | 'dark';
  noise: 'quiet' | 'moderate' | 'loud';
  mood: 'peaceful' | 'tense' | 'eerie' | 'chaotic' | 'neutral';
  temperature?: 'cold' | 'cool' | 'comfortable' | 'warm' | 'hot';
}

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'npc' | 'creature' | 'item' | 'faction';

export interface BaseEntity {
  id: EntityId;
  type: EntityType;
  name: string;
  description: CanonicalDescription;
}

export interface PersonalityProfile {
  traits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
  speakingStyle?: string;
  mannerisms?: string[];
}

export interface NPCEntity extends BaseEntity {
  type: 'npc';
  personality: PersonalityProfile;
  knowledge: string[];
  motivation: string;
  attitude: 'friendly' | 'neutral' | 'hostile' | 'fearful';
  stats?: CreatureStats;
}

export interface CreatureEntity extends BaseEntity {
  type: 'creature';
  stats: CreatureStats;
  attitude: 'friendly' | 'neutral' | 'hostile' | 'fearful';
}

export interface ItemEntity extends BaseEntity {
  type: 'item';
  itemType: 'weapon' | 'armor' | 'consumable' | 'treasure' | 'misc' | 'tool' | 'gear';
  value?: number;
  weight?: number;
  magical?: boolean;
  properties?: string[];
  weaponDetails?: WeaponDetails;
  armorDetails?: ArmorDetails;
  consumableDetails?: ConsumableDetails;
}

// ============================================================================
// Equipment & Inventory Types
// ============================================================================

export type WeaponCategory = 'simple' | 'martial';
export type WeaponType = 'melee' | 'ranged';
export type DamageType = 'bludgeoning' | 'piercing' | 'slashing' | 'fire' | 'cold' | 'lightning' | 'thunder' | 'acid' | 'poison' | 'necrotic' | 'radiant' | 'force' | 'psychic';
export type WeaponProperty = 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading' | 'reach' | 'thrown' | 'two-handed' | 'versatile' | 'silvered';
export type ArmorType = 'light' | 'medium' | 'heavy' | 'shield';

export interface WeaponDetails {
  category: WeaponCategory;
  weaponType: WeaponType;
  damageDice: string;
  damageType: DamageType;
  properties: WeaponProperty[];
  range?: { normal: number; long?: number };
  versatileDice?: string;
}

export interface ArmorDetails {
  armorType: ArmorType;
  baseAC: number;
  maxDexBonus?: number;
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
}

export interface ConsumableDetails {
  uses: number;
  maxUses: number;
  effect: string;
  healingDice?: string;
}

export interface Currency {
  copper: number;
  silver: number;
  electrum: number;
  gold: number;
  platinum: number;
}

export type EquipmentSlot = 'mainHand' | 'offHand' | 'armor' | 'head' | 'cloak' | 'neck' | 'ring1' | 'ring2' | 'belt' | 'boots' | 'gloves';

export interface EquippedItems {
  mainHand?: EntityId;
  offHand?: EntityId;
  armor?: EntityId;
  head?: EntityId;
  cloak?: EntityId;
  neck?: EntityId;
  ring1?: EntityId;
  ring2?: EntityId;
  belt?: EntityId;
  boots?: EntityId;
  gloves?: EntityId;
}

export interface CharacterInventory {
  equipped: EquippedItems;
  backpack: EntityId[];
  currency: Currency;
  carryingCapacity: number;
  currentWeight: number;
}

export interface FactionEntity extends BaseEntity {
  type: 'faction';
  alignment?: string;
  goals: string[];
  relationships: FactionRelationship[];
}

export interface FactionRelationship {
  factionId: EntityId;
  attitude: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';
}

export type Entity = NPCEntity | CreatureEntity | ItemEntity | FactionEntity;

// ============================================================================
// Character/Combat Stats
// ============================================================================

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CreatureStats {
  abilityScores: AbilityScores;
  armorClass: number;
  hitPoints: { current: number; max: number; temp?: number };
  speed: number;
  proficiencyBonus?: number;
  savingThrows?: Partial<Record<keyof AbilityScores, boolean>>;
  skills?: Record<string, boolean>;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
}

// ============================================================================
// Magic & Spell Types
// ============================================================================

export type SpellSchool = 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';

export interface SpellSlots {
  /** Slots per spell level (index 0 = 1st level, index 8 = 9th level) */
  current: [number, number, number, number, number, number, number, number, number];
  max: [number, number, number, number, number, number, number, number, number];
}

export interface SpellInfo {
  name: string;
  level: number; // 0 = cantrip
  school: SpellSchool;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  description: string;
}

export interface CharacterSpellcasting {
  /** Spellcasting ability (intelligence, wisdom, charisma) */
  ability: keyof AbilityScores;
  /** Spell save DC = 8 + proficiency + ability mod */
  spellSaveDC: number;
  /** Spell attack bonus = proficiency + ability mod */
  spellAttackBonus: number;
  /** Available spell slots */
  slots: SpellSlots;
  /** Cantrips known */
  cantripsKnown: string[];
  /** Spells known (for spontaneous casters like Sorcerers) */
  spellsKnown: string[];
  /** Prepared spells (for prepared casters like Wizards, Clerics) */
  preparedSpells: string[];
  /** Maximum number of spells that can be prepared */
  maxPreparedSpells: number;
}

export interface HitDice {
  /** Available hit dice to spend */
  current: number;
  /** Maximum hit dice (equals character level) */
  max: number;
  /** Hit die type (d6, d8, d10, d12) based on class */
  dieType: 6 | 8 | 10 | 12;
}

export interface DeathSaves {
  /** Number of successful death saves (0-3) */
  successes: number;
  /** Number of failed death saves (0-3) */
  failures: number;
  /** Whether the character is stable (unconscious but not dying) */
  stable: boolean;
}

export interface CharacterExperience {
  /** Current XP total */
  current: number;
  /** XP needed for next level */
  nextLevelAt: number;
}

export interface CharacterSheet {
  id: EntityId;
  name: string;
  race: string;
  class: string;
  level: number;
  experience: CharacterExperience;
  background: string;
  stats: CreatureStats;
  inventory: CharacterInventory;
  spellcasting?: CharacterSpellcasting;
  hitDice: HitDice;
  deathSaves?: DeathSaves;
  features: string[];
  proficiencies: {
    armor: string[];
    weapons: string[];
    tools: string[];
    languages: string[];
  };
}

// ============================================================================
// Player Identity Types
// ============================================================================

/**
 * Player roles within a session
 */
export type PlayerRole = 'dm' | 'player' | 'spectator';

/**
 * Player authentication status
 */
export type PlayerAuthStatus = 'guest' | 'registered' | 'authenticated';

/**
 * Player preferences for game experience
 */
export interface PlayerPreferences {
  /** Preferred name to display */
  displayName: string;
  /** Avatar URL or identifier */
  avatarUrl?: string;
  /** Color for player identification */
  color?: string;
  /** Notification preferences */
  notifications: {
    turnReminders: boolean;
    combatAlerts: boolean;
    chatMessages: boolean;
  };
  /** UI preferences */
  ui: {
    diceAnimations: boolean;
    soundEffects: boolean;
    darkMode: boolean;
  };
}

/**
 * Player profile information
 */
export interface PlayerProfile {
  id: PlayerId;
  /** Unique username for registered players */
  username?: string;
  /** Display name shown to others */
  displayName: string;
  /** Player's avatar URL */
  avatarUrl?: string;
  /** Authentication status */
  authStatus: PlayerAuthStatus;
  /** Account creation date (for registered users) */
  createdAt?: Date;
  /** Last login date */
  lastSeenAt: Date;
  /** Player preferences */
  preferences: PlayerPreferences;
  /** Statistics across sessions */
  stats?: PlayerStats;
}

/**
 * Player statistics (optional tracking)
 */
export interface PlayerStats {
  sessionsPlayed: number;
  totalPlayTimeMinutes: number;
  characterCount: number;
  diceRolls: number;
  criticalHits: number;
  criticalMisses: number;
}

/**
 * Player's role and permissions within a specific session
 */
export interface SessionPlayer {
  playerId: PlayerId;
  displayName: string;
  role: PlayerRole;
  /** ID of controlled character(s) for players */
  characterIds: EntityId[];
  /** Whether the player is currently connected */
  isConnected: boolean;
  /** When the player joined the session */
  joinedAt: Date;
  /** Permissions specific to this session */
  permissions: SessionPermissions;
}

/**
 * Session-specific permissions
 */
export interface SessionPermissions {
  /** Can send chat messages */
  canChat: boolean;
  /** Can execute game commands */
  canCommand: boolean;
  /** Can control NPCs (DM only typically) */
  canControlNPCs: boolean;
  /** Can modify world state (DM only typically) */
  canModifyWorld: boolean;
  /** Can invite other players */
  canInvite: boolean;
  /** Can kick players (DM only typically) */
  canKick: boolean;
  /** Can pause/resume session */
  canPauseSession: boolean;
}

/**
 * Default permissions by role
 */
export const DEFAULT_PERMISSIONS: Record<PlayerRole, SessionPermissions> = {
  dm: {
    canChat: true,
    canCommand: true,
    canControlNPCs: true,
    canModifyWorld: true,
    canInvite: true,
    canKick: true,
    canPauseSession: true,
  },
  player: {
    canChat: true,
    canCommand: true,
    canControlNPCs: false,
    canModifyWorld: false,
    canInvite: false,
    canKick: false,
    canPauseSession: false,
  },
  spectator: {
    canChat: true,
    canCommand: false,
    canControlNPCs: false,
    canModifyWorld: false,
    canInvite: false,
    canKick: false,
    canPauseSession: false,
  },
};

// ============================================================================
// Session Types
// ============================================================================

export type SceneType = 'exploration' | 'social' | 'combat' | 'puzzle' | 'rest';

export interface Scene {
  locationId: LocationId;
  presentNPCs: EntityId[];
  mood: AmbianceProfile;
  activeObjectives: string[];
  sceneType: SceneType;
}

export interface Turn {
  id: string;
  timestamp: Date;
  role: 'player' | 'dm' | 'system';
  content: string;
  metadata?: {
    diceRolls?: DiceRoll[];
    toolCalls?: ToolCall[];
    stateChanges?: StateChange[];
  };
}

export interface DiceRoll {
  notation: string;
  results: number[];
  total: number;
  purpose: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface StateChange {
  entityId: EntityId;
  path: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface CombatState {
  isActive: boolean;
  round: number;
  participants: CombatParticipant[];
  currentTurnIndex: number;
}

export interface CombatParticipant {
  entityId: EntityId;
  name: string;
  initiative: number;
  isPlayer: boolean;
  conditions: string[];
}

export interface PlayerGamePreferences {
  experienceLevel: 'new' | 'casual' | 'veteran';
  playStyle: {
    prefersRoleplay: number;
    prefersCombat: number;
    prefersExploration: number;
    prefersPuzzles: number;
  };
  humorReceptivity: number;
  pacePreference: 'fast' | 'measured' | 'slow';
}

// ============================================================================
// Persona Types
// ============================================================================

export type HumorType = 'absurdist' | 'dry' | 'slapstick' | 'referential' | 'wordplay';

export interface HumorProfile {
  frequency: number;
  types: HumorType[];
  fourthWallBreaks: boolean;
  selfDeprecation: boolean;
}

export interface VoiceProfile {
  verbosity: 'terse' | 'moderate' | 'verbose';
  formality: 'casual' | 'moderate' | 'formal';
  humor: HumorProfile;
}

export interface RulingPhilosophy {
  ruleAdherence: number;
  playerAgencyBias: number;
  consequenceSeverity: number;
}

export interface ImprovStyle {
  yesAndTendency: number;
  callbackMemory: 'poor' | 'good' | 'excellent';
}

export interface ConversationExample {
  playerInput: string;
  dmResponse: string;
  context?: string;
}

export interface DMPersona {
  id: PersonaId;
  name: string;
  voice: VoiceProfile;
  rulingPhilosophy: RulingPhilosophy;
  improv: ImprovStyle;
  systemPrompt: string;
  exampleExchanges: ConversationExample[];
  catchphrases: string[];
}

// ============================================================================
// World State (Aggregate Root)
// ============================================================================

export interface WorldState {
  id: string;
  name: string;
  description: string;
  locations: Map<LocationId, Location>;
  entities: Map<EntityId, Entity>;
  flags: Map<string, boolean>;
  counters: Map<string, number>;
  lore: LoreEntry[];
}

export interface LoreEntry {
  id: string;
  category: string;
  content: string;
  isPublicKnowledge: boolean;
  relatedEntities?: EntityId[];
}

// ============================================================================
// Session State
// ============================================================================

export interface GameSession {
  id: SessionId;
  worldStateId: string;
  personaId: PersonaId;
  currentScene: Scene;
  playerCharacters: CharacterSheet[];
  conversationHistory: Turn[];
  combat?: CombatState;
  gamePreferences: PlayerGamePreferences;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Snapshot Types
// ============================================================================

export interface GameSnapshot {
  id: SnapshotId;
  sessionId: SessionId;
  createdAt: Date;
  label?: string;
  worldState: WorldState;
  sessionState: Omit<GameSession, 'conversationHistory'>;
  contextCache: {
    narrativeSummary: string;
    recentMoments: string[];
    activeThreads: string[];
  };
  turnLog: Turn[];
  diceRolls: DiceRoll[];
}

// ============================================================================
// LLM Types
// ============================================================================

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: LLMToolCall[];
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  tools?: LLMTool[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMToolCallRequest {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMCompletionResponse {
  content: string | null;
  toolCalls?: LLMToolCallRequest[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Campaign & Story Types
// ============================================================================

/**
 * Campaign setting reference - can be a world overlay ID or custom setting
 */
export interface CampaignSetting {
  /** World overlay ID if using an overlay */
  overlayId?: string;
  /** Custom setting name */
  name: string;
  /** Setting description */
  description: string;
  /** Starting location */
  startingLocationId?: LocationId;
}

/**
 * Objective status tracking
 */
export type ObjectiveStatus = 'unknown' | 'discovered' | 'active' | 'completed' | 'failed' | 'abandoned';

/**
 * Objective type classification
 */
export type ObjectiveType = 'main' | 'side' | 'hidden' | 'bonus';

/**
 * Rewards for completing objectives
 */
export interface ObjectiveReward {
  /** XP reward */
  xp?: number;
  /** Gold reward */
  gold?: number;
  /** Item rewards (entity IDs) */
  items?: EntityId[];
  /** Faction reputation changes */
  reputation?: Array<{
    factionId: EntityId;
    change: number;
  }>;
  /** Custom reward description */
  custom?: string;
}

/**
 * Single objective within a quest or chapter
 */
export interface Objective {
  id: ObjectiveId;
  /** Short title */
  title: string;
  /** Full description */
  description: string;
  /** Objective classification */
  type: ObjectiveType;
  /** Current status */
  status: ObjectiveStatus;
  /** IDs of objectives that must be completed first */
  prerequisites?: ObjectiveId[];
  /** Rewards for completion */
  rewards?: ObjectiveReward;
  /** Optional progress tracking (0-100) */
  progress?: number;
  /** Optional hint for players */
  hint?: string;
  /** Whether this objective has been revealed to players */
  isRevealed: boolean;
}

/**
 * Quest - a standalone story unit with objectives
 */
export interface Quest {
  id: QuestId;
  /** Quest name */
  name: string;
  /** Quest description/summary */
  description: string;
  /** NPC who gave this quest */
  questGiverId?: EntityId;
  /** Location where quest was received */
  originLocationId?: LocationId;
  /** Quest objectives */
  objectives: Objective[];
  /** Overall quest status */
  status: ObjectiveStatus;
  /** Chapter this quest belongs to */
  chapterId?: ChapterId;
  /** Is this a main story quest? */
  isMainQuest: boolean;
  /** Recommended level range */
  levelRange?: { min: number; max: number };
  /** Tags for categorization */
  tags?: string[];
  /** When the quest was started */
  startedAt?: Date;
  /** When the quest was completed/failed */
  endedAt?: Date;
}

/**
 * Chapter - major story segment
 */
export interface Chapter {
  id: ChapterId;
  /** Chapter number for ordering */
  number: number;
  /** Chapter name */
  name: string;
  /** Synopsis of what happens in this chapter */
  synopsis: string;
  /** Key objectives to complete the chapter */
  objectives: Objective[];
  /** Key locations featured in this chapter */
  keyLocations: LocationId[];
  /** Key NPCs featured in this chapter */
  keyNPCs: EntityId[];
  /** Suggested player level for this chapter */
  suggestedLevel: number;
  /** Quests available in this chapter */
  questIds: QuestId[];
  /** Chapter completion status */
  status: 'locked' | 'active' | 'completed';
  /** Requirements to unlock this chapter */
  prerequisites?: {
    completedChapters?: ChapterId[];
    completedObjectives?: ObjectiveId[];
    minLevel?: number;
  };
}

/**
 * Major plot decision tracked for story branching
 */
export interface PlotDecision {
  id: string;
  /** Description of the decision point */
  description: string;
  /** The choice made */
  choice: string;
  /** When the decision was made */
  timestamp: Date;
  /** Which chapter this occurred in */
  chapterId?: ChapterId;
  /** Consequences of this decision */
  consequences?: string[];
  /** Affected entities */
  affectedEntities?: EntityId[];
}

/**
 * Story state tracking major narrative elements
 */
export interface StoryState {
  /** Current chapter being played */
  currentChapterId?: ChapterId;
  /** All chapters in the campaign */
  chapters: Chapter[];
  /** All quests (active and completed) */
  quests: Quest[];
  /** Major plot decisions made */
  decisions: PlotDecision[];
  /** Faction reputation tracking */
  factionReputation: Record<string, number>;
  /** Story flags for conditional content */
  storyFlags: Record<string, boolean>;
  /** Story counters for tracking */
  storyCounters: Record<string, number>;
  /** Known lore entries (discovered by players) */
  discoveredLore: string[];
}

/**
 * Complete campaign definition
 */
export interface Campaign {
  id: CampaignId;
  /** Campaign name */
  name: string;
  /** Campaign description/premise */
  description: string;
  /** Long-form introduction for players */
  introduction: string;
  /** Campaign setting information */
  setting: CampaignSetting;
  /** Recommended level range for the campaign */
  levelRange: { min: number; max: number };
  /** Chapters in order */
  chapters: Chapter[];
  /** Associated world state ID */
  worldStateId: string;
  /** Story state tracking */
  storyState: StoryState;
  /** Campaign metadata */
  metadata: {
    author?: string;
    version: string;
    tags?: string[];
    estimatedSessions?: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Campaign summary for listings/selection
 */
export interface CampaignSummary {
  id: CampaignId;
  name: string;
  description: string;
  levelRange: { min: number; max: number };
  chapterCount: number;
  questCount: number;
  tags?: string[];
  progress?: {
    currentChapter: number;
    totalChapters: number;
    completedQuests: number;
    totalQuests: number;
  };
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const DiceRollSchema = z.object({
  notation: z.string(),
  results: z.array(z.number()),
  total: z.number(),
  purpose: z.string(),
});

export const AbilityCheckResultSchema = z.object({
  ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
  skill: z.string().optional(),
  dc: z.number(),
  roll: z.number(),
  modifier: z.number(),
  total: z.number(),
  success: z.boolean(),
});

export const AttackRollResultSchema = z.object({
  attackRoll: z.number(),
  modifier: z.number(),
  total: z.number(),
  targetAC: z.number(),
  hit: z.boolean(),
  critical: z.boolean(),
  damage: z.number().optional(),
  damageType: z.string().optional(),
});

export const GameActionSchema = z.object({
  actionType: z.enum(['attack', 'cast_spell', 'move', 'interact', 'dialogue', 'skill_check', 'other']),
  target: z.string().optional(),
  skillCheck: z.string().optional(),
  difficulty: z.number().min(1).max(30).optional(),
  narrativeDescription: z.string(),
});

export type AbilityCheckResult = z.infer<typeof AbilityCheckResultSchema>;
export type AttackRollResult = z.infer<typeof AttackRollResultSchema>;
export type GameAction = z.infer<typeof GameActionSchema>;
