/**
 * AI Player for automated testing
 * Generates player actions based on archetype and context
 */

import type { PlayerArchetype, WeightedAction } from './player-archetypes.js';

/**
 * Simple LLM adapter interface for AI player
 * This avoids dependency on infrastructure package
 */
export interface AIPlayerLLMAdapter {
  complete(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content?: string }>;
}

/**
 * AI Player configuration
 */
export interface AIPlayerConfig {
  archetype: PlayerArchetype;
  characterName: string;
  characterClass?: string;
  llmAdapter?: AIPlayerLLMAdapter; // Optional - use LLM for more realistic responses
}

/**
 * AI Player that generates actions based on archetype
 */
export class AIPlayer {
  private archetype: PlayerArchetype;
  private characterName: string;
  private characterClass: string;
  private llmAdapter?: AIPlayerLLMAdapter;
  private conversationContext: string[] = [];
  private turnCount: number = 0;

  constructor(config: AIPlayerConfig) {
    this.archetype = config.archetype;
    this.characterName = config.characterName;
    this.characterClass = config.characterClass ?? 'adventurer';
    if (config.llmAdapter !== undefined) {
      this.llmAdapter = config.llmAdapter;
    }
  }

  /**
   * Get player name
   */
  getName(): string {
    return this.characterName;
  }

  /**
   * Get archetype
   */
  getArchetype(): PlayerArchetype {
    return this.archetype;
  }

  /**
   * Generate a response to DM output
   */
  async generateAction(dmOutput: string): Promise<string> {
    this.turnCount++;
    this.conversationContext.push(dmOutput);

    // Keep context window manageable
    if (this.conversationContext.length > 10) {
      this.conversationContext = this.conversationContext.slice(-10);
    }

    // If we have an LLM adapter, use it for more realistic responses
    if (this.llmAdapter) {
      return this.generateLLMAction(dmOutput);
    }

    // Otherwise use pattern matching
    return this.generatePatternAction(dmOutput);
  }

  /**
   * Generate action using pattern matching (no LLM)
   */
  private generatePatternAction(dmOutput: string): string {
    const dmLower = dmOutput.toLowerCase();

    // Find matching action patterns
    for (const pattern of this.archetype.actionPatterns) {
      const regex = new RegExp(pattern.situation, 'i');
      if (regex.test(dmLower)) {
        const action = this.selectWeightedAction(pattern.actions);
        return this.formatAction(action);
      }
    }

    // Default fallback actions
    const fallbacks: WeightedAction[] = [
      { action: 'I look around. What do I see?', weight: 25 },
      { action: 'What are my options here?', weight: 25 },
      { action: 'I wait and observe.', weight: 20 },
      { action: "I continue forward cautiously.", weight: 15 },
      { action: 'I check my surroundings for anything interesting.', weight: 15 },
    ];

    return this.formatAction(this.selectWeightedAction(fallbacks));
  }

  /**
   * Generate action using LLM for realistic roleplay
   */
  private async generateLLMAction(dmOutput: string): Promise<string> {
    if (!this.llmAdapter) {
      return this.generatePatternAction(dmOutput);
    }

    const systemPrompt = this.buildPlayerSystemPrompt();
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.conversationContext.slice(0, -1).map((text, i) => ({
        role: (i % 2 === 0 ? 'assistant' : 'user') as 'assistant' | 'user',
        content: text,
      })),
      { role: 'assistant' as const, content: dmOutput },
    ];

    try {
      const response = await this.llmAdapter.complete({
        messages,
        temperature: 0.9,
        maxTokens: 150,
      });

      const action = response.content ?? this.generatePatternAction(dmOutput);
      this.conversationContext.push(action);
      return action;
    } catch {
      // Fallback to pattern matching on error
      return this.generatePatternAction(dmOutput);
    }
  }

  /**
   * Build system prompt for LLM-based player
   */
  private buildPlayerSystemPrompt(): string {
    const style = this.archetype.conversationStyle;

    return `You are a D&D player with the following characteristics:
Name: ${this.characterName}
Class: ${this.characterClass}
Player Type: ${this.archetype.name}
Description: ${this.archetype.description}

Play Style:
- Roleplay preference: ${Math.round(this.archetype.profile.playStyle.prefersRoleplay * 100)}%
- Combat preference: ${Math.round(this.archetype.profile.playStyle.prefersCombat * 100)}%
- Exploration preference: ${Math.round(this.archetype.profile.playStyle.prefersExploration * 100)}%
- Puzzle preference: ${Math.round(this.archetype.profile.playStyle.prefersPuzzles * 100)}%

Communication Style:
- Verbosity: ${style.verbosity}
- Formality: ${style.formality}
- Speaks in character: ${style.inCharacter ? 'Yes' : 'No'}
- Asks clarifying questions: ${Math.round(style.asksClarifyingQuestions * 100)}% of the time
- Uses game terminology: ${Math.round(style.usesGameTerms * 100)}% of the time

Respond as this player would to the DM's narration. Keep responses concise (1-3 sentences).
${style.inCharacter ? 'Speak as your character would, using first person.' : 'Speak as a player describing your character\'s actions.'}
Be authentic to this player archetype's personality.`;
  }

  /**
   * Select an action based on weights
   */
  private selectWeightedAction(actions: WeightedAction[]): string {
    const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;

    for (const action of actions) {
      random -= action.weight;
      if (random <= 0) {
        // If variants exist, randomly select between main action and variants
        if (action.variants && action.variants.length > 0 && Math.random() > 0.5) {
          const variant = action.variants[Math.floor(Math.random() * action.variants.length)];
          return variant ?? action.action;
        }
        return action.action;
      }
    }

    const firstAction = actions[0];
    return firstAction?.action ?? "I'm not sure what to do.";
  }

  /**
   * Format action according to conversation style
   */
  private formatAction(action: string): string {
    const style = this.archetype.conversationStyle;

    // Replace placeholders
    let formatted = action
      .replace('[character name]', this.characterName)
      .replace('[target]', 'them');

    // Occasionally add clarifying questions based on archetype
    if (Math.random() < style.asksClarifyingQuestions * 0.3) {
      const questions = [
        ' Can you describe that more?',
        ' What exactly do I see?',
        ' Any other details I should know?',
      ];
      formatted += questions[Math.floor(Math.random() * questions.length)];
    }

    return formatted;
  }

  /**
   * Reset player state for new session
   */
  reset(): void {
    this.conversationContext = [];
    this.turnCount = 0;
  }

  /**
   * Get turn count
   */
  getTurnCount(): number {
    return this.turnCount;
  }
}

/**
 * Create an AI player with a specific archetype
 */
export function createAIPlayer(
  archetype: PlayerArchetype,
  name: string,
  options?: { characterClass?: string; llmAdapter?: AIPlayerLLMAdapter }
): AIPlayer {
  const config: AIPlayerConfig = {
    archetype,
    characterName: name,
  };
  if (options?.characterClass !== undefined) {
    config.characterClass = options.characterClass;
  }
  if (options?.llmAdapter !== undefined) {
    config.llmAdapter = options.llmAdapter;
  }
  return new AIPlayer(config);
}
