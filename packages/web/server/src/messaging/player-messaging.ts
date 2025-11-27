/**
 * Player Messaging
 *
 * Handles player-specific communication for multi-player sessions.
 */

import type { SessionId, PlayerId, EntityId } from '@ai-dm/shared';

// =============================================================================
// Message Types
// =============================================================================

/**
 * Message visibility levels
 */
export type MessageVisibility =
  | 'public'      // Visible to all players
  | 'private'     // Only to specific recipients
  | 'dm_only'     // Only to DM
  | 'whisper'     // DM to single player
  | 'party'       // To player's party members
  | 'system';     // System messages (broadcasts)

/**
 * Message categories
 */
export type MessageCategory =
  | 'narrative'   // Story/narrative text
  | 'dialogue'    // NPC dialogue
  | 'action'      // Action results
  | 'roll'        // Dice roll results
  | 'chat'        // Player chat
  | 'system'      // System notifications
  | 'whisper'     // Private messages
  | 'secret';     // Hidden information (e.g., perception checks)

/**
 * Game message
 */
export interface GameMessage {
  id: string;
  sessionId: SessionId;
  timestamp: Date;
  senderId: PlayerId | 'system' | 'dm';
  senderName: string;
  visibility: MessageVisibility;
  category: MessageCategory;
  content: string;
  metadata?: Record<string, unknown>;
  /** For private messages, list of recipient player IDs */
  recipients?: PlayerId[];
  /** For entity-related messages */
  entityId?: EntityId;
  /** Whether message has been read */
  isRead?: boolean;
}

/**
 * Message filter options
 */
export interface MessageFilter {
  sessionId: SessionId;
  playerId?: PlayerId;
  visibility?: MessageVisibility[];
  category?: MessageCategory[];
  since?: Date;
  limit?: number;
}

/**
 * Message event types
 */
export type MessageEventType =
  | 'message_sent'
  | 'message_delivered'
  | 'message_read'
  | 'typing_started'
  | 'typing_stopped';

export interface MessageEvent {
  type: MessageEventType;
  sessionId: SessionId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type MessageEventHandler = (event: MessageEvent) => void;

// =============================================================================
// Player Message Manager
// =============================================================================

export class PlayerMessageManager {
  private messages: Map<SessionId, GameMessage[]> = new Map();
  private eventHandlers: Map<SessionId, Set<MessageEventHandler>> = new Map();
  private typingStatus: Map<SessionId, Map<PlayerId, Date>> = new Map();

  private readonly maxMessagesPerSession = 1000;
  private messageCounter = 0;

  /**
   * Send a public message to all players
   */
  sendPublic(
    sessionId: SessionId,
    senderId: PlayerId | 'system' | 'dm',
    senderName: string,
    content: string,
    category: MessageCategory = 'narrative',
    metadata?: Record<string, unknown>
  ): GameMessage {
    const message: GameMessage = {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date(),
      senderId,
      senderName,
      visibility: 'public',
      category,
      content,
    };

    if (metadata !== undefined) {
      message.metadata = metadata;
    }

    return this.storeAndEmit(message);
  }

  /**
   * Send a private message to specific recipients
   */
  sendPrivate(
    sessionId: SessionId,
    senderId: PlayerId | 'system' | 'dm',
    senderName: string,
    recipients: PlayerId[],
    content: string,
    category: MessageCategory = 'whisper',
    metadata?: Record<string, unknown>
  ): GameMessage {
    const message: GameMessage = {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date(),
      senderId,
      senderName,
      visibility: 'private',
      category,
      content,
      recipients,
    };

    if (metadata !== undefined) {
      message.metadata = metadata;
    }

    return this.storeAndEmit(message);
  }

  /**
   * Send a whisper from DM to a single player
   */
  sendWhisper(
    sessionId: SessionId,
    dmId: PlayerId,
    dmName: string,
    recipientId: PlayerId,
    content: string,
    metadata?: Record<string, unknown>
  ): GameMessage {
    const message: GameMessage = {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date(),
      senderId: dmId,
      senderName: dmName,
      visibility: 'whisper',
      category: 'whisper',
      content,
      recipients: [recipientId],
    };

    if (metadata !== undefined) {
      message.metadata = metadata;
    }

    return this.storeAndEmit(message);
  }

  /**
   * Send a DM-only message (only visible to DM)
   */
  sendDmOnly(
    sessionId: SessionId,
    senderId: PlayerId | 'system',
    senderName: string,
    content: string,
    category: MessageCategory = 'secret',
    metadata?: Record<string, unknown>
  ): GameMessage {
    const message: GameMessage = {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date(),
      senderId,
      senderName,
      visibility: 'dm_only',
      category,
      content,
    };

    if (metadata !== undefined) {
      message.metadata = metadata;
    }

    return this.storeAndEmit(message);
  }

  /**
   * Send a system message
   */
  sendSystem(
    sessionId: SessionId,
    content: string,
    metadata?: Record<string, unknown>
  ): GameMessage {
    const message: GameMessage = {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date(),
      senderId: 'system',
      senderName: 'System',
      visibility: 'system',
      category: 'system',
      content,
    };

    if (metadata !== undefined) {
      message.metadata = metadata;
    }

    return this.storeAndEmit(message);
  }

  /**
   * Send a party-only message
   */
  sendToParty(
    sessionId: SessionId,
    senderId: PlayerId,
    senderName: string,
    partyMembers: PlayerId[],
    content: string,
    category: MessageCategory = 'chat',
    metadata?: Record<string, unknown>
  ): GameMessage {
    const message: GameMessage = {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date(),
      senderId,
      senderName,
      visibility: 'party',
      category,
      content,
      recipients: partyMembers,
    };

    if (metadata !== undefined) {
      message.metadata = metadata;
    }

    return this.storeAndEmit(message);
  }

  /**
   * Get messages for a player (filtered by visibility)
   */
  getMessagesForPlayer(
    sessionId: SessionId,
    playerId: PlayerId,
    isDm: boolean = false,
    since?: Date,
    limit?: number
  ): GameMessage[] {
    const sessionMessages = this.messages.get(sessionId) ?? [];

    let filtered = sessionMessages.filter((msg) => {
      // Apply date filter
      if (since && msg.timestamp < since) {
        return false;
      }

      // DM sees everything
      if (isDm) {
        return true;
      }

      // Filter by visibility
      switch (msg.visibility) {
        case 'public':
        case 'system':
          return true;
        case 'private':
        case 'whisper':
        case 'party':
          // Check if player is in recipients
          return msg.recipients?.includes(playerId) ?? false;
        case 'dm_only':
          return false;
        default:
          return false;
      }
    });

    // Apply limit
    if (limit !== undefined && limit > 0) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Get all messages (for DM or admin)
   */
  getAllMessages(
    sessionId: SessionId,
    since?: Date,
    limit?: number
  ): GameMessage[] {
    let messages = this.messages.get(sessionId) ?? [];

    if (since) {
      messages = messages.filter((msg) => msg.timestamp >= since);
    }

    if (limit !== undefined && limit > 0) {
      messages = messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Mark message as read
   */
  markRead(messageId: string, playerId: PlayerId): void {
    for (const sessionMessages of this.messages.values()) {
      const message = sessionMessages.find((m) => m.id === messageId);
      if (message) {
        message.isRead = true;

        this.emitEvent(message.sessionId, {
          type: 'message_read',
          sessionId: message.sessionId,
          timestamp: new Date(),
          data: { messageId, playerId },
        });
        break;
      }
    }
  }

  /**
   * Set typing status for a player
   */
  setTyping(sessionId: SessionId, playerId: PlayerId, isTyping: boolean): void {
    let sessionTyping = this.typingStatus.get(sessionId);
    if (!sessionTyping) {
      sessionTyping = new Map();
      this.typingStatus.set(sessionId, sessionTyping);
    }

    if (isTyping) {
      sessionTyping.set(playerId, new Date());
      this.emitEvent(sessionId, {
        type: 'typing_started',
        sessionId,
        timestamp: new Date(),
        data: { playerId },
      });
    } else {
      sessionTyping.delete(playerId);
      this.emitEvent(sessionId, {
        type: 'typing_stopped',
        sessionId,
        timestamp: new Date(),
        data: { playerId },
      });
    }
  }

  /**
   * Get players currently typing
   */
  getTypingPlayers(sessionId: SessionId): PlayerId[] {
    const sessionTyping = this.typingStatus.get(sessionId);
    if (!sessionTyping) {
      return [];
    }

    // Filter out stale typing status (> 5 seconds)
    const now = Date.now();
    const result: PlayerId[] = [];

    for (const [playerId, timestamp] of sessionTyping) {
      if (now - timestamp.getTime() < 5000) {
        result.push(playerId);
      } else {
        sessionTyping.delete(playerId);
      }
    }

    return result;
  }

  /**
   * Subscribe to message events
   */
  subscribe(sessionId: SessionId, handler: MessageEventHandler): () => void {
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
   * Clean up session messages
   */
  cleanup(sessionId: SessionId): void {
    this.messages.delete(sessionId);
    this.eventHandlers.delete(sessionId);
    this.typingStatus.delete(sessionId);
  }

  /**
   * Get message count for a session
   */
  getMessageCount(sessionId: SessionId): number {
    return this.messages.get(sessionId)?.length ?? 0;
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private generateMessageId(): string {
    this.messageCounter++;
    return `msg_${Date.now()}_${this.messageCounter}`;
  }

  private storeAndEmit(message: GameMessage): GameMessage {
    // Get or create session messages
    let sessionMessages = this.messages.get(message.sessionId);
    if (!sessionMessages) {
      sessionMessages = [];
      this.messages.set(message.sessionId, sessionMessages);
    }

    // Store message
    sessionMessages.push(message);

    // Trim old messages if over limit
    if (sessionMessages.length > this.maxMessagesPerSession) {
      sessionMessages.shift();
    }

    // Emit event
    this.emitEvent(message.sessionId, {
      type: 'message_sent',
      sessionId: message.sessionId,
      timestamp: new Date(),
      data: {
        messageId: message.id,
        senderId: message.senderId,
        visibility: message.visibility,
        category: message.category,
        recipients: message.recipients,
      },
    });

    return message;
  }

  private emitEvent(sessionId: SessionId, event: MessageEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in message event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const playerMessageManager = new PlayerMessageManager();
