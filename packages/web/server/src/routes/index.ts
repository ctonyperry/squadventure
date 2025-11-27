/**
 * REST API Routes
 *
 * Provides endpoints for session management and command execution.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SessionId } from '@ai-dm/shared';
import { createSessionId } from '@ai-dm/shared';
import type {
  GameBridge,
  CreateSessionConfig,
  PlayerCommand,
  PlayerId,
  SessionToken,
} from '../bridge/index.js';
import { createPlayerId } from '../bridge/index.js';

// =============================================================================
// Types
// =============================================================================

interface SessionRouteContext {
  gameBridge: GameBridge | null;
}

// Module-level state
let routeContext: SessionRouteContext = {
  gameBridge: null,
};

/**
 * Set the game bridge for route handlers
 */
export function setRouteBridge(bridge: GameBridge): void {
  routeContext.gameBridge = bridge;
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register all REST routes
 */
export function registerRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // Session Management API (#25)
  // ==========================================================================

  /**
   * Create a new game session
   * POST /api/sessions
   */
  fastify.post<{
    Body: CreateSessionConfig & { playerId?: string };
  }>('/api/sessions', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const playerId = createPlayerId(
        request.body.playerId ?? `player_${Date.now()}`
      );

      const createConfig: CreateSessionConfig = {
        name: request.body.name,
        personaId: request.body.personaId,
        worldStateId: request.body.worldStateId,
        startingLocationId: request.body.startingLocationId,
      };
      if (request.body.maxPlayers !== undefined) {
        createConfig.maxPlayers = request.body.maxPlayers;
      }

      const sessionInfo = await routeContext.gameBridge.createSession(
        playerId,
        createConfig
      );

      return {
        success: true,
        session: {
          id: sessionInfo.id,
          name: sessionInfo.name,
          token: sessionInfo.token,
          status: sessionInfo.status,
          playerCount: sessionInfo.playerCount,
          maxPlayers: sessionInfo.maxPlayers,
          createdAt: sessionInfo.createdAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get session info
   * GET /api/sessions/:id
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/sessions/:id', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    const sessionId = createSessionId(request.params.id);
    const session = routeContext.gameBridge.getSession(sessionId);

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    return {
      id: session.id,
      name: session.name,
      status: session.status,
      playerCount: session.playerCount,
      maxPlayers: session.maxPlayers,
      createdAt: session.createdAt.toISOString(),
    };
  });

  /**
   * List all active sessions
   * GET /api/sessions
   */
  fastify.get('/api/sessions', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    const sessions = routeContext.gameBridge.listSessions();

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        playerCount: s.playerCount,
        maxPlayers: s.maxPlayers,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  });

  /**
   * Join an existing session
   * POST /api/sessions/:id/join
   */
  fastify.post<{
    Params: { id: string };
    Body: { playerId: string; token: string };
  }>('/api/sessions/:id/join', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      const playerId = createPlayerId(request.body.playerId);
      const token = request.body.token as SessionToken;

      const sessionInfo = await routeContext.gameBridge.joinSession(
        playerId,
        sessionId,
        token
      );

      return {
        success: true,
        session: {
          id: sessionInfo.id,
          name: sessionInfo.name,
          status: sessionInfo.status,
          playerCount: sessionInfo.playerCount,
          maxPlayers: sessionInfo.maxPlayers,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join session';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Start a session (move from lobby to active)
   * POST /api/sessions/:id/start
   */
  fastify.post<{
    Params: { id: string };
  }>('/api/sessions/:id/start', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      const initialDescription = await routeContext.gameBridge.startSession(sessionId);

      return {
        success: true,
        initialDescription,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Pause a session
   * POST /api/sessions/:id/pause
   */
  fastify.post<{
    Params: { id: string };
  }>('/api/sessions/:id/pause', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      routeContext.gameBridge.pauseSession(sessionId);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pause session';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Resume a paused session
   * POST /api/sessions/:id/resume
   */
  fastify.post<{
    Params: { id: string };
  }>('/api/sessions/:id/resume', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      routeContext.gameBridge.resumeSession(sessionId);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resume session';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * End a session
   * DELETE /api/sessions/:id
   */
  fastify.delete<{
    Params: { id: string };
  }>('/api/sessions/:id', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      await routeContext.gameBridge.endSession(sessionId);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end session';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get session state
   * GET /api/sessions/:id/state
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/sessions/:id/state', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    const sessionId = createSessionId(request.params.id);
    const state = await routeContext.gameBridge.getState(sessionId);

    if (!state) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    return state;
  });

  // ==========================================================================
  // Command Execution API (#24)
  // ==========================================================================

  /**
   * Execute a player command
   * POST /api/sessions/:id/command
   */
  fastify.post<{
    Params: { id: string };
    Body: { playerId: string; command: PlayerCommand };
  }>('/api/sessions/:id/command', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      const playerId = createPlayerId(request.body.playerId);

      const result = await routeContext.gameBridge.executeCommand(
        sessionId,
        playerId,
        request.body.command
      );

      if (result.success) {
        return {
          success: true,
          response: result.response,
        };
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command execution failed';
      return reply.code(500).send({ error: message });
    }
  });

  /**
   * Send a chat message (shorthand for say command)
   * POST /api/sessions/:id/chat
   */
  fastify.post<{
    Params: { id: string };
    Body: { playerId: string; message: string };
  }>('/api/sessions/:id/chat', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      const playerId = createPlayerId(request.body.playerId);

      const result = await routeContext.gameBridge.executeCommand(
        sessionId,
        playerId,
        { type: 'say', content: request.body.message }
      );

      if (result.success) {
        return {
          success: true,
          response: result.response,
        };
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed';
      return reply.code(500).send({ error: message });
    }
  });

  /**
   * Roll dice
   * POST /api/sessions/:id/roll
   */
  fastify.post<{
    Params: { id: string };
    Body: { playerId: string; notation: string; purpose?: string };
  }>('/api/sessions/:id/roll', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return reply.code(503).send({ error: 'Service unavailable' });
    }

    try {
      const sessionId = createSessionId(request.params.id);
      const playerId = createPlayerId(request.body.playerId);

      const rollCommand: PlayerCommand = {
        type: 'roll',
        notation: request.body.notation,
      };
      if (request.body.purpose !== undefined) {
        rollCommand.purpose = request.body.purpose;
      }

      const result = await routeContext.gameBridge.executeCommand(
        sessionId,
        playerId,
        rollCommand
      );

      if (result.success) {
        return {
          success: true,
          response: result.response,
        };
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Roll failed';
      return reply.code(500).send({ error: message });
    }
  });

  // ==========================================================================
  // Legacy Routes (backward compatibility)
  // ==========================================================================

  /**
   * Get full game state (legacy)
   */
  fastify.get('/api/state', async (request, reply) => {
    if (!routeContext.gameBridge) {
      return { world: {}, entities: {}, party: {}, combat: null, conversation: { history: [] } };
    }

    const sessions = routeContext.gameBridge.listSessions();
    if (sessions.length === 0) {
      return { world: {}, entities: {}, party: {}, combat: null, conversation: { history: [] } };
    }

    const state = await routeContext.gameBridge.getState(sessions[0]!.id);
    return state ?? { world: {}, entities: {}, party: {}, combat: null, conversation: { history: [] } };
  });
}
