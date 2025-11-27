/**
 * Game Bridge Implementation
 *
 * Connects web clients to the game engine via SessionOrchestrator.
 */

import {
  SessionOrchestrator,
  type SessionOrchestratorConfig,
  type SessionEvents,
} from '@ai-dm/application';
import type { LLMAdapter } from '@ai-dm/infrastructure';
import {
  type SessionId,
  type WorldState,
  type DMPersona,
  type CombatState,
  type Turn,
  createSessionId,
  createLocationId,
} from '@ai-dm/shared';

import {
  type IGameBridge,
  type PlayerId,
  type SessionToken,
  type SessionInfo,
  type SessionStatus,
  type CreateSessionConfig,
  type PlayerCommand,
  type CommandResult,
  type GameEvent,
  type EventHandler,
  type Unsubscribe,
  type GameStateSnapshot,
  createSessionToken,
} from './types.js';

// =============================================================================
// Internal Types
// =============================================================================

interface ManagedSession {
  id: SessionId;
  name: string;
  token: SessionToken;
  orchestrator: SessionOrchestrator;
  worldState: WorldState;
  persona: DMPersona;
  players: Set<PlayerId>;
  maxPlayers: number;
  status: SessionStatus;
  createdAt: Date;
  subscribers: Map<PlayerId, EventHandler>;
}

// =============================================================================
// Game Bridge Implementation
// =============================================================================

export class GameBridge implements IGameBridge {
  private sessions: Map<SessionId, ManagedSession> = new Map();
  private llmAdapter: LLMAdapter;
  private worldStateLoader: (id: string) => Promise<WorldState>;
  private personaLoader: (id: string) => Promise<DMPersona>;

  constructor(config: {
    llmAdapter: LLMAdapter;
    worldStateLoader: (id: string) => Promise<WorldState>;
    personaLoader: (id: string) => Promise<DMPersona>;
  }) {
    this.llmAdapter = config.llmAdapter;
    this.worldStateLoader = config.worldStateLoader;
    this.personaLoader = config.personaLoader;
  }

  /**
   * Create a new game session
   */
  async createSession(
    playerId: PlayerId,
    config: CreateSessionConfig
  ): Promise<SessionInfo> {
    // Load world state and persona
    const worldState = await this.worldStateLoader(config.worldStateId);
    const persona = await this.personaLoader(config.personaId);

    const sessionId = createSessionId(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const token = createSessionToken();

    // Create event handlers that emit to subscribers
    const emitEvent = (event: GameEvent) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        for (const handler of session.subscribers.values()) {
          try {
            handler(event);
          } catch (e) {
            console.error('Error in event handler:', e);
          }
        }
      }
    };

    const sessionEvents: SessionEvents = {
      onTurnStart: (turn) => {
        emitEvent({
          type: 'turn_changed',
          sessionId,
          timestamp: new Date(),
          currentTurn: turn,
        });
      },
      onTurnEnd: (turn: Turn) => {
        // Narrative content is emitted on turn end
        if (turn.role === 'dm') {
          emitEvent({
            type: 'narrative',
            sessionId,
            timestamp: new Date(),
            content: turn.content,
            speaker: 'DM',
          });
        }
      },
      onToolCall: (name, args, result) => {
        // Emit dice roll events
        if (name === 'roll_dice' && result && typeof result === 'object') {
          const rollResult = result as { notation: string; results: number[]; total: number };
          emitEvent({
            type: 'dice_rolled',
            sessionId,
            timestamp: new Date(),
            roll: {
              notation: rollResult.notation,
              results: rollResult.results,
              total: rollResult.total,
              purpose: (args['purpose'] as string) || 'roll',
            },
          });
        }
      },
      onStreamChunk: (chunk) => {
        emitEvent({
          type: 'narrative',
          sessionId,
          timestamp: new Date(),
          content: chunk,
          isStreaming: true,
        });
      },
      onCombatStart: (state: CombatState) => {
        emitEvent({
          type: 'combat_started',
          sessionId,
          timestamp: new Date(),
          combat: state,
        });
      },
      onCombatEnd: () => {
        emitEvent({
          type: 'combat_ended',
          sessionId,
          timestamp: new Date(),
        });
      },
      onError: (error: Error) => {
        emitEvent({
          type: 'error',
          sessionId,
          timestamp: new Date(),
          error: error.message,
        });
      },
    };

    // Create orchestrator config
    const orchestratorConfig: SessionOrchestratorConfig = {
      llmAdapter: this.llmAdapter,
      worldState,
      persona,
      startingLocationId: createLocationId(config.startingLocationId),
      events: sessionEvents,
    };

    // Create orchestrator
    const orchestrator = new SessionOrchestrator(orchestratorConfig);
    orchestrator.initialize(worldState);

    // Create managed session
    const managedSession: ManagedSession = {
      id: sessionId,
      name: config.name,
      token,
      orchestrator,
      worldState,
      persona,
      players: new Set([playerId]),
      maxPlayers: config.maxPlayers ?? 6,
      status: 'lobby',
      createdAt: new Date(),
      subscribers: new Map(),
    };

    this.sessions.set(sessionId, managedSession);

    // Emit player joined event
    emitEvent({
      type: 'player_joined',
      sessionId,
      timestamp: new Date(),
      playerId,
      playerName: playerId, // TODO: Get actual player name
    });

    return this.getSessionInfo(managedSession);
  }

  /**
   * Join an existing session
   */
  async joinSession(
    playerId: PlayerId,
    sessionId: SessionId,
    token: SessionToken
  ): Promise<SessionInfo> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.token !== token) {
      throw new Error('Invalid session token');
    }

    if (session.players.size >= session.maxPlayers) {
      throw new Error('Session is full');
    }

    if (session.status === 'ended') {
      throw new Error('Session has ended');
    }

    session.players.add(playerId);

    // Emit player joined event
    this.emitToSession(sessionId, {
      type: 'player_joined',
      sessionId,
      timestamp: new Date(),
      playerId,
      playerName: playerId,
    });

    return this.getSessionInfo(session);
  }

  /**
   * Leave a session
   */
  async leaveSession(playerId: PlayerId, sessionId: SessionId): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    session.players.delete(playerId);
    session.subscribers.delete(playerId);

    // Emit player left event
    this.emitToSession(sessionId, {
      type: 'player_left',
      sessionId,
      timestamp: new Date(),
      playerId,
    });

    // If no players left, end the session
    if (session.players.size === 0) {
      await this.endSession(sessionId);
    }
  }

  /**
   * Execute a player command
   */
  async executeCommand(
    sessionId: SessionId,
    playerId: PlayerId,
    command: PlayerCommand
  ): Promise<CommandResult> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (!session.players.has(playerId)) {
      return { success: false, error: 'Player not in session' };
    }

    if (session.status !== 'active') {
      // Auto-start session if in lobby
      if (session.status === 'lobby') {
        session.status = 'active';
        this.emitToSession(sessionId, {
          type: 'session_status_changed',
          sessionId,
          timestamp: new Date(),
          status: 'active',
        });

        // Get initial description
        const initialDescription = await session.orchestrator.getInitialDescription(
          session.persona
        );

        return {
          success: true,
          response: initialDescription,
        };
      }

      return { success: false, error: `Session is ${session.status}` };
    }

    try {
      // Convert command to player input string
      const input = this.commandToInput(command);

      // Process through orchestrator
      const response = await session.orchestrator.processPlayerInput(
        input,
        session.persona
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current game state
   */
  async getState(sessionId: SessionId): Promise<GameStateSnapshot | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    const gameSession = session.orchestrator.getSession();
    const combatManager = session.orchestrator.getCombatManager();

    return {
      session: gameSession,
      worldState: session.worldState,
      combat: combatManager.getState(),
    };
  }

  /**
   * Subscribe to session events
   */
  subscribe(
    sessionId: SessionId,
    playerId: PlayerId,
    handler: EventHandler
  ): Unsubscribe {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.subscribers.set(playerId, handler);

    return () => {
      session.subscribers.delete(playerId);
    };
  }

  /**
   * List active sessions
   */
  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.status !== 'ended')
      .map((s) => this.getSessionInfo(s));
  }

  /**
   * Get session info by ID
   */
  getSession(sessionId: SessionId): SessionInfo | null {
    const session = this.sessions.get(sessionId);
    return session ? this.getSessionInfo(session) : null;
  }

  /**
   * End a session
   */
  async endSession(sessionId: SessionId): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    session.status = 'ended';

    this.emitToSession(sessionId, {
      type: 'session_status_changed',
      sessionId,
      timestamp: new Date(),
      status: 'ended',
    });

    // Clear subscribers
    session.subscribers.clear();

    // Remove session after a delay to allow cleanup
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 5000);
  }

  /**
   * Start a session (move from lobby to active)
   */
  async startSession(sessionId: SessionId): Promise<string> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'lobby') {
      throw new Error(`Session is already ${session.status}`);
    }

    session.status = 'active';

    this.emitToSession(sessionId, {
      type: 'session_status_changed',
      sessionId,
      timestamp: new Date(),
      status: 'active',
    });

    // Get initial description
    const initialDescription = await session.orchestrator.getInitialDescription(
      session.persona
    );

    return initialDescription;
  }

  /**
   * Pause a session
   */
  pauseSession(sessionId: SessionId): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot pause session in ${session.status} state`);
    }

    session.status = 'paused';

    this.emitToSession(sessionId, {
      type: 'session_status_changed',
      sessionId,
      timestamp: new Date(),
      status: 'paused',
    });
  }

  /**
   * Resume a paused session
   */
  resumeSession(sessionId: SessionId): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Cannot resume session in ${session.status} state`);
    }

    session.status = 'active';

    this.emitToSession(sessionId, {
      type: 'session_status_changed',
      sessionId,
      timestamp: new Date(),
      status: 'active',
    });
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private getSessionInfo(session: ManagedSession): SessionInfo {
    return {
      id: session.id,
      name: session.name,
      token: session.token,
      createdAt: session.createdAt,
      playerCount: session.players.size,
      maxPlayers: session.maxPlayers,
      status: session.status,
    };
  }

  private emitToSession(sessionId: SessionId, event: GameEvent): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      for (const handler of session.subscribers.values()) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in event handler:', e);
        }
      }
    }
  }

  private commandToInput(command: PlayerCommand): string {
    switch (command.type) {
      case 'say':
        return command.content;
      case 'action':
        return `I ${command.action}`;
      case 'roll':
        return command.purpose
          ? `I roll ${command.notation} for ${command.purpose}`
          : `I roll ${command.notation}`;
      case 'examine':
        return `I examine ${command.target}`;
      case 'move':
        return `I go ${command.direction}`;
      case 'attack':
        return `I attack ${command.targetId}`;
      case 'cast':
        return command.targetId
          ? `I cast ${command.spellName} on ${command.targetId}`
          : `I cast ${command.spellName}`;
      case 'use':
        return command.targetId
          ? `I use ${command.itemId} on ${command.targetId}`
          : `I use ${command.itemId}`;
      case 'rest':
        return `I take a ${command.restType} rest`;
      default:
        return 'I wait';
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

export interface GameBridgeConfig {
  llmAdapter: LLMAdapter;
  worldStateLoader: (id: string) => Promise<WorldState>;
  personaLoader: (id: string) => Promise<DMPersona>;
}

export function createGameBridge(config: GameBridgeConfig): GameBridge {
  return new GameBridge(config);
}
