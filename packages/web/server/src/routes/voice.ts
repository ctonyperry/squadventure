/**
 * Voice API Routes
 *
 * REST endpoints for voice functionality:
 * - Voice channels
 * - Speech synthesis
 * - Command recognition
 */

import type { FastifyInstance } from 'fastify';
import type { PlayerId, SessionId } from '@ai-dm/shared';
import { createPlayerId, createSessionId, createEntityId } from '@ai-dm/shared';
import {
  voiceChannelManager,
  textToSpeechService,
  speechToTextService,
  voiceCommandRecognizer,
  type VoiceChannelConfig,
  type VoiceChannelType,
  type TTSOptions,
  type AudioFormat,
} from '../voice/index.js';

/**
 * Register voice routes
 */
export function registerVoiceRoutes(fastify: FastifyInstance): void {
  // ==========================================================================
  // Voice Channel Endpoints (#37)
  // ==========================================================================

  /**
   * Get all voice channels for a session
   */
  fastify.get<{
    Params: { sessionId: string };
  }>('/api/voice/channels/:sessionId', (request, reply) => {
    const sessionId = createSessionId(request.params.sessionId);
    const channels = voiceChannelManager.getSessionChannels(sessionId);

    return {
      success: true,
      channels: channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        state: ch.state,
        participantCount: ch.participants.size,
        participants: Array.from(ch.participants.values()).map((p) => ({
          playerId: p.playerId,
          playerName: p.playerName,
          connectionState: p.connectionState,
          isMuted: p.isMuted,
          isSpeaking: p.isSpeaking,
        })),
        createdAt: ch.createdAt.toISOString(),
      })),
    };
  });

  /**
   * Create a new voice channel
   */
  fastify.post<{
    Body: {
      sessionId: string;
      name: string;
      type: VoiceChannelType;
      createdBy: string;
      config?: VoiceChannelConfig;
    };
  }>('/api/voice/channels', async (request, reply) => {
    const sessionId = createSessionId(request.body.sessionId);
    const createdBy = createPlayerId(request.body.createdBy);

    const channel = voiceChannelManager.createChannel(
      sessionId,
      request.body.name,
      request.body.type,
      createdBy,
      request.body.config
    );

    return {
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        state: channel.state,
      },
    };
  });

  /**
   * Delete a voice channel
   */
  fastify.delete<{
    Params: { channelId: string };
  }>('/api/voice/channels/:channelId', (request, reply) => {
    const success = voiceChannelManager.deleteChannel(request.params.channelId);

    if (!success) {
      return reply.code(404).send({ success: false, error: 'Channel not found' });
    }

    return { success: true };
  });

  /**
   * Join a voice channel
   */
  fastify.post<{
    Params: { channelId: string };
    Body: { playerId: string; playerName: string };
  }>('/api/voice/channels/:channelId/join', async (request, reply) => {
    const playerId = createPlayerId(request.body.playerId);

    const result = voiceChannelManager.joinChannel(
      request.params.channelId,
      playerId,
      request.body.playerName
    );

    if (!result.success) {
      return reply.code(400).send({ success: false, error: result.error });
    }

    return { success: true };
  });

  /**
   * Leave a voice channel
   */
  fastify.post<{
    Params: { channelId: string };
    Body: { playerId: string };
  }>('/api/voice/channels/:channelId/leave', async (request, reply) => {
    const playerId = createPlayerId(request.body.playerId);
    const success = voiceChannelManager.leaveChannel(
      request.params.channelId,
      playerId
    );

    if (!success) {
      return reply.code(400).send({ success: false, error: 'Not in channel' });
    }

    return { success: true };
  });

  /**
   * Update mute state
   */
  fastify.post<{
    Params: { channelId: string };
    Body: { playerId: string; muted: boolean };
  }>('/api/voice/channels/:channelId/mute', async (request, reply) => {
    const playerId = createPlayerId(request.body.playerId);

    const success = voiceChannelManager.setMuted(
      request.params.channelId,
      playerId,
      request.body.muted
    );

    if (!success) {
      return reply.code(400).send({ success: false, error: 'Player not in channel' });
    }

    return { success: true };
  });

  /**
   * Create default channels for a session
   */
  fastify.post<{
    Body: { sessionId: string; dmId: string };
  }>('/api/voice/channels/defaults', async (request, reply) => {
    const sessionId = createSessionId(request.body.sessionId);
    const dmId = createPlayerId(request.body.dmId);

    const { main, dmPrivate } = voiceChannelManager.createDefaultChannels(
      sessionId,
      dmId
    );

    return {
      success: true,
      channels: {
        main: { id: main.id, name: main.name },
        dmPrivate: { id: dmPrivate.id, name: dmPrivate.name },
      },
    };
  });

  /**
   * Get channel statistics
   */
  fastify.get('/api/voice/channels/stats', (request, reply) => {
    const stats = voiceChannelManager.getStats();
    return { success: true, stats };
  });

  // ==========================================================================
  // Text-to-Speech Endpoints (#36)
  // ==========================================================================

  /**
   * Synthesize speech from text
   */
  fastify.post<{
    Body: {
      text: string;
      sessionId: string;
      options?: TTSOptions;
    };
  }>('/api/voice/tts/synthesize', async (request, reply) => {
    const sessionId = createSessionId(request.body.sessionId);

    try {
      const result = await textToSpeechService.synthesize(
        request.body.text,
        sessionId,
        request.body.options
      );

      return {
        success: true,
        result: {
          id: result.id,
          duration: result.duration,
          format: result.format,
          audioSize: result.audioData.byteLength,
        },
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Synthesis failed',
      });
    }
  });

  /**
   * Queue speech for processing
   */
  fastify.post<{
    Body: {
      text: string;
      sessionId: string;
      options?: TTSOptions;
    };
  }>('/api/voice/tts/queue', async (request, reply) => {
    const sessionId = createSessionId(request.body.sessionId);

    const speechId = textToSpeechService.queueSpeech(
      request.body.text,
      sessionId,
      request.body.options
    );

    return { success: true, speechId };
  });

  /**
   * Get available voice profiles
   */
  fastify.get('/api/voice/tts/voices', (request, reply) => {
    const voices = textToSpeechService.getVoiceProfiles();

    return {
      success: true,
      voices: voices.map((v) => ({
        id: v.id,
        name: v.name,
        gender: v.gender,
        style: v.style,
        preview: v.previewUrl,
      })),
    };
  });

  /**
   * Assign a voice to an entity
   */
  fastify.post<{
    Body: { entityId: string; voiceId: string };
  }>('/api/voice/tts/assign-voice', async (request, reply) => {
    const entityId = createEntityId(request.body.entityId);
    textToSpeechService.assignEntityVoice(entityId, request.body.voiceId);

    return { success: true };
  });

  /**
   * Get TTS configuration
   */
  fastify.get('/api/voice/tts/config', (request, reply) => {
    const config = textToSpeechService.getConfig();

    return {
      success: true,
      config: {
        provider: config.provider,
        defaultVoice: config.defaultVoice,
        speed: config.speed,
        pitch: config.pitch,
      },
    };
  });

  // ==========================================================================
  // Speech-to-Text Endpoints (#35)
  // ==========================================================================

  /**
   * Transcribe audio
   */
  fastify.post<{
    Body: {
      audioData: string;
      sessionId: string;
      playerId: string;
      format: AudioFormat;
    };
  }>('/api/voice/stt/transcribe', async (request, reply) => {
    const sessionId = createSessionId(request.body.sessionId);
    const playerId = createPlayerId(request.body.playerId);

    try {
      const audioBuffer = Buffer.from(request.body.audioData, 'base64');

      const result = await speechToTextService.transcribe(
        audioBuffer,
        sessionId,
        playerId,
        request.body.format
      );

      return {
        success: true,
        result: {
          id: result.id,
          text: result.text,
          confidence: result.confidence,
          language: result.language,
          duration: result.duration,
          isFinal: result.isFinal,
        },
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      });
    }
  });

  /**
   * Get STT configuration
   */
  fastify.get('/api/voice/stt/config', (request, reply) => {
    const config = speechToTextService.getConfig();

    return {
      success: true,
      config: {
        provider: config.provider,
        language: config.language,
        streaming: config.streaming,
      },
    };
  });

  /**
   * Get active transcriptions for a session
   */
  fastify.get<{
    Params: { sessionId: string };
  }>('/api/voice/stt/active/:sessionId', (request, reply) => {
    const sessionId = createSessionId(request.params.sessionId);
    const active = speechToTextService.getActiveTranscriptions(sessionId);

    return { success: true, transcriptions: active };
  });

  // ==========================================================================
  // Voice Command Endpoints (#38)
  // ==========================================================================

  /**
   * Recognize command from text
   */
  fastify.post<{
    Body: {
      text: string;
      playerId: string;
      sessionId: string;
    };
  }>('/api/voice/commands/recognize', async (request, reply) => {
    const playerId = createPlayerId(request.body.playerId);
    const sessionId = createSessionId(request.body.sessionId);

    const result = voiceCommandRecognizer.recognize(
      request.body.text,
      playerId,
      sessionId
    );

    return {
      success: result.success,
      command: result.command
        ? {
            id: result.command.id,
            category: result.command.category,
            intent: result.command.intent,
            confidence: result.command.confidence,
            parameters: result.command.parameters,
          }
        : null,
      alternatives: result.alternatives?.map((alt) => ({
        intent: alt.intent,
        confidence: alt.confidence,
      })),
      processingTimeMs: result.processingTimeMs,
    };
  });

  /**
   * Get supported command categories
   */
  fastify.get('/api/voice/commands/categories', (request, reply) => {
    const categories = voiceCommandRecognizer.getCategories();
    return { success: true, categories };
  });

  /**
   * Get supported intents
   */
  fastify.get('/api/voice/commands/intents', (request, reply) => {
    const intents = voiceCommandRecognizer.getIntents();
    return { success: true, intents };
  });

  /**
   * Parse dice notation
   */
  fastify.post<{
    Body: { notation: string };
  }>('/api/voice/commands/parse-dice', async (request, reply) => {
    const result = voiceCommandRecognizer.parseDiceNotation(request.body.notation);

    if (!result) {
      return reply.code(400).send({ success: false, error: 'Invalid dice notation' });
    }

    return { success: true, dice: result };
  });
}
