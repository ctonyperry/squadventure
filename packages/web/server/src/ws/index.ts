/**
 * WebSocket Handler
 *
 * Provides real-time updates for game state changes.
 * Integrates with GameBridge for event routing.
 */

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { SessionId } from '@ai-dm/shared';
import { createSessionId } from '@ai-dm/shared';
import type {
  GameBridge,
  GameEvent,
  PlayerId,
  SessionToken,
  Unsubscribe,
} from '../bridge/index.js';
import { createPlayerId } from '../bridge/index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Client connection info
 */
interface ClientConnection {
  socket: WebSocket;
  playerId: PlayerId;
  sessionId?: SessionId;
  unsubscribe?: Unsubscribe;
}

/**
 * Incoming WebSocket message types
 */
type WSClientMessage =
  | { type: 'authenticate'; playerId: string }
  | { type: 'join_session'; sessionId: string; token: string }
  | { type: 'leave_session' }
  | { type: 'command'; command: unknown }
  | { type: 'ping' }
  | { type: 'subscribe'; eventTypes?: string[] };

/**
 * Outgoing WebSocket message types
 */
export type WSServerMessage =
  | { type: 'authenticated'; playerId: string }
  | { type: 'session_joined'; sessionId: string; state: unknown }
  | { type: 'session_left' }
  | { type: 'game_event'; event: GameEvent }
  | { type: 'command_result'; success: boolean; response?: string; error?: string }
  | { type: 'error'; error: string; code?: string }
  | { type: 'pong' };

// =============================================================================
// WebSocket Manager
// =============================================================================

/**
 * Manages WebSocket connections and message routing
 */
export class WebSocketManager {
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private gameBridge: GameBridge | null = null;

  /**
   * Set the game bridge for event routing
   */
  setGameBridge(bridge: GameBridge): void {
    this.gameBridge = bridge;
  }

  /**
   * Add a new client connection
   */
  addClient(socket: WebSocket): void {
    const playerId = createPlayerId(`player_${Date.now()}_${Math.random().toString(36).slice(2)}`);

    const connection: ClientConnection = {
      socket,
      playerId,
    };

    this.clients.set(socket, connection);

    // Send initial authentication (auto-assigned player ID)
    this.send(socket, {
      type: 'authenticated',
      playerId,
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(socket: WebSocket): void {
    const connection = this.clients.get(socket);

    if (connection) {
      // Unsubscribe from session events
      if (connection.unsubscribe) {
        connection.unsubscribe();
      }

      // Leave session if in one
      if (connection.sessionId && this.gameBridge) {
        this.gameBridge.leaveSession(connection.playerId, connection.sessionId).catch(console.error);
      }

      this.clients.delete(socket);
    }
  }

  /**
   * Handle incoming client message
   */
  async handleMessage(socket: WebSocket, message: WSClientMessage): Promise<void> {
    const connection = this.clients.get(socket);

    if (!connection) {
      this.sendError(socket, 'Not connected', 'NOT_CONNECTED');
      return;
    }

    switch (message.type) {
      case 'authenticate':
        // Allow client to set their own player ID
        connection.playerId = createPlayerId(message.playerId);
        this.send(socket, { type: 'authenticated', playerId: message.playerId });
        break;

      case 'join_session':
        await this.handleJoinSession(socket, connection, message.sessionId, message.token);
        break;

      case 'leave_session':
        await this.handleLeaveSession(socket, connection);
        break;

      case 'command':
        await this.handleCommand(socket, connection, message.command);
        break;

      case 'ping':
        this.send(socket, { type: 'pong' });
        break;

      case 'subscribe':
        // Subscription is automatic when joining a session
        break;

      default:
        this.sendError(socket, 'Unknown message type', 'UNKNOWN_MESSAGE');
    }
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast to all clients in a session
   */
  broadcastToSession(sessionId: SessionId, message: WSServerMessage): void {
    for (const [socket, connection] of this.clients) {
      if (connection.sessionId === sessionId) {
        this.send(socket, message);
      }
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(message: WSServerMessage): void {
    for (const socket of this.clients.keys()) {
      this.send(socket, message);
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async handleJoinSession(
    socket: WebSocket,
    connection: ClientConnection,
    sessionIdStr: string,
    tokenStr: string
  ): Promise<void> {
    if (!this.gameBridge) {
      this.sendError(socket, 'Game bridge not initialized', 'NO_BRIDGE');
      return;
    }

    try {
      const sessionId = createSessionId(sessionIdStr);
      const token = tokenStr as unknown as SessionToken;

      // Join the session
      const sessionInfo = await this.gameBridge.joinSession(
        connection.playerId,
        sessionId,
        token
      );

      connection.sessionId = sessionId;

      // Subscribe to session events
      connection.unsubscribe = this.gameBridge.subscribe(
        sessionId,
        connection.playerId,
        (event: GameEvent) => {
          this.send(socket, { type: 'game_event', event });
        }
      );

      // Get current state
      const state = await this.gameBridge.getState(sessionId);

      this.send(socket, {
        type: 'session_joined',
        sessionId: sessionIdStr,
        state,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join session';
      this.sendError(socket, errorMessage, 'JOIN_FAILED');
    }
  }

  private async handleLeaveSession(
    socket: WebSocket,
    connection: ClientConnection
  ): Promise<void> {
    if (!connection.sessionId) {
      return;
    }

    // Unsubscribe from events
    if (connection.unsubscribe) {
      connection.unsubscribe();
      delete connection.unsubscribe;
    }

    // Leave session
    if (this.gameBridge) {
      await this.gameBridge.leaveSession(connection.playerId, connection.sessionId);
    }

    delete connection.sessionId;

    this.send(socket, { type: 'session_left' });
  }

  private async handleCommand(
    socket: WebSocket,
    connection: ClientConnection,
    command: unknown
  ): Promise<void> {
    if (!this.gameBridge) {
      this.sendError(socket, 'Game bridge not initialized', 'NO_BRIDGE');
      return;
    }

    if (!connection.sessionId) {
      this.sendError(socket, 'Not in a session', 'NOT_IN_SESSION');
      return;
    }

    try {
      const result = await this.gameBridge.executeCommand(
        connection.sessionId,
        connection.playerId,
        command as never
      );

      const cmdResult: WSServerMessage = {
        type: 'command_result',
        success: result.success,
      };
      if (result.response !== undefined) {
        (cmdResult as { response?: string }).response = result.response;
      }
      if (result.error !== undefined) {
        (cmdResult as { error?: string }).error = result.error;
      }
      this.send(socket, cmdResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed';
      this.send(socket, {
        type: 'command_result',
        success: false,
        error: errorMessage,
      });
    }
  }

  private send(socket: WebSocket, message: WSServerMessage): void {
    if (socket.readyState === 1) {
      // OPEN
      socket.send(JSON.stringify(message));
    }
  }

  private sendError(socket: WebSocket, error: string, code?: string): void {
    const errorMsg: WSServerMessage = { type: 'error', error };
    if (code !== undefined) {
      (errorMsg as { code?: string }).code = code;
    }
    this.send(socket, errorMsg);
  }
}

// =============================================================================
// Singleton instance
// =============================================================================

export const wsManager = new WebSocketManager();

// =============================================================================
// Fastify Registration
// =============================================================================

/**
 * Register WebSocket routes
 */
export function registerWebSocket(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (socket) => {
    console.log('WebSocket client connected');
    wsManager.addClient(socket);

    socket.on('message', (rawMessage: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = JSON.parse(rawMessage.toString()) as WSClientMessage;
        wsManager.handleMessage(socket, message).catch((error) => {
          console.error('Error handling WebSocket message:', error);
        });
      } catch (error: unknown) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
      wsManager.removeClient(socket);
    });

    socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      wsManager.removeClient(socket);
    });
  });
}

// =============================================================================
// Legacy exports for backward compatibility
// =============================================================================

export type WSEventType =
  | 'state_update'
  | 'entity_updated'
  | 'combat_state_changed'
  | 'turn_taken'
  | 'dice_rolled'
  | 'tool_executed'
  | 'conversation_updated';

export interface WSMessage {
  type: WSEventType;
  payload: unknown;
  timestamp: string;
}

export function broadcast(message: WSMessage): void {
  wsManager.broadcastAll({
    type: 'game_event',
    event: {
      type: 'state_changed',
      sessionId: '' as SessionId,
      timestamp: new Date(),
      delta: message.payload as Record<string, unknown>,
    },
  });
}

export function emitGameEvent(type: WSEventType, payload: unknown): void {
  broadcast({ type, payload, timestamp: new Date().toISOString() });
}

export function getConnectedClientCount(): number {
  return wsManager.getClientCount();
}
