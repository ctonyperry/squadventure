import { z } from 'zod';

// ============================================================================
// Core ID Types
// ============================================================================

export type EntityId = string & { readonly __brand: 'EntityId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type PersonaId = string & { readonly __brand: 'PersonaId' };
export type SnapshotId = string & { readonly __brand: 'SnapshotId' };

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
  features: string[];
  proficiencies: {
    armor: string[];
    weapons: string[];
    tools: string[];
    languages: string[];
  };
}

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

export interface PlayerProfile {
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
  playerProfile: PlayerProfile;
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
