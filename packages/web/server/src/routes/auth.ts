/**
 * Authentication Routes
 *
 * Handles player registration, login, and profile management.
 */

import type { FastifyInstance } from 'fastify';
import {
  playerIdentityService,
  type RegisterPlayerData,
  type CreateGuestData,
  type LoginData,
  type UpdateProfileData,
  type AuthToken,
  type RefreshToken,
} from '../identity/index.js';
import { createPlayerId } from '@ai-dm/shared';

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
 * Register authentication routes
 */
export function registerAuthRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // Registration & Authentication
  // ==========================================================================

  /**
   * Register a new player account
   * POST /api/auth/register
   */
  fastify.post<{
    Body: RegisterPlayerData;
  }>('/api/auth/register', async (request, reply) => {
    try {
      const result = await playerIdentityService.register(request.body);

      return {
        success: true,
        player: {
          id: result.player.id,
          username: result.player.username,
          displayName: result.player.displayName,
          authStatus: result.player.authStatus,
        },
        tokens: {
          authToken: result.tokens.authToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Create a guest player (no registration required)
   * POST /api/auth/guest
   */
  fastify.post<{
    Body: CreateGuestData;
  }>('/api/auth/guest', async (request, reply) => {
    try {
      const result = playerIdentityService.createGuest(request.body);

      return {
        success: true,
        player: {
          id: result.player.id,
          displayName: result.player.displayName,
          authStatus: result.player.authStatus,
        },
        tokens: {
          authToken: result.tokens.authToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create guest';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Login with username and password
   * POST /api/auth/login
   */
  fastify.post<{
    Body: LoginData;
  }>('/api/auth/login', async (request, reply) => {
    try {
      const result = await playerIdentityService.login(request.body);

      return {
        success: true,
        player: {
          id: result.player.id,
          username: result.player.username,
          displayName: result.player.displayName,
          authStatus: result.player.authStatus,
        },
        tokens: {
          authToken: result.tokens.authToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.code(401).send({ error: message });
    }
  });

  /**
   * Refresh authentication tokens
   * POST /api/auth/refresh
   */
  fastify.post<{
    Body: { refreshToken: string };
  }>('/api/auth/refresh', async (request, reply) => {
    try {
      const refreshToken = request.body.refreshToken as RefreshToken;
      const tokens = playerIdentityService.refreshTokens(refreshToken);

      if (!tokens) {
        return reply.code(401).send({ error: 'Invalid refresh token' });
      }

      return {
        success: true,
        tokens: {
          authToken: tokens.authToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      return reply.code(401).send({ error: message });
    }
  });

  /**
   * Logout (invalidate tokens)
   * POST /api/auth/logout
   */
  fastify.post('/api/auth/logout', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (authToken) {
      playerIdentityService.logout(authToken);
    }

    return { success: true };
  });

  /**
   * Check username availability
   * GET /api/auth/check-username/:username
   */
  fastify.get<{
    Params: { username: string };
  }>('/api/auth/check-username/:username', async (request) => {
    const available = playerIdentityService.isUsernameAvailable(request.params.username);
    return { available };
  });

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  /**
   * Get current player profile
   * GET /api/auth/me
   */
  fastify.get('/api/auth/me', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);

    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    return {
      id: player.id,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      authStatus: player.authStatus,
      createdAt: player.createdAt?.toISOString(),
      lastSeenAt: player.lastSeenAt.toISOString(),
      preferences: player.preferences,
      stats: player.stats,
    };
  });

  /**
   * Update current player profile
   * PATCH /api/auth/me
   */
  fastify.patch<{
    Body: UpdateProfileData;
  }>('/api/auth/me', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);

    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const updatedPlayer = playerIdentityService.updateProfile(player.id, request.body);

    if (!updatedPlayer) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    return {
      success: true,
      player: {
        id: updatedPlayer.id,
        username: updatedPlayer.username,
        displayName: updatedPlayer.displayName,
        avatarUrl: updatedPlayer.avatarUrl,
        authStatus: updatedPlayer.authStatus,
        preferences: updatedPlayer.preferences,
      },
    };
  });

  /**
   * Upgrade guest to registered account
   * POST /api/auth/upgrade
   */
  fastify.post<{
    Body: RegisterPlayerData;
  }>('/api/auth/upgrade', async (request, reply) => {
    const authToken = extractAuthToken(request.headers.authorization);

    if (!authToken) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const player = playerIdentityService.validateToken(authToken);

    if (!player) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    if (player.authStatus !== 'guest') {
      return reply.code(400).send({ error: 'Account is already registered' });
    }

    try {
      const result = await playerIdentityService.upgradeGuest(player.id, request.body);

      return {
        success: true,
        player: {
          id: result.player.id,
          username: result.player.username,
          displayName: result.player.displayName,
          authStatus: result.player.authStatus,
        },
        tokens: {
          authToken: result.tokens.authToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt.toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upgrade failed';
      return reply.code(400).send({ error: message });
    }
  });

  /**
   * Get player by ID (public profile)
   * GET /api/players/:id
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/players/:id', async (request, reply) => {
    const playerId = createPlayerId(request.params.id);
    const player = playerIdentityService.getPlayer(playerId);

    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    // Return only public info
    return {
      id: player.id,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      authStatus: player.authStatus,
    };
  });
}
