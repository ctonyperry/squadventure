/**
 * Game Bridge Types
 *
 * Types for the game engine bridge layer.
 */

import type {
  SessionId,
  GameSession,
  WorldState,
  DMPersona,
  Turn,
  CombatState,
  DiceRoll,
} from '@ai-dm/shared';

// =============================================================================
// Session Types
// =============================================================================

/**
 * Unique identifier for a player/client
 */
export type PlayerId = string & { readonly __brand: 'PlayerId' };

export function createPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

/**
 * Session token for authentication
 */
export type SessionToken = string & { readonly __brand: 'SessionToken' };

export function createSessionToken(): SessionToken {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') as SessionToken;
}

/**
 * Configuration for creating a new game session
 */
export interface CreateSessionConfig {
  /** Name for the session */
  name: string;
  /** DM persona to use */
  personaId: string;
  /** World state ID */
  worldStateId: string;
  /** Starting location ID */
  startingLocationId: string;
  /** Maximum number of players */
  maxPlayers?: number;
}

/**
 * Session metadata visible to clients
 */
export interface SessionInfo {
  id: SessionId;
  name: string;
  token: SessionToken;
  createdAt: Date;
  playerCount: number;
  maxPlayers: number;
  status: SessionStatus;
}

export type SessionStatus = 'lobby' | 'active' | 'paused' | 'ended';

// =============================================================================
// Command Types
// =============================================================================

/**
 * Commands that can be executed through the bridge
 */
export type PlayerCommand =
  | { type: 'say'; content: string }
  | { type: 'action'; action: string }
  | { type: 'roll'; notation: string; purpose?: string }
  | { type: 'examine'; target: string }
  | { type: 'move'; direction: string }
  | { type: 'attack'; targetId: string }
  | { type: 'cast'; spellName: string; targetId?: string }
  | { type: 'use'; itemId: string; targetId?: string }
  | { type: 'rest'; restType: 'short' | 'long' };

/**
 * Result of command execution
 */
export interface CommandResult {
  success: boolean;
  response?: string;
  error?: string;
  events?: GameEvent[];
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Events emitted by the game engine
 */
export type GameEventType =
  | 'narrative'
  | 'dice_rolled'
  | 'combat_started'
  | 'combat_ended'
  | 'turn_changed'
  | 'entity_updated'
  | 'location_changed'
  | 'state_changed'
  | 'player_joined'
  | 'player_left'
  | 'session_status_changed'
  | 'error';

export interface BaseGameEvent {
  type: GameEventType;
  sessionId: SessionId;
  timestamp: Date;
}

export interface NarrativeEvent extends BaseGameEvent {
  type: 'narrative';
  content: string;
  speaker?: string;
  isStreaming?: boolean;
}

export interface DiceRolledEvent extends BaseGameEvent {
  type: 'dice_rolled';
  roll: DiceRoll;
  entityId?: string;
}

export interface CombatStartedEvent extends BaseGameEvent {
  type: 'combat_started';
  combat: CombatState;
}

export interface CombatEndedEvent extends BaseGameEvent {
  type: 'combat_ended';
  outcome?: 'victory' | 'defeat' | 'fled' | 'negotiated';
}

export interface TurnChangedEvent extends BaseGameEvent {
  type: 'turn_changed';
  currentTurn: 'player' | 'dm';
  activeEntityId?: string;
}

export interface EntityUpdatedEvent extends BaseGameEvent {
  type: 'entity_updated';
  entityId: string;
  changes: Record<string, unknown>;
}

export interface LocationChangedEvent extends BaseGameEvent {
  type: 'location_changed';
  locationId: string;
  locationName: string;
}

export interface StateChangedEvent extends BaseGameEvent {
  type: 'state_changed';
  delta: Record<string, unknown>;
}

export interface PlayerJoinedEvent extends BaseGameEvent {
  type: 'player_joined';
  playerId: PlayerId;
  playerName: string;
}

export interface PlayerLeftEvent extends BaseGameEvent {
  type: 'player_left';
  playerId: PlayerId;
}

export interface SessionStatusChangedEvent extends BaseGameEvent {
  type: 'session_status_changed';
  status: SessionStatus;
}

export interface ErrorEvent extends BaseGameEvent {
  type: 'error';
  error: string;
  code?: string;
}

export type GameEvent =
  | NarrativeEvent
  | DiceRolledEvent
  | CombatStartedEvent
  | CombatEndedEvent
  | TurnChangedEvent
  | EntityUpdatedEvent
  | LocationChangedEvent
  | StateChangedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | SessionStatusChangedEvent
  | ErrorEvent;

// =============================================================================
// Bridge Interface
// =============================================================================

/**
 * Event handler for game events
 */
export type EventHandler = (event: GameEvent) => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * Game state snapshot
 */
export interface GameStateSnapshot {
  session: GameSession;
  worldState: WorldState;
  combat: CombatState | null;
}

/**
 * Game Bridge interface
 */
export interface IGameBridge {
  /**
   * Create a new game session
   */
  createSession(
    playerId: PlayerId,
    config: CreateSessionConfig
  ): Promise<SessionInfo>;

  /**
   * Join an existing session
   */
  joinSession(
    playerId: PlayerId,
    sessionId: SessionId,
    token: SessionToken
  ): Promise<SessionInfo>;

  /**
   * Leave a session
   */
  leaveSession(playerId: PlayerId, sessionId: SessionId): Promise<void>;

  /**
   * Execute a player command
   */
  executeCommand(
    sessionId: SessionId,
    playerId: PlayerId,
    command: PlayerCommand
  ): Promise<CommandResult>;

  /**
   * Get current game state
   */
  getState(sessionId: SessionId): Promise<GameStateSnapshot | null>;

  /**
   * Subscribe to session events
   */
  subscribe(
    sessionId: SessionId,
    playerId: PlayerId,
    handler: EventHandler
  ): Unsubscribe;

  /**
   * List active sessions
   */
  listSessions(): SessionInfo[];

  /**
   * Get session info by ID
   */
  getSession(sessionId: SessionId): SessionInfo | null;

  /**
   * End a session
   */
  endSession(sessionId: SessionId): Promise<void>;
}
