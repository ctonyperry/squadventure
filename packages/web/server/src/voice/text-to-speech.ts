/**
 * Text-to-Speech Narration
 *
 * Converts DM narration and NPC dialogue to speech.
 * Supports multiple TTS providers and voice customization.
 */

import type { SessionId, EntityId } from '@ai-dm/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * TTS provider types
 */
export type TTSProvider = 'openai' | 'elevenlabs' | 'azure' | 'google' | 'browser';

/**
 * Voice characteristics
 */
export interface VoiceProfile {
  id: string;
  name: string;
  provider: TTSProvider;
  /** Provider-specific voice ID */
  voiceId: string;
  /** Voice gender */
  gender: 'male' | 'female' | 'neutral';
  /** Age range */
  age: 'young' | 'adult' | 'elder';
  /** Voice personality/style */
  style: 'narrator' | 'heroic' | 'mysterious' | 'sinister' | 'friendly' | 'gruff';
  /** Language code */
  language: string;
  /** Speaking rate (0.5-2.0, 1.0 = normal) */
  rate?: number;
  /** Pitch adjustment (-1.0 to 1.0) */
  pitch?: number;
  /** URL for voice preview audio */
  previewUrl?: string;
}

/**
 * Options for TTS synthesis
 */
export interface TTSOptions {
  voiceId?: string;
  entityId?: EntityId;
  ssml?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Speech synthesis result
 */
export interface SpeechResult {
  id: string;
  audioData: Buffer;
  format: AudioOutputFormat;
  duration: number;
  voiceId: string;
  timestamp: Date;
}

/**
 * Audio output format
 */
export interface AudioOutputFormat {
  encoding: 'mp3' | 'wav' | 'ogg' | 'pcm';
  sampleRate: number;
  channels: number;
}

/**
 * TTS configuration
 */
export interface TTSConfig {
  provider: TTSProvider;
  apiKey?: string;
  defaultVoice?: string;
  outputFormat?: AudioOutputFormat;
  /** Enable SSML support */
  ssmlEnabled?: boolean;
  /** Cache generated audio */
  cacheEnabled?: boolean;
  /** Maximum text length per request */
  maxTextLength?: number;
}

/**
 * Speech queue item
 */
export interface SpeechQueueItem {
  id: string;
  text: string;
  voiceId: string;
  priority: 'high' | 'normal' | 'low';
  entityId?: EntityId;
  ssml?: boolean;
  createdAt: Date;
}

/**
 * TTS event types
 */
export type TTSEventType =
  | 'speech_started'
  | 'speech_complete'
  | 'speech_error'
  | 'queue_updated';

export interface TTSEvent {
  type: TTSEventType;
  sessionId: SessionId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type TTSEventHandler = (event: TTSEvent) => void;

// =============================================================================
// Default Voice Profiles
// =============================================================================

const DEFAULT_VOICE_PROFILES: VoiceProfile[] = [
  // Narrator voices
  {
    id: 'narrator-default',
    name: 'The Narrator',
    provider: 'openai',
    voiceId: 'alloy',
    gender: 'neutral',
    age: 'adult',
    style: 'narrator',
    language: 'en',
    rate: 1.0,
  },
  {
    id: 'narrator-dramatic',
    name: 'Dramatic Narrator',
    provider: 'openai',
    voiceId: 'onyx',
    gender: 'male',
    age: 'adult',
    style: 'narrator',
    language: 'en',
    rate: 0.9,
  },
  // NPC voices
  {
    id: 'npc-elder-male',
    name: 'Wise Elder',
    provider: 'openai',
    voiceId: 'echo',
    gender: 'male',
    age: 'elder',
    style: 'mysterious',
    language: 'en',
    rate: 0.85,
  },
  {
    id: 'npc-young-female',
    name: 'Young Adventurer',
    provider: 'openai',
    voiceId: 'nova',
    gender: 'female',
    age: 'young',
    style: 'friendly',
    language: 'en',
    rate: 1.1,
  },
  {
    id: 'npc-villain',
    name: 'Dark Villain',
    provider: 'openai',
    voiceId: 'fable',
    gender: 'neutral',
    age: 'adult',
    style: 'sinister',
    language: 'en',
    rate: 0.95,
    pitch: -0.2,
  },
  {
    id: 'npc-tavern-keeper',
    name: 'Tavern Keeper',
    provider: 'openai',
    voiceId: 'shimmer',
    gender: 'female',
    age: 'adult',
    style: 'friendly',
    language: 'en',
    rate: 1.0,
  },
];

// =============================================================================
// Text-to-Speech Service
// =============================================================================

/**
 * Manages text-to-speech synthesis
 */
export class TextToSpeechService {
  private config: TTSConfig;
  private voiceProfiles: Map<string, VoiceProfile> = new Map();
  private entityVoices: Map<EntityId, string> = new Map();
  private speechQueue: Map<SessionId, SpeechQueueItem[]> = new Map();
  private eventHandlers: Map<SessionId, Set<TTSEventHandler>> = new Map();
  private audioCache: Map<string, SpeechResult> = new Map();
  private speechCounter = 0;

  constructor(config: Partial<TTSConfig> = {}) {
    this.config = {
      provider: config.provider ?? 'openai',
      outputFormat: config.outputFormat ?? {
        encoding: 'mp3',
        sampleRate: 24000,
        channels: 1,
      },
      ssmlEnabled: config.ssmlEnabled ?? false,
      cacheEnabled: config.cacheEnabled ?? true,
      maxTextLength: config.maxTextLength ?? 4096,
    };

    if (config.apiKey !== undefined) {
      this.config.apiKey = config.apiKey;
    }
    if (config.defaultVoice !== undefined) {
      this.config.defaultVoice = config.defaultVoice;
    }

    // Register default voice profiles
    for (const profile of DEFAULT_VOICE_PROFILES) {
      this.voiceProfiles.set(profile.id, profile);
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(
    text: string,
    sessionId: SessionId,
    options: {
      voiceId?: string;
      entityId?: EntityId;
      ssml?: boolean;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ): Promise<SpeechResult> {
    // Determine voice to use
    let voiceId = options.voiceId ?? this.config.defaultVoice ?? 'narrator-default';

    // Check if entity has assigned voice
    if (options.entityId) {
      const entityVoice = this.entityVoices.get(options.entityId);
      if (entityVoice) {
        voiceId = entityVoice;
      }
    }

    const voice = this.voiceProfiles.get(voiceId);
    if (!voice) {
      throw new Error(`Voice profile not found: ${voiceId}`);
    }

    // Check cache
    if (this.config.cacheEnabled) {
      const cacheKey = this.getCacheKey(text, voiceId);
      const cached = this.audioCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Validate text length
    if (text.length > (this.config.maxTextLength ?? 4096)) {
      throw new Error(`Text exceeds maximum length of ${this.config.maxTextLength}`);
    }

    const speechId = this.generateSpeechId();

    this.emitEvent(sessionId, {
      type: 'speech_started',
      sessionId,
      timestamp: new Date(),
      data: { speechId, voiceId, textLength: text.length },
    });

    try {
      const result = await this.performSynthesis(text, voice, speechId, options.ssml);

      // Cache result
      if (this.config.cacheEnabled) {
        const cacheKey = this.getCacheKey(text, voiceId);
        this.audioCache.set(cacheKey, result);
      }

      this.emitEvent(sessionId, {
        type: 'speech_complete',
        sessionId,
        timestamp: new Date(),
        data: { speechId, duration: result.duration },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Synthesis failed';

      this.emitEvent(sessionId, {
        type: 'speech_error',
        sessionId,
        timestamp: new Date(),
        data: { speechId, error: errorMessage },
      });

      throw error;
    }
  }

  /**
   * Queue text for synthesis
   */
  queueSpeech(
    text: string,
    sessionId: SessionId,
    options: {
      voiceId?: string;
      entityId?: EntityId;
      priority?: 'high' | 'normal' | 'low';
      ssml?: boolean;
    } = {}
  ): string {
    const speechId = this.generateSpeechId();

    const item: SpeechQueueItem = {
      id: speechId,
      text,
      voiceId: options.voiceId ?? this.config.defaultVoice ?? 'narrator-default',
      priority: options.priority ?? 'normal',
      createdAt: new Date(),
    };

    if (options.entityId !== undefined) {
      item.entityId = options.entityId;
    }
    if (options.ssml !== undefined) {
      item.ssml = options.ssml;
    }

    let queue = this.speechQueue.get(sessionId);
    if (!queue) {
      queue = [];
      this.speechQueue.set(sessionId, queue);
    }

    // Insert by priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      if (priorityOrder[queue[i]!.priority] > priorityOrder[item.priority]) {
        insertIndex = i;
        break;
      }
    }
    queue.splice(insertIndex, 0, item);

    this.emitEvent(sessionId, {
      type: 'queue_updated',
      sessionId,
      timestamp: new Date(),
      data: { queueSize: queue.length, addedId: speechId },
    });

    return speechId;
  }

  /**
   * Process next item in queue
   */
  async processQueue(sessionId: SessionId): Promise<SpeechResult | null> {
    const queue = this.speechQueue.get(sessionId);
    if (!queue || queue.length === 0) {
      return null;
    }

    const item = queue.shift()!;

    this.emitEvent(sessionId, {
      type: 'queue_updated',
      sessionId,
      timestamp: new Date(),
      data: { queueSize: queue.length, processingId: item.id },
    });

    const options: TTSOptions = {
      voiceId: item.voiceId,
      priority: item.priority,
    };
    if (item.entityId !== undefined) {
      options.entityId = item.entityId;
    }
    if (item.ssml !== undefined) {
      options.ssml = item.ssml;
    }

    return this.synthesize(item.text, sessionId, options);
  }

  /**
   * Register a custom voice profile
   */
  registerVoice(profile: VoiceProfile): void {
    this.voiceProfiles.set(profile.id, profile);
  }

  /**
   * Assign a voice to an entity (NPC)
   */
  assignEntityVoice(entityId: EntityId, voiceId: string): void {
    if (!this.voiceProfiles.has(voiceId)) {
      throw new Error(`Voice profile not found: ${voiceId}`);
    }
    this.entityVoices.set(entityId, voiceId);
  }

  /**
   * Get voice for an entity
   */
  getEntityVoice(entityId: EntityId): VoiceProfile | undefined {
    const voiceId = this.entityVoices.get(entityId);
    if (voiceId) {
      return this.voiceProfiles.get(voiceId);
    }
    return undefined;
  }

  /**
   * Get all available voice profiles
   */
  getVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values());
  }

  /**
   * Get voices filtered by criteria
   */
  findVoices(criteria: Partial<Pick<VoiceProfile, 'gender' | 'age' | 'style' | 'language'>>): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values()).filter((voice) => {
      if (criteria.gender && voice.gender !== criteria.gender) return false;
      if (criteria.age && voice.age !== criteria.age) return false;
      if (criteria.style && voice.style !== criteria.style) return false;
      if (criteria.language && voice.language !== criteria.language) return false;
      return true;
    });
  }

  /**
   * Subscribe to TTS events
   */
  subscribe(sessionId: SessionId, handler: TTSEventHandler): () => void {
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
   * Clear audio cache
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * Get queue size for session
   */
  getQueueSize(sessionId: SessionId): number {
    return this.speechQueue.get(sessionId)?.length ?? 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    provider: TTSProvider;
    defaultVoice: string;
    speed: number;
    pitch: number;
  } {
    return {
      provider: this.config.provider,
      defaultVoice: this.config.defaultVoice ?? 'narrator-default',
      speed: 1.0,
      pitch: 0,
    };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async performSynthesis(
    text: string,
    voice: VoiceProfile,
    speechId: string,
    ssml?: boolean
  ): Promise<SpeechResult> {
    const startTime = Date.now();

    switch (voice.provider) {
      case 'openai':
        return this.synthesizeWithOpenAI(text, voice, speechId, startTime);
      case 'elevenlabs':
        return this.synthesizeWithElevenLabs(text, voice, speechId, startTime);
      case 'azure':
        return this.synthesizeWithAzure(text, voice, speechId, startTime, ssml);
      case 'google':
        return this.synthesizeWithGoogle(text, voice, speechId, startTime, ssml);
      case 'browser':
        throw new Error('Browser TTS should be handled client-side');
      default:
        throw new Error(`Unsupported TTS provider: ${voice.provider}`);
    }
  }

  private async synthesizeWithOpenAI(
    text: string,
    voice: VoiceProfile,
    speechId: string,
    startTime: number
  ): Promise<SpeechResult> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice.voiceId,
        response_format: this.config.outputFormat?.encoding ?? 'mp3',
        speed: voice.rate ?? 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS API error: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(arrayBuffer);
    const duration = (Date.now() - startTime) / 1000;

    return {
      id: speechId,
      audioData,
      format: this.config.outputFormat ?? { encoding: 'mp3', sampleRate: 24000, channels: 1 },
      duration,
      voiceId: voice.id,
      timestamp: new Date(),
    };
  }

  private async synthesizeWithElevenLabs(
    text: string,
    voice: VoiceProfile,
    speechId: string,
    startTime: number
  ): Promise<SpeechResult> {
    // Placeholder for ElevenLabs implementation
    const duration = (Date.now() - startTime) / 1000;

    return {
      id: speechId,
      audioData: Buffer.from([]),
      format: this.config.outputFormat ?? { encoding: 'mp3', sampleRate: 24000, channels: 1 },
      duration,
      voiceId: voice.id,
      timestamp: new Date(),
    };
  }

  private async synthesizeWithAzure(
    _text: string,
    voice: VoiceProfile,
    speechId: string,
    startTime: number,
    _ssml?: boolean
  ): Promise<SpeechResult> {
    // Placeholder for Azure Speech Services implementation
    const duration = (Date.now() - startTime) / 1000;

    return {
      id: speechId,
      audioData: Buffer.from([]),
      format: this.config.outputFormat ?? { encoding: 'mp3', sampleRate: 24000, channels: 1 },
      duration,
      voiceId: voice.id,
      timestamp: new Date(),
    };
  }

  private async synthesizeWithGoogle(
    _text: string,
    voice: VoiceProfile,
    speechId: string,
    startTime: number,
    _ssml?: boolean
  ): Promise<SpeechResult> {
    // Placeholder for Google Cloud TTS implementation
    const duration = (Date.now() - startTime) / 1000;

    return {
      id: speechId,
      audioData: Buffer.from([]),
      format: this.config.outputFormat ?? { encoding: 'mp3', sampleRate: 24000, channels: 1 },
      duration,
      voiceId: voice.id,
      timestamp: new Date(),
    };
  }

  private getCacheKey(text: string, voiceId: string): string {
    // Simple hash for cache key
    const combined = `${voiceId}:${text}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `tts_${hash.toString(16)}`;
  }

  private generateSpeechId(): string {
    return `speech_${Date.now()}_${++this.speechCounter}`;
  }

  private emitEvent(sessionId: SessionId, event: TTSEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error('Error in TTS event handler:', e);
        }
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const textToSpeechService = new TextToSpeechService();
