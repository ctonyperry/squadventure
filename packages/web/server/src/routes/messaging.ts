/**
 * Messaging Routes
 *
 * Handles player-specific communication for multi-player sessions.
 */

import type { FastifyInstance } from 'fastify';
import { createPlayerId, createSessionId } from '@ai-dm/shared';
import {
  playerMessageManager,
  type MessageCategory,
} from '../messaging/index.js';
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
 * Register messaging routes
 */
export function registerMessagingRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // Player-Specific Communication API (#30)
  // ==========================================================================

  /**
   * Send a public message
   * POST /api/messages/public
   */
  fastify.post<{
    Body: {
      roomId: string;
      content: string;
      category?: MessageCategory;
    };
  }>('/api/messages/public', async (request, reply) => {
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

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const playerInRoom = roomPlayers.find((p) => p.playerId === player.id);
      if (!playerInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      const message = playerMessageManager.sendPublic(
        sessionId,
        player.id,
        player.displayName,
        request.body.content,
        request.body.category ?? 'chat'
      );

      return {
        success: true,
        message: {
          id: message.id,
          timestamp: message.timestamp.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Send a private message to specific players
   * POST /api/messages/private
   */
  fastify.post<{
    Body: {
      roomId: string;
      recipientIds: string[];
      content: string;
      category?: MessageCategory;
    };
  }>('/api/messages/private', async (request, reply) => {
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

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const playerInRoom = roomPlayers.find((p) => p.playerId === player.id);
      if (!playerInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      // Only DM can send private messages to specific players
      if (playerInRoom.role !== 'dm') {
        return reply.code(403).send({ error: 'Only DM can send private messages' });
      }

      const recipients = request.body.recipientIds.map((id) => createPlayerId(id));

      const message = playerMessageManager.sendPrivate(
        sessionId,
        player.id,
        player.displayName,
        recipients,
        request.body.content,
        request.body.category ?? 'whisper'
      );

      return {
        success: true,
        message: {
          id: message.id,
          timestamp: message.timestamp.toISOString(),
          recipients: message.recipients,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Send a whisper (DM to single player)
   * POST /api/messages/whisper
   */
  fastify.post<{
    Body: {
      roomId: string;
      recipientId: string;
      content: string;
    };
  }>('/api/messages/whisper', async (request, reply) => {
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

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const playerInRoom = roomPlayers.find((p) => p.playerId === player.id);
      if (!playerInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      // Only DM can whisper
      if (playerInRoom.role !== 'dm') {
        return reply.code(403).send({ error: 'Only DM can send whispers' });
      }

      const recipientId = createPlayerId(request.body.recipientId);

      // Verify recipient is in room
      const recipientInRoom = roomPlayers.find((p) => p.playerId === recipientId);
      if (!recipientInRoom) {
        return reply.code(400).send({ error: 'Recipient not in room' });
      }

      const message = playerMessageManager.sendWhisper(
        sessionId,
        player.id,
        player.displayName,
        recipientId,
        request.body.content
      );

      return {
        success: true,
        message: {
          id: message.id,
          timestamp: message.timestamp.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send whisper';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Send a player chat message to DM
   * POST /api/messages/to-dm
   */
  fastify.post<{
    Body: {
      roomId: string;
      content: string;
    };
  }>('/api/messages/to-dm', async (request, reply) => {
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

      const roomPlayers = roomManager.getRoomPlayers(sessionId);
      const playerInRoom = roomPlayers.find((p) => p.playerId === player.id);
      if (!playerInRoom) {
        return reply.code(403).send({ error: 'Not a member of this room' });
      }

      // Find DM
      const dm = roomPlayers.find((p) => p.role === 'dm');
      if (!dm) {
        return reply.code(400).send({ error: 'No DM in room' });
      }

      // Send as private message to DM only
      const message = playerMessageManager.sendPrivate(
        sessionId,
        player.id,
        player.displayName,
        [dm.playerId],
        request.body.content,
        'whisper'
      );

      return {
        success: true,
        message: {
          id: message.id,
          timestamp: message.timestamp.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message to DM';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get messages for current player
   * GET /api/messages/:roomId
   */
  fastify.get<{
    Params: { roomId: string };
    Querystring: { since?: string; limit?: string };
  }>('/api/messages/:roomId', async (request, reply) => {
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
    const playerInRoom = roomPlayers.find((p) => p.playerId === player.id);
    if (!playerInRoom) {
      return reply.code(403).send({ error: 'Not a member of this room' });
    }

    const since = request.query.since ? new Date(request.query.since) : undefined;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;

    const isDm = playerInRoom.role === 'dm';
    const messages = playerMessageManager.getMessagesForPlayer(
      sessionId,
      player.id,
      isDm,
      since,
      limit
    );

    return {
      messages: messages.map((m) => ({
        id: m.id,
        timestamp: m.timestamp.toISOString(),
        senderId: m.senderId,
        senderName: m.senderName,
        visibility: m.visibility,
        category: m.category,
        content: m.content,
        metadata: m.metadata,
        isRead: m.isRead,
      })),
    };
  });

  /**
   * Get all messages (DM only)
   * GET /api/messages/:roomId/all
   */
  fastify.get<{
    Params: { roomId: string };
    Querystring: { since?: string; limit?: string };
  }>('/api/messages/:roomId/all', async (request, reply) => {
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
    const playerInRoom = roomPlayers.find((p) => p.playerId === player.id);
    if (!playerInRoom) {
      return reply.code(403).send({ error: 'Not a member of this room' });
    }

    // Only DM can see all messages
    if (playerInRoom.role !== 'dm') {
      return reply.code(403).send({ error: 'Only DM can view all messages' });
    }

    const since = request.query.since ? new Date(request.query.since) : undefined;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;

    const messages = playerMessageManager.getAllMessages(sessionId, since, limit);

    return {
      messages: messages.map((m) => ({
        id: m.id,
        timestamp: m.timestamp.toISOString(),
        senderId: m.senderId,
        senderName: m.senderName,
        visibility: m.visibility,
        category: m.category,
        content: m.content,
        metadata: m.metadata,
        recipients: m.recipients,
        isRead: m.isRead,
      })),
    };
  });

  /**
   * Mark message as read
   * POST /api/messages/:messageId/read
   */
  fastify.post<{
    Params: { messageId: string };
  }>('/api/messages/:messageId/read', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    playerMessageManager.markRead(request.params.messageId, player.id);

    return { success: true };
  });

  /**
   * Set typing status
   * POST /api/messages/:roomId/typing
   */
  fastify.post<{
    Params: { roomId: string };
    Body: { isTyping: boolean };
  }>('/api/messages/:roomId/typing', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);
    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const sessionId = createSessionId(request.params.roomId);

    playerMessageManager.setTyping(sessionId, player.id, request.body.isTyping);

    return { success: true };
  });

  /**
   * Get typing players
   * GET /api/messages/:roomId/typing
   */
  fastify.get<{
    Params: { roomId: string };
  }>('/api/messages/:roomId/typing', async (request, reply) => {
    const sessionId = createSessionId(request.params.roomId);

    const typingPlayers = playerMessageManager.getTypingPlayers(sessionId);

    return { typingPlayers };
  });
}
