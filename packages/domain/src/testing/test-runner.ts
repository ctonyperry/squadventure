/**
 * Test runner for automated AI player testing
 * Runs sessions with AI players and collects metrics
 */

import type { AIPlayer } from './ai-player.js';

/**
 * Logger interface for test output
 */
export interface TestLogger {
  log(message: string): void;
}

/**
 * Default no-op logger
 */
const noopLogger: TestLogger = {
  log: () => {},
};

/**
 * Test session configuration
 */
export interface TestSessionConfig {
  maxTurns: number;
  collectMetrics: boolean;
  logger?: TestLogger;
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: TestSessionConfig = {
  maxTurns: 20,
  collectMetrics: true,
};

/**
 * Test turn record
 */
export interface TestTurn {
  turnNumber: number;
  role: 'dm' | 'player';
  content: string;
  timestamp: Date;
  responseTimeMs?: number;
  toolsUsed?: string[];
}

/**
 * Test session result
 */
export interface TestSessionResult {
  sessionId: string;
  archetypeId: string;
  archetypeName: string;
  turns: TestTurn[];
  metrics: TestMetrics;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  completionReason: 'max_turns' | 'timeout' | 'error' | 'player_exit' | 'manual';
  error?: string;
}

/**
 * Metrics collected during test
 */
export interface TestMetrics {
  totalTurns: number;
  averageResponseTimeMs: number;
  toolCallCount: number;
  toolsUsed: Map<string, number>;
  combatEncounters: number;
  npcInteractions: number;
  diceRolls: number;
  rulesLookups: number;
  errorCount: number;
  playerQuestionCount: number;
  wordCount: number;
  averageWordsPerTurn: number;
}

/**
 * Test event handlers
 */
export interface TestEventHandlers {
  onTurnStart?: (turn: number, role: 'dm' | 'player') => void;
  onTurnEnd?: (turn: TestTurn) => void;
  onToolCall?: (name: string, args: unknown, result: unknown) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: TestSessionResult) => void;
}

/**
 * Orchestrator interface for running tests
 */
export interface TestOrchestrator {
  processPlayerInput(input: string): Promise<string>;
  getInitialDescription(): Promise<string>;
}

/**
 * Test runner for automated sessions
 */
export class TestRunner {
  private config: TestSessionConfig;
  private handlers: TestEventHandlers;
  private logger: TestLogger;

  constructor(
    config: Partial<TestSessionConfig> = {},
    handlers: TestEventHandlers = {}
  ) {
    this.config = { ...DEFAULT_TEST_CONFIG, ...config };
    this.handlers = handlers;
    this.logger = config.logger ?? noopLogger;
  }

  /**
   * Run a test session with an AI player
   */
  async runSession(
    player: AIPlayer,
    orchestrator: TestOrchestrator
  ): Promise<TestSessionResult> {
    const sessionId = `test_${Date.now()}_${player.getArchetype().id}`;
    const startTime = new Date();
    const turns: TestTurn[] = [];
    const metrics = this.initializeMetrics();

    let completionReason: TestSessionResult['completionReason'] = 'max_turns';
    let errorMessage: string | undefined;

    try {
      // Get initial scene description
      const initialStart = Date.now();
      this.handlers.onTurnStart?.(0, 'dm');

      const initialDescription = await orchestrator.getInitialDescription();

      const dmTurn: TestTurn = {
        turnNumber: 0,
        role: 'dm',
        content: initialDescription,
        timestamp: new Date(),
        responseTimeMs: Date.now() - initialStart,
      };
      turns.push(dmTurn);
      this.updateMetrics(metrics, dmTurn, 'dm');
      this.handlers.onTurnEnd?.(dmTurn);

      this.logger.log(`\n[DM]: ${initialDescription.substring(0, 200)}...`);

      // Main test loop
      for (let turn = 1; turn <= this.config.maxTurns; turn++) {
        // Player turn
        this.handlers.onTurnStart?.(turn, 'player');
        const playerAction = await player.generateAction(turns[turns.length - 1]?.content ?? '');

        const playerTurn: TestTurn = {
          turnNumber: turn,
          role: 'player',
          content: playerAction,
          timestamp: new Date(),
        };
        turns.push(playerTurn);
        this.updateMetrics(metrics, playerTurn, 'player');
        this.handlers.onTurnEnd?.(playerTurn);

        this.logger.log(`\n[${player.getName()}]: ${playerAction}`);

        // Check for exit conditions
        if (this.isExitAction(playerAction)) {
          completionReason = 'player_exit';
          break;
        }

        // DM turn
        this.handlers.onTurnStart?.(turn, 'dm');
        const dmStart = Date.now();

        const dmResponse = await orchestrator.processPlayerInput(playerAction);

        const dmResponseTurn: TestTurn = {
          turnNumber: turn,
          role: 'dm',
          content: dmResponse,
          timestamp: new Date(),
          responseTimeMs: Date.now() - dmStart,
        };
        turns.push(dmResponseTurn);
        this.updateMetrics(metrics, dmResponseTurn, 'dm');
        this.handlers.onTurnEnd?.(dmResponseTurn);

        this.logger.log(`\n[DM]: ${dmResponse.substring(0, 300)}...`);
      }
    } catch (err) {
      completionReason = 'error';
      errorMessage = err instanceof Error ? err.message : String(err);
      this.handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    const endTime = new Date();
    const result: TestSessionResult = {
      sessionId,
      archetypeId: player.getArchetype().id,
      archetypeName: player.getArchetype().name,
      turns,
      metrics: this.finalizeMetrics(metrics, turns),
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      completionReason,
    };

    // Only add error if it exists
    if (errorMessage !== undefined) {
      result.error = errorMessage;
    }

    this.handlers.onComplete?.(result);
    return result;
  }

  /**
   * Run multiple sessions with different archetypes
   */
  async runBatchTests(
    players: AIPlayer[],
    createOrchestrator: () => TestOrchestrator
  ): Promise<TestSessionResult[]> {
    const results: TestSessionResult[] = [];

    for (const player of players) {
      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`Starting test: ${player.getArchetype().name}`);
      this.logger.log(`Player: ${player.getName()}`);
      this.logger.log(`${'='.repeat(60)}`);

      player.reset();
      const orchestrator = createOrchestrator();
      const result = await this.runSession(player, orchestrator);
      results.push(result);

      this.printSummary(result);
    }

    return results;
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): TestMetrics {
    return {
      totalTurns: 0,
      averageResponseTimeMs: 0,
      toolCallCount: 0,
      toolsUsed: new Map(),
      combatEncounters: 0,
      npcInteractions: 0,
      diceRolls: 0,
      rulesLookups: 0,
      errorCount: 0,
      playerQuestionCount: 0,
      wordCount: 0,
      averageWordsPerTurn: 0,
    };
  }

  /**
   * Update metrics during test
   */
  private updateMetrics(metrics: TestMetrics, turn: TestTurn, role: 'dm' | 'player'): void {
    metrics.totalTurns++;
    metrics.wordCount += turn.content.split(/\s+/).length;

    if (role === 'player') {
      // Count questions
      if (turn.content.includes('?')) {
        metrics.playerQuestionCount++;
      }
    }

    // Detect content patterns
    const contentLower = turn.content.toLowerCase();
    if (contentLower.includes('combat') || contentLower.includes('initiative') || contentLower.includes('attack')) {
      metrics.combatEncounters++;
    }
    if (contentLower.includes('says') || contentLower.includes('speaks') || contentLower.includes('replies')) {
      metrics.npcInteractions++;
    }
  }

  /**
   * Finalize metrics at end of test
   */
  private finalizeMetrics(metrics: TestMetrics, turns: TestTurn[]): TestMetrics {
    const dmTurns = turns.filter(t => t.role === 'dm' && t.responseTimeMs);
    if (dmTurns.length > 0) {
      const totalTime = dmTurns.reduce((sum, t) => sum + (t.responseTimeMs ?? 0), 0);
      metrics.averageResponseTimeMs = totalTime / dmTurns.length;
    }

    if (metrics.totalTurns > 0) {
      metrics.averageWordsPerTurn = metrics.wordCount / metrics.totalTurns;
    }

    return metrics;
  }

  /**
   * Check if player action indicates exit
   */
  private isExitAction(action: string): boolean {
    const exitPatterns = [
      /quit|exit|leave.*(game|session)/i,
      /end.*(session|game)/i,
      /stop playing/i,
    ];
    return exitPatterns.some(p => p.test(action));
  }

  /**
   * Print test summary
   */
  private printSummary(result: TestSessionResult): void {
    this.logger.log(`\n${'─'.repeat(40)}`);
    this.logger.log('TEST SUMMARY');
    this.logger.log(`${'─'.repeat(40)}`);
    this.logger.log(`Archetype: ${result.archetypeName}`);
    this.logger.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    this.logger.log(`Total Turns: ${result.metrics.totalTurns}`);
    this.logger.log(`Avg Response Time: ${result.metrics.averageResponseTimeMs.toFixed(0)}ms`);
    this.logger.log(`Questions Asked: ${result.metrics.playerQuestionCount}`);
    this.logger.log(`Combat Encounters: ${result.metrics.combatEncounters}`);
    this.logger.log(`NPC Interactions: ${result.metrics.npcInteractions}`);
    this.logger.log(`Completion: ${result.completionReason}`);
    if (result.error) {
      this.logger.log(`Error: ${result.error}`);
    }
    this.logger.log(`${'─'.repeat(40)}`);
  }
}

/**
 * Generate a test report from multiple results
 */
export function generateTestReport(results: TestSessionResult[]): string {
  const lines: string[] = [
    '# AI Player Test Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total Sessions: ${results.length}`,
    '',
    '## Summary by Archetype',
    '',
  ];

  for (const result of results) {
    lines.push(`### ${result.archetypeName}`);
    lines.push('');
    lines.push(`- **Session ID**: ${result.sessionId}`);
    lines.push(`- **Duration**: ${(result.durationMs / 1000).toFixed(1)} seconds`);
    lines.push(`- **Total Turns**: ${result.metrics.totalTurns}`);
    lines.push(`- **Avg Response Time**: ${result.metrics.averageResponseTimeMs.toFixed(0)}ms`);
    lines.push(`- **Player Questions**: ${result.metrics.playerQuestionCount}`);
    lines.push(`- **Completion**: ${result.completionReason}`);
    lines.push('');
  }

  // Overall statistics
  const totalTurns = results.reduce((sum, r) => sum + r.metrics.totalTurns, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  const successCount = results.filter(r => r.completionReason !== 'error').length;

  lines.push('## Overall Statistics');
  lines.push('');
  lines.push(`- **Total Turns Across All Sessions**: ${totalTurns}`);
  lines.push(`- **Average Session Duration**: ${(avgDuration / 1000).toFixed(1)}s`);
  lines.push(`- **Success Rate**: ${((successCount / results.length) * 100).toFixed(0)}%`);
  lines.push('');

  return lines.join('\n');
}
