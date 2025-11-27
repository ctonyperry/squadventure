#!/usr/bin/env node
/**
 * World Generation CLI
 *
 * Command-line interface for generating D&D worlds.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createWorldGenerator, type ChatClient } from './generators/world-generator.js';
import type { WorldBrief, GenerationProgress, GenerationLayer } from './types.js';

// =============================================================================
// CLI Implementation
// =============================================================================

const USAGE = `
World Generation CLI

Usage:
  world-gen generate <brief-file> [options]
  world-gen example                           Create an example brief file

Options:
  --output, -o <file>   Output file for generated world (default: world.json)
  --model, -m <model>   LLM model to use (default: gpt-4o-mini)
  --verbose, -v         Show detailed progress

Examples:
  world-gen generate my-brief.json -o my-world.json
  world-gen example > brief.json
`;

interface CLIOptions {
  command: string;
  briefFile?: string;
  output: string;
  model: string;
  verbose: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    command: '',
    output: 'world.json',
    model: 'gpt-4o-mini',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (!options.command && !arg.startsWith('-')) {
      options.command = arg;
      continue;
    }

    if (!options.briefFile && options.command === 'generate' && !arg.startsWith('-')) {
      options.briefFile = arg;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      options.output = args[++i] ?? 'world.json';
    } else if (arg === '--model' || arg === '-m') {
      options.model = args[++i] ?? 'gpt-4o-mini';
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

const EXAMPLE_BRIEF: WorldBrief = {
  name: 'The Shattered Realm',
  genre: 'dark-fantasy',
  themes: ['corruption', 'redemption', 'ancient evil'],
  tone: 'gritty',
  levelRange: { min: 1, max: 10 },
  estimatedSessions: 20,
  requirements: [
    'Include a major city as the starting hub',
    'Feature a cult as primary antagonist',
    'Include morally gray factions',
  ],
  inspirations: ['The Witcher', 'Dark Souls', 'Curse of Strahd'],
};

function printProgress(progress: GenerationProgress, verbose: boolean): void {
  const elapsed = Date.now() - progress.startedAt.getTime();
  const layerElapsed = Date.now() - progress.layerStartedAt.getTime();

  if (verbose) {
    console.log(
      `[${(elapsed / 1000).toFixed(1)}s] Layer: ${progress.currentLayer} (${(layerElapsed / 1000).toFixed(1)}s)`
    );
    console.log(`  Completed: ${progress.completedLayers.join(', ') || 'none'}`);
    if (progress.errors.length > 0) {
      console.log(`  Errors: ${progress.errors.join(', ')}`);
    }
    if (progress.warnings.length > 0) {
      console.log(`  Warnings: ${progress.warnings.length}`);
    }
  } else {
    const layers: GenerationLayer[] = [
      'foundation',
      'factions',
      'locations',
      'npcs',
      'campaign',
      'encounters',
    ];
    const progressBar = layers
      .map((l) => {
        if (progress.completedLayers.includes(l)) return '\u2588';
        if (l === progress.currentLayer) return '\u2592';
        return '\u2591';
      })
      .join('');
    process.stdout.write(`\rGenerating: [${progressBar}] ${progress.currentLayer}...`);
  }
}

// =============================================================================
// Mock Chat Client (for demonstration)
// =============================================================================

/**
 * This is a mock client for demonstration.
 * In production, use the actual ChatClient from @ai-dm/infrastructure.
 */
function createMockChatClient(): ChatClient {
  return {
    async chat() {
      console.log('\nNote: Using mock client. Configure OPENAI_API_KEY for real generation.');
      throw new Error('Mock client - configure real LLM client for generation');
    },
  };
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options.command || options.command === 'help') {
    console.log(USAGE);
    process.exit(0);
  }

  if (options.command === 'example') {
    console.log(JSON.stringify(EXAMPLE_BRIEF, null, 2));
    process.exit(0);
  }

  if (options.command === 'generate') {
    if (!options.briefFile) {
      console.error('Error: Brief file required');
      console.log(USAGE);
      process.exit(1);
    }

    // Load brief
    let brief: WorldBrief;
    try {
      const content = fs.readFileSync(options.briefFile, 'utf-8');
      brief = JSON.parse(content) as WorldBrief;
    } catch (error) {
      console.error(`Error loading brief: ${error}`);
      process.exit(1);
    }

    console.log(`Generating world: ${brief.name}`);
    console.log(`Genre: ${brief.genre}, Tone: ${brief.tone}`);
    console.log(`Levels: ${brief.levelRange.min}-${brief.levelRange.max}`);
    console.log('');

    // Create generator
    const chatClient = createMockChatClient();
    const generator = createWorldGenerator({
      chatClient,
      model: options.model,
      onProgress: (progress) => printProgress(progress, options.verbose),
      onLayerComplete: (layer, _data) => {
        if (options.verbose) {
          console.log(`  \u2713 ${layer} complete`);
        }
      },
    });

    // Generate
    const startTime = Date.now();
    const result = await generator.generate(brief);
    const duration = (Date.now() - startTime) / 1000;

    console.log(''); // New line after progress

    if (result.success && result.data) {
      // Save result
      fs.writeFileSync(options.output, JSON.stringify(result.data, null, 2));
      console.log(`\n\u2713 World generated successfully in ${duration.toFixed(1)}s`);
      console.log(`  Output: ${options.output}`);
      console.log(`  Locations: ${result.data.locations.locations.length}`);
      console.log(`  NPCs: ${result.data.npcs.npcs.length}`);
      console.log(`  Factions: ${result.data.factions.factions.length}`);
      console.log(`  Chapters: ${result.data.campaignArc.chapters.length}`);
      console.log(`  Encounters: ${result.data.encounters.encounters.length}`);
      if (result.tokensUsed) {
        console.log(`  Tokens used: ${result.tokensUsed.toLocaleString()}`);
      }
      if (result.warnings.length > 0) {
        console.log(`\n  Warnings: ${result.warnings.length}`);
        result.warnings.slice(0, 5).forEach((w) => console.log(`    - ${w}`));
        if (result.warnings.length > 5) {
          console.log(`    ... and ${result.warnings.length - 5} more`);
        }
      }
    } else {
      console.log(`\n\u2717 Generation failed after ${duration.toFixed(1)}s`);
      result.errors.forEach((e) => console.log(`  Error: ${e}`));
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
