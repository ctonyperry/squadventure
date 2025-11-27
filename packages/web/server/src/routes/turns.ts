/**
 * Turn Routes
 *
 * Handles turn coordination for multi-player sessions.
 */

import type { FastifyInstance } from 'fastify';
import { createPlayerId, createSessionId, createEntityId } from '@ai-dm/shared';
import {
  turnManager,
  type TurnMode,
  type TurnConfig,
} from '../turn/index.js';
import { roomManager } from '../room/index.js';
import {
  playerIdentityService,
  type AuthToken,
} from '../identity/index.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract auth token from request header
 */
function extractAuthToken(authHeader: string | undefined): AuthToken | null {
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7) as AuthToken;
  }

  return authHeader as AuthToken;
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register turn routes
 */
export function registerTurnRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // Turn Coordination API (#28)
  // ==========================================================================

  /**
   * Initialize turn tracking for a room
   * POST /api/turns/init
   */
  fastify.post<{
    Body: {
      roomId: string;
      mode?: TurnMode;
      turnTimeoutMs?: number;
    };
  }>('/api/turns/init', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      if (room.hostId !== player.id) {
        return reply.code(403).send({ error: 'Only the host can initialize turns' });
      }

      const config: TurnConfig = {
        mode: request.body.mode ?? 'round-robin',
      };
      if (request.body.turnTimeoutMs !== undefined) {
        config.turnTimeoutMs = request.body.turnTimeoutMs;
      }

      const state = turnManager.initialize(sessionId, config);

      return {
        success: true,
        turnState: {
          mode: state.mode,
          currentRound: state.currentRound,
          participants: state.participants.length,
          turnTimeoutMs: state.turnTimeoutMs,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize turns';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Add a participant to turn order
   * POST /api/turns/participants
   */
  fastify.post<{
    Body: {
      roomId: string;
      entityId: string;
      playerId?: string;
      name: string;
      initiative?: number;
    };
  }>('/api/turns/participants', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      const entityId = createEntityId(request.body.entityId);
      const playerId = request.body.playerId ? createPlayerId(request.body.playerId) : null;

      turnManager.addParticipant(
        sessionId,
        entityId,
        playerId,
        request.body.name,
        request.body.initiative ?? 0
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add participant';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Remove a participant from turn order
   * DELETE /api/turns/participants/:entityId
   */
  fastify.delete<{
    Params: { entityId: string };
    Body: { roomId: string };
  }>('/api/turns/participants/:entityId', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);
      const entityId = createEntityId(request.params.entityId);

      turnManager.removeParticipant(sessionId, entityId);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove participant';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Set initiative for a participant
   * POST /api/turns/initiative
   */
  fastify.post<{
    Body: {
      roomId: string;
      entityId: string;
      initiative: number;
    };
  }>('/api/turns/initiative', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);
      const entityId = createEntityId(request.body.entityId);

      turnManager.setInitiative(sessionId, entityId, request.body.initiative);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set initiative';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Start a new round
   * POST /api/turns/round/start
   */
  fastify.post<{
    Body: { roomId: string };
  }>('/api/turns/round/start', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      if (room.hostId !== player.id) {
        return reply.code(403).send({ error: 'Only the host can start rounds' });
      }

      turnManager.startRound(sessionId);

      const state = turnManager.getState(sessionId);
      const current = turnManager.getCurrentTurn(sessionId);

      return {
        success: true,
        round: state?.currentRound,
        currentTurn: current
          ? {
              entityId: current.entityId,
              playerId: current.playerId,
              name: current.name,
            }
          : null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start round';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * End current turn
   * POST /api/turns/end
   */
  fastify.post<{
    Body: {
      roomId: string;
      action?: string;
    };
  }>('/api/turns/end', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);

      // Check if it's the player's turn
      if (!turnManager.isPlayerTurn(sessionId, player.id)) {
        // Allow DM (host) to end anyone's turn
        const room = roomManager.getRoom(sessionId);
        if (!room || room.hostId !== player.id) {
          return reply.code(403).send({ error: 'Not your turn' });
        }
      }

      turnManager.endTurn(sessionId, request.body.action);

      const state = turnManager.getState(sessionId);
      const current = turnManager.getCurrentTurn(sessionId);

      return {
        success: true,
        round: state?.currentRound,
        isRoundComplete: state?.isRoundComplete,
        currentTurn: current
          ? {
              entityId: current.entityId,
              playerId: current.playerId,
              name: current.name,
            }
          : null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end turn';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Skip current turn
   * POST /api/turns/skip
   */
  fastify.post<{
    Body: { roomId: string };
  }>('/api/turns/skip', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);

      // Check if it's the player's turn or they're the host
      if (!turnManager.isPlayerTurn(sessionId, player.id)) {
        const room = roomManager.getRoom(sessionId);
        if (!room || room.hostId !== player.id) {
          return reply.code(403).send({ error: 'Not your turn' });
        }
      }

      turnManager.skipTurn(sessionId);

      const state = turnManager.getState(sessionId);
      const current = turnManager.getCurrentTurn(sessionId);

      return {
        success: true,
        round: state?.currentRound,
        isRoundComplete: state?.isRoundComplete,
        currentTurn: current
          ? {
              entityId: current.entityId,
              playerId: current.playerId,
              name: current.name,
            }
          : null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip turn';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get current turn state
   * GET /api/turns/:roomId
   */
  fastify.get<{
    Params: { roomId: string };
  }>('/api/turns/:roomId', async (request, reply) => {
    const sessionId = createSessionId(request.params.roomId);
    const state = turnManager.getState(sessionId);

    if (!state) {
      return reply.code(404).send({ error: 'Turn state not found' });
    }

    const current = turnManager.getCurrentTurn(sessionId);

    return {
      mode: state.mode,
      currentRound: state.currentRound,
      isRoundComplete: state.isRoundComplete,
      turnTimeoutMs: state.turnTimeoutMs,
      participants: state.participants.map((p) => ({
        entityId: p.entityId,
        playerId: p.playerId,
        name: p.name,
        initiative: p.initiative,
        hasActed: p.hasActed,
        isActive: p.isActive,
      })),
      currentTurn: current
        ? {
            entityId: current.entityId,
            playerId: current.playerId,
            name: current.name,
            turnStartedAt: state.turnStartedAt.toISOString(),
          }
        : null,
    };
  });

  /**
   * Get turn history
   * GET /api/turns/:roomId/history
   */
  fastify.get<{
    Params: { roomId: string };
    Querystring: { limit?: string };
  }>('/api/turns/:roomId/history', async (request, reply) => {
    const sessionId = createSessionId(request.params.roomId);
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;

    const history = turnManager.getHistory(sessionId, limit);

    return {
      history: history.map((h) => ({
        round: h.round,
        turnIndex: h.turnIndex,
        participantId: h.participantId,
        playerId: h.playerId,
        startedAt: h.startedAt.toISOString(),
        endedAt: h.endedAt?.toISOString(),
        action: h.action,
        skipped: h.skipped,
        timedOut: h.timedOut,
      })),
    };
  });

  /**
   * Change turn mode
   * POST /api/turns/mode
   */
  fastify.post<{
    Body: {
      roomId: string;
      mode: TurnMode;
    };
  }>('/api/turns/mode', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.body.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      if (room.hostId !== player.id) {
        return reply.code(403).send({ error: 'Only the host can change turn mode' });
      }

      turnManager.setMode(sessionId, request.body.mode);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change mode';
      return reply.code(400).send({ error: message });
    }
  });
}
