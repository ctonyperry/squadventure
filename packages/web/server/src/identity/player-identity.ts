/**
 * Player Identity Service
 *
 * Manages player registration, authentication, and profiles.
 */

import {
  type PlayerId,
  type PlayerProfile,
  type PlayerPreferences,
  type PlayerAuthStatus,
  type PlayerStats,
  createPlayerId,
} from '@ai-dm/shared';

// =============================================================================
// Token Types
// =============================================================================

/**
 * JWT token for authentication
 */
export type AuthToken = string & { readonly __brand: 'AuthToken' };

/**
 * Refresh token for renewing auth tokens
 */
export type RefreshToken = string & { readonly __brand: 'RefreshToken' };

/**
 * Token pair returned on successful authentication
 */
export interface TokenPair {
  authToken: AuthToken;
  refreshToken: RefreshToken;
  expiresAt: Date;
}

/**
 * JWT payload structure
 */
export interface TokenPayload {
  sub: PlayerId;
  displayName: string;
  authStatus: PlayerAuthStatus;
  iat: number;
  exp: number;
}

// =============================================================================
// Registration Types
// =============================================================================

/**
 * Data required to register a new player
 */
export interface RegisterPlayerData {
  username: string;
  password: string;
  displayName: string;
  email?: string;
}

/**
 * Data required to create a guest player
 */
export interface CreateGuestData {
  displayName: string;
}

/**
 * Data required to authenticate
 */
export interface LoginData {
  username: string;
  password: string;
}

/**
 * Update player profile data
 */
export interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
  preferences?: Partial<PlayerPreferences>;
}

// =============================================================================
// Stored Player Data
// =============================================================================

interface StoredPlayer {
  profile: PlayerProfile;
  passwordHash?: string;
  email?: string;
}

// =============================================================================
// Player Identity Service
// =============================================================================

/**
 * Default player preferences
 */
function createDefaultPreferences(displayName: string): PlayerPreferences {
  return {
    displayName,
    notifications: {
      turnReminders: true,
      combatAlerts: true,
      chatMessages: true,
    },
    ui: {
      diceAnimations: true,
      soundEffects: true,
      darkMode: false,
    },
  };
}

/**
 * Default player statistics
 */
function createDefaultStats(): PlayerStats {
  return {
    sessionsPlayed: 0,
    totalPlayTimeMinutes: 0,
    characterCount: 0,
    diceRolls: 0,
    criticalHits: 0,
    criticalMisses: 0,
  };
}

/**
 * Generate a unique player ID
 */
function generatePlayerId(): PlayerId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return createPlayerId(`player_${timestamp}_${random}`);
}

/**
 * Generate a random token
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple password hashing (in production, use bcrypt or similar)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Player Identity Service
 */
export class PlayerIdentityService {
  private players: Map<PlayerId, StoredPlayer> = new Map();
  private usernameIndex: Map<string, PlayerId> = new Map();
  private tokenToPlayer: Map<string, PlayerId> = new Map();
  private refreshTokenMap: Map<RefreshToken, PlayerId> = new Map();

  private readonly tokenTTLMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly refreshTTLMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Register a new player account
   */
  async register(data: RegisterPlayerData): Promise<{ player: PlayerProfile; tokens: TokenPair }> {
    // Check if username is taken
    const normalizedUsername = data.username.toLowerCase().trim();
    if (this.usernameIndex.has(normalizedUsername)) {
      throw new Error('Username already taken');
    }

    // Validate username
    if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
      throw new Error('Username must be between 3 and 32 characters');
    }

    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Validate password
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const playerId = generatePlayerId();
    const passwordHash = await hashPassword(data.password);

    const profile: PlayerProfile = {
      id: playerId,
      username: normalizedUsername,
      displayName: data.displayName.trim() || normalizedUsername,
      authStatus: 'registered',
      createdAt: new Date(),
      lastSeenAt: new Date(),
      preferences: createDefaultPreferences(data.displayName.trim() || normalizedUsername),
      stats: createDefaultStats(),
    };

    const storedPlayer: StoredPlayer = {
      profile,
      passwordHash,
    };
    if (data.email !== undefined) {
      storedPlayer.email = data.email;
    }

    this.players.set(playerId, storedPlayer);
    this.usernameIndex.set(normalizedUsername, playerId);

    const tokens = this.generateTokenPair(playerId, profile);

    return { player: profile, tokens };
  }

  /**
   * Create a guest player (no registration required)
   */
  createGuest(data: CreateGuestData): { player: PlayerProfile; tokens: TokenPair } {
    const playerId = generatePlayerId();
    const displayName = data.displayName.trim() || `Guest_${playerId.slice(-6)}`;

    const profile: PlayerProfile = {
      id: playerId,
      displayName,
      authStatus: 'guest',
      lastSeenAt: new Date(),
      preferences: createDefaultPreferences(displayName),
    };

    const storedPlayer: StoredPlayer = {
      profile,
    };

    this.players.set(playerId, storedPlayer);

    const tokens = this.generateTokenPair(playerId, profile);

    return { player: profile, tokens };
  }

  /**
   * Authenticate a registered player
   */
  async login(data: LoginData): Promise<{ player: PlayerProfile; tokens: TokenPair }> {
    const normalizedUsername = data.username.toLowerCase().trim();
    const playerId = this.usernameIndex.get(normalizedUsername);

    if (!playerId) {
      throw new Error('Invalid username or password');
    }

    const storedPlayer = this.players.get(playerId);
    if (!storedPlayer || !storedPlayer.passwordHash) {
      throw new Error('Invalid username or password');
    }

    const providedHash = await hashPassword(data.password);
    if (providedHash !== storedPlayer.passwordHash) {
      throw new Error('Invalid username or password');
    }

    // Update last seen
    storedPlayer.profile.lastSeenAt = new Date();
    storedPlayer.profile.authStatus = 'authenticated';

    const tokens = this.generateTokenPair(playerId, storedPlayer.profile);

    return { player: storedPlayer.profile, tokens };
  }

  /**
   * Validate an auth token and return the player
   */
  validateToken(token: AuthToken): PlayerProfile | null {
    const playerId = this.tokenToPlayer.get(token);
    if (!playerId) {
      return null;
    }

    const storedPlayer = this.players.get(playerId);
    if (!storedPlayer) {
      return null;
    }

    // Update last seen
    storedPlayer.profile.lastSeenAt = new Date();

    return storedPlayer.profile;
  }

  /**
   * Refresh tokens using a refresh token
   */
  refreshTokens(refreshToken: RefreshToken): TokenPair | null {
    const playerId = this.refreshTokenMap.get(refreshToken);
    if (!playerId) {
      return null;
    }

    const storedPlayer = this.players.get(playerId);
    if (!storedPlayer) {
      return null;
    }

    // Invalidate old refresh token
    this.refreshTokenMap.delete(refreshToken);

    // Update last seen
    storedPlayer.profile.lastSeenAt = new Date();

    return this.generateTokenPair(playerId, storedPlayer.profile);
  }

  /**
   * Logout a player (invalidate tokens)
   */
  logout(token: AuthToken): void {
    const playerId = this.tokenToPlayer.get(token);
    if (playerId) {
      // Remove auth token
      this.tokenToPlayer.delete(token);

      // Remove all refresh tokens for this player
      for (const [refreshToken, pid] of this.refreshTokenMap) {
        if (pid === playerId) {
          this.refreshTokenMap.delete(refreshToken);
        }
      }
    }
  }

  /**
   * Get a player profile by ID
   */
  getPlayer(playerId: PlayerId): PlayerProfile | null {
    const storedPlayer = this.players.get(playerId);
    return storedPlayer?.profile ?? null;
  }

  /**
   * Update a player's profile
   */
  updateProfile(playerId: PlayerId, updates: UpdateProfileData): PlayerProfile | null {
    const storedPlayer = this.players.get(playerId);
    if (!storedPlayer) {
      return null;
    }

    const profile = storedPlayer.profile;

    if (updates.displayName !== undefined) {
      profile.displayName = updates.displayName.trim();
      profile.preferences.displayName = profile.displayName;
    }

    if (updates.avatarUrl !== undefined) {
      profile.avatarUrl = updates.avatarUrl;
      profile.preferences.avatarUrl = updates.avatarUrl;
    }

    if (updates.preferences) {
      if (updates.preferences.color !== undefined) {
        profile.preferences.color = updates.preferences.color;
      }
      if (updates.preferences.notifications) {
        Object.assign(profile.preferences.notifications, updates.preferences.notifications);
      }
      if (updates.preferences.ui) {
        Object.assign(profile.preferences.ui, updates.preferences.ui);
      }
    }

    return profile;
  }

  /**
   * Update player statistics
   */
  updateStats(playerId: PlayerId, updates: Partial<PlayerStats>): void {
    const storedPlayer = this.players.get(playerId);
    if (storedPlayer && storedPlayer.profile.stats) {
      Object.assign(storedPlayer.profile.stats, updates);
    }
  }

  /**
   * Upgrade a guest to a registered player
   */
  async upgradeGuest(
    playerId: PlayerId,
    data: RegisterPlayerData
  ): Promise<{ player: PlayerProfile; tokens: TokenPair }> {
    const storedPlayer = this.players.get(playerId);
    if (!storedPlayer) {
      throw new Error('Player not found');
    }

    if (storedPlayer.profile.authStatus !== 'guest') {
      throw new Error('Player is already registered');
    }

    // Check username availability
    const normalizedUsername = data.username.toLowerCase().trim();
    if (this.usernameIndex.has(normalizedUsername)) {
      throw new Error('Username already taken');
    }

    // Validate username
    if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
      throw new Error('Username must be between 3 and 32 characters');
    }

    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Validate password
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const passwordHash = await hashPassword(data.password);

    // Update profile
    storedPlayer.profile.username = normalizedUsername;
    storedPlayer.profile.displayName = data.displayName.trim() || storedPlayer.profile.displayName;
    storedPlayer.profile.authStatus = 'registered';
    storedPlayer.profile.createdAt = new Date();
    storedPlayer.passwordHash = passwordHash;
    if (data.email !== undefined) {
      storedPlayer.email = data.email;
    }

    // Add to username index
    this.usernameIndex.set(normalizedUsername, playerId);

    // Initialize stats if not present
    if (!storedPlayer.profile.stats) {
      storedPlayer.profile.stats = createDefaultStats();
    }

    const tokens = this.generateTokenPair(playerId, storedPlayer.profile);

    return { player: storedPlayer.profile, tokens };
  }

  /**
   * Generate a token pair for a player
   */
  private generateTokenPair(playerId: PlayerId, profile: PlayerProfile): TokenPair {
    const authToken = generateToken() as AuthToken;
    const refreshToken = generateToken() as RefreshToken;
    const expiresAt = new Date(Date.now() + this.tokenTTLMs);

    this.tokenToPlayer.set(authToken, playerId);
    this.refreshTokenMap.set(refreshToken, playerId);

    // Schedule token cleanup
    setTimeout(() => {
      this.tokenToPlayer.delete(authToken);
    }, this.tokenTTLMs);

    setTimeout(() => {
      this.refreshTokenMap.delete(refreshToken);
    }, this.refreshTTLMs);

    return {
      authToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Get total player count
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Check if a username is available
   */
  isUsernameAvailable(username: string): boolean {
    return !this.usernameIndex.has(username.toLowerCase().trim());
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const playerIdentityService = new PlayerIdentityService();
