/**
 * Voice Channel Management
 *
 * Manages voice channels for multiplayer sessions, handling
 * player connections, audio routing, and channel permissions.
 */

import type { PlayerId, SessionId } from '@ai-dm/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Voice channel types
 */
export type VoiceChannelType = 'main' | 'party' | 'whisper' | 'dm-private';

/**
 * Voice channel state
 */
export type VoiceChannelState = 'active' | 'inactive' | 'muted';

/**
 * Connection state for a player in a channel
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Voice channel configuration
 */
export interface VoiceChannelConfig {
  /** Maximum participants (0 = unlimited) */
  maxParticipants?: number;
  /** Whether channel persists when empty */
  persistent?: boolean;
  /** Audio quality setting */
  quality?: 'low' | 'medium' | 'high';
  /** Enable noise suppression */
  noiseSuppression?: boolean;
  /** Enable echo cancellation */
  echoCancellation?: boolean;
  /** Enable automatic gain control */
  autoGainControl?: boolean;
}

/**
 * Voice channel information
 */
export interface VoiceChannel {
  id: string;
  sessionId: SessionId;
  name: string;
  type: VoiceChannelType;
  state: VoiceChannelState;
  config: Required<VoiceChannelConfig>;
  createdAt: Date;
  createdBy: PlayerId | 'system';
  participants: Map<PlayerId, ParticipantInfo>;
}

/**
 * Participant information in a voice channel
 */
export interface ParticipantInfo {
  playerId: PlayerId;
  playerName: string;
  connectionState: ConnectionState;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  joinedAt: Date;
  lastActivity: Date;
}

/**
 * Voice channel event types
 */
export type VoiceChannelEventType =
  | 'channel_created'
  | 'channel_deleted'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_muted'
  | 'participant_unmuted'
  | 'participant_speaking'
  | 'participant_stopped_speaking'
  | 'channel_state_changed';

export interface VoiceChannelEvent {
  type: VoiceChannelEventType;
  channelId: string;
  sessionId: SessionId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type VoiceChannelEventHandler = (event: VoiceChannelEvent) => void;

/**
 * Audio stream information
 */
export interface AudioStreamInfo {
  playerId: PlayerId;
  channelId: string;
  sampleRate: number;
  channels: number;
  codec: 'opus' | 'pcm';
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CHANNEL_CONFIG: Required<VoiceChannelConfig> = {
  maxParticipants: 0, // Unlimited
  persistent: false,
  quality: 'medium',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

// =============================================================================
// Voice Channel Manager
// =============================================================================

/**
 * Manages voice channels for game sessions
 */
export class VoiceChannelManager {
  private channels: Map<string, VoiceChannel> = new Map();
  private sessionChannels: Map<SessionId, Set<string>> = new Map();
  private playerChannels: Map<PlayerId, Set<string>> = new Map();
  private eventHandlers: Map<SessionId, Set<VoiceChannelEventHandler>> = new Map();
  private channelCounter = 0;

  /**
   * Create a new voice channel
   */
  createChannel(
    sessionId: SessionId,
    name: string,
    type: VoiceChannelType,
    createdBy: PlayerId | 'system',
    config: VoiceChannelConfig = {}
  ): VoiceChannel {
    const channelId = this.generateChannelId();

    const channel: VoiceChannel = {
      id: channelId,
      sessionId,
      name,
      type,
      state: 'active',
      config: { ...DEFAULT_CHANNEL_CONFIG, ...config },
      createdAt: new Date(),
      createdBy,
      participants: new Map(),
    };

    this.channels.set(channelId, channel);

    // Track by session
    let sessionSet = this.sessionChannels.get(sessionId);
    if (!sessionSet) {
      sessionSet = new Set();
      this.sessionChannels.set(sessionId, sessionSet);
    }
    sessionSet.add(channelId);

    this.emitEvent(sessionId, {
      type: 'channel_created',
      channelId,
      sessionId,
      timestamp: new Date(),
      data: {
        name,
        type,
        createdBy,
      },
    });

    return channel;
  }

  /**
   * Delete a voice channel
   */
  deleteChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    // Remove all participants first
    for (const playerId of channel.participants.keys()) {
      this.leaveChannel(channelId, playerId);
    }

    // Remove from tracking
    const sessionSet = this.sessionChannels.get(channel.sessionId);
    if (sessionSet) {
      sessionSet.delete(channelId);
    }

    this.channels.delete(channelId);

    this.emitEvent(channel.sessionId, {
      type: 'channel_deleted',
      channelId,
      sessionId: channel.sessionId,
      timestamp: new Date(),
      data: { name: channel.name },
    });

    return true;
  }

  /**
   * Get a voice channel by ID
   */
  getChannel(channelId: string): VoiceChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels for a session
   */
  getSessionChannels(sessionId: SessionId): VoiceChannel[] {
    const channelIds = this.sessionChannels.get(sessionId);
    if (!channelIds) return [];

    return Array.from(channelIds)
      .map((id) => this.channels.get(id))
      .filter((ch): ch is VoiceChannel => ch !== undefined);
  }

  /**
   * Get channels a player is in
   */
  getPlayerChannels(playerId: PlayerId): VoiceChannel[] {
    const channelIds = this.playerChannels.get(playerId);
    if (!channelIds) return [];

    return Array.from(channelIds)
      .map((id) => this.channels.get(id))
      .filter((ch): ch is VoiceChannel => ch !== undefined);
  }

  /**
   * Join a voice channel
   */
  joinChannel(
    channelId: string,
    playerId: PlayerId,
    playerName: string
  ): { success: boolean; error?: string } {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    if (channel.state !== 'active') {
      return { success: false, error: 'Channel is not active' };
    }

    // Check max participants
    if (
      channel.config.maxParticipants > 0 &&
      channel.participants.size >= channel.config.maxParticipants
    ) {
      return { success: false, error: 'Channel is full' };
    }

    // Check if already in channel
    if (channel.participants.has(playerId)) {
      return { success: true }; // Already joined
    }

    const participant: ParticipantInfo = {
      playerId,
      playerName,
      connectionState: 'connecting',
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      joinedAt: new Date(),
      lastActivity: new Date(),
    };

    channel.participants.set(playerId, participant);

    // Track player's channels
    let playerSet = this.playerChannels.get(playerId);
    if (!playerSet) {
      playerSet = new Set();
      this.playerChannels.set(playerId, playerSet);
    }
    playerSet.add(channelId);

    this.emitEvent(channel.sessionId, {
      type: 'participant_joined',
      channelId,
      sessionId: channel.sessionId,
      timestamp: new Date(),
      data: {
        playerId,
        playerName,
        participantCount: channel.participants.size,
      },
    });

    return { success: true };
  }

  /**
   * Leave a voice channel
   */
  leaveChannel(channelId: string, playerId: PlayerId): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const participant = channel.participants.get(playerId);
    if (!participant) return false;

    channel.participants.delete(playerId);

    // Update player tracking
    const playerSet = this.playerChannels.get(playerId);
    if (playerSet) {
      playerSet.delete(channelId);
    }

    this.emitEvent(channel.sessionId, {
      type: 'participant_left',
      channelId,
      sessionId: channel.sessionId,
      timestamp: new Date(),
      data: {
        playerId,
        playerName: participant.playerName,
        participantCount: channel.participants.size,
      },
    });

    // Auto-delete non-persistent empty channels
    if (!channel.config.persistent && channel.participants.size === 0) {
      this.deleteChannel(channelId);
    }

    return true;
  }

  /**
   * Update participant connection state
   */
  updateConnectionState(
    channelId: string,
    playerId: PlayerId,
    state: ConnectionState
  ): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const participant = channel.participants.get(playerId);
    if (!participant) return false;

    participant.connectionState = state;
    participant.lastActivity = new Date();

    return true;
  }

  /**
   * Set participant muted state
   */
  setMuted(channelId: string, playerId: PlayerId, muted: boolean): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const participant = channel.participants.get(playerId);
    if (!participant) return false;

    participant.isMuted = muted;
    participant.lastActivity = new Date();

    this.emitEvent(channel.sessionId, {
      type: muted ? 'participant_muted' : 'participant_unmuted',
      channelId,
      sessionId: channel.sessionId,
      timestamp: new Date(),
      data: {
        playerId,
        playerName: participant.playerName,
      },
    });

    return true;
  }

  /**
   * Set participant deafened state
   */
  setDeafened(channelId: string, playerId: PlayerId, deafened: boolean): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const participant = channel.participants.get(playerId);
    if (!participant) return false;

    participant.isDeafened = deafened;
    if (deafened) {
      participant.isMuted = true; // Deafen implies mute
    }
    participant.lastActivity = new Date();

    return true;
  }

  /**
   * Update speaking state
   */
  setSpeaking(channelId: string, playerId: PlayerId, speaking: boolean): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const participant = channel.participants.get(playerId);
    if (!participant) return false;

    const wasSpaking = participant.isSpeaking;
    participant.isSpeaking = speaking;
    participant.lastActivity = new Date();

    if (speaking !== wasSpaking) {
      this.emitEvent(channel.sessionId, {
        type: speaking ? 'participant_speaking' : 'participant_stopped_speaking',
        channelId,
        sessionId: channel.sessionId,
        timestamp: new Date(),
        data: {
          playerId,
          playerName: participant.playerName,
        },
      });
    }

    return true;
  }

  /**
   * Set channel state
   */
  setChannelState(channelId: string, state: VoiceChannelState): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const previousState = channel.state;
    channel.state = state;

    this.emitEvent(channel.sessionId, {
      type: 'channel_state_changed',
      channelId,
      sessionId: channel.sessionId,
      timestamp: new Date(),
      data: {
        previousState,
        newState: state,
      },
    });

    return true;
  }

  /**
   * Get participants who should receive audio from a speaker
   */
  getAudioRecipients(channelId: string, speakerId: PlayerId): PlayerId[] {
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    const recipients: PlayerId[] = [];
    for (const [playerId, participant] of channel.participants) {
      // Don't send to self, muted participants, or disconnected ones
      if (
        playerId !== speakerId &&
        !participant.isDeafened &&
        participant.connectionState === 'connected'
      ) {
        recipients.push(playerId);
      }
    }

    return recipients;
  }

  /**
   * Create default channels for a session
   */
  createDefaultChannels(
    sessionId: SessionId,
    dmId: PlayerId
  ): { main: VoiceChannel; dmPrivate: VoiceChannel } {
    const main = this.createChannel(
      sessionId,
      'Main Voice',
      'main',
      'system',
      { persistent: true }
    );

    const dmPrivate = this.createChannel(
      sessionId,
      'DM Private',
      'dm-private',
      'system',
      { persistent: true, maxParticipants: 2 }
    );

    return { main, dmPrivate };
  }

  /**
   * Create a whisper channel between players
   */
  createWhisperChannel(
    sessionId: SessionId,
    player1Id: PlayerId,
    player1Name: string,
    player2Id: PlayerId,
    player2Name: string
  ): VoiceChannel {
    const channel = this.createChannel(
      sessionId,
      `Whisper: ${player1Name} & ${player2Name}`,
      'whisper',
      player1Id,
      { maxParticipants: 2, persistent: false }
    );

    // Auto-join both players
    this.joinChannel(channel.id, player1Id, player1Name);
    this.joinChannel(channel.id, player2Id, player2Name);

    return channel;
  }

  /**
   * Create a party channel
   */
  createPartyChannel(
    sessionId: SessionId,
    partyName: string,
    createdBy: PlayerId
  ): VoiceChannel {
    return this.createChannel(
      sessionId,
      `Party: ${partyName}`,
      'party',
      createdBy,
      { persistent: true }
    );
  }

  /**
   * Subscribe to channel events
   */
  subscribe(sessionId: SessionId, handler: VoiceChannelEventHandler): () => void {
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
   * Clean up channels for a session
   */
  cleanupSession(sessionId: SessionId): void {
    const channelIds = this.sessionChannels.get(sessionId);
    if (!channelIds) return;

    for (const channelId of channelIds) {
      this.deleteChannel(channelId);
    }

    this.sessionChannels.delete(sessionId);
    this.eventHandlers.delete(sessionId);
  }

  /**
   * Get channel statistics
   */
  getStats(): {
    totalChannels: number;
    totalParticipants: number;
    channelsByType: Record<VoiceChannelType, number>;
  } {
    const channelsByType: Record<VoiceChannelType, number> = {
      main: 0,
      party: 0,
      whisper: 0,
      'dm-private': 0,
    };

    let totalParticipants = 0;

    for (const channel of this.channels.values()) {
      channelsByType[channel.type]++;
      totalParticipants += channel.participants.size;
    }

    return {
      totalChannels: this.channels.size,
      totalParticipants,
      channelsByType,
    };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private generateChannelId(): string {
    return `voice_${Date.now()}_${++this.channelCounter}`;
  }

  private emitEvent(sessionId: SessionId, event: VoiceChannelEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in voice channel event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const voiceChannelManager = new VoiceChannelManager();
