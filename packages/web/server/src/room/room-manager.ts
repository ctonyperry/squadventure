/**
 * Game Room Manager
 *
 * Manages game rooms for multi-player sessions.
 */

import type { SessionId, PlayerId, PlayerRole, SessionPlayer, DEFAULT_PERMISSIONS } from '@ai-dm/shared';
import { createPlayerId, createSessionId } from '@ai-dm/shared';

// =============================================================================
// Room Types
// =============================================================================

/**
 * Unique room code for joining
 */
export type RoomCode = string & { readonly __brand: 'RoomCode' };

/**
 * Room visibility setting
 */
export type RoomVisibility = 'public' | 'private';

/**
 * Room lifecycle states
 */
export type RoomStatus = 'lobby' | 'active' | 'paused' | 'ended';

/**
 * Room configuration
 */
export interface RoomConfig {
  name: string;
  minPlayers: number;
  maxPlayers: number;
  visibility: RoomVisibility;
  password?: string;
  /** Auto-cleanup timeout in milliseconds (default 30 minutes) */
  abandonedTimeout?: number;
}

/**
 * Room information
 */
export interface RoomInfo {
  id: SessionId;
  code: RoomCode;
  name: string;
  status: RoomStatus;
  visibility: RoomVisibility;
  hasPassword: boolean;
  playerCount: number;
  minPlayers: number;
  maxPlayers: number;
  hostId: PlayerId;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Full room state
 */
export interface Room {
  info: RoomInfo;
  password?: string;
  players: Map<PlayerId, SessionPlayer>;
  /** Cleanup timer handle */
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Room event types
 */
export type RoomEventType =
  | 'player_joined'
  | 'player_left'
  | 'player_kicked'
  | 'room_status_changed'
  | 'host_changed'
  | 'room_settings_changed'
  | 'room_closed';

export interface RoomEvent {
  type: RoomEventType;
  roomId: SessionId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type RoomEventHandler = (event: RoomEvent) => void;

// =============================================================================
// Room Code Generation
// =============================================================================

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars (I, O, 0, 1)
const CODE_LENGTH = 6;

function generateRoomCode(): RoomCode {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code as RoomCode;
}

// =============================================================================
// Default Permissions
// =============================================================================

const DEFAULT_PLAYER_PERMISSIONS = {
  canChat: true,
  canCommand: true,
  canControlNPCs: false,
  canModifyWorld: false,
  canInvite: false,
  canKick: false,
  canPauseSession: false,
};

const DEFAULT_DM_PERMISSIONS = {
  canChat: true,
  canCommand: true,
  canControlNPCs: true,
  canModifyWorld: true,
  canInvite: true,
  canKick: true,
  canPauseSession: true,
};

const DEFAULT_SPECTATOR_PERMISSIONS = {
  canChat: true,
  canCommand: false,
  canControlNPCs: false,
  canModifyWorld: false,
  canInvite: false,
  canKick: false,
  canPauseSession: false,
};

// =============================================================================
// Room Manager
// =============================================================================

export class RoomManager {
  private rooms: Map<SessionId, Room> = new Map();
  private codeToRoom: Map<RoomCode, SessionId> = new Map();
  private playerRooms: Map<PlayerId, SessionId> = new Map();
  private eventHandlers: Map<SessionId, Set<RoomEventHandler>> = new Map();

  private readonly defaultAbandonedTimeout = 30 * 60 * 1000; // 30 minutes

  /**
   * Create a new room
   */
  createRoom(hostId: PlayerId, hostName: string, config: RoomConfig): RoomInfo {
    // Generate unique room code
    let code: RoomCode;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 100) {
        throw new Error('Failed to generate unique room code');
      }
    } while (this.codeToRoom.has(code));

    const roomId = createSessionId(`room_${Date.now()}_${Math.random().toString(36).slice(2)}`);

    const hostPlayer: SessionPlayer = {
      playerId: hostId,
      displayName: hostName,
      role: 'dm',
      characterIds: [],
      isConnected: true,
      joinedAt: new Date(),
      permissions: DEFAULT_DM_PERMISSIONS,
    };

    const roomInfo: RoomInfo = {
      id: roomId,
      code,
      name: config.name,
      status: 'lobby',
      visibility: config.visibility,
      hasPassword: !!config.password,
      playerCount: 1,
      minPlayers: Math.max(1, config.minPlayers),
      maxPlayers: Math.min(8, Math.max(2, config.maxPlayers)),
      hostId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    const room: Room = {
      info: roomInfo,
      players: new Map([[hostId, hostPlayer]]),
    };

    if (config.password) {
      room.password = config.password;
    }

    this.rooms.set(roomId, room);
    this.codeToRoom.set(code, roomId);
    this.playerRooms.set(hostId, roomId);

    // Start cleanup timer
    this.scheduleCleanup(room, config.abandonedTimeout ?? this.defaultAbandonedTimeout);

    return roomInfo;
  }

  /**
   * Join a room by code
   */
  joinRoom(
    playerId: PlayerId,
    displayName: string,
    code: RoomCode,
    password?: string,
    role: PlayerRole = 'player'
  ): RoomInfo {
    const roomId = this.codeToRoom.get(code);
    if (!roomId) {
      throw new Error('Room not found');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if already in a room
    const existingRoom = this.playerRooms.get(playerId);
    if (existingRoom && existingRoom !== roomId) {
      throw new Error('Already in another room');
    }

    // Check if already in this room (reconnection)
    if (room.players.has(playerId)) {
      const player = room.players.get(playerId)!;
      player.isConnected = true;
      this.updateActivity(room);
      return room.info;
    }

    // Check room status
    if (room.info.status === 'ended') {
      throw new Error('Room has ended');
    }

    // Check capacity
    if (room.players.size >= room.info.maxPlayers) {
      throw new Error('Room is full');
    }

    // Check password
    if (room.password && room.password !== password) {
      throw new Error('Invalid room password');
    }

    // Determine permissions based on role
    let permissions = DEFAULT_PLAYER_PERMISSIONS;
    if (role === 'dm') {
      permissions = DEFAULT_DM_PERMISSIONS;
    } else if (role === 'spectator') {
      permissions = DEFAULT_SPECTATOR_PERMISSIONS;
    }

    const player: SessionPlayer = {
      playerId,
      displayName,
      role,
      characterIds: [],
      isConnected: true,
      joinedAt: new Date(),
      permissions,
    };

    room.players.set(playerId, player);
    room.info.playerCount = room.players.size;
    this.playerRooms.set(playerId, roomId);
    this.updateActivity(room);

    this.emitEvent(roomId, {
      type: 'player_joined',
      roomId,
      timestamp: new Date(),
      data: { playerId, displayName, role },
    });

    return room.info;
  }

  /**
   * Join a room by ID (for reconnection)
   */
  joinRoomById(playerId: PlayerId, displayName: string, roomId: SessionId): RoomInfo {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if already in a room
    const existingRoom = this.playerRooms.get(playerId);
    if (existingRoom && existingRoom !== roomId) {
      throw new Error('Already in another room');
    }

    // Check if already in this room (reconnection)
    if (room.players.has(playerId)) {
      const player = room.players.get(playerId)!;
      player.isConnected = true;
      this.updateActivity(room);
      return room.info;
    }

    throw new Error('Not a member of this room');
  }

  /**
   * Leave a room
   */
  leaveRoom(playerId: PlayerId): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(playerId);
      return;
    }

    const player = room.players.get(playerId);
    if (player) {
      room.players.delete(playerId);
      room.info.playerCount = room.players.size;

      this.emitEvent(roomId, {
        type: 'player_left',
        roomId,
        timestamp: new Date(),
        data: { playerId, displayName: player.displayName },
      });

      // If host left, transfer host or close room
      if (room.info.hostId === playerId) {
        this.handleHostLeft(room);
      }
    }

    this.playerRooms.delete(playerId);

    // If room is empty, schedule cleanup
    if (room.players.size === 0) {
      this.closeRoom(roomId);
    }
  }

  /**
   * Kick a player from the room
   */
  kickPlayer(hostId: PlayerId, targetId: PlayerId): void {
    const roomId = this.playerRooms.get(hostId);
    if (!roomId) {
      throw new Error('Not in a room');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.info.hostId !== hostId) {
      throw new Error('Only the host can kick players');
    }

    if (targetId === hostId) {
      throw new Error('Cannot kick yourself');
    }

    const target = room.players.get(targetId);
    if (!target) {
      throw new Error('Player not in room');
    }

    room.players.delete(targetId);
    room.info.playerCount = room.players.size;
    this.playerRooms.delete(targetId);

    this.emitEvent(roomId, {
      type: 'player_kicked',
      roomId,
      timestamp: new Date(),
      data: { playerId: targetId, displayName: target.displayName, kickedBy: hostId },
    });
  }

  /**
   * Change room status
   */
  setRoomStatus(playerId: PlayerId, status: RoomStatus): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      throw new Error('Not in a room');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.info.hostId !== playerId) {
      throw new Error('Only the host can change room status');
    }

    // Validate state transitions
    const validTransitions: Record<RoomStatus, RoomStatus[]> = {
      lobby: ['active', 'ended'],
      active: ['paused', 'ended'],
      paused: ['active', 'ended'],
      ended: [],
    };

    if (!validTransitions[room.info.status].includes(status)) {
      throw new Error(`Cannot transition from ${room.info.status} to ${status}`);
    }

    // Check minimum players for active
    if (status === 'active' && room.players.size < room.info.minPlayers) {
      throw new Error(`Need at least ${room.info.minPlayers} players to start`);
    }

    const previousStatus = room.info.status;
    room.info.status = status;
    this.updateActivity(room);

    this.emitEvent(roomId, {
      type: 'room_status_changed',
      roomId,
      timestamp: new Date(),
      data: { previousStatus, newStatus: status },
    });

    if (status === 'ended') {
      this.closeRoom(roomId);
    }
  }

  /**
   * Get room info by ID
   */
  getRoom(roomId: SessionId): RoomInfo | null {
    const room = this.rooms.get(roomId);
    return room?.info ?? null;
  }

  /**
   * Get room info by code
   */
  getRoomByCode(code: RoomCode): RoomInfo | null {
    const roomId = this.codeToRoom.get(code);
    if (!roomId) {
      return null;
    }
    return this.getRoom(roomId);
  }

  /**
   * Get player's current room
   */
  getPlayerRoom(playerId: PlayerId): RoomInfo | null {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      return null;
    }
    return this.getRoom(roomId);
  }

  /**
   * Get players in a room
   */
  getRoomPlayers(roomId: SessionId): SessionPlayer[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.players.values());
  }

  /**
   * List public rooms
   */
  listPublicRooms(): RoomInfo[] {
    return Array.from(this.rooms.values())
      .filter((room) => room.info.visibility === 'public' && room.info.status !== 'ended')
      .map((room) => room.info);
  }

  /**
   * Subscribe to room events
   */
  subscribe(roomId: SessionId, handler: RoomEventHandler): () => void {
    let handlers = this.eventHandlers.get(roomId);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(roomId, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers?.delete(handler);
    };
  }

  /**
   * Mark a player as disconnected (for reconnection handling)
   */
  markDisconnected(playerId: PlayerId): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const player = room.players.get(playerId);
    if (player) {
      player.isConnected = false;
    }
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private handleHostLeft(room: Room): void {
    // Find next player to become host
    let newHost: SessionPlayer | undefined;
    for (const player of room.players.values()) {
      if (!newHost || player.joinedAt < newHost.joinedAt) {
        newHost = player;
      }
    }

    if (newHost) {
      room.info.hostId = newHost.playerId;
      newHost.role = 'dm';
      newHost.permissions = DEFAULT_DM_PERMISSIONS;

      this.emitEvent(room.info.id, {
        type: 'host_changed',
        roomId: room.info.id,
        timestamp: new Date(),
        data: { newHostId: newHost.playerId, newHostName: newHost.displayName },
      });
    }
  }

  private closeRoom(roomId: SessionId): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Clear cleanup timer
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
    }

    // Emit close event
    this.emitEvent(roomId, {
      type: 'room_closed',
      roomId,
      timestamp: new Date(),
      data: {},
    });

    // Remove all player associations
    for (const playerId of room.players.keys()) {
      this.playerRooms.delete(playerId);
    }

    // Remove room
    this.codeToRoom.delete(room.info.code);
    this.rooms.delete(roomId);
    this.eventHandlers.delete(roomId);
  }

  private updateActivity(room: Room): void {
    room.info.lastActivityAt = new Date();

    // Reset cleanup timer
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      this.scheduleCleanup(room, this.defaultAbandonedTimeout);
    }
  }

  private scheduleCleanup(room: Room, timeout: number): void {
    room.cleanupTimer = setTimeout(() => {
      // Check if room is still inactive
      const now = Date.now();
      const lastActivity = room.info.lastActivityAt.getTime();
      if (now - lastActivity >= timeout) {
        // Check if any connected players
        let hasConnected = false;
        for (const player of room.players.values()) {
          if (player.isConnected) {
            hasConnected = true;
            break;
          }
        }

        if (!hasConnected) {
          this.closeRoom(room.info.id);
        } else {
          // Reschedule if there are connected players
          this.scheduleCleanup(room, timeout);
        }
      } else {
        // Activity happened, reschedule
        this.scheduleCleanup(room, timeout - (now - lastActivity));
      }
    }, timeout);
  }

  private emitEvent(roomId: SessionId, event: RoomEvent): void {
    const handlers = this.eventHandlers.get(roomId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in room event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const roomManager = new RoomManager();
