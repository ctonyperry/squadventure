import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
} from '@ai-dm/shared';

/**
 * Configuration for LLM adapters
 */
export interface LLMAdapterConfig {
  apiKey: string;
  defaultModel: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
}

/**
 * Streaming chunk from LLM
 */
export interface LLMStreamChunk {
  content: string | null;
  isComplete: boolean;
  toolCalls?: {
    id: string;
    name: string;
    arguments: string;
  }[];
}

/**
 * Abstract interface for LLM providers
 * Allows swapping between OpenAI, Anthropic, local models, etc.
 */
export interface LLMAdapter {
  /**
   * Get a completion from the LLM
   */
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;

  /**
   * Stream a completion from the LLM
   */
  stream(
    request: LLMCompletionRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  /**
   * Get the name of the adapter (for logging/debugging)
   */
  getName(): string;

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean;
}

/**
 * Model tier for routing decisions
 */
export type ModelTier = 'fast' | 'balanced' | 'powerful';

/**
 * Model router configuration
 */
export interface ModelRouterConfig {
  fast: string; // e.g., 'gpt-4o-mini'
  balanced: string; // e.g., 'gpt-4o'
  powerful: string; // e.g., 'gpt-4o' with higher tokens
}

/**
 * Routes requests to appropriate model tiers based on complexity
 */
export interface ModelRouter {
  /**
   * Select the appropriate model tier for a request
   */
  selectTier(request: LLMCompletionRequest): ModelTier;

  /**
   * Get the model name for a tier
   */
  getModelForTier(tier: ModelTier): string;
}
