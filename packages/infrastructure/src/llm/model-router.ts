import type { LLMCompletionRequest } from '@ai-dm/shared';
import type { ModelRouter, ModelRouterConfig, ModelTier } from './adapter.js';

/**
 * Default model router implementation
 * Routes based on message complexity and tool usage
 */
export class DefaultModelRouter implements ModelRouter {
  private config: ModelRouterConfig;

  constructor(config: ModelRouterConfig) {
    this.config = config;
  }

  selectTier(request: LLMCompletionRequest): ModelTier {
    // Count tokens approximately (rough estimate)
    const totalContent = request.messages
      .map((m) => m.content)
      .join(' ');
    const estimatedTokens = Math.ceil(totalContent.length / 4);

    // Complex tool usage suggests need for better model
    const hasComplexTools =
      request.tools !== undefined && request.tools.length > 3;

    // Long context suggests need for better model
    const hasLongContext = estimatedTokens > 2000;

    // Multiple system messages or complex prompting
    const systemMessageCount = request.messages.filter(
      (m) => m.role === 'system'
    ).length;
    const hasComplexPrompting = systemMessageCount > 1;

    // Route to powerful tier for complex requests
    if (hasComplexTools && hasLongContext) {
      return 'powerful';
    }

    // Route to balanced tier for moderately complex requests
    if (hasComplexTools || hasLongContext || hasComplexPrompting) {
      return 'balanced';
    }

    // Default to fast tier
    return 'fast';
  }

  getModelForTier(tier: ModelTier): string {
    return this.config[tier];
  }
}

/**
 * Create a model router with OpenAI defaults
 */
export function createOpenAIModelRouter(): ModelRouter {
  return new DefaultModelRouter({
    fast: 'gpt-4o-mini',
    balanced: 'gpt-4o',
    powerful: 'gpt-4o',
  });
}
