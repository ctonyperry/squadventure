/**
 * Sync Routes
 *
 * Handles state synchronization for multi-player sessions.
 */

import type { FastifyInstance } from 'fastify';
import { createPlayerId, createSessionId } from '@ai-dm/shared';
import { stateSyncManager, type StateChange } from '../sync/index.js';
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
 * Register sync routes
 */
export function registerSyncRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // State Synchronization API (#29)
  // ==========================================================================

  /**
   * Initialize state for a session
   * POST /api/sync/init
   */
  fastify.post<{
    Body: {
      roomId: string;
      initialState: Record<string, unknown>;
    };
  }>('/api/sync/init', async (request, reply) => {
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
        return reply.code(403).send({ error: 'Only the host can initialize state' });
      }

      const snapshot = stateSyncManager.initialize(sessionId, request.body.initialState);

      return {
        success: true,
        snapshot: {
          version: snapshot.version.version,
          timestamp: snapshot.version.timestamp.toISOString(),
          checksum: snapshot.checksum,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize state';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get full state snapshot
   * GET /api/sync/:roomId/snapshot
   */
  fastify.get<{
    Params: { roomId: string };
  }>('/api/sync/:roomId/snapshot', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const sessionId = createSessionId(request.params.roomId);
    const room = roomManager.getRoom(sessionId);

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    // Verify player is in the room
    const roomPlayers = roomManager.getRoomPlayers(sessionId);
    const isInRoom = roomPlayers.some((p) => p.playerId === player.id);
    if (!isInRoom) {
      return reply.code(403).send({ error: 'Not a member of this room' });
    }

    const snapshot = stateSyncManager.getSnapshot(sessionId);
    if (!snapshot) {
      return reply.code(404).send({ error: 'State not initialized' });
    }

    // Register player for sync tracking
    stateSyncManager.registerPlayer(sessionId, player.id);

    // Mark player as synced to current version
    stateSyncManager.markPlayerSynced(sessionId, player.id, snapshot.version.version);

    return {
      version: snapshot.version.version,
      timestamp: snapshot.version.timestamp.toISOString(),
      lastModifiedBy: snapshot.version.lastModifiedBy,
      checksum: snapshot.checksum,
      state: snapshot.state,
    };
  });

  /**
   * Get deltas since a version
   * GET /api/sync/:roomId/deltas
   */
  fastify.get<{
    Params: { roomId: string };
    Querystring: { sinceVersion?: string };
  }>('/api/sync/:roomId/deltas', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const sessionId = createSessionId(request.params.roomId);
    const room = roomManager.getRoom(sessionId);

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    const roomPlayers = roomManager.getRoomPlayers(sessionId);
    const isInRoom = roomPlayers.some((p) => p.playerId === player.id);
    if (!isInRoom) {
      return reply.code(403).send({ error: 'Not a member of this room' });
    }

    const sinceVersion = request.query.sinceVersion
      ? parseInt(request.query.sinceVersion, 10)
      : 0;

    const deltas = stateSyncManager.getDeltasSince(sessionId, sinceVersion);
    const currentVersion = stateSyncManager.getCurrentVersion(sessionId);

    // Mark player as synced to latest version
    if (currentVersion) {
      stateSyncManager.markPlayerSynced(sessionId, player.id, currentVersion.version);
    }

    return {
      currentVersion: currentVersion?.version ?? 0,
      deltas: deltas.map((d) => ({
        fromVersion: d.fromVersion,
        toVersion: d.toVersion,
        timestamp: d.timestamp.toISOString(),
        changes: d.changes,
      })),
    };
  });

  /**
   * Apply state changes
   * POST /api/sync/:roomId/changes
   */
  fastify.post<{
    Params: { roomId: string };
    Body: {
      changes: StateChange[];
    };
  }>('/api/sync/:roomId/changes', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.params.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const isInRoom = roomPlayers.some((p) => p.playerId === player.id);
      if (!isInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      const delta = stateSyncManager.applyChanges(
        sessionId,
        request.body.changes,
        player.id
      );

      if (!delta) {
        return reply.code(400).send({ error: 'Failed to apply changes' });
      }

      return {
        success: true,
        delta: {
          fromVersion: delta.fromVersion,
          toVersion: delta.toVersion,
          timestamp: delta.timestamp.toISOString(),
          changeCount: delta.changes.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply changes';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Set a value at a path
   * POST /api/sync/:roomId/set
   */
  fastify.post<{
    Params: { roomId: string };
    Body: {
      path: string[];
      value: unknown;
    };
  }>('/api/sync/:roomId/set', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.params.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const isInRoom = roomPlayers.some((p) => p.playerId === player.id);
      if (!isInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      const delta = stateSyncManager.setValue(
        sessionId,
        request.body.path,
        request.body.value,
        player.id
      );

      if (!delta) {
        return reply.code(400).send({ error: 'Failed to set value' });
      }

      return {
        success: true,
        version: delta.toVersion,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set value';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Delete a value at a path
   * DELETE /api/sync/:roomId/value
   */
  fastify.delete<{
    Params: { roomId: string };
    Body: {
      path: string[];
    };
  }>('/api/sync/:roomId/value', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const sessionId = createSessionId(request.params.roomId);
      const room = roomManager.getRoom(sessionId);

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const isInRoom = roomPlayers.some((p) => p.playerId === player.id);
      if (!isInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      const delta = stateSyncManager.deleteValue(
        sessionId,
        request.body.path,
        player.id
      );

      if (!delta) {
        return reply.code(400).send({ error: 'Failed to delete value' });
      }

      return {
        success: true,
        version: delta.toVersion,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete value';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get sync status for all players
   * GET /api/sync/:roomId/status
   */
  fastify.get<{
    Params: { roomId: string };
  }>('/api/sync/:roomId/status', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const sessionId = createSessionId(request.params.roomId);
    const room = roomManager.getRoom(sessionId);

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    // Only host can see all sync statuses
    if (room.hostId !== player.id) {
      return reply.code(403).send({ error: 'Only the host can view sync status' });
    }

    const statuses = stateSyncManager.getPlayerSyncStatuses(sessionId);
    const currentVersion = stateSyncManager.getCurrentVersion(sessionId);

    return {
      currentVersion: currentVersion?.version ?? 0,
      players: statuses.map((s) => ({
        playerId: s.playerId,
        lastSyncedVersion: s.lastSyncedVersion,
        isOnline: s.isOnline,
        lastSeenAt: s.lastSeenAt.toISOString(),
        pendingDeltas: s.pendingDeltas,
      })),
    };
  });

  /**
   * Mark player online/offline (called when WebSocket connects/disconnects)
   * POST /api/sync/:roomId/presence
   */
  fastify.post<{
    Params: { roomId: string };
    Body: {
      isOnline: boolean;
    };
  }>('/api/sync/:roomId/presence', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const sessionId = createSessionId(request.params.roomId);

    stateSyncManager.setPlayerOnline(sessionId, player.id, request.body.isOnline);

    return { success: true };
  });
}
