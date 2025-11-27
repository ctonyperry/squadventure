import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  GameSnapshot,
  SessionId,
  SnapshotId,
  WorldState,
  Location,
  LocationId,
  Entity,
  EntityId,
} from '@ai-dm/shared';
import { createSnapshotId } from '@ai-dm/shared';

/**
 * Snapshot store interface for persistence
 */
export interface SnapshotStore {
  save(snapshot: GameSnapshot): Promise<void>;
  load(id: SnapshotId): Promise<GameSnapshot | null>;
  list(sessionId?: SessionId): Promise<SnapshotMetadata[]>;
  delete(id: SnapshotId): Promise<boolean>;
}

/**
 * Minimal metadata for listing snapshots
 */
export interface SnapshotMetadata {
  id: SnapshotId;
  sessionId: SessionId;
  createdAt: Date;
  label?: string | undefined;
}

/**
 * Serializable version of WorldState (Maps converted to arrays)
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
 * Serializable version of GameSnapshot
 */
interface SerializableSnapshot {
  id: SnapshotId;
  sessionId: SessionId;
  createdAt: string;
  label?: string | undefined;
  worldState: SerializableWorldState;
  sessionState: GameSnapshot['sessionState'];
  contextCache: GameSnapshot['contextCache'];
  turnLog: GameSnapshot['turnLog'];
  diceRolls: GameSnapshot['diceRolls'];
}

/**
 * File-based snapshot store implementation
 */
export class FileSnapshotStore implements SnapshotStore {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async save(snapshot: GameSnapshot): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });

    const serializable = this.toSerializable(snapshot);
    const filePath = this.getFilePath(snapshot.id);

    await fs.writeFile(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
  }

  async load(id: SnapshotId): Promise<GameSnapshot | null> {
    const filePath = this.getFilePath(id);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const serializable = JSON.parse(content) as SerializableSnapshot;
      return this.fromSerializable(serializable);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async list(sessionId?: SessionId): Promise<SnapshotMetadata[]> {
    try {
      const files = await fs.readdir(this.baseDir);
      const snapshots: SnapshotMetadata[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.baseDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content) as SerializableSnapshot;

        if (sessionId && data.sessionId !== sessionId) continue;

        const metadata: SnapshotMetadata = {
          id: data.id,
          sessionId: data.sessionId,
          createdAt: new Date(data.createdAt),
        };

        if (data.label !== undefined) {
          metadata.label = data.label;
        }

        snapshots.push(metadata);
      }

      return snapshots.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async delete(id: SnapshotId): Promise<boolean> {
    const filePath = this.getFilePath(id);

    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private getFilePath(id: SnapshotId): string {
    return path.join(this.baseDir, `${id}.json`);
  }

  private toSerializable(snapshot: GameSnapshot): SerializableSnapshot {
    const result: SerializableSnapshot = {
      id: snapshot.id,
      sessionId: snapshot.sessionId,
      createdAt: snapshot.createdAt.toISOString(),
      worldState: {
        id: snapshot.worldState.id,
        name: snapshot.worldState.name,
        description: snapshot.worldState.description,
        locations: Array.from(snapshot.worldState.locations.entries()),
        entities: Array.from(snapshot.worldState.entities.entries()),
        flags: Array.from(snapshot.worldState.flags.entries()),
        counters: Array.from(snapshot.worldState.counters.entries()),
        lore: snapshot.worldState.lore,
      },
      sessionState: snapshot.sessionState,
      contextCache: snapshot.contextCache,
      turnLog: snapshot.turnLog,
      diceRolls: snapshot.diceRolls,
    };

    if (snapshot.label !== undefined) {
      result.label = snapshot.label;
    }

    return result;
  }

  private fromSerializable(data: SerializableSnapshot): GameSnapshot {
    const result: GameSnapshot = {
      id: data.id,
      sessionId: data.sessionId,
      createdAt: new Date(data.createdAt),
      worldState: {
        id: data.worldState.id,
        name: data.worldState.name,
        description: data.worldState.description,
        locations: new Map(data.worldState.locations),
        entities: new Map(data.worldState.entities),
        flags: new Map(data.worldState.flags),
        counters: new Map(data.worldState.counters),
        lore: data.worldState.lore,
      },
      sessionState: data.sessionState,
      contextCache: data.contextCache,
      turnLog: data.turnLog,
      diceRolls: data.diceRolls,
    };

    if (data.label !== undefined) {
      result.label = data.label;
    }

    return result;
  }
}

/**
 * Generate a unique snapshot ID
 */
export function generateSnapshotId(): SnapshotId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return createSnapshotId(`snap_${timestamp}_${random}`);
}
