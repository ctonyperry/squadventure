import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMMessage,
  LLMTool,
  LLMToolCallRequest,
} from '@ai-dm/shared';
import type { LLMAdapter, LLMAdapterConfig, LLMStreamChunk } from './adapter.js';

/**
 * OpenAI-specific configuration
 */
export interface OpenAIAdapterConfig extends LLMAdapterConfig {
  organization?: string | undefined;
  baseUrl?: string | undefined;
}

/**
 * OpenAI adapter implementation
 */
export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private config: OpenAIAdapterConfig;

  constructor(config: OpenAIAdapterConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 60000,
    });
  }

  getName(): string {
    return 'openai';
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const messages = this.convertMessages(request.messages);
    const tools = request.tools ? this.convertTools(request.tools) : undefined;
    const maxTokens = request.maxTokens ?? this.config.defaultMaxTokens;

    const response = await this.client.chat.completions.create({
      model: request.model ?? this.config.defaultModel,
      messages,
      ...(tools ? { tools } : {}),
      temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
      max_tokens: maxTokens ?? null,
      stream: false,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No completion choice returned from OpenAI');
    }

    const toolCalls: LLMToolCallRequest[] | undefined = choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

    const result: LLMCompletionResponse = {
      content: choice.message.content,
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };

    if (toolCalls) {
      result.toolCalls = toolCalls;
    }

    return result;
  }

  async *stream(
    request: LLMCompletionRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const messages = this.convertMessages(request.messages);
    const tools = request.tools ? this.convertTools(request.tools) : undefined;
    const maxTokens = request.maxTokens ?? this.config.defaultMaxTokens;

    const stream = await this.client.chat.completions.create({
      model: request.model ?? this.config.defaultModel,
      messages,
      ...(tools ? { tools } : {}),
      temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
      max_tokens: maxTokens ?? null,
      stream: true,
    });

    const toolCallAccumulators: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      // Accumulate tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = toolCallAccumulators.get(tc.index);
          if (existing) {
            existing.arguments += tc.function?.arguments ?? '';
          } else {
            toolCallAccumulators.set(tc.index, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              arguments: tc.function?.arguments ?? '',
            });
          }
        }
      }

      const streamChunk: LLMStreamChunk = {
        content: delta?.content ?? null,
        isComplete: finishReason !== null,
      };

      if (finishReason === 'tool_calls') {
        streamChunk.toolCalls = Array.from(toolCallAccumulators.values());
      }

      yield streamChunk;
    }
  }

  private convertMessages(messages: LLMMessage[]): ChatCompletionMessageParam[] {
    return messages.map((msg): ChatCompletionMessageParam => {
      switch (msg.role) {
        case 'system':
          return { role: 'system', content: msg.content };
        case 'user':
          return { role: 'user', content: msg.content };
        case 'assistant':
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            return {
              role: 'assistant',
              content: msg.content || null,
              tool_calls: msg.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })),
            };
          }
          return { role: 'assistant', content: msg.content };
        case 'tool':
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.toolCallId ?? '',
          };
        default:
          throw new Error(`Unknown message role: ${msg.role}`);
      }
    });
  }

  private convertTools(tools: LLMTool[]): ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private mapFinishReason(
    reason: string | null
  ): LLMCompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}

/**
 * Create an OpenAI adapter from environment variables
 */
export function createOpenAIAdapterFromEnv(): OpenAIAdapter {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const organization = process.env['OPENAI_ORGANIZATION'];
  const temperatureStr = process.env['OPENAI_TEMPERATURE'];
  const maxTokensStr = process.env['OPENAI_MAX_TOKENS'];

  const config: OpenAIAdapterConfig = {
    apiKey,
    defaultModel: process.env['OPENAI_DEFAULT_MODEL'] ?? 'gpt-4o-mini',
    defaultTemperature: temperatureStr ? parseFloat(temperatureStr) : 0.7,
  };

  if (organization) {
    config.organization = organization;
  }

  if (maxTokensStr) {
    config.defaultMaxTokens = parseInt(maxTokensStr, 10);
  }

  return new OpenAIAdapter(config);
}
