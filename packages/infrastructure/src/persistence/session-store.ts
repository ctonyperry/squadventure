/**
 * Session persistence for saving/loading game sessions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GameSession, Turn, CombatState } from '@ai-dm/shared';

/**
 * Serializable session data
 */
export interface SerializedSession {
  version: string;
  savedAt: string;
  session: {
    id: string;
    worldStateId: string;
    personaId: string;
    currentScene: GameSession['currentScene'];
    playerCharacters: GameSession['playerCharacters'];
    conversationHistory: Array<{
      id: string;
      timestamp: string;
      role: Turn['role'];
      content: string;
    }>;
    playerProfile: GameSession['playerProfile'];
    combat?: CombatState;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Session store for file-based persistence
 */
export class SessionStore {
  private savesDir: string;
  private version = '1.0.0';

  constructor(savesDir?: string) {
    this.savesDir = savesDir ?? path.join(process.cwd(), 'saves');
  }

  /**
   * Ensure saves directory exists
   */
  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.savesDir, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }

  /**
   * Get filename for a session
   */
  private getFilename(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.savesDir, `${safeId}.json`);
  }

  /**
   * Save a session to disk
   */
  async save(session: GameSession, name?: string): Promise<string> {
    await this.ensureDir();

    const sessionData: SerializedSession['session'] = {
      id: session.id,
      worldStateId: session.worldStateId,
      personaId: session.personaId,
      currentScene: session.currentScene,
      playerCharacters: session.playerCharacters,
      conversationHistory: session.conversationHistory.map((turn) => ({
        id: turn.id,
        timestamp: turn.timestamp.toISOString(),
        role: turn.role,
        content: turn.content,
      })),
      playerProfile: session.playerProfile,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };

    if (session.combat !== undefined) {
      sessionData.combat = session.combat;
    }

    const serialized: SerializedSession = {
      version: this.version,
      savedAt: new Date().toISOString(),
      session: sessionData,
    };

    const filename = this.getFilename(name ?? session.id);
    await fs.writeFile(filename, JSON.stringify(serialized, null, 2), 'utf-8');

    return filename;
  }

  /**
   * Load a session from disk
   */
  async load(sessionId: string): Promise<GameSession | null> {
    const filename = this.getFilename(sessionId);

    try {
      const content = await fs.readFile(filename, 'utf-8');
      const data = JSON.parse(content) as SerializedSession;

      // Deserialize dates
      const session: GameSession = {
        id: data.session.id as GameSession['id'],
        worldStateId: data.session.worldStateId as GameSession['worldStateId'],
        personaId: data.session.personaId as GameSession['personaId'],
        currentScene: data.session.currentScene,
        playerCharacters: data.session.playerCharacters,
        conversationHistory: data.session.conversationHistory.map((turn) => ({
          id: turn.id,
          timestamp: new Date(turn.timestamp),
          role: turn.role,
          content: turn.content,
        })),
        playerProfile: data.session.playerProfile,
        createdAt: new Date(data.session.createdAt),
        updatedAt: new Date(data.session.updatedAt),
      };

      if (data.session.combat !== undefined) {
        session.combat = data.session.combat;
      }

      return session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all saved sessions
   */
  async list(): Promise<Array<{ id: string; name: string; savedAt: Date; turnCount: number }>> {
    await this.ensureDir();

    const files = await fs.readdir(this.savesDir);
    const sessions: Array<{ id: string; name: string; savedAt: Date; turnCount: number }> = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await fs.readFile(path.join(this.savesDir, file), 'utf-8');
        const data = JSON.parse(content) as SerializedSession;

        sessions.push({
          id: data.session.id,
          name: file.replace('.json', ''),
          savedAt: new Date(data.savedAt),
          turnCount: data.session.conversationHistory.length,
        });
      } catch {
        // Skip invalid files
      }
    }

    return sessions.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  }

  /**
   * Delete a saved session
   */
  async delete(sessionId: string): Promise<boolean> {
    const filename = this.getFilename(sessionId);

    try {
      await fs.unlink(filename);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const filename = this.getFilename(sessionId);

    try {
      await fs.access(filename);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a quick save with timestamp
   */
  async quickSave(session: GameSession): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `quicksave_${timestamp}`;
    return this.save(session, name);
  }

  /**
   * Load the most recent quick save
   */
  async loadLatestQuickSave(): Promise<GameSession | null> {
    const sessions = await this.list();
    const quickSave = sessions.find((s) => s.name.startsWith('quicksave_'));

    if (!quickSave) {
      return null;
    }

    return this.load(quickSave.name);
  }
}

/**
 * Create a session store with default configuration
 */
export function createSessionStore(savesDir?: string): SessionStore {
  return new SessionStore(savesDir);
}
