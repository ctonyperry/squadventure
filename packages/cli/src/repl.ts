import * as readline from 'node:readline';
import * as path from 'node:path';
import chalk from 'chalk';
import type { DMPersona, WorldState, SnapshotId } from '@ai-dm/shared';
import { createLocationId, createSnapshotId } from '@ai-dm/shared';
import type { LLMAdapter } from '@ai-dm/infrastructure';
import { FileSnapshotStore } from '@ai-dm/infrastructure';
import { SessionOrchestrator, SnapshotManager } from '@ai-dm/application';

/**
 * REPL configuration
 */
export interface REPLConfig {
  llmAdapter: LLMAdapter;
  worldState: WorldState;
  persona: DMPersona;
  startingLocationId: string;
  savePath?: string;
}

/**
 * Interactive REPL for the DM game
 */
export class GameREPL {
  private rl: readline.Interface;
  private orchestrator: SessionOrchestrator;
  private persona: DMPersona;
  private worldState: WorldState;
  private isRunning = false;
  private snapshotManager: SnapshotManager;

  constructor(config: REPLConfig) {
    this.persona = config.persona;
    this.worldState = config.worldState;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.orchestrator = new SessionOrchestrator({
      llmAdapter: config.llmAdapter,
      worldState: config.worldState,
      persona: config.persona,
      startingLocationId: createLocationId(config.startingLocationId),
      events: {
        onToolCall: (name, args, result) => {
          this.printToolCall(name, args, result);
        },
        onError: (error) => {
          this.printError(error.message);
        },
      },
    });

    this.orchestrator.initialize(config.worldState);

    // Set up snapshot manager
    const savePath = config.savePath ?? path.join(process.cwd(), '.ai-dm-saves');
    const store = new FileSnapshotStore(savePath);
    this.snapshotManager = new SnapshotManager(store);
  }

  /**
   * Print styled header
   */
  private printHeader(): void {
    console.log();
    console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════'));
    console.log(chalk.bold.magenta('                   AI DUNGEON MASTER                        '));
    console.log(chalk.bold.magenta('═══════════════════════════════════════════════════════════'));
    console.log();
    console.log(chalk.gray(`DM Persona: ${chalk.cyan(this.persona.name)}`));
    console.log(chalk.gray('Type your actions or dialogue. Commands: /help, /quit, /save'));
    console.log();
  }

  /**
   * Print DM message
   */
  private printDM(message: string): void {
    console.log();
    console.log(chalk.yellow.bold('DM: ') + chalk.white(message));
    console.log();
  }

  /**
   * Print player prompt
   */
  private printPrompt(): void {
    process.stdout.write(chalk.green.bold('You: '));
  }

  /**
   * Print tool call info
   */
  private printToolCall(
    name: string,
    args: Record<string, unknown>,
    result: unknown
  ): void {
    console.log();
    console.log(chalk.dim(`  [Tool: ${name}]`));
    if (name === 'roll_dice') {
      const roll = result as { notation: string; results: number[]; total: number; purpose: string };
      console.log(
        chalk.cyan(`  🎲 ${roll.notation} → ${chalk.bold(roll.total.toString())} (${roll.purpose})`)
      );
    }
  }

  /**
   * Print error
   */
  private printError(message: string): void {
    console.log(chalk.red(`Error: ${message}`));
  }

  /**
   * Print help
   */
  private printHelp(): void {
    console.log();
    console.log(chalk.cyan.bold('Commands:'));
    console.log(chalk.gray('  /help          - Show this help'));
    console.log(chalk.gray('  /quit          - Exit the game'));
    console.log(chalk.gray('  /save [label]  - Save the current game'));
    console.log(chalk.gray('  /load          - List and load saved games'));
    console.log(chalk.gray('  /scene         - Describe the current scene again'));
    console.log();
    console.log(chalk.cyan.bold('Tips:'));
    console.log(chalk.gray('  - Type your actions naturally: "I examine the painting"'));
    console.log(chalk.gray('  - For dialogue: "I say to the bartender: What news?"'));
    console.log(chalk.gray('  - Be creative! The DM will adapt to your playstyle.'));
    console.log();
  }

  /**
   * Handle user input
   */
  private async handleInput(input: string): Promise<boolean> {
    const trimmed = input.trim();

    if (!trimmed) {
      return true;
    }

    // Handle commands
    if (trimmed.startsWith('/')) {
      return this.handleCommand(trimmed);
    }

    // Process player input
    try {
      console.log(chalk.dim('  [Thinking...]'));

      const response = await this.orchestrator.processPlayerInput(
        trimmed,
        this.persona
      );
      this.printDM(response);
    } catch (error) {
      this.printError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }

    return true;
  }

  /**
   * Handle slash commands
   */
  private async handleCommand(command: string): Promise<boolean> {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0]?.toLowerCase() ?? '';
    const args = parts.slice(1);

    switch (cmd) {
      case 'quit':
      case 'exit':
      case 'q':
        console.log(chalk.yellow('\nFarewell, adventurer! May your dice roll true.'));
        return false;

      case 'help':
      case 'h':
      case '?':
        this.printHelp();
        return true;

      case 'scene':
        try {
          console.log(chalk.dim('  [Looking around...]'));
          const response = await this.orchestrator.processPlayerInput(
            'Look around and describe what I see.',
            this.persona
          );
          this.printDM(response);
        } catch (e) {
          this.printError(e instanceof Error ? e.message : 'Unknown error');
        }
        return true;

      case 'save':
        await this.handleSave(args.join(' ') || undefined);
        return true;

      case 'load':
        await this.handleLoad(args);
        return true;

      default:
        console.log(chalk.red(`Unknown command: ${cmd}. Type /help for commands.`));
        return true;
    }
  }

  /**
   * Handle save command
   */
  private async handleSave(label?: string): Promise<void> {
    try {
      console.log(chalk.dim('  [Saving game...]'));
      const session = this.orchestrator.getSession();
      const snapshot = await this.snapshotManager.createSnapshot(
        session,
        this.worldState,
        label ? { label } : undefined
      );
      console.log(chalk.green(`✓ Game saved: ${snapshot.id}`));
      if (label) {
        console.log(chalk.gray(`  Label: ${label}`));
      }
    } catch (error) {
      this.printError(
        error instanceof Error ? error.message : 'Failed to save'
      );
    }
  }

  /**
   * Handle load command
   */
  private async handleLoad(args: string[] = []): Promise<void> {
    try {
      const snapshots = await this.snapshotManager.listSnapshots();

      if (snapshots.length === 0) {
        console.log(chalk.yellow('No saved games found.'));
        return;
      }

      // If no argument, list saves
      if (args.length === 0 || args[0] === '') {
        console.log();
        console.log(chalk.cyan.bold('Saved Games:'));
        snapshots.forEach((snap, i) => {
          const date = snap.createdAt.toLocaleString();
          const label = snap.label ? ` - ${snap.label}` : '';
          console.log(chalk.gray(`  ${i + 1}. ${snap.id}${label}`));
          console.log(chalk.dim(`     ${date}`));
        });
        console.log();
        console.log(chalk.gray('To load a save, use: /load <number>'));
        return;
      }

      // Load specific save
      const index = parseInt(args[0] ?? '', 10) - 1;
      if (isNaN(index) || index < 0 || index >= snapshots.length) {
        console.log(chalk.red(`Invalid save number. Choose 1-${snapshots.length}`));
        return;
      }

      const snapInfo = snapshots[index];
      if (!snapInfo) {
        console.log(chalk.red('Save not found.'));
        return;
      }

      console.log(chalk.dim('  [Loading game...]'));
      const snapshot = await this.snapshotManager.loadSnapshot(snapInfo.id);

      if (!snapshot) {
        console.log(chalk.red('Failed to load save file.'));
        return;
      }

      // Restore the session
      this.orchestrator.restoreFromSnapshot({
        worldState: snapshot.worldState,
        sessionState: snapshot.sessionState as any,
        turnLog: snapshot.turnLog,
      });
      this.worldState = snapshot.worldState;

      console.log(chalk.green(`✓ Loaded: ${snapInfo.label ?? snapInfo.id}`));
      console.log(chalk.gray(`  ${snapshot.turnLog.length} turns restored`));
      console.log();

      // Show current scene context
      if (snapshot.contextCache?.narrativeSummary) {
        console.log(chalk.cyan('Last scene:'));
        console.log(chalk.gray(snapshot.contextCache.narrativeSummary));
        console.log();
      }
    } catch (error) {
      this.printError(
        error instanceof Error ? error.message : 'Failed to load save'
      );
    }
  }

  /**
   * Start the REPL
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.printHeader();

    // Get initial scene description
    try {
      console.log(chalk.dim('  [Setting the scene...]'));
      const intro = await this.orchestrator.getInitialDescription(this.persona);
      this.printDM(intro);
    } catch (error) {
      this.printError(
        error instanceof Error ? error.message : 'Failed to get initial description'
      );
    }

    // Main REPL loop
    const promptLoop = (): void => {
      if (!this.isRunning) {
        this.rl.close();
        return;
      }

      this.printPrompt();
      this.rl.once('line', async (input) => {
        const shouldContinue = await this.handleInput(input);
        if (shouldContinue) {
          promptLoop();
        } else {
          this.isRunning = false;
          this.rl.close();
        }
      });
    };

    promptLoop();

    // Handle close
    this.rl.on('close', () => {
      this.isRunning = false;
    });
  }

  /**
   * Stop the REPL
   */
  stop(): void {
    this.isRunning = false;
    this.rl.close();
  }
}
