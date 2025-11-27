/**
 * Speech-to-Text Integration
 *
 * Converts player voice input to text for command processing.
 * Supports multiple STT providers (OpenAI Whisper, browser Web Speech API, etc.)
 */

import type { PlayerId, SessionId } from '@ai-dm/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * STT provider types
 */
export type STTProvider = 'whisper' | 'web-speech' | 'azure' | 'google';

/**
 * Transcription result
 */
export interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  language: string;
  duration: number;
  timestamp: Date;
  isFinal: boolean;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

/**
 * Audio format configuration
 */
export interface AudioFormat {
  sampleRate: number;
  channels: number;
  encoding: 'pcm' | 'mp3' | 'webm' | 'ogg' | 'wav';
  bitDepth?: number;
}

/**
 * STT configuration
 */
export interface STTConfig {
  provider: STTProvider;
  apiKey?: string;
  language?: string;
  model?: string;
  /** Enable real-time streaming transcription */
  streaming?: boolean;
  /** Maximum audio duration in seconds */
  maxDuration?: number;
  /** Enable profanity filter */
  profanityFilter?: boolean;
  /** Enable punctuation */
  punctuation?: boolean;
  /** Custom vocabulary for game terms */
  customVocabulary?: string[];
}

/**
 * Transcription event types
 */
export type TranscriptionEventType =
  | 'transcription_started'
  | 'transcription_partial'
  | 'transcription_complete'
  | 'transcription_error';

export interface TranscriptionEvent {
  type: TranscriptionEventType;
  sessionId: SessionId;
  playerId: PlayerId;
  timestamp: Date;
  data: TranscriptionResult | { error: string };
}

export type TranscriptionEventHandler = (event: TranscriptionEvent) => void;

// =============================================================================
// Default Game Vocabulary
// =============================================================================

const DEFAULT_GAME_VOCABULARY = [
  // Actions
  'attack', 'cast', 'dodge', 'hide', 'dash', 'disengage',
  'help', 'search', 'investigate', 'persuade', 'intimidate',
  'deceive', 'insight', 'perception', 'stealth', 'acrobatics',
  // Dice
  'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100',
  'advantage', 'disadvantage', 'modifier', 'bonus',
  // Combat
  'initiative', 'armor class', 'hit points', 'damage',
  'melee', 'ranged', 'spell', 'cantrip', 'concentration',
  // Common commands
  'roll', 'check', 'save', 'saving throw', 'ability check',
  'skill check', 'attack roll', 'damage roll',
  // Locations
  'tavern', 'dungeon', 'castle', 'forest', 'cave',
  'town', 'village', 'city', 'wilderness',
];

// =============================================================================
// Speech-to-Text Service
// =============================================================================

/**
 * Manages speech-to-text transcription
 */
export class SpeechToTextService {
  private config: STTConfig;
  private eventHandlers: Map<SessionId, Set<TranscriptionEventHandler>> = new Map();
  private activeTranscriptions: Map<string, { playerId: PlayerId; sessionId: SessionId }> = new Map();
  private transcriptionCounter = 0;

  constructor(config: Partial<STTConfig> = {}) {
    this.config = {
      provider: config.provider ?? 'whisper',
      language: config.language ?? 'en',
      streaming: config.streaming ?? true,
      maxDuration: config.maxDuration ?? 30,
      profanityFilter: config.profanityFilter ?? false,
      punctuation: config.punctuation ?? true,
      customVocabulary: [
        ...DEFAULT_GAME_VOCABULARY,
        ...(config.customVocabulary ?? []),
      ],
    };

    if (config.apiKey !== undefined) {
      this.config.apiKey = config.apiKey;
    }
    if (config.model !== undefined) {
      this.config.model = config.model;
    }
  }

  /**
   * Transcribe audio buffer
   */
  async transcribe(
    audioBuffer: Buffer | ArrayBuffer,
    sessionId: SessionId,
    playerId: PlayerId,
    format: AudioFormat
  ): Promise<TranscriptionResult> {
    const transcriptionId = this.generateTranscriptionId();

    this.activeTranscriptions.set(transcriptionId, { playerId, sessionId });

    this.emitEvent(sessionId, {
      type: 'transcription_started',
      sessionId,
      playerId,
      timestamp: new Date(),
      data: {
        id: transcriptionId,
        text: '',
        confidence: 0,
        language: this.config.language ?? 'en',
        duration: 0,
        timestamp: new Date(),
        isFinal: false,
      },
    });

    try {
      const result = await this.performTranscription(
        audioBuffer,
        format,
        transcriptionId
      );

      this.emitEvent(sessionId, {
        type: 'transcription_complete',
        sessionId,
        playerId,
        timestamp: new Date(),
        data: result,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';

      this.emitEvent(sessionId, {
        type: 'transcription_error',
        sessionId,
        playerId,
        timestamp: new Date(),
        data: { error: errorMessage } as unknown as TranscriptionResult,
      });

      throw error;
    } finally {
      this.activeTranscriptions.delete(transcriptionId);
    }
  }

  /**
   * Start streaming transcription session
   */
  startStreamingSession(
    sessionId: SessionId,
    playerId: PlayerId
  ): StreamingTranscriptionSession {
    return new StreamingTranscriptionSession(
      sessionId,
      playerId,
      this.config,
      (event) => this.emitEvent(sessionId, event)
    );
  }

  /**
   * Subscribe to transcription events
   */
  subscribe(sessionId: SessionId, handler: TranscriptionEventHandler): () => void {
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
   * Get active transcriptions for a session
   */
  getActiveTranscriptions(sessionId: SessionId): string[] {
    const result: string[] = [];
    for (const [id, data] of this.activeTranscriptions) {
      if (data.sessionId === sessionId) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<STTConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): STTConfig {
    return { ...this.config };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async performTranscription(
    audioBuffer: Buffer | ArrayBuffer,
    format: AudioFormat,
    transcriptionId: string
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    // Provider-specific implementation
    switch (this.config.provider) {
      case 'whisper':
        return this.transcribeWithWhisper(audioBuffer, format, transcriptionId, startTime);
      case 'web-speech':
        // Web Speech API runs in browser, server just receives results
        throw new Error('Web Speech API should be handled client-side');
      case 'azure':
        return this.transcribeWithAzure(audioBuffer, format, transcriptionId, startTime);
      case 'google':
        return this.transcribeWithGoogle(audioBuffer, format, transcriptionId, startTime);
      default:
        throw new Error(`Unsupported STT provider: ${this.config.provider}`);
    }
  }

  private async transcribeWithWhisper(
    audioBuffer: Buffer | ArrayBuffer,
    format: AudioFormat,
    transcriptionId: string,
    startTime: number
  ): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required for Whisper');
    }

    // Convert to proper format if needed
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: this.getMimeType(format) });
    formData.append('file', blob, `audio.${format.encoding}`);
    formData.append('model', this.config.model ?? 'whisper-1');
    formData.append('language', this.config.language ?? 'en');
    formData.append('response_format', 'verbose_json');

    if (this.config.customVocabulary && this.config.customVocabulary.length > 0) {
      formData.append('prompt', this.config.customVocabulary.join(', '));
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const data = await response.json() as {
      text: string;
      language: string;
      duration: number;
    };

    return {
      id: transcriptionId,
      text: data.text,
      confidence: 0.95, // Whisper doesn't return confidence
      language: data.language,
      duration: data.duration,
      timestamp: new Date(),
      isFinal: true,
    };
  }

  private async transcribeWithAzure(
    _audioBuffer: Buffer | ArrayBuffer,
    _format: AudioFormat,
    transcriptionId: string,
    startTime: number
  ): Promise<TranscriptionResult> {
    // Placeholder for Azure Speech Services implementation
    // Would require Azure Speech SDK
    const duration = (Date.now() - startTime) / 1000;

    return {
      id: transcriptionId,
      text: '[Azure STT not implemented]',
      confidence: 0,
      language: this.config.language ?? 'en',
      duration,
      timestamp: new Date(),
      isFinal: true,
    };
  }

  private async transcribeWithGoogle(
    _audioBuffer: Buffer | ArrayBuffer,
    _format: AudioFormat,
    transcriptionId: string,
    startTime: number
  ): Promise<TranscriptionResult> {
    // Placeholder for Google Cloud Speech-to-Text implementation
    const duration = (Date.now() - startTime) / 1000;

    return {
      id: transcriptionId,
      text: '[Google STT not implemented]',
      confidence: 0,
      language: this.config.language ?? 'en',
      duration,
      timestamp: new Date(),
      isFinal: true,
    };
  }

  private getMimeType(format: AudioFormat): string {
    switch (format.encoding) {
      case 'mp3':
        return 'audio/mpeg';
      case 'webm':
        return 'audio/webm';
      case 'ogg':
        return 'audio/ogg';
      case 'wav':
        return 'audio/wav';
      case 'pcm':
        return 'audio/pcm';
      default:
        return 'audio/wav';
    }
  }

  private generateTranscriptionId(): string {
    return `trans_${Date.now()}_${++this.transcriptionCounter}`;
  }

  private emitEvent(sessionId: SessionId, event: TranscriptionEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in transcription event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Streaming Transcription Session
// =============================================================================

/**
 * Handles real-time streaming transcription
 */
export class StreamingTranscriptionSession {
  private sessionId: SessionId;
  private playerId: PlayerId;
  private config: STTConfig;
  private emitEvent: (event: TranscriptionEvent) => void;
  private audioChunks: Buffer[] = [];
  private isActive = false;
  private partialText = '';

  constructor(
    sessionId: SessionId,
    playerId: PlayerId,
    config: STTConfig,
    emitEvent: (event: TranscriptionEvent) => void
  ) {
    this.sessionId = sessionId;
    this.playerId = playerId;
    this.config = config;
    this.emitEvent = emitEvent;
  }

  /**
   * Start the streaming session
   */
  start(): void {
    this.isActive = true;
    this.audioChunks = [];
    this.partialText = '';
  }

  /**
   * Add audio chunk to the stream
   */
  addChunk(chunk: Buffer): void {
    if (!this.isActive) return;
    this.audioChunks.push(chunk);

    // Emit partial result (in real implementation, this would process incrementally)
    this.emitEvent({
      type: 'transcription_partial',
      sessionId: this.sessionId,
      playerId: this.playerId,
      timestamp: new Date(),
      data: {
        id: `stream_${Date.now()}`,
        text: this.partialText,
        confidence: 0.8,
        language: this.config.language ?? 'en',
        duration: 0,
        timestamp: new Date(),
        isFinal: false,
      },
    });
  }

  /**
   * End the streaming session and get final result
   */
  async end(): Promise<TranscriptionResult> {
    this.isActive = false;

    // Combine all chunks
    const fullBuffer = Buffer.concat(this.audioChunks);

    // In real implementation, finalize streaming transcription
    const result: TranscriptionResult = {
      id: `stream_final_${Date.now()}`,
      text: this.partialText || '[Streaming transcription complete]',
      confidence: 0.9,
      language: this.config.language ?? 'en',
      duration: this.audioChunks.length * 0.1, // Approximate
      timestamp: new Date(),
      isFinal: true,
    };

    this.emitEvent({
      type: 'transcription_complete',
      sessionId: this.sessionId,
      playerId: this.playerId,
      timestamp: new Date(),
      data: result,
    });

    return result;
  }

  /**
   * Cancel the streaming session
   */
  cancel(): void {
    this.isActive = false;
    this.audioChunks = [];
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.isActive;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const speechToTextService = new SpeechToTextService();
