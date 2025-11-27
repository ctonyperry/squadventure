/**
 * SQLite-based persistence for game sessions and world state
 *
 * Provides durable storage with support for:
 * - Multiple save slots
 * - World state serialization
 * - Session management
 * - Conversation history
 * - Auto-save checkpoints
 */

import Database from 'better-sqlite3';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type {
  WorldState,
  GameSession,
  Turn,
  Location,
  LocationId,
  Entity,
  EntityId,
  SessionId,
  CombatState,
} from '@ai-dm/shared';

/**
 * Database schema version for migrations
 */
const SCHEMA_VERSION = 1;

/**
 * Save slot metadata
 */
export interface SaveSlot {
  id: string;
  name: string;
  description?: string;
  worldStateId: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
  playTime: number; // seconds
  turnCount: number;
}

/**
 * Auto-save checkpoint
 */
export interface AutoSaveCheckpoint {
  id: number;
  saveId: string;
  createdAt: Date;
  label: string;
}

/**
 * Serializable world state for JSON storage
 */
interface SerializableWorldState {
  id: string;
  name: string;
  description: string;
  locations: [LocationId, Location][];
  entities: [EntityId, Entity][];
  flags: [string, boolean][];
  counters: [string, number][];
  lore: WorldState['lore'];
}

/**
 * Serializable session for JSON storage
 */
interface SerializableSession {
  id: string;
  worldStateId: string;
  personaId: string;
  currentScene: GameSession['currentScene'];
  playerCharacters: GameSession['playerCharacters'];
  playerProfile: GameSession['playerProfile'];
  combat?: CombatState;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serializable turn for JSON storage
 */
interface SerializableTurn {
  id: string;
  timestamp: string;
  role: Turn['role'];
  content: string;
}

/**
 * SQLite-based game store
 */
export class SQLiteGameStore {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? path.join(process.cwd(), 'data', 'game.db');

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    const version = this.getSchemaVersion();

    if (version < SCHEMA_VERSION) {
      this.runMigrations(version);
    }
  }

  /**
   * Get current schema version
   */
  private getSchemaVersion(): number {
    try {
      const row = this.db.prepare('SELECT version FROM schema_version').get() as
        | { version: number }
        | undefined;
      return row?.version ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Run database migrations
   */
  private runMigrations(fromVersion: number): void {
    if (fromVersion < 1) {
      this.migrateTo1();
    }

    // Update schema version
    this.db
      .prepare('INSERT OR REPLACE INTO schema_version (id, version) VALUES (1, ?)')
      .run(SCHEMA_VERSION);
  }

  /**
   * Migration to version 1 - initial schema
   */
  private migrateTo1(): void {
    this.db.exec(`
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL
      );

      -- Save slots (campaigns)
      CREATE TABLE IF NOT EXISTS saves (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        world_state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        play_time INTEGER DEFAULT 0,
        turn_count INTEGER DEFAULT 0
      );

      -- Sessions within a save
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
        persona_id TEXT NOT NULL,
        session_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Conversation history (stored separately for efficient querying)
      CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        UNIQUE(session_id, sequence)
      );

      -- Auto-save checkpoints
      CREATE TABLE IF NOT EXISTS autosaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        world_state_json TEXT NOT NULL,
        session_json TEXT NOT NULL,
        turns_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_sessions_save_id ON sessions(save_id);
      CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);
      CREATE INDEX IF NOT EXISTS idx_turns_session_sequence ON turns(session_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_autosaves_save_id ON autosaves(save_id);
      CREATE INDEX IF NOT EXISTS idx_autosaves_created ON autosaves(created_at);
    `);
  }

  // ============================================================================
  // Save Slot Operations
  // ============================================================================

  /**
   * Create a new save slot
   */
  createSave(name: string, worldState: WorldState, description?: string): string {
    const id = `save_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const worldStateJson = JSON.stringify(this.serializeWorldState(worldState));

    this.db
      .prepare(
        `INSERT INTO saves (id, name, description, world_state_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, name, description ?? null, worldStateJson, now, now);

    return id;
  }

  /**
   * Update a save slot
   */
  updateSave(
    saveId: string,
    worldState: WorldState,
    turnCount?: number,
    playTime?: number
  ): void {
    const now = new Date().toISOString();
    const worldStateJson = JSON.stringify(this.serializeWorldState(worldState));

    const updates: string[] = ['world_state_json = ?', 'updated_at = ?'];
    const params: (string | number)[] = [worldStateJson, now];

    if (turnCount !== undefined) {
      updates.push('turn_count = ?');
      params.push(turnCount);
    }

    if (playTime !== undefined) {
      updates.push('play_time = ?');
      params.push(playTime);
    }

    params.push(saveId);

    this.db.prepare(`UPDATE saves SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  /**
   * Load a save slot
   */
  loadSave(saveId: string): { worldState: WorldState; metadata: SaveSlot } | null {
    const row = this.db.prepare('SELECT * FROM saves WHERE id = ?').get(saveId) as
      | {
          id: string;
          name: string;
          description: string | null;
          world_state_json: string;
          created_at: string;
          updated_at: string;
          play_time: number;
          turn_count: number;
        }
      | undefined;

    if (!row) return null;

    const worldState = this.deserializeWorldState(JSON.parse(row.world_state_json));

    // Get active session ID if any
    const sessionRow = this.db
      .prepare('SELECT id FROM sessions WHERE save_id = ? ORDER BY updated_at DESC LIMIT 1')
      .get(saveId) as { id: string } | undefined;

    const metadata: SaveSlot = {
      id: row.id,
      name: row.name,
      worldStateId: worldState.id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      playTime: row.play_time,
      turnCount: row.turn_count,
    };

    if (row.description) {
      metadata.description = row.description;
    }
    if (sessionRow?.id) {
      metadata.sessionId = sessionRow.id;
    }

    return { worldState, metadata };
  }

  /**
   * List all save slots
   */
  listSaves(): SaveSlot[] {
    const rows = this.db
      .prepare('SELECT * FROM saves ORDER BY updated_at DESC')
      .all() as Array<{
      id: string;
      name: string;
      description: string | null;
      world_state_json: string;
      created_at: string;
      updated_at: string;
      play_time: number;
      turn_count: number;
    }>;

    return rows.map((row) => {
      const worldState = JSON.parse(row.world_state_json) as SerializableWorldState;
      const sessionRow = this.db
        .prepare('SELECT id FROM sessions WHERE save_id = ? ORDER BY updated_at DESC LIMIT 1')
        .get(row.id) as { id: string } | undefined;

      const slot: SaveSlot = {
        id: row.id,
        name: row.name,
        worldStateId: worldState.id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        playTime: row.play_time,
        turnCount: row.turn_count,
      };

      if (row.description) {
        slot.description = row.description;
      }
      if (sessionRow?.id) {
        slot.sessionId = sessionRow.id;
      }

      return slot;
    });
  }

  /**
   * Delete a save slot (cascades to sessions, turns, autosaves)
   */
  deleteSave(saveId: string): boolean {
    const result = this.db.prepare('DELETE FROM saves WHERE id = ?').run(saveId);
    return result.changes > 0;
  }

  /**
   * Rename a save slot
   */
  renameSave(saveId: string, newName: string): void {
    this.db.prepare('UPDATE saves SET name = ?, updated_at = ? WHERE id = ?').run(
      newName,
      new Date().toISOString(),
      saveId
    );
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  /**
   * Create or update a session
   */
  saveSession(saveId: string, session: GameSession): void {
    const now = new Date().toISOString();
    const sessionJson = JSON.stringify(this.serializeSession(session));

    // Upsert session
    this.db
      .prepare(
        `INSERT INTO sessions (id, save_id, persona_id, session_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           session_json = excluded.session_json,
           updated_at = excluded.updated_at`
      )
      .run(session.id, saveId, session.personaId, sessionJson, now, now);

    // Sync conversation history
    this.syncTurns(session.id, session.conversationHistory);

    // Update save's turn count
    this.db
      .prepare('UPDATE saves SET turn_count = ?, updated_at = ? WHERE id = ?')
      .run(session.conversationHistory.length, now, saveId);
  }

  /**
   * Load a session
   */
  loadSession(sessionId: string): GameSession | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
      | {
          id: string;
          save_id: string;
          persona_id: string;
          session_json: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) return null;

    const sessionData = JSON.parse(row.session_json) as SerializableSession;
    const turns = this.loadTurns(sessionId);

    return this.deserializeSession(sessionData, turns);
  }

  /**
   * Load turns for a session
   */
  private loadTurns(sessionId: string): Turn[] {
    const rows = this.db
      .prepare('SELECT * FROM turns WHERE session_id = ? ORDER BY sequence ASC')
      .all(sessionId) as Array<{
      id: string;
      session_id: string;
      sequence: number;
      timestamp: string;
      role: string;
      content: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      role: row.role as Turn['role'],
      content: row.content,
    }));
  }

  /**
   * Sync turns to database
   */
  private syncTurns(sessionId: string, turns: Turn[]): void {
    const insertTurn = this.db.prepare(
      `INSERT OR REPLACE INTO turns (id, session_id, sequence, timestamp, role, content)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const transaction = this.db.transaction((turns: Turn[]) => {
      turns.forEach((turn, index) => {
        insertTurn.run(
          turn.id,
          sessionId,
          index,
          turn.timestamp.toISOString(),
          turn.role,
          turn.content
        );
      });
    });

    transaction(turns);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return result.changes > 0;
  }

  // ============================================================================
  // Auto-save Operations
  // ============================================================================

  /**
   * Create an auto-save checkpoint
   */
  createAutoSave(
    saveId: string,
    session: GameSession,
    worldState: WorldState,
    label: string
  ): number {
    const now = new Date().toISOString();
    const worldStateJson = JSON.stringify(this.serializeWorldState(worldState));
    const sessionJson = JSON.stringify(this.serializeSession(session));
    const turnsJson = JSON.stringify(
      session.conversationHistory.map((t) => ({
        id: t.id,
        timestamp: t.timestamp.toISOString(),
        role: t.role,
        content: t.content,
      }))
    );

    const result = this.db
      .prepare(
        `INSERT INTO autosaves (save_id, session_id, label, world_state_json, session_json, turns_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(saveId, session.id, label, worldStateJson, sessionJson, turnsJson, now);

    // Prune old auto-saves (keep last 10)
    this.pruneAutoSaves(saveId, 10);

    return result.lastInsertRowid as number;
  }

  /**
   * Load an auto-save checkpoint
   */
  loadAutoSave(
    autoSaveId: number
  ): { worldState: WorldState; session: GameSession; label: string } | null {
    const row = this.db.prepare('SELECT * FROM autosaves WHERE id = ?').get(autoSaveId) as
      | {
          id: number;
          save_id: string;
          session_id: string;
          label: string;
          world_state_json: string;
          session_json: string;
          turns_json: string;
          created_at: string;
        }
      | undefined;

    if (!row) return null;

    const worldState = this.deserializeWorldState(JSON.parse(row.world_state_json));
    const sessionData = JSON.parse(row.session_json) as SerializableSession;
    const turnsData = JSON.parse(row.turns_json) as SerializableTurn[];
    const turns = turnsData.map((t) => ({
      id: t.id,
      timestamp: new Date(t.timestamp),
      role: t.role as Turn['role'],
      content: t.content,
    }));

    return {
      worldState,
      session: this.deserializeSession(sessionData, turns),
      label: row.label,
    };
  }

  /**
   * List auto-saves for a save slot
   */
  listAutoSaves(saveId: string): AutoSaveCheckpoint[] {
    const rows = this.db
      .prepare('SELECT id, save_id, label, created_at FROM autosaves WHERE save_id = ? ORDER BY created_at DESC')
      .all(saveId) as Array<{
      id: number;
      save_id: string;
      label: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      saveId: row.save_id,
      createdAt: new Date(row.created_at),
      label: row.label,
    }));
  }

  /**
   * Prune old auto-saves
   */
  private pruneAutoSaves(saveId: string, keep: number): void {
    this.db
      .prepare(
        `DELETE FROM autosaves WHERE save_id = ? AND id NOT IN (
           SELECT id FROM autosaves WHERE save_id = ? ORDER BY created_at DESC LIMIT ?
         )`
      )
      .run(saveId, saveId, keep);
  }

  // ============================================================================
  // Serialization Helpers
  // ============================================================================

  private serializeWorldState(worldState: WorldState): SerializableWorldState {
    return {
      id: worldState.id,
      name: worldState.name,
      description: worldState.description,
      locations: Array.from(worldState.locations.entries()),
      entities: Array.from(worldState.entities.entries()),
      flags: Array.from(worldState.flags.entries()),
      counters: Array.from(worldState.counters.entries()),
      lore: worldState.lore,
    };
  }

  private deserializeWorldState(data: SerializableWorldState): WorldState {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      locations: new Map(data.locations),
      entities: new Map(data.entities),
      flags: new Map(data.flags),
      counters: new Map(data.counters),
      lore: data.lore,
    };
  }

  private serializeSession(session: GameSession): SerializableSession {
    const result: SerializableSession = {
      id: session.id,
      worldStateId: session.worldStateId,
      personaId: session.personaId,
      currentScene: session.currentScene,
      playerCharacters: session.playerCharacters,
      playerProfile: session.playerProfile,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };

    if (session.combat !== undefined) {
      result.combat = session.combat;
    }

    return result;
  }

  private deserializeSession(data: SerializableSession, turns: Turn[]): GameSession {
    const result: GameSession = {
      id: data.id as SessionId,
      worldStateId: data.worldStateId,
      personaId: data.personaId as GameSession['personaId'],
      currentScene: data.currentScene,
      playerCharacters: data.playerCharacters,
      conversationHistory: turns,
      playerProfile: data.playerProfile,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };

    if (data.combat !== undefined) {
      result.combat = data.combat;
    }

    return result;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database file path
   */
  getPath(): string {
    return this.dbPath;
  }

  /**
   * Run a full database backup
   */
  backup(targetPath: string): void {
    this.db.backup(targetPath);
  }

  /**
   * Get database statistics
   */
  getStats(): {
    saveCount: number;
    sessionCount: number;
    turnCount: number;
    autoSaveCount: number;
    sizeBytes: number;
  } {
    const saves = this.db.prepare('SELECT COUNT(*) as count FROM saves').get() as {
      count: number;
    };
    const sessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as {
      count: number;
    };
    const turns = this.db.prepare('SELECT COUNT(*) as count FROM turns').get() as {
      count: number;
    };
    const autoSaves = this.db.prepare('SELECT COUNT(*) as count FROM autosaves').get() as {
      count: number;
    };

    const stats = fs.statSync(this.dbPath);

    return {
      saveCount: saves.count,
      sessionCount: sessions.count,
      turnCount: turns.count,
      autoSaveCount: autoSaves.count,
      sizeBytes: stats.size,
    };
  }
}

/**
 * Create a SQLite game store with default configuration
 */
export function createSQLiteGameStore(dbPath?: string): SQLiteGameStore {
  return new SQLiteGameStore(dbPath);
}
