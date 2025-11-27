/**
 * Turn Coordination System
 *
 * Manages turn order and coordination for multi-player sessions.
 */

import type { SessionId, PlayerId, EntityId } from '@ai-dm/shared';

// =============================================================================
// Turn Types
// =============================================================================

/**
 * Turn mode - how turns are managed
 */
export type TurnMode = 'free' | 'round-robin' | 'initiative' | 'dm-controlled';

/**
 * Turn participant - an entity that can take turns
 */
export interface TurnParticipant {
  /** Entity ID (character or NPC) */
  entityId: EntityId;
  /** Controlling player ID (null for AI/NPC controlled) */
  playerId: PlayerId | null;
  /** Display name */
  name: string;
  /** Initiative roll (for initiative mode) */
  initiative: number;
  /** Whether this participant has acted this round */
  hasActed: boolean;
  /** Whether participant is active (not unconscious/dead/etc) */
  isActive: boolean;
  /** Reaction available this round */
  hasReaction: boolean;
  /** Bonus action available this turn */
  hasBonusAction: boolean;
}

/**
 * Turn history entry
 */
export interface TurnHistoryEntry {
  round: number;
  turnIndex: number;
  participantId: EntityId;
  playerId: PlayerId | null;
  startedAt: Date;
  endedAt?: Date;
  action?: string;
  skipped: boolean;
  timedOut: boolean;
}

/**
 * Turn state for a session
 */
export interface TurnState {
  mode: TurnMode;
  currentRound: number;
  currentTurnIndex: number;
  participants: TurnParticipant[];
  activeParticipantId: EntityId | null;
  isRoundComplete: boolean;
  roundStartedAt: Date;
  turnStartedAt: Date;
  turnTimeoutMs: number;
  history: TurnHistoryEntry[];
}

/**
 * Turn event types
 */
export type TurnEventType =
  | 'turn_started'
  | 'turn_ended'
  | 'turn_skipped'
  | 'turn_timed_out'
  | 'round_started'
  | 'round_ended'
  | 'initiative_rolled'
  | 'participant_added'
  | 'participant_removed'
  | 'mode_changed';

export interface TurnEvent {
  type: TurnEventType;
  sessionId: SessionId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type TurnEventHandler = (event: TurnEvent) => void;

// =============================================================================
// Turn Configuration
// =============================================================================

export interface TurnConfig {
  mode: TurnMode;
  turnTimeoutMs?: number;
  autoAdvance?: boolean;
}

const DEFAULT_TURN_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Turn Manager
// =============================================================================

export class TurnManager {
  private sessions: Map<SessionId, TurnState> = new Map();
  private eventHandlers: Map<SessionId, Set<TurnEventHandler>> = new Map();
  private timeoutTimers: Map<SessionId, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Initialize turn tracking for a session
   */
  initialize(sessionId: SessionId, config: TurnConfig): TurnState {
    const state: TurnState = {
      mode: config.mode,
      currentRound: 0,
      currentTurnIndex: -1,
      participants: [],
      activeParticipantId: null,
      isRoundComplete: true,
      roundStartedAt: new Date(),
      turnStartedAt: new Date(),
      turnTimeoutMs: config.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT,
      history: [],
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  /**
   * Add a participant to the turn order
   */
  addParticipant(
    sessionId: SessionId,
    entityId: EntityId,
    playerId: PlayerId | null,
    name: string,
    initiative: number = 0
  ): void {
    const state = this.getState(sessionId);
    if (!state) {
      throw new Error('Session not initialized');
    }

    // Check if already exists
    const existing = state.participants.find((p) => p.entityId === entityId);
    if (existing) {
      return;
    }

    const participant: TurnParticipant = {
      entityId,
      playerId,
      name,
      initiative,
      hasActed: false,
      isActive: true,
      hasReaction: true,
      hasBonusAction: true,
    };

    state.participants.push(participant);

    // Re-sort by initiative if in initiative mode
    if (state.mode === 'initiative') {
      this.sortByInitiative(state);
    }

    this.emitEvent(sessionId, {
      type: 'participant_added',
      sessionId,
      timestamp: new Date(),
      data: { entityId, name, playerId, initiative },
    });
  }

  /**
   * Remove a participant from the turn order
   */
  removeParticipant(sessionId: SessionId, entityId: EntityId): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    const index = state.participants.findIndex((p) => p.entityId === entityId);
    if (index === -1) {
      return;
    }

    const participant = state.participants[index];
    state.participants.splice(index, 1);

    // Adjust current turn index if needed
    if (index < state.currentTurnIndex) {
      state.currentTurnIndex--;
    } else if (index === state.currentTurnIndex) {
      // Current participant removed, move to next
      if (state.currentTurnIndex >= state.participants.length) {
        state.currentTurnIndex = 0;
      }
      this.updateActiveParticipant(sessionId, state);
    }

    this.emitEvent(sessionId, {
      type: 'participant_removed',
      sessionId,
      timestamp: new Date(),
      data: { entityId, name: participant?.name },
    });
  }

  /**
   * Roll initiative for a participant
   */
  setInitiative(sessionId: SessionId, entityId: EntityId, initiative: number): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    const participant = state.participants.find((p) => p.entityId === entityId);
    if (participant) {
      participant.initiative = initiative;

      if (state.mode === 'initiative') {
        this.sortByInitiative(state);
      }

      this.emitEvent(sessionId, {
        type: 'initiative_rolled',
        sessionId,
        timestamp: new Date(),
        data: { entityId, name: participant.name, initiative },
      });
    }
  }

  /**
   * Start a new round
   */
  startRound(sessionId: SessionId): void {
    const state = this.getState(sessionId);
    if (!state) {
      throw new Error('Session not initialized');
    }

    if (state.participants.length === 0) {
      throw new Error('No participants in turn order');
    }

    // Reset all participants for new round
    for (const p of state.participants) {
      p.hasActed = false;
      p.hasReaction = true;
    }

    state.currentRound++;
    state.currentTurnIndex = 0;
    state.isRoundComplete = false;
    state.roundStartedAt = new Date();

    this.emitEvent(sessionId, {
      type: 'round_started',
      sessionId,
      timestamp: new Date(),
      data: { round: state.currentRound },
    });

    // Start first turn
    this.startTurn(sessionId);
  }

  /**
   * Start the current participant's turn
   */
  private startTurn(sessionId: SessionId): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    const participant = state.participants[state.currentTurnIndex];
    if (!participant) {
      return;
    }

    state.turnStartedAt = new Date();
    state.activeParticipantId = participant.entityId;
    participant.hasBonusAction = true;

    this.emitEvent(sessionId, {
      type: 'turn_started',
      sessionId,
      timestamp: new Date(),
      data: {
        round: state.currentRound,
        turnIndex: state.currentTurnIndex,
        entityId: participant.entityId,
        playerId: participant.playerId,
        name: participant.name,
      },
    });

    // Set timeout
    this.setTurnTimeout(sessionId, state);
  }

  /**
   * End the current turn and advance
   */
  endTurn(sessionId: SessionId, action?: string): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    this.clearTurnTimeout(sessionId);

    const participant = state.participants[state.currentTurnIndex];
    if (!participant) {
      return;
    }

    participant.hasActed = true;

    // Record history
    const historyEntry: TurnHistoryEntry = {
      round: state.currentRound,
      turnIndex: state.currentTurnIndex,
      participantId: participant.entityId,
      playerId: participant.playerId,
      startedAt: state.turnStartedAt,
      endedAt: new Date(),
      skipped: false,
      timedOut: false,
    };
    if (action !== undefined) {
      historyEntry.action = action;
    }
    state.history.push(historyEntry);

    this.emitEvent(sessionId, {
      type: 'turn_ended',
      sessionId,
      timestamp: new Date(),
      data: {
        round: state.currentRound,
        turnIndex: state.currentTurnIndex,
        entityId: participant.entityId,
        name: participant.name,
        action,
      },
    });

    // Advance to next turn
    this.advanceTurn(sessionId, state);
  }

  /**
   * Skip the current turn
   */
  skipTurn(sessionId: SessionId): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    this.clearTurnTimeout(sessionId);

    const participant = state.participants[state.currentTurnIndex];
    if (!participant) {
      return;
    }

    participant.hasActed = true;

    // Record history
    state.history.push({
      round: state.currentRound,
      turnIndex: state.currentTurnIndex,
      participantId: participant.entityId,
      playerId: participant.playerId,
      startedAt: state.turnStartedAt,
      endedAt: new Date(),
      skipped: true,
      timedOut: false,
    });

    this.emitEvent(sessionId, {
      type: 'turn_skipped',
      sessionId,
      timestamp: new Date(),
      data: {
        round: state.currentRound,
        turnIndex: state.currentTurnIndex,
        entityId: participant.entityId,
        name: participant.name,
      },
    });

    this.advanceTurn(sessionId, state);
  }

  /**
   * Advance to the next turn
   */
  private advanceTurn(sessionId: SessionId, state: TurnState): void {
    // Find next participant who hasn't acted and is active
    let nextIndex = state.currentTurnIndex;
    let checked = 0;

    do {
      nextIndex = (nextIndex + 1) % state.participants.length;
      checked++;

      const nextParticipant = state.participants[nextIndex];
      if (nextParticipant && !nextParticipant.hasActed && nextParticipant.isActive) {
        state.currentTurnIndex = nextIndex;
        this.startTurn(sessionId);
        return;
      }
    } while (checked < state.participants.length);

    // Round is complete
    state.isRoundComplete = true;
    state.activeParticipantId = null;

    this.emitEvent(sessionId, {
      type: 'round_ended',
      sessionId,
      timestamp: new Date(),
      data: { round: state.currentRound },
    });
  }

  /**
   * Get current turn state
   */
  getState(sessionId: SessionId): TurnState | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Get whose turn it is
   */
  getCurrentTurn(sessionId: SessionId): TurnParticipant | null {
    const state = this.getState(sessionId);
    if (!state || state.isRoundComplete || state.currentTurnIndex < 0) {
      return null;
    }
    return state.participants[state.currentTurnIndex] ?? null;
  }

  /**
   * Check if it's a specific player's turn
   */
  isPlayerTurn(sessionId: SessionId, playerId: PlayerId): boolean {
    const current = this.getCurrentTurn(sessionId);
    return current?.playerId === playerId;
  }

  /**
   * Set turn mode
   */
  setMode(sessionId: SessionId, mode: TurnMode): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    const previousMode = state.mode;
    state.mode = mode;

    if (mode === 'initiative') {
      this.sortByInitiative(state);
    }

    this.emitEvent(sessionId, {
      type: 'mode_changed',
      sessionId,
      timestamp: new Date(),
      data: { previousMode, newMode: mode },
    });
  }

  /**
   * Set turn timeout
   */
  setTurnTimeout(sessionId: SessionId, state: TurnState): void {
    if (state.turnTimeoutMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.handleTurnTimeout(sessionId);
    }, state.turnTimeoutMs);

    this.timeoutTimers.set(sessionId, timer);
  }

  /**
   * Clear turn timeout
   */
  private clearTurnTimeout(sessionId: SessionId): void {
    const timer = this.timeoutTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timeoutTimers.delete(sessionId);
    }
  }

  /**
   * Handle turn timeout
   */
  private handleTurnTimeout(sessionId: SessionId): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    const participant = state.participants[state.currentTurnIndex];
    if (!participant) {
      return;
    }

    participant.hasActed = true;

    // Record history
    state.history.push({
      round: state.currentRound,
      turnIndex: state.currentTurnIndex,
      participantId: participant.entityId,
      playerId: participant.playerId,
      startedAt: state.turnStartedAt,
      endedAt: new Date(),
      skipped: false,
      timedOut: true,
    });

    this.emitEvent(sessionId, {
      type: 'turn_timed_out',
      sessionId,
      timestamp: new Date(),
      data: {
        round: state.currentRound,
        turnIndex: state.currentTurnIndex,
        entityId: participant.entityId,
        name: participant.name,
      },
    });

    this.advanceTurn(sessionId, state);
  }

  /**
   * Use participant's reaction
   */
  useReaction(sessionId: SessionId, entityId: EntityId): boolean {
    const state = this.getState(sessionId);
    if (!state) {
      return false;
    }

    const participant = state.participants.find((p) => p.entityId === entityId);
    if (!participant || !participant.hasReaction) {
      return false;
    }

    participant.hasReaction = false;
    return true;
  }

  /**
   * Use participant's bonus action
   */
  useBonusAction(sessionId: SessionId, entityId: EntityId): boolean {
    const state = this.getState(sessionId);
    if (!state) {
      return false;
    }

    const participant = state.participants.find((p) => p.entityId === entityId);
    if (!participant || !participant.hasBonusAction) {
      return false;
    }

    participant.hasBonusAction = false;
    return true;
  }

  /**
   * Set participant active/inactive status
   */
  setParticipantActive(sessionId: SessionId, entityId: EntityId, isActive: boolean): void {
    const state = this.getState(sessionId);
    if (!state) {
      return;
    }

    const participant = state.participants.find((p) => p.entityId === entityId);
    if (participant) {
      participant.isActive = isActive;
    }
  }

  /**
   * Subscribe to turn events
   */
  subscribe(sessionId: SessionId, handler: TurnEventHandler): () => void {
    let handlers = this.eventHandlers.get(sessionId);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(sessionId, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers?.delete(handler);
    };
  }

  /**
   * Clean up session turn state
   */
  cleanup(sessionId: SessionId): void {
    this.clearTurnTimeout(sessionId);
    this.sessions.delete(sessionId);
    this.eventHandlers.delete(sessionId);
  }

  /**
   * Get turn history
   */
  getHistory(sessionId: SessionId, limit?: number): TurnHistoryEntry[] {
    const state = this.getState(sessionId);
    if (!state) {
      return [];
    }

    if (limit !== undefined) {
      return state.history.slice(-limit);
    }
    return [...state.history];
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private sortByInitiative(state: TurnState): void {
    state.participants.sort((a, b) => b.initiative - a.initiative);
  }

  private updateActiveParticipant(sessionId: SessionId, state: TurnState): void {
    const participant = state.participants[state.currentTurnIndex];
    if (participant) {
      state.activeParticipantId = participant.entityId;
      this.startTurn(sessionId);
    } else {
      state.activeParticipantId = null;
    }
  }

  private emitEvent(sessionId: SessionId, event: TurnEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in turn event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const turnManager = new TurnManager();
