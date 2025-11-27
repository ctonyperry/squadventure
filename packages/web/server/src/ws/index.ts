/**
 * WebSocket Handler
 *
 * Provides real-time updates for game state changes.
 */

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';

// Store connected clients
const clients: Set<WebSocket> = new Set();

/**
 * Event types for WebSocket messages
 */
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

/**
 * Broadcast a message to all connected clients
 */
export function broadcast(message: WSMessage): void {
  const messageStr = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      // OPEN
      client.send(messageStr);
    }
  }
}

/**
 * Send a message to a specific client
 */
export function send(client: WebSocket, message: WSMessage): void {
  if (client.readyState === 1) {
    client.send(JSON.stringify(message));
  }
}

/**
 * Register WebSocket routes
 */
export function registerWebSocket(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (socket) => {
    console.log('WebSocket client connected');
    clients.add(socket);

    // Send initial connection confirmation
    send(socket, {
      type: 'state_update',
      payload: { connected: true },
      timestamp: new Date().toISOString(),
    });

    socket.on('message', (rawMessage: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        handleClientMessage(socket, message);
      } catch (error: unknown) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(socket);
    });

    socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clients.delete(socket);
    });
  });
}

/**
 * Handle incoming client messages
 */
function handleClientMessage(
  client: WebSocket,
  message: { type: string; payload?: unknown }
): void {
  switch (message.type) {
    case 'ping':
      send(client, {
        type: 'state_update',
        payload: { pong: true },
        timestamp: new Date().toISOString(),
      });
      break;

    case 'subscribe':
      // Client subscribes to specific event types
      // For now, all clients receive all events
      send(client, {
        type: 'state_update',
        payload: { subscribed: true },
        timestamp: new Date().toISOString(),
      });
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

/**
 * Emit a game event to all connected clients
 */
export function emitGameEvent(type: WSEventType, payload: unknown): void {
  broadcast({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get the number of connected clients
 */
export function getConnectedClientCount(): number {
  return clients.size;
}
