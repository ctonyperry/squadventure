/**
 * DM tools for game persistence (save/load)
 */

import type { WorldState, GameSession } from '@ai-dm/shared';
import type { ToolDefinition } from './tool-registry.js';

/**
 * Context for persistence tools
 */
export interface PersistenceToolContext {
  /** Get current world state */
  getWorldState: () => WorldState;
  /** Get current session */
  getSession: () => GameSession;
  /** Current save ID if loaded from a save */
  currentSaveId?: string;
  /** Save operations */
  save: {
    create: (name: string, description?: string) => string;
    update: (saveId: string) => void;
    load: (saveId: string) => { worldState: WorldState; session: GameSession | null } | null;
    list: () => Array<{
      id: string;
      name: string;
      description?: string;
      updatedAt: Date;
      turnCount: number;
      playTime: number;
    }>;
    delete: (saveId: string) => boolean;
  };
  /** Auto-save operations */
  autoSave: {
    create: (label: string) => number;
    list: () => Array<{ id: number; label: string; createdAt: Date }>;
    load: (id: number) => { worldState: WorldState; session: GameSession } | null;
  };
  /** Callback when game is loaded */
  onGameLoaded?: (worldState: WorldState, session: GameSession | null) => void;
}

/**
 * Result of save_game tool
 */
interface SaveGameResult {
  success: boolean;
  saveId: string;
  name: string;
  message: string;
}

/**
 * Result of load_game tool
 */
interface LoadGameResult {
  success: boolean;
  message: string;
  saveId?: string;
  name?: string;
}

/**
 * Result of list_saves tool
 */
interface ListSavesResult {
  saves: Array<{
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
    turnCount: number;
    playTimeFormatted: string;
  }>;
  count: number;
}

/**
 * Create save_game tool
 */
export function createSaveGameTool(
  getContext: () => PersistenceToolContext
): ToolDefinition<{ name?: string; description?: string }, SaveGameResult> {
  return {
    tool: {
      name: 'save_game',
      description: `Save the current game state to a save slot. Use this when the player
requests to save their progress, or at natural story break points. If a save slot with
the same name exists, it will be updated. Otherwise a new save is created.`,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the save slot. If omitted, uses current save or creates "Quick Save".',
          },
          description: {
            type: 'string',
            description: 'Optional description of where in the story this save is.',
          },
        },
        required: [],
      },
    },
    handler: async ({ name, description }) => {
      const ctx = getContext();
      const session = ctx.getSession();

      // Determine save name
      const saveName = name ?? 'Quick Save';

      // Check if we're updating an existing save
      const existingSaves = ctx.save.list();
      const existingSave = existingSaves.find(
        (s) => s.name.toLowerCase() === saveName.toLowerCase()
      );

      let saveId: string;
      if (existingSave) {
        // Update existing save
        ctx.save.update(existingSave.id);
        saveId = existingSave.id;
      } else if (ctx.currentSaveId && !name) {
        // Update current save if no name specified
        ctx.save.update(ctx.currentSaveId);
        saveId = ctx.currentSaveId;
      } else {
        // Create new save
        saveId = ctx.save.create(saveName, description);
      }

      return {
        success: true,
        saveId,
        name: saveName,
        message: `Game saved to "${saveName}" (${session.conversationHistory.length} turns)`,
      };
    },
  };
}

/**
 * Create load_game tool
 */
export function createLoadGameTool(
  getContext: () => PersistenceToolContext
): ToolDefinition<{ saveId?: string; name?: string }, LoadGameResult> {
  return {
    tool: {
      name: 'load_game',
      description: `Load a previously saved game. Specify either the save ID or name.
WARNING: This will replace the current game state. The player should confirm before loading.`,
      parameters: {
        type: 'object',
        properties: {
          saveId: {
            type: 'string',
            description: 'The save slot ID to load',
          },
          name: {
            type: 'string',
            description: 'The save slot name to load (alternative to saveId)',
          },
        },
        required: [],
      },
    },
    handler: async ({ saveId, name }) => {
      const ctx = getContext();

      // Find save by ID or name
      let targetId = saveId;
      if (!targetId && name) {
        const saves = ctx.save.list();
        const found = saves.find(
          (s) => s.name.toLowerCase() === name.toLowerCase()
        );
        if (found) {
          targetId = found.id;
        }
      }

      if (!targetId) {
        return {
          success: false,
          message: 'No save specified. Use list_saves to see available saves.',
        };
      }

      const loaded = ctx.save.load(targetId);
      if (!loaded) {
        return {
          success: false,
          message: `Save "${saveId ?? name}" not found.`,
        };
      }

      // Notify the orchestrator to update its state
      if (ctx.onGameLoaded) {
        ctx.onGameLoaded(loaded.worldState, loaded.session);
      }

      const saves = ctx.save.list();
      const saveMeta = saves.find((s) => s.id === targetId);

      const result: LoadGameResult = {
        success: true,
        message: `Game loaded from "${saveMeta?.name ?? targetId}". ${
          loaded.session
            ? `Restored ${loaded.session.conversationHistory.length} turns of conversation.`
            : 'Starting fresh session.'
        }`,
        saveId: targetId,
      };

      if (saveMeta?.name) {
        result.name = saveMeta.name;
      }

      return result;
    },
  };
}

/**
 * Create list_saves tool
 */
export function createListSavesTool(
  getContext: () => PersistenceToolContext
): ToolDefinition<Record<string, never>, ListSavesResult> {
  return {
    tool: {
      name: 'list_saves',
      description: `List all available save slots. Shows save name, when it was last
updated, turn count, and play time. Use this to help the player choose a save to load.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const ctx = getContext();
      const saves = ctx.save.list();

      return {
        saves: saves.map((s) => {
          const save: ListSavesResult['saves'][number] = {
            id: s.id,
            name: s.name,
            updatedAt: s.updatedAt.toISOString(),
            turnCount: s.turnCount,
            playTimeFormatted: formatPlayTime(s.playTime),
          };
          if (s.description) {
            save.description = s.description;
          }
          return save;
        }),
        count: saves.length,
      };
    },
  };
}

/**
 * Create delete_save tool
 */
export function createDeleteSaveTool(
  getContext: () => PersistenceToolContext
): ToolDefinition<{ saveId?: string; name?: string }, { success: boolean; message: string }> {
  return {
    tool: {
      name: 'delete_save',
      description: `Delete a save slot. WARNING: This cannot be undone.
The player should confirm before deleting.`,
      parameters: {
        type: 'object',
        properties: {
          saveId: {
            type: 'string',
            description: 'The save slot ID to delete',
          },
          name: {
            type: 'string',
            description: 'The save slot name to delete (alternative to saveId)',
          },
        },
        required: [],
      },
    },
    handler: async ({ saveId, name }) => {
      const ctx = getContext();

      // Find save by ID or name
      let targetId = saveId;
      let targetName = name;
      if (!targetId && name) {
        const saves = ctx.save.list();
        const found = saves.find(
          (s) => s.name.toLowerCase() === name.toLowerCase()
        );
        if (found) {
          targetId = found.id;
          targetName = found.name;
        }
      }

      if (!targetId) {
        return {
          success: false,
          message: 'No save specified or save not found.',
        };
      }

      const deleted = ctx.save.delete(targetId);
      if (!deleted) {
        return {
          success: false,
          message: `Could not delete save "${targetName ?? targetId}".`,
        };
      }

      return {
        success: true,
        message: `Save "${targetName ?? targetId}" has been deleted.`,
      };
    },
  };
}

/**
 * Format play time in human-readable format
 */
function formatPlayTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
