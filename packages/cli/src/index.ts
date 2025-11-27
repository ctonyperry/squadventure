#!/usr/bin/env node

import { loadEnv } from '@ai-dm/infrastructure';
import { createOpenAIAdapterFromEnv } from '@ai-dm/infrastructure';
import { createRustyTankardWorld, createSpencerPersona } from '@ai-dm/domain';
import { GameREPL } from './repl.js';

// Load environment variables
loadEnv();

async function main(): Promise<void> {
  console.log('Initializing AI Dungeon Master...');

  // Create OpenAI adapter
  let llmAdapter;
  try {
    llmAdapter = createOpenAIAdapterFromEnv();
  } catch (error) {
    console.error(
      'Error: OPENAI_API_KEY not found. Please set it in your .env file or environment.'
    );
    process.exit(1);
  }

  // Load world and persona
  const worldState = createRustyTankardWorld();
  const persona = createSpencerPersona();

  // Start REPL
  const repl = new GameREPL({
    llmAdapter,
    worldState,
    persona,
    startingLocationId: 'tavern_main',
  });

  await repl.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
