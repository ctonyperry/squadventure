import type {
  GameSnapshot,
  GameSession,
  WorldState,
  SessionId,
  SnapshotId,
} from '@ai-dm/shared';
import type { SnapshotStore } from '@ai-dm/infrastructure';
import { generateSnapshotId } from '@ai-dm/infrastructure';

/**
 * Manages game snapshots for save/load functionality
 */
export class SnapshotManager {
  private store: SnapshotStore;

  constructor(store: SnapshotStore) {
    this.store = store;
  }

  /**
   * Create a snapshot of the current game state
   */
  async createSnapshot(
    session: GameSession,
    worldState: WorldState,
    options?: { label?: string }
  ): Promise<GameSnapshot> {
    const sessionState: GameSnapshot['sessionState'] = {
      id: session.id,
      worldStateId: session.worldStateId,
      personaId: session.personaId,
      currentScene: session.currentScene,
      playerCharacters: session.playerCharacters,
      gamePreferences: session.gamePreferences,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    if (session.combat !== undefined) {
      sessionState.combat = session.combat;
    }

    const snapshot: GameSnapshot = {
      id: generateSnapshotId(),
      sessionId: session.id,
      createdAt: new Date(),
      worldState,
      sessionState,
      contextCache: {
        narrativeSummary: this.generateNarrativeSummary(session),
        recentMoments: this.extractRecentMoments(session),
        activeThreads: [],
      },
      turnLog: [...session.conversationHistory],
      diceRolls: this.extractDiceRolls(session),
    };

    if (options?.label) {
      snapshot.label = options.label;
    }

    await this.store.save(snapshot);
    return snapshot;
  }

  /**
   * Load a snapshot
   */
  async loadSnapshot(id: SnapshotId): Promise<GameSnapshot | null> {
    return this.store.load(id);
  }

  /**
   * List available snapshots
   */
  async listSnapshots(sessionId?: SessionId) {
    return this.store.list(sessionId);
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(id: SnapshotId): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Generate a brief narrative summary
   */
  private generateNarrativeSummary(session: GameSession): string {
    const turns = session.conversationHistory;
    if (turns.length === 0) {
      return 'The adventure begins...';
    }

    // Get last few significant exchanges
    const recentTurns = turns.slice(-6);
    const summary = recentTurns
      .filter((t) => t.role !== 'system')
      .map((t) => `${t.role === 'player' ? 'Player' : 'DM'}: ${t.content.slice(0, 100)}...`)
      .join('\n');

    return summary;
  }

  /**
   * Extract recent memorable moments
   */
  private extractRecentMoments(session: GameSession): string[] {
    const moments: string[] = [];

    // Look for dice rolls and their results
    for (const turn of session.conversationHistory) {
      if (turn.metadata?.diceRolls) {
        for (const roll of turn.metadata.diceRolls) {
          if (roll.total === 20 || roll.total === 1) {
            moments.push(
              `${roll.total === 20 ? 'Critical success' : 'Critical failure'} on ${roll.purpose}`
            );
          }
        }
      }
    }

    return moments.slice(-5);
  }

  /**
   * Extract all dice rolls from session
   */
  private extractDiceRolls(session: GameSession) {
    const rolls: GameSnapshot['diceRolls'] = [];

    for (const turn of session.conversationHistory) {
      if (turn.metadata?.diceRolls) {
        rolls.push(...turn.metadata.diceRolls);
      }
    }

    return rolls;
  }
}
