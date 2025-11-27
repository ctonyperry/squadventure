/**
 * Zustand Game State Store
 *
 * Central state management for the dashboard.
 */

import { create } from 'zustand';

// Type definitions
export interface Location {
  id: string;
  name: string;
  description: string;
  connections: string[];
  discovered: boolean;
}

export interface Entity {
  id: string;
  name: string;
  type: 'npc' | 'creature' | 'item';
  locationId: string | null;
  attitude?: 'friendly' | 'neutral' | 'hostile';
  hp?: { current: number; max: number };
}

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: { current: number; max: number };
  ac: number;
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  spellSlots?: { level: number; used: number; max: number }[];
  hitDice?: { used: number; max: number };
  conditions: string[];
  deathSaves?: { successes: number; failures: number };
  inventory: { id: string; name: string; equipped: boolean }[];
}

export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  hp: { current: number; max: number };
  conditions: string[];
  isPlayer: boolean;
}

export interface CombatState {
  active: boolean;
  round: number;
  currentTurnIndex: number;
  participants: CombatParticipant[];
  turnHistory: Array<{
    round: number;
    participantId: string;
    action: string;
    result: string;
  }>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  diceRolls?: Array<{
    notation: string;
    result: number;
    breakdown: string;
  }>;
}

export interface GameState {
  // Connection status
  connected: boolean;
  lastUpdate: string | null;

  // World state
  locations: Location[];
  currentLocationId: string | null;

  // Entities
  npcs: Entity[];
  creatures: Entity[];
  items: Entity[];

  // Party
  characters: Character[];
  selectedCharacterId: string | null;

  // Combat
  combat: CombatState | null;

  // Conversation
  messages: ConversationMessage[];

  // UI state
  selectedEntityId: string | null;
  activeView: 'world' | 'combat' | 'character' | 'conversation';
}

interface GameActions {
  // Connection
  setConnected: (connected: boolean) => void;

  // State updates from server
  updateState: (updates: Partial<GameState>) => void;
  setLocations: (locations: Location[]) => void;
  setCurrentLocation: (locationId: string | null) => void;
  setEntities: (entities: { npcs: Entity[]; creatures: Entity[]; items: Entity[] }) => void;
  setCharacters: (characters: Character[]) => void;
  setCombat: (combat: CombatState | null) => void;
  addMessage: (message: ConversationMessage) => void;

  // UI actions
  selectEntity: (entityId: string | null) => void;
  selectCharacter: (characterId: string | null) => void;
  setActiveView: (view: GameState['activeView']) => void;

  // Combat actions
  updateParticipantHP: (participantId: string, hp: { current: number; max: number }) => void;
  advanceTurn: () => void;
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  // Initial state
  connected: false,
  lastUpdate: null,
  locations: [],
  currentLocationId: null,
  npcs: [],
  creatures: [],
  items: [],
  characters: [],
  selectedCharacterId: null,
  combat: null,
  messages: [],
  selectedEntityId: null,
  activeView: 'world',

  // Actions
  setConnected: (connected) =>
    set({ connected, lastUpdate: new Date().toISOString() }),

  updateState: (updates) =>
    set((state) => ({ ...state, ...updates, lastUpdate: new Date().toISOString() })),

  setLocations: (locations) => set({ locations }),

  setCurrentLocation: (currentLocationId) => set({ currentLocationId }),

  setEntities: ({ npcs, creatures, items }) => set({ npcs, creatures, items }),

  setCharacters: (characters) => set({ characters }),

  setCombat: (combat) => set({ combat }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  selectEntity: (selectedEntityId) => set({ selectedEntityId }),

  selectCharacter: (selectedCharacterId) => set({ selectedCharacterId }),

  setActiveView: (activeView) => set({ activeView }),

  updateParticipantHP: (participantId, hp) =>
    set((state) => {
      if (!state.combat) return state;
      return {
        combat: {
          ...state.combat,
          participants: state.combat.participants.map((p) =>
            p.id === participantId ? { ...p, hp } : p
          ),
        },
      };
    }),

  advanceTurn: () =>
    set((state) => {
      if (!state.combat) return state;
      const nextIndex =
        (state.combat.currentTurnIndex + 1) % state.combat.participants.length;
      const newRound =
        nextIndex === 0 ? state.combat.round + 1 : state.combat.round;
      return {
        combat: {
          ...state.combat,
          currentTurnIndex: nextIndex,
          round: newRound,
        },
      };
    }),
}));
