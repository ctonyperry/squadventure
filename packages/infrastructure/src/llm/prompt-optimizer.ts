/**
 * Prompt Optimization
 *
 * Utilities for optimizing prompts to reduce token usage
 * while maintaining quality.
 */

import type { LLMMessage } from '@ai-dm/shared';

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Approximate token count for a string
 * Uses rough heuristic: ~4 chars per token for English
 */
export function estimateTokens(text: string): number {
  // More accurate estimation based on OpenAI tokenizer patterns
  // Roughly: 1 token ≈ 4 characters or ~0.75 words
  const charEstimate = Math.ceil(text.length / 4);
  const wordEstimate = Math.ceil(text.split(/\s+/).length * 1.3);
  return Math.ceil((charEstimate + wordEstimate) / 2);
}

/**
 * Estimate tokens for an array of messages
 */
export function estimateMessageTokens(messages: LLMMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    // Role tokens (~4 per message for role + formatting)
    total += 4;
    // Content tokens
    total += estimateTokens(msg.content);
    // Tool call tokens if present
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        total += estimateTokens(tc.name) + estimateTokens(tc.arguments);
      }
    }
  }
  return total;
}

// =============================================================================
// Context Window Management
// =============================================================================

/**
 * Configuration for context window management
 */
export interface ContextWindowConfig {
  /** Maximum tokens to allow in context */
  maxTokens: number;
  /** Tokens to reserve for response */
  reserveForResponse: number;
  /** Strategy for trimming: 'fifo' (oldest first), 'summary', or 'smart' */
  trimStrategy: 'fifo' | 'summary' | 'smart';
  /** Messages to always keep (e.g., system prompt) */
  preserveCount: number;
}

/**
 * Result of context window optimization
 */
export interface ContextWindowResult {
  messages: LLMMessage[];
  trimmedCount: number;
  estimatedTokens: number;
  wasTrimmed: boolean;
}

/**
 * Manage context window to fit within token limits
 */
export function optimizeContextWindow(
  messages: LLMMessage[],
  config: ContextWindowConfig
): ContextWindowResult {
  const targetTokens = config.maxTokens - config.reserveForResponse;
  let currentTokens = estimateMessageTokens(messages);

  if (currentTokens <= targetTokens) {
    return {
      messages,
      trimmedCount: 0,
      estimatedTokens: currentTokens,
      wasTrimmed: false,
    };
  }

  // Clone messages to avoid mutation
  const result = [...messages];
  let trimmedCount = 0;

  // Preserve first N messages (usually system prompt)
  const preserved = result.slice(0, config.preserveCount);
  let trimable = result.slice(config.preserveCount);

  switch (config.trimStrategy) {
    case 'fifo':
      // Remove oldest messages first
      while (
        trimable.length > 0 &&
        estimateMessageTokens([...preserved, ...trimable]) > targetTokens
      ) {
        trimable.shift();
        trimmedCount++;
      }
      break;

    case 'smart':
      // Prioritize keeping recent messages and tool results
      trimable = smartTrim(trimable, targetTokens - estimateMessageTokens(preserved));
      trimmedCount = messages.length - preserved.length - trimable.length;
      break;

    case 'summary':
      // For now, fall back to FIFO - summary would require LLM call
      while (
        trimable.length > 0 &&
        estimateMessageTokens([...preserved, ...trimable]) > targetTokens
      ) {
        trimable.shift();
        trimmedCount++;
      }
      break;
  }

  const finalMessages = [...preserved, ...trimable];
  return {
    messages: finalMessages,
    trimmedCount,
    estimatedTokens: estimateMessageTokens(finalMessages),
    wasTrimmed: trimmedCount > 0,
  };
}

/**
 * Smart trimming that prioritizes recent and important messages
 */
function smartTrim(messages: LLMMessage[], targetTokens: number): LLMMessage[] {
  if (messages.length === 0) return [];

  // Score each message by importance
  const scored = messages.map((msg, index) => ({
    msg,
    index,
    score: scoreMessageImportance(msg, index, messages.length),
    tokens: estimateTokens(msg.content) + 4,
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Greedily select messages that fit
  const selected: typeof scored = [];
  let currentTokens = 0;

  for (const item of scored) {
    if (currentTokens + item.tokens <= targetTokens) {
      selected.push(item);
      currentTokens += item.tokens;
    }
  }

  // Restore original order
  selected.sort((a, b) => a.index - b.index);
  return selected.map((s) => s.msg);
}

/**
 * Score message importance for smart trimming
 */
function scoreMessageImportance(
  msg: LLMMessage,
  index: number,
  totalMessages: number
): number {
  let score = 0;

  // Recency bonus (0-50 points)
  score += (index / totalMessages) * 50;

  // Role-based scoring
  switch (msg.role) {
    case 'system':
      score += 100; // Always important
      break;
    case 'tool':
      score += 30; // Tool results are often referenced
      break;
    case 'assistant':
      score += 20;
      break;
    case 'user':
      score += 25; // User messages provide context
      break;
  }

  // Content-based scoring
  if (msg.toolCalls && msg.toolCalls.length > 0) {
    score += 15; // Messages with tool calls are important
  }

  // Short messages are cheap to keep
  const tokens = estimateTokens(msg.content);
  if (tokens < 50) {
    score += 10;
  }

  return score;
}

// =============================================================================
// Prompt Templates
// =============================================================================

/**
 * Template variable type
 */
export type TemplateVariables = Record<string, string | number | boolean | undefined>;

/**
 * Prompt template with variable substitution
 */
export class PromptTemplate {
  private template: string;
  private variables: Set<string>;

  constructor(template: string) {
    this.template = template;
    this.variables = this.extractVariables(template);
  }

  /**
   * Render template with variables
   */
  render(vars: TemplateVariables): string {
    let result = this.template;

    for (const [key, value] of Object.entries(vars)) {
      if (value !== undefined) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        result = result.replace(regex, String(value));
      }
    }

    // Remove any remaining unset optional variables
    result = result.replace(/\{\{\s*\w+\s*\}\}/g, '');

    return result.trim();
  }

  /**
   * Get required variables
   */
  getVariables(): string[] {
    return Array.from(this.variables);
  }

  /**
   * Check if all required variables are provided
   */
  validate(vars: TemplateVariables): { valid: boolean; missing: string[] } {
    const missing = Array.from(this.variables).filter(
      (v) => vars[v] === undefined
    );
    return { valid: missing.length === 0, missing };
  }

  private extractVariables(template: string): Set<string> {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const vars = new Set<string>();
    let match;
    while ((match = regex.exec(template)) !== null) {
      vars.add(match[1]!);
    }
    return vars;
  }
}

// =============================================================================
// Prompt Compression
// =============================================================================

/**
 * Compress a prompt by removing redundant whitespace and formatting
 */
export function compressPrompt(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Collapse multiple newlines to double
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces to single
    .replace(/[ \t]+/g, ' ')
    // Remove leading/trailing whitespace from lines
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/**
 * Remove common filler phrases that don't add value
 */
export function removeFillerPhrases(text: string): string {
  const fillers = [
    /\bplease note that\b/gi,
    /\bit is important to note that\b/gi,
    /\bas mentioned earlier\b/gi,
    /\bin order to\b/gi,
    /\bfor the purpose of\b/gi,
    /\bat this point in time\b/gi,
    /\bdue to the fact that\b/gi,
    /\bin the event that\b/gi,
  ];

  let result = text;
  for (const filler of fillers) {
    result = result.replace(filler, '');
  }

  // Clean up any double spaces created
  return result.replace(/\s+/g, ' ').trim();
}

// =============================================================================
// Common Game Master Templates
// =============================================================================

export const GM_TEMPLATES = {
  /** Core system prompt for the game master */
  systemPrompt: new PromptTemplate(`You are a Game Master for a {{gameSystem}} tabletop RPG.

Current Setting: {{settingName}}
{{settingDescription}}

Players: {{playerCount}}
Current Scene: {{sceneName}}

Guidelines:
- Be descriptive but concise
- Maintain consistent tone
- Track game state accurately
- Respond to player actions fairly`),

  /** Scene description template */
  sceneDescription: new PromptTemplate(`Describe the scene for the players.

Location: {{locationName}}
Time: {{timeOfDay}}
Weather: {{weather}}
Mood: {{mood}}

Key Elements:
{{keyElements}}

NPCs Present:
{{npcsPresent}}`),

  /** Combat narration template */
  combatNarration: new PromptTemplate(`Narrate the combat action.

Attacker: {{attackerName}}
Target: {{targetName}}
Action: {{actionType}}
Roll Result: {{rollResult}}
Outcome: {{outcome}}

Current Combat State:
{{combatState}}`),

  /** NPC dialogue template */
  npcDialogue: new PromptTemplate(`Generate dialogue for the NPC.

NPC: {{npcName}}
Personality: {{personality}}
Current Mood: {{mood}}
Speaking To: {{speakingTo}}
Context: {{context}}
Topic: {{topic}}`),
};

// =============================================================================
// Prompt Optimizer Class
// =============================================================================

/**
 * Central prompt optimization manager
 */
export class PromptOptimizer {
  private templates: Map<string, PromptTemplate> = new Map();
  private contextConfig: ContextWindowConfig;

  constructor(contextConfig?: Partial<ContextWindowConfig>) {
    this.contextConfig = {
      maxTokens: contextConfig?.maxTokens ?? 8000,
      reserveForResponse: contextConfig?.reserveForResponse ?? 1000,
      trimStrategy: contextConfig?.trimStrategy ?? 'smart',
      preserveCount: contextConfig?.preserveCount ?? 1,
    };

    // Register default templates
    for (const [name, template] of Object.entries(GM_TEMPLATES)) {
      this.templates.set(name, template);
    }
  }

  /**
   * Register a custom template
   */
  registerTemplate(name: string, template: string): void {
    this.templates.set(name, new PromptTemplate(template));
  }

  /**
   * Get a template
   */
  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Render a template
   */
  renderTemplate(name: string, vars: TemplateVariables): string | null {
    const template = this.templates.get(name);
    if (!template) return null;
    return template.render(vars);
  }

  /**
   * Optimize messages for context window
   */
  optimizeMessages(messages: LLMMessage[]): ContextWindowResult {
    return optimizeContextWindow(messages, this.contextConfig);
  }

  /**
   * Estimate tokens for content
   */
  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  /**
   * Compress and optimize a prompt
   */
  optimizePrompt(text: string): string {
    let result = compressPrompt(text);
    result = removeFillerPhrases(result);
    return result;
  }

  /**
   * Update context window configuration
   */
  setContextConfig(config: Partial<ContextWindowConfig>): void {
    Object.assign(this.contextConfig, config);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const promptOptimizer = new PromptOptimizer();
