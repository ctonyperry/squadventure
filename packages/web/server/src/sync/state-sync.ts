/**
 * State Synchronization
 *
 * Manages real-time game state synchronization across players.
 */

import type { SessionId, PlayerId } from '@ai-dm/shared';

// =============================================================================
// State Types
// =============================================================================

/**
 * State version for optimistic concurrency
 */
export interface StateVersion {
  version: number;
  timestamp: Date;
  lastModifiedBy: PlayerId | null;
}

/**
 * State delta - changes since last version
 */
export interface StateDelta {
  fromVersion: number;
  toVersion: number;
  timestamp: Date;
  changes: StateChange[];
}

/**
 * Individual state change
 */
export interface StateChange {
  path: string[];
  operation: 'set' | 'delete' | 'push' | 'splice';
  value?: unknown;
  previousValue?: unknown;
  index?: number;
  deleteCount?: number;
}

/**
 * Full state snapshot
 */
export interface StateSnapshot<T = unknown> {
  version: StateVersion;
  state: T;
  checksum: string;
}

/**
 * Sync status for a player
 */
export interface PlayerSyncStatus {
  playerId: PlayerId;
  lastSyncedVersion: number;
  isOnline: boolean;
  lastSeenAt: Date;
  pendingDeltas: number;
}

/**
 * Sync event types
 */
export type SyncEventType =
  | 'state_updated'
  | 'full_sync'
  | 'delta_sync'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'player_synced'
  | 'sync_error';

export interface SyncEvent {
  type: SyncEventType;
  sessionId: SessionId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type SyncEventHandler = (event: SyncEvent) => void;

// =============================================================================
// State Store
// =============================================================================

interface SessionState<T = unknown> {
  current: T;
  version: StateVersion;
  history: StateDelta[];
  maxHistoryLength: number;
}

interface PlayerSync {
  playerId: PlayerId;
  lastSyncedVersion: number;
  isOnline: boolean;
  lastSeenAt: Date;
}

// =============================================================================
// State Synchronization Manager
// =============================================================================

export class StateSyncManager {
  private sessions: Map<SessionId, SessionState> = new Map();
  private playerSyncs: Map<SessionId, Map<PlayerId, PlayerSync>> = new Map();
  private eventHandlers: Map<SessionId, Set<SyncEventHandler>> = new Map();

  private readonly defaultMaxHistory = 100;

  /**
   * Initialize state for a session
   */
  initialize<T>(sessionId: SessionId, initialState: T): StateSnapshot<T> {
    const version: StateVersion = {
      version: 1,
      timestamp: new Date(),
      lastModifiedBy: null,
    };

    const sessionState: SessionState<T> = {
      current: initialState,
      version,
      history: [],
      maxHistoryLength: this.defaultMaxHistory,
    };

    this.sessions.set(sessionId, sessionState as SessionState);
    this.playerSyncs.set(sessionId, new Map());

    return {
      version,
      state: initialState,
      checksum: this.computeChecksum(initialState),
    };
  }

  /**
   * Apply state changes
   */
  applyChanges(
    sessionId: SessionId,
    changes: StateChange[],
    playerId: PlayerId | null
  ): StateDelta | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const fromVersion = session.version.version;

    // Apply changes to current state
    for (const change of changes) {
      this.applyChange(session.current, change);
    }

    // Update version
    const newVersion: StateVersion = {
      version: fromVersion + 1,
      timestamp: new Date(),
      lastModifiedBy: playerId,
    };
    session.version = newVersion;

    // Create delta
    const delta: StateDelta = {
      fromVersion,
      toVersion: newVersion.version,
      timestamp: new Date(),
      changes,
    };

    // Store in history
    session.history.push(delta);
    if (session.history.length > session.maxHistoryLength) {
      session.history.shift();
    }

    // Emit event
    this.emitEvent(sessionId, {
      type: 'state_updated',
      sessionId,
      timestamp: new Date(),
      data: {
        version: newVersion.version,
        changeCount: changes.length,
        modifiedBy: playerId,
      },
    });

    return delta;
  }

  /**
   * Set a value at a path
   */
  setValue(
    sessionId: SessionId,
    path: string[],
    value: unknown,
    playerId: PlayerId | null
  ): StateDelta | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const previousValue = this.getValueAtPath(session.current, path);

    const change: StateChange = {
      path,
      operation: 'set',
      value,
      previousValue,
    };

    return this.applyChanges(sessionId, [change], playerId);
  }

  /**
   * Delete a value at a path
   */
  deleteValue(
    sessionId: SessionId,
    path: string[],
    playerId: PlayerId | null
  ): StateDelta | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const previousValue = this.getValueAtPath(session.current, path);

    const change: StateChange = {
      path,
      operation: 'delete',
      previousValue,
    };

    return this.applyChanges(sessionId, [change], playerId);
  }

  /**
   * Get full state snapshot
   */
  getSnapshot<T>(sessionId: SessionId): StateSnapshot<T> | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      version: { ...session.version },
      state: structuredClone(session.current) as T,
      checksum: this.computeChecksum(session.current),
    };
  }

  /**
   * Get deltas since a version
   */
  getDeltasSince(sessionId: SessionId, sinceVersion: number): StateDelta[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    return session.history.filter((d) => d.fromVersion >= sinceVersion);
  }

  /**
   * Get current version
   */
  getCurrentVersion(sessionId: SessionId): StateVersion | null {
    const session = this.sessions.get(sessionId);
    return session?.version ?? null;
  }

  /**
   * Register player for sync
   */
  registerPlayer(sessionId: SessionId, playerId: PlayerId): void {
    let playerSyncs = this.playerSyncs.get(sessionId);
    if (!playerSyncs) {
      playerSyncs = new Map();
      this.playerSyncs.set(sessionId, playerSyncs);
    }

    const session = this.sessions.get(sessionId);
    const currentVersion = session?.version.version ?? 0;

    playerSyncs.set(playerId, {
      playerId,
      lastSyncedVersion: currentVersion,
      isOnline: true,
      lastSeenAt: new Date(),
    });
  }

  /**
   * Mark player as synced to a version
   */
  markPlayerSynced(sessionId: SessionId, playerId: PlayerId, version: number): void {
    const playerSyncs = this.playerSyncs.get(sessionId);
    const playerSync = playerSyncs?.get(playerId);

    if (playerSync) {
      playerSync.lastSyncedVersion = version;
      playerSync.lastSeenAt = new Date();

      this.emitEvent(sessionId, {
        type: 'player_synced',
        sessionId,
        timestamp: new Date(),
        data: { playerId, version },
      });
    }
  }

  /**
   * Mark player as online/offline
   */
  setPlayerOnline(sessionId: SessionId, playerId: PlayerId, isOnline: boolean): void {
    const playerSyncs = this.playerSyncs.get(sessionId);
    const playerSync = playerSyncs?.get(playerId);

    if (playerSync) {
      playerSync.isOnline = isOnline;
      playerSync.lastSeenAt = new Date();
    }
  }

  /**
   * Get sync status for all players
   */
  getPlayerSyncStatuses(sessionId: SessionId): PlayerSyncStatus[] {
    const playerSyncs = this.playerSyncs.get(sessionId);
    const session = this.sessions.get(sessionId);

    if (!playerSyncs || !session) {
      return [];
    }

    const currentVersion = session.version.version;

    return Array.from(playerSyncs.values()).map((ps) => ({
      playerId: ps.playerId,
      lastSyncedVersion: ps.lastSyncedVersion,
      isOnline: ps.isOnline,
      lastSeenAt: ps.lastSeenAt,
      pendingDeltas: currentVersion - ps.lastSyncedVersion,
    }));
  }

  /**
   * Get pending deltas for a player
   */
  getPendingDeltas(sessionId: SessionId, playerId: PlayerId): StateDelta[] {
    const playerSyncs = this.playerSyncs.get(sessionId);
    const playerSync = playerSyncs?.get(playerId);

    if (!playerSync) {
      return [];
    }

    return this.getDeltasSince(sessionId, playerSync.lastSyncedVersion);
  }

  /**
   * Subscribe to sync events
   */
  subscribe(sessionId: SessionId, handler: SyncEventHandler): () => void {
    let handlers = this.eventHandlers.get(sessionId);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(sessionId, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers?.delete(handler);
    };
  }

  /**
   * Clean up session state
   */
  cleanup(sessionId: SessionId): void {
    this.sessions.delete(sessionId);
    this.playerSyncs.delete(sessionId);
    this.eventHandlers.delete(sessionId);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private applyChange(state: unknown, change: StateChange): void {
    if (change.path.length === 0) {
      // Root level change
      return;
    }

    const parent = this.getParentAtPath(state, change.path);
    const key = change.path[change.path.length - 1];

    if (parent === null || parent === undefined) {
      return;
    }

    switch (change.operation) {
      case 'set':
        (parent as Record<string, unknown>)[key!] = change.value;
        break;
      case 'delete':
        delete (parent as Record<string, unknown>)[key!];
        break;
      case 'push':
        if (Array.isArray((parent as Record<string, unknown>)[key!])) {
          ((parent as Record<string, unknown>)[key!] as unknown[]).push(change.value);
        }
        break;
      case 'splice':
        if (Array.isArray((parent as Record<string, unknown>)[key!])) {
          ((parent as Record<string, unknown>)[key!] as unknown[]).splice(
            change.index ?? 0,
            change.deleteCount ?? 0
          );
        }
        break;
    }
  }

  private getValueAtPath(state: unknown, path: string[]): unknown {
    let current = state;
    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private getParentAtPath(state: unknown, path: string[]): unknown {
    if (path.length <= 1) {
      return state;
    }
    return this.getValueAtPath(state, path.slice(0, -1));
  }

  private computeChecksum(state: unknown): string {
    // Simple checksum for state verification
    const json = JSON.stringify(state);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private emitEvent(sessionId: SessionId, event: SyncEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in sync event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const stateSyncManager = new StateSyncManager();
