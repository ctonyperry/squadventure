/**
 * Voice Command Recognition
 *
 * Parses transcribed speech to detect game commands like dice rolls,
 * combat actions, skill checks, and natural language intents.
 */

import type { PlayerId, SessionId } from '@ai-dm/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Command categories
 */
export type CommandCategory =
  | 'dice_roll'
  | 'combat_action'
  | 'skill_check'
  | 'spell_cast'
  | 'movement'
  | 'interaction'
  | 'inventory'
  | 'character'
  | 'game_control'
  | 'social'
  | 'unknown';

/**
 * Recognized voice command
 */
export interface VoiceCommand {
  id: string;
  category: CommandCategory;
  intent: string;
  confidence: number;
  rawText: string;
  normalizedText: string;
  parameters: CommandParameters;
  timestamp: Date;
  playerId: PlayerId;
  sessionId: SessionId;
}

/**
 * Command parameters extracted from speech
 */
export interface CommandParameters {
  // Dice parameters
  diceType?: string | undefined; // d20, d6, etc.
  diceCount?: number | undefined;
  modifier?: number | undefined;
  advantage?: boolean | undefined;
  disadvantage?: boolean | undefined;

  // Target parameters
  targetName?: string | undefined;
  targetType?: 'creature' | 'object' | 'location' | 'self' | undefined;

  // Action parameters
  actionType?: string | undefined;
  abilityName?: string | undefined;
  spellName?: string | undefined;
  itemName?: string | undefined;
  skillName?: string | undefined;

  // Movement
  direction?: string | undefined;
  distance?: number | undefined;
  distanceUnit?: 'feet' | 'squares' | 'meters' | undefined;

  // Additional context
  extras?: Record<string, unknown> | undefined;
}

/**
 * Command recognition result
 */
export interface RecognitionResult {
  success: boolean;
  command?: VoiceCommand | undefined;
  alternatives?: VoiceCommand[] | undefined;
  error?: string | undefined;
  processingTimeMs: number;
}

/**
 * Command pattern definition
 */
interface CommandPattern {
  category: CommandCategory;
  intent: string;
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray, text: string) => Partial<CommandParameters>;
  priority: number;
}

// =============================================================================
// Command Patterns
// =============================================================================

const DICE_PATTERN = /(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?/i;
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, twenty: 20,
};

const SKILL_NAMES = [
  'acrobatics', 'animal handling', 'arcana', 'athletics',
  'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight of hand',
  'stealth', 'survival',
];

const ABILITY_NAMES = [
  'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma',
];

const COMMAND_PATTERNS: CommandPattern[] = [
  // ==========================================================================
  // Dice Rolls
  // ==========================================================================
  {
    category: 'dice_roll',
    intent: 'roll_dice',
    patterns: [
      /roll\s+(?:a\s+)?(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?/i,
      /(?:can\s+)?(?:i\s+)?roll\s+(?:a\s+)?(\d+)?d(\d+)/i,
      /(\d+)?d(\d+)\s+roll/i,
    ],
    extractor: (match, text) => {
      const diceMatch = text.match(DICE_PATTERN);
      if (!diceMatch) return {};
      return {
        diceCount: diceMatch[1] ? parseInt(diceMatch[1]) : 1,
        diceType: `d${diceMatch[2]}`,
        modifier: diceMatch[4] ? parseInt(diceMatch[4]) * (diceMatch[3] === '-' ? -1 : 1) : 0,
        advantage: /advantage/i.test(text),
        disadvantage: /disadvantage/i.test(text),
      };
    },
    priority: 10,
  },
  {
    category: 'dice_roll',
    intent: 'roll_initiative',
    patterns: [
      /roll\s+(?:for\s+)?initiative/i,
      /initiative\s+roll/i,
      /(?:let'?s?\s+)?roll\s+initiative/i,
    ],
    extractor: () => ({
      diceType: 'd20',
      diceCount: 1,
    }),
    priority: 15,
  },
  {
    category: 'dice_roll',
    intent: 'roll_attack',
    patterns: [
      /roll\s+(?:to\s+)?(?:hit|attack)/i,
      /attack\s+roll/i,
      /(?:make\s+)?(?:an?\s+)?attack\s+roll/i,
    ],
    extractor: (match, text) => ({
      diceType: 'd20',
      diceCount: 1,
      advantage: /advantage/i.test(text),
      disadvantage: /disadvantage/i.test(text),
    }),
    priority: 12,
  },
  {
    category: 'dice_roll',
    intent: 'roll_damage',
    patterns: [
      /roll\s+(?:for\s+)?damage/i,
      /damage\s+roll/i,
    ],
    extractor: (match, text) => {
      const diceMatch = text.match(DICE_PATTERN);
      return diceMatch ? {
        diceCount: diceMatch[1] ? parseInt(diceMatch[1]) : 1,
        diceType: `d${diceMatch[2]}`,
        modifier: diceMatch[4] ? parseInt(diceMatch[4]) * (diceMatch[3] === '-' ? -1 : 1) : 0,
      } : {};
    },
    priority: 11,
  },

  // ==========================================================================
  // Skill Checks
  // ==========================================================================
  {
    category: 'skill_check',
    intent: 'skill_check',
    patterns: [
      new RegExp(`(?:roll|make)\\s+(?:a\\s+)?(?:${SKILL_NAMES.join('|')})\\s+check`, 'i'),
      new RegExp(`(?:${SKILL_NAMES.join('|')})\\s+check`, 'i'),
      /check\s+(?:my\s+)?(\w+)/i,
    ],
    extractor: (match, text) => {
      const lowerText = text.toLowerCase();
      const skill = SKILL_NAMES.find(s => lowerText.includes(s));
      return {
        skillName: skill,
        diceType: 'd20',
        diceCount: 1,
        advantage: /advantage/i.test(text),
        disadvantage: /disadvantage/i.test(text),
      };
    },
    priority: 8,
  },
  {
    category: 'skill_check',
    intent: 'saving_throw',
    patterns: [
      new RegExp(`(?:roll|make)\\s+(?:a\\s+)?(?:${ABILITY_NAMES.join('|')})\\s+(?:saving\\s+throw|save)`, 'i'),
      new RegExp(`(?:${ABILITY_NAMES.join('|')})\\s+save`, 'i'),
      /saving\s+throw/i,
    ],
    extractor: (match, text) => {
      const lowerText = text.toLowerCase();
      const ability = ABILITY_NAMES.find(a => lowerText.includes(a));
      return {
        abilityName: ability,
        diceType: 'd20',
        diceCount: 1,
        advantage: /advantage/i.test(text),
        disadvantage: /disadvantage/i.test(text),
      };
    },
    priority: 9,
  },

  // ==========================================================================
  // Combat Actions
  // ==========================================================================
  {
    category: 'combat_action',
    intent: 'attack',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?attack\s+(?:the\s+)?(\w+)/i,
      /(?:i\s+)?(?:want\s+to\s+)?hit\s+(?:the\s+)?(\w+)/i,
      /strike\s+(?:the\s+)?(\w+)/i,
    ],
    extractor: (match) => ({
      actionType: 'attack',
      targetName: match[1],
      targetType: 'creature',
    }),
    priority: 7,
  },
  {
    category: 'combat_action',
    intent: 'dodge',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?(?:take\s+the\s+)?dodge\s+action/i,
      /(?:i\s+)?dodge/i,
    ],
    extractor: () => ({
      actionType: 'dodge',
    }),
    priority: 6,
  },
  {
    category: 'combat_action',
    intent: 'disengage',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?disengage/i,
      /(?:take\s+the\s+)?disengage\s+action/i,
    ],
    extractor: () => ({
      actionType: 'disengage',
    }),
    priority: 6,
  },
  {
    category: 'combat_action',
    intent: 'dash',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?dash/i,
      /(?:take\s+the\s+)?dash\s+action/i,
      /double\s+move/i,
    ],
    extractor: () => ({
      actionType: 'dash',
    }),
    priority: 6,
  },
  {
    category: 'combat_action',
    intent: 'hide',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?hide/i,
      /(?:take\s+the\s+)?hide\s+action/i,
    ],
    extractor: () => ({
      actionType: 'hide',
    }),
    priority: 6,
  },
  {
    category: 'combat_action',
    intent: 'help',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?help\s+(\w+)/i,
      /(?:take\s+the\s+)?help\s+action/i,
      /assist\s+(\w+)/i,
    ],
    extractor: (match) => ({
      actionType: 'help',
      targetName: match[1],
      targetType: 'creature',
    }),
    priority: 6,
  },

  // ==========================================================================
  // Spell Casting
  // ==========================================================================
  {
    category: 'spell_cast',
    intent: 'cast_spell',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?cast\s+(.+?)(?:\s+(?:on|at)\s+(.+))?$/i,
      /(?:i\s+)?cast\s+(.+)/i,
    ],
    extractor: (match) => ({
      actionType: 'cast',
      spellName: match[1]?.trim(),
      targetName: match[2]?.trim(),
    }),
    priority: 8,
  },
  {
    category: 'spell_cast',
    intent: 'cantrip',
    patterns: [
      /(?:use\s+)?(?:my\s+)?cantrip\s+(.+)/i,
    ],
    extractor: (match) => ({
      actionType: 'cantrip',
      spellName: match[1]?.trim(),
    }),
    priority: 7,
  },

  // ==========================================================================
  // Movement
  // ==========================================================================
  {
    category: 'movement',
    intent: 'move',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?move\s+(\d+)\s*(feet|ft|squares?|meters?|m)?(?:\s+(\w+))?/i,
      /(?:i\s+)?(?:want\s+to\s+)?go\s+(\w+)/i,
      /walk\s+(?:to\s+)?(.+)/i,
    ],
    extractor: (match) => {
      const distanceStr = match[1] ?? '';
      const distance = parseInt(distanceStr);
      return {
        actionType: 'move',
        distance: isNaN(distance) ? undefined : distance,
        distanceUnit: match[2]?.toLowerCase().startsWith('sq') ? 'squares' :
          match[2]?.toLowerCase().startsWith('m') ? 'meters' : 'feet',
        direction: match[3],
      };
    },
    priority: 5,
  },

  // ==========================================================================
  // Interaction
  // ==========================================================================
  {
    category: 'interaction',
    intent: 'talk',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?(?:talk|speak)\s+(?:to|with)\s+(?:the\s+)?(.+)/i,
      /(?:i\s+)?say\s+(?:to\s+)?(?:the\s+)?(\w+)/i,
    ],
    extractor: (match) => ({
      actionType: 'talk',
      targetName: match[1]?.trim(),
      targetType: 'creature',
    }),
    priority: 4,
  },
  {
    category: 'interaction',
    intent: 'examine',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?(?:examine|inspect|look at)\s+(?:the\s+)?(.+)/i,
      /what\s+(?:does|do)\s+(?:the\s+)?(.+)\s+look\s+like/i,
    ],
    extractor: (match) => ({
      actionType: 'examine',
      targetName: match[1]?.trim(),
    }),
    priority: 4,
  },
  {
    category: 'interaction',
    intent: 'search',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?search\s+(?:the\s+)?(.+)/i,
      /look\s+(?:for|around)\s+(?:the\s+)?(.+)?/i,
    ],
    extractor: (match) => ({
      actionType: 'search',
      targetName: match[1]?.trim(),
    }),
    priority: 4,
  },

  // ==========================================================================
  // Inventory
  // ==========================================================================
  {
    category: 'inventory',
    intent: 'use_item',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?use\s+(?:my\s+)?(.+)/i,
      /drink\s+(?:the\s+)?(.+)/i,
      /eat\s+(?:the\s+)?(.+)/i,
    ],
    extractor: (match) => ({
      actionType: 'use',
      itemName: match[1]?.trim(),
    }),
    priority: 5,
  },
  {
    category: 'inventory',
    intent: 'equip',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?(?:equip|draw|ready)\s+(?:my\s+)?(.+)/i,
      /take\s+out\s+(?:my\s+)?(.+)/i,
    ],
    extractor: (match) => ({
      actionType: 'equip',
      itemName: match[1]?.trim(),
    }),
    priority: 5,
  },
  {
    category: 'inventory',
    intent: 'drop',
    patterns: [
      /(?:i\s+)?(?:want\s+to\s+)?drop\s+(?:my\s+)?(.+)/i,
      /put\s+down\s+(?:my\s+)?(.+)/i,
    ],
    extractor: (match) => ({
      actionType: 'drop',
      itemName: match[1]?.trim(),
    }),
    priority: 5,
  },

  // ==========================================================================
  // Game Control
  // ==========================================================================
  {
    category: 'game_control',
    intent: 'end_turn',
    patterns: [
      /(?:i\s+)?end\s+(?:my\s+)?turn/i,
      /(?:that'?s?\s+)?(?:my\s+)?turn\s+(?:is\s+)?(?:done|over|finished)/i,
      /pass(?:\s+turn)?/i,
    ],
    extractor: () => ({
      actionType: 'end_turn',
    }),
    priority: 10,
  },
  {
    category: 'game_control',
    intent: 'ready_action',
    patterns: [
      /(?:i\s+)?ready\s+(?:an?\s+)?action/i,
      /(?:i\s+)?prepare\s+(?:to\s+)?(.+)/i,
    ],
    extractor: (match) => ({
      actionType: 'ready',
      extras: { preparedAction: match[1]?.trim() },
    }),
    priority: 8,
  },
  {
    category: 'game_control',
    intent: 'pause',
    patterns: [
      /pause\s+(?:the\s+)?game/i,
      /hold\s+on/i,
      /wait\s+(?:a\s+)?(?:moment|second|minute)/i,
    ],
    extractor: () => ({
      actionType: 'pause',
    }),
    priority: 15,
  },

  // ==========================================================================
  // Social / RP
  // ==========================================================================
  {
    category: 'social',
    intent: 'roleplay',
    patterns: [
      /(?:i\s+)?say\s+"(.+)"/i,
      /(?:i\s+)?tell\s+(?:them|him|her|it)\s+"(.+)"/i,
    ],
    extractor: (match) => ({
      actionType: 'speak',
      extras: { dialogue: match[1] },
    }),
    priority: 3,
  },
];

// Sort patterns by priority (higher priority first)
COMMAND_PATTERNS.sort((a, b) => b.priority - a.priority);

// =============================================================================
// Voice Command Recognizer
// =============================================================================

/**
 * Recognizes game commands from transcribed speech
 */
export class VoiceCommandRecognizer {
  private commandCounter = 0;
  private customPatterns: CommandPattern[] = [];

  /**
   * Recognize commands from transcribed text
   */
  recognize(
    text: string,
    playerId: PlayerId,
    sessionId: SessionId
  ): RecognitionResult {
    const startTime = Date.now();

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Empty input',
        processingTimeMs: Date.now() - startTime,
      };
    }

    const normalizedText = this.normalizeText(text);
    const allPatterns = [...this.customPatterns, ...COMMAND_PATTERNS];
    const matches: VoiceCommand[] = [];

    for (const pattern of allPatterns) {
      for (const regex of pattern.patterns) {
        const match = normalizedText.match(regex);
        if (match) {
          const parameters = pattern.extractor(match, normalizedText);
          const confidence = this.calculateConfidence(match, normalizedText, pattern);

          matches.push({
            id: this.generateCommandId(),
            category: pattern.category,
            intent: pattern.intent,
            confidence,
            rawText: text,
            normalizedText,
            parameters,
            timestamp: new Date(),
            playerId,
            sessionId,
          });
          break; // Only match once per pattern
        }
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    if (matches.length === 0) {
      // No explicit command found - could be general dialogue
      return {
        success: true,
        command: {
          id: this.generateCommandId(),
          category: 'unknown',
          intent: 'general_speech',
          confidence: 0.5,
          rawText: text,
          normalizedText,
          parameters: {},
          timestamp: new Date(),
          playerId,
          sessionId,
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      command: matches[0],
      alternatives: matches.slice(1, 4), // Top 3 alternatives
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Add custom command pattern
   */
  addPattern(pattern: CommandPattern): void {
    this.customPatterns.push(pattern);
    this.customPatterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove custom pattern by intent
   */
  removePattern(intent: string): boolean {
    const index = this.customPatterns.findIndex((p) => p.intent === intent);
    if (index >= 0) {
      this.customPatterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Parse a dice notation string
   */
  parseDiceNotation(notation: string): {
    count: number;
    sides: number;
    modifier: number;
  } | null {
    const match = notation.match(/(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?/i);
    if (!match || !match[2]) return null;

    return {
      count: match[1] ? parseInt(match[1]) : 1,
      sides: parseInt(match[2]),
      modifier: match[4] ? parseInt(match[4]) * (match[3] === '-' ? -1 : 1) : 0,
    };
  }

  /**
   * Extract numbers from text (including word forms)
   */
  extractNumber(text: string): number | null {
    // Try direct number first
    const directMatch = text.match(/\d+/);
    if (directMatch) {
      return parseInt(directMatch[0]);
    }

    // Try number words
    const lowerText = text.toLowerCase();
    for (const [word, value] of Object.entries(NUMBER_WORDS)) {
      if (lowerText.includes(word)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get all supported command categories
   */
  getCategories(): CommandCategory[] {
    return [
      'dice_roll',
      'combat_action',
      'skill_check',
      'spell_cast',
      'movement',
      'interaction',
      'inventory',
      'character',
      'game_control',
      'social',
      'unknown',
    ];
  }

  /**
   * Get all supported intents
   */
  getIntents(): string[] {
    const intents = new Set<string>();
    for (const pattern of [...COMMAND_PATTERNS, ...this.customPatterns]) {
      intents.add(pattern.intent);
    }
    return Array.from(intents);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s'"+-]/g, ' ') // Remove special chars except quotes and math
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateConfidence(
    match: RegExpMatchArray,
    text: string,
    pattern: CommandPattern
  ): number {
    // Base confidence from match coverage
    const matchLength = match[0].length;
    const textLength = text.length;
    const coverageRatio = matchLength / textLength;

    // Start with base confidence
    let confidence = 0.6 + coverageRatio * 0.3;

    // Boost for priority patterns
    confidence += (pattern.priority / 100) * 0.1;

    // Cap at 0.99
    return Math.min(0.99, confidence);
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${++this.commandCounter}`;
  }
}

// =============================================================================
// Command Executor Interface
// =============================================================================

/**
 * Result of executing a command
 */
export interface CommandExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Command handler function type
 */
export type CommandHandler = (
  command: VoiceCommand
) => Promise<CommandExecutionResult>;

/**
 * Command dispatcher for routing commands to handlers
 */
export class CommandDispatcher {
  private handlers: Map<string, CommandHandler> = new Map();
  private categoryHandlers: Map<CommandCategory, CommandHandler> = new Map();
  private defaultHandler?: CommandHandler;

  /**
   * Register a handler for a specific intent
   */
  registerHandler(intent: string, handler: CommandHandler): void {
    this.handlers.set(intent, handler);
  }

  /**
   * Register a handler for a command category
   */
  registerCategoryHandler(category: CommandCategory, handler: CommandHandler): void {
    this.categoryHandlers.set(category, handler);
  }

  /**
   * Set default handler for unmatched commands
   */
  setDefaultHandler(handler: CommandHandler): void {
    this.defaultHandler = handler;
  }

  /**
   * Dispatch a command to the appropriate handler
   */
  async dispatch(command: VoiceCommand): Promise<CommandExecutionResult> {
    // Try specific intent handler first
    const intentHandler = this.handlers.get(command.intent);
    if (intentHandler) {
      return intentHandler(command);
    }

    // Try category handler
    const categoryHandler = this.categoryHandlers.get(command.category);
    if (categoryHandler) {
      return categoryHandler(command);
    }

    // Fall back to default
    if (this.defaultHandler) {
      return this.defaultHandler(command);
    }

    return {
      success: false,
      message: 'No handler registered for command',
      error: `Unhandled command: ${command.intent}`,
    };
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

export const voiceCommandRecognizer = new VoiceCommandRecognizer();
export const commandDispatcher = new CommandDispatcher();
