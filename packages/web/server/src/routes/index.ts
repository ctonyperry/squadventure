/**
 * REST API Routes
 *
 * Provides endpoints for querying game state.
 */

import type { FastifyInstance } from 'fastify';

/**
 * Game state storage (in-memory for now, will integrate with session persistence)
 */
interface GameState {
  world: {
    locations: unknown[];
    currentLocationId: string | null;
  };
  entities: {
    npcs: unknown[];
    creatures: unknown[];
    items: unknown[];
  };
  party: {
    characters: unknown[];
  };
  combat: {
    active: boolean;
    participants: unknown[];
    currentTurn: number;
    round: number;
  } | null;
  conversation: {
    history: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string;
      toolCalls?: unknown[];
    }>;
  };
}

// In-memory state (will be replaced with session persistence integration)
let gameState: GameState = {
  world: {
    locations: [],
    currentLocationId: null,
  },
  entities: {
    npcs: [],
    creatures: [],
    items: [],
  },
  party: {
    characters: [],
  },
  combat: null,
  conversation: {
    history: [],
  },
};

/**
 * Register all REST routes
 */
export function registerRoutes(fastify: FastifyInstance): void {
  // Get full game state
  fastify.get('/api/state', async () => {
    return gameState;
  });

  // Get world state
  fastify.get('/api/state/world', async () => {
    return gameState.world;
  });

  // Get entities
  fastify.get('/api/state/entities', async () => {
    return gameState.entities;
  });

  // Get specific entity types
  fastify.get('/api/state/entities/npcs', async () => {
    return gameState.entities.npcs;
  });

  fastify.get('/api/state/entities/creatures', async () => {
    return gameState.entities.creatures;
  });

  fastify.get('/api/state/entities/items', async () => {
    return gameState.entities.items;
  });

  // Get party state
  fastify.get('/api/state/party', async () => {
    return gameState.party;
  });

  // Get combat state
  fastify.get('/api/state/combat', async () => {
    return gameState.combat;
  });

  // Get conversation history
  fastify.get('/api/state/conversation', async () => {
    return gameState.conversation;
  });

  // Update state (for DM tools panel)
  fastify.post<{ Body: Partial<GameState> }>('/api/state', async (request) => {
    const updates = request.body;
    gameState = { ...gameState, ...updates };
    return { success: true, state: gameState };
  });

  // Execute a tool (for DM tools panel)
  fastify.post<{ Body: { tool: string; args: Record<string, unknown> } }>(
    '/api/tools/execute',
    async (request) => {
      const { tool, args } = request.body;
      // TODO: Integrate with actual tool execution
      return {
        success: true,
        tool,
        args,
        result: `Tool ${tool} executed (mock)`,
      };
    }
  );
}

/**
 * Update game state and notify connected clients
 */
export function updateGameState(
  updates: Partial<GameState>,
  broadcast: (message: unknown) => void
): void {
  gameState = { ...gameState, ...updates };
  broadcast({
    type: 'state_update',
    payload: updates,
    timestamp: new Date().toISOString(),
  });
}

export { gameState };
