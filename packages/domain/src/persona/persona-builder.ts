import type {
  DMPersona,
  PersonaId,
  VoiceProfile,
  RulingPhilosophy,
  ImprovStyle,
  HumorProfile,
  HumorType,
  ConversationExample,
} from '@ai-dm/shared';
import { createPersonaId } from '@ai-dm/shared';

/**
 * Builder for creating DMPersona instances
 */
export class PersonaBuilder {
  private persona: DMPersona;

  constructor(id: string, name: string) {
    this.persona = {
      id: createPersonaId(id),
      name,
      voice: {
        verbosity: 'moderate',
        formality: 'moderate',
        humor: {
          frequency: 0.3,
          types: [],
          fourthWallBreaks: false,
          selfDeprecation: false,
        },
      },
      rulingPhilosophy: {
        ruleAdherence: 0.5,
        playerAgencyBias: 0.5,
        consequenceSeverity: 0.5,
      },
      improv: {
        yesAndTendency: 0.7,
        callbackMemory: 'good',
      },
      systemPrompt: '',
      exampleExchanges: [],
      catchphrases: [],
    };
  }

  /**
   * Set verbosity level
   */
  verbosity(level: VoiceProfile['verbosity']): this {
    this.persona.voice.verbosity = level;
    return this;
  }

  /**
   * Set formality level
   */
  formality(level: VoiceProfile['formality']): this {
    this.persona.voice.formality = level;
    return this;
  }

  /**
   * Configure humor
   */
  humor(
    frequency: number,
    types: HumorType[],
    options?: { fourthWallBreaks?: boolean; selfDeprecation?: boolean }
  ): this {
    this.persona.voice.humor = {
      frequency,
      types,
      fourthWallBreaks: options?.fourthWallBreaks ?? false,
      selfDeprecation: options?.selfDeprecation ?? false,
    };
    return this;
  }

  /**
   * Set rule adherence (0 = rule of cool, 1 = rules lawyer)
   */
  ruleAdherence(value: number): this {
    this.persona.rulingPhilosophy.ruleAdherence = Math.max(0, Math.min(1, value));
    return this;
  }

  /**
   * Set player agency bias (0 = DM decides, 1 = player always succeeds)
   */
  playerAgencyBias(value: number): this {
    this.persona.rulingPhilosophy.playerAgencyBias = Math.max(0, Math.min(1, value));
    return this;
  }

  /**
   * Set consequence severity (0 = forgiving, 1 = brutal)
   */
  consequenceSeverity(value: number): this {
    this.persona.rulingPhilosophy.consequenceSeverity = Math.max(0, Math.min(1, value));
    return this;
  }

  /**
   * Set improv style
   */
  improv(yesAndTendency: number, callbackMemory: ImprovStyle['callbackMemory']): this {
    this.persona.improv = {
      yesAndTendency: Math.max(0, Math.min(1, yesAndTendency)),
      callbackMemory,
    };
    return this;
  }

  /**
   * Set the system prompt
   */
  systemPrompt(prompt: string): this {
    this.persona.systemPrompt = prompt;
    return this;
  }

  /**
   * Add example exchanges
   */
  addExample(playerInput: string, dmResponse: string, context?: string): this {
    const example: ConversationExample = { playerInput, dmResponse };
    if (context) {
      example.context = context;
    }
    this.persona.exampleExchanges.push(example);
    return this;
  }

  /**
   * Add catchphrases
   */
  addCatchphrase(...phrases: string[]): this {
    this.persona.catchphrases.push(...phrases);
    return this;
  }

  /**
   * Build and return the persona
   */
  build(): DMPersona {
    return this.persona;
  }
}

/**
 * Generate a system prompt from persona configuration
 */
export function generateSystemPrompt(persona: DMPersona): string {
  const parts: string[] = [];

  // Core identity
  parts.push(`You are ${persona.name}, an AI Dungeon Master.`);

  // Voice style
  const verbosityDesc = {
    terse: 'Keep descriptions brief and punchy.',
    moderate: 'Balance detail with pacing.',
    verbose: 'Paint rich, detailed scenes.',
  };
  parts.push(verbosityDesc[persona.voice.verbosity]);

  const formalityDesc = {
    casual: 'Speak casually, like chatting with friends.',
    moderate: 'Maintain a balanced tone.',
    formal: 'Use a more literary, dramatic voice.',
  };
  parts.push(formalityDesc[persona.voice.formality]);

  // Humor
  if (persona.voice.humor.frequency > 0) {
    const humorTypes = persona.voice.humor.types.join(', ');
    parts.push(
      `Incorporate ${humorTypes} humor naturally (about ${Math.round(persona.voice.humor.frequency * 100)}% of interactions).`
    );
    if (persona.voice.humor.fourthWallBreaks) {
      parts.push('Occasional fourth-wall breaks are acceptable.');
    }
    if (persona.voice.humor.selfDeprecation) {
      parts.push('Self-deprecating humor about being an AI is welcome.');
    }
  }

  // Ruling philosophy
  if (persona.rulingPhilosophy.ruleAdherence < 0.3) {
    parts.push('Prioritize fun and narrative over strict rules (rule of cool).');
  } else if (persona.rulingPhilosophy.ruleAdherence > 0.7) {
    parts.push('Adhere closely to D&D 5e rules. Rules create fair, consistent play.');
  } else {
    parts.push('Balance rules with narrative flow, bending when it serves the story.');
  }

  if (persona.rulingPhilosophy.playerAgencyBias > 0.6) {
    parts.push('Lean toward enabling player ideas with "yes, and..." thinking.');
  }

  if (persona.rulingPhilosophy.consequenceSeverity > 0.7) {
    parts.push('The world is dangerous. Actions have real consequences.');
  } else if (persona.rulingPhilosophy.consequenceSeverity < 0.3) {
    parts.push('Be forgiving with consequences. Focus on fun over punishment.');
  }

  // Improv style
  if (persona.improv.yesAndTendency > 0.7) {
    parts.push('Embrace improvisation. Build on player ideas rather than blocking them.');
  }
  if (persona.improv.callbackMemory === 'excellent') {
    parts.push('Remember and callback to earlier events, creating narrative continuity.');
  }

  // Catchphrases
  if (persona.catchphrases.length > 0) {
    parts.push(`Signature phrases: "${persona.catchphrases.join('", "')}"`);
  }

  // Core DM responsibilities
  parts.push(`
CORE RESPONSIBILITIES:
- Describe scenes vividly using the canonical world state as your source of truth
- Voice NPCs distinctly based on their personality profiles
- Request dice rolls for uncertain outcomes using the roll_dice tool
- Track combat and conditions accurately
- Never make up information not in the world state - use tools to look things up
- Keep the pace moving - don't over-explain or lecture`);

  return parts.join('\n\n');
}
