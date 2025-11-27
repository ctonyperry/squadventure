/**
 * AI Dungeon Master Web Server
 *
 * Provides REST API and WebSocket endpoints for the game dashboard.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerRoutes } from './routes/index.js';
import { registerWebSocket } from './ws/index.js';

const PORT = Number(process.env['PORT']) || 3001;

async function start(): Promise<void> {
  const fastify = Fastify({
    logger: true,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
  });

  await fastify.register(websocket);

  // Register routes
  registerRoutes(fastify);

  // Register WebSocket handlers
  registerWebSocket(fastify);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
