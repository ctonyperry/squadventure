/**
 * Room Routes
 *
 * Handles game room creation, joining, and management.
 */

import type { FastifyInstance } from 'fastify';
import { createPlayerId, type PlayerRole } from '@ai-dm/shared';
import {
  roomManager,
  type RoomConfig,
  type RoomCode,
  type RoomVisibility,
} from '../room/index.js';
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
 * Register room routes
 */
export function registerRoomRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // Room Management API (#27)
  // ==========================================================================

  /**
   * Create a new room
   * POST /api/rooms
   */
  fastify.post<{
    Body: {
      name: string;
      minPlayers?: number;
      maxPlayers?: number;
      visibility?: RoomVisibility;
      password?: string;
    };
  }>('/api/rooms', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const config: RoomConfig = {
        name: request.body.name,
        minPlayers: request.body.minPlayers ?? 1,
        maxPlayers: request.body.maxPlayers ?? 6,
        visibility: request.body.visibility ?? 'private',
      };

      if (request.body.password) {
        config.password = request.body.password;
      }

      const roomInfo = roomManager.createRoom(player.id, player.displayName, config);

      return {
        success: true,
        room: {
          id: roomInfo.id,
          code: roomInfo.code,
          name: roomInfo.name,
          status: roomInfo.status,
          visibility: roomInfo.visibility,
          hasPassword: roomInfo.hasPassword,
          playerCount: roomInfo.playerCount,
          minPlayers: roomInfo.minPlayers,
          maxPlayers: roomInfo.maxPlayers,
          createdAt: roomInfo.createdAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Join a room by code
   * POST /api/rooms/join
   */
  fastify.post<{
    Body: {
      code: string;
      password?: string;
      role?: PlayerRole;
    };
  }>('/api/rooms/join', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const roomInfo = roomManager.joinRoom(
        player.id,
        player.displayName,
        request.body.code as RoomCode,
        request.body.password,
        request.body.role ?? 'player'
      );

      return {
        success: true,
        room: {
          id: roomInfo.id,
          code: roomInfo.code,
          name: roomInfo.name,
          status: roomInfo.status,
          visibility: roomInfo.visibility,
          hasPassword: roomInfo.hasPassword,
          playerCount: roomInfo.playerCount,
          minPlayers: roomInfo.minPlayers,
          maxPlayers: roomInfo.maxPlayers,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Leave current room
   * POST /api/rooms/leave
   */
  fastify.post('/api/rooms/leave', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    roomManager.leaveRoom(player.id);
    return { success: true };
  });

  /**
   * Get current room
   * GET /api/rooms/current
   */
  fastify.get('/api/rooms/current', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const roomInfo = roomManager.getPlayerRoom(player.id);
    if (!roomInfo) {
      return reply.code(404).send({ error: 'Not in a room' });
    }

    const players = roomManager.getRoomPlayers(roomInfo.id);

    return {
      room: {
        id: roomInfo.id,
        code: roomInfo.code,
        name: roomInfo.name,
        status: roomInfo.status,
        visibility: roomInfo.visibility,
        hasPassword: roomInfo.hasPassword,
        playerCount: roomInfo.playerCount,
        minPlayers: roomInfo.minPlayers,
        maxPlayers: roomInfo.maxPlayers,
        hostId: roomInfo.hostId,
        createdAt: roomInfo.createdAt.toISOString(),
      },
      players: players.map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        role: p.role,
        isConnected: p.isConnected,
        joinedAt: p.joinedAt.toISOString(),
      })),
    };
  });

  /**
   * Get room by code
   * GET /api/rooms/:code
   */
  fastify.get<{
    Params: { code: string };
  }>('/api/rooms/:code', async (request, reply) => {
    const roomInfo = roomManager.getRoomByCode(request.params.code as RoomCode);

    if (!roomInfo) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    return {
      id: roomInfo.id,
      code: roomInfo.code,
      name: roomInfo.name,
      status: roomInfo.status,
      visibility: roomInfo.visibility,
      hasPassword: roomInfo.hasPassword,
      playerCount: roomInfo.playerCount,
      minPlayers: roomInfo.minPlayers,
      maxPlayers: roomInfo.maxPlayers,
    };
  });

  /**
   * List public rooms
   * GET /api/rooms
   */
  fastify.get('/api/rooms', async () => {
    const rooms = roomManager.listPublicRooms();

    return {
      rooms: rooms.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        status: r.status,
        playerCount: r.playerCount,
        maxPlayers: r.maxPlayers,
      })),
    };
  });

  /**
   * Kick a player from the room
   * POST /api/rooms/kick
   */
  fastify.post<{
    Body: { playerId: string };
  }>('/api/rooms/kick', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const targetId = createPlayerId(request.body.playerId);
      roomManager.kickPlayer(player.id, targetId);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to kick player';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Change room status
   * POST /api/rooms/status
   */
  fastify.post<{
    Body: { status: 'lobby' | 'active' | 'paused' | 'ended' };
  }>('/api/rooms/status', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    try {
      roomManager.setRoomStatus(player.id, request.body.status);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change status';
      return reply.code(400).send({ error: message });
    }
  });
}
