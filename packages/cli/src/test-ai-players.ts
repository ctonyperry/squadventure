/**
 * Integration test script for AI players
 * Tests the DM with different player archetypes
 */

import 'dotenv/config';
import {
  createRustyTankardWorld,
  createSpencerPersona,
  createAIPlayer,
  COMBAT_OPTIMIZER,
  ROLEPLAY_ENTHUSIAST,
  CURIOUS_EXPLORER,
  NEW_PLAYER,
  TestRunner,
  type TestLogger,
  type TestOrchestrator,
  generateTestReport,
} from '@ai-dm/domain';
import { SessionOrchestrator } from '@ai-dm/application';
import { createOpenAIAdapterFromEnv } from '@ai-dm/infrastructure';

// Console logger
const consoleLogger: TestLogger = {
  log: (msg) => console.log(msg),
};

/**
 * Create a test orchestrator wrapper
 */
function createTestOrchestratorWrapper(): TestOrchestrator {
  const llm = createOpenAIAdapterFromEnv();
  const world = createRustyTankardWorld();
  const persona = createSpencerPersona();

  const orchestrator = new SessionOrchestrator({
    llmAdapter: llm,
    worldState: world,
    persona,
    startingLocationId: world.locations.keys().next().value!,
    events: {
      onToolCall: (name, args) => {
        console.log(`  [Tool: ${name}]`);
      },
    },
  });

  orchestrator.initialize(world);

  return {
    processPlayerInput: (input: string) => orchestrator.processPlayerInput(input, persona),
    getInitialDescription: () => orchestrator.getInitialDescription(persona),
  };
}

/**
 * Run tests with a specific archetype
 */
async function runSingleArchetypeTest(archetypeName: string): Promise<void> {
  const archetypes = {
    combat: COMBAT_OPTIMIZER,
    roleplay: ROLEPLAY_ENTHUSIAST,
    explorer: CURIOUS_EXPLORER,
    newplayer: NEW_PLAYER,
  };

  const archetype = archetypes[archetypeName as keyof typeof archetypes];
  if (!archetype) {
    console.error(`Unknown archetype: ${archetypeName}`);
    console.log('Available: combat, roleplay, explorer, newplayer');
    process.exit(1);
  }

  const player = createAIPlayer(archetype, 'TestPlayer', { characterClass: 'Fighter' });
  const runner = new TestRunner({ maxTurns: 5, logger: consoleLogger });
  const orchestrator = createTestOrchestratorWrapper();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing with: ${archetype.name}`);
  console.log(`${'='.repeat(60)}\n`);

  const result = await runner.runSession(player, orchestrator);

  console.log('\n' + generateTestReport([result]));
}

/**
 * Run quick tests with all archetypes
 */
async function runAllArchetypeTests(): Promise<void> {
  const archetypes = [COMBAT_OPTIMIZER, ROLEPLAY_ENTHUSIAST, CURIOUS_EXPLORER, NEW_PLAYER];
  const players = archetypes.map((a, i) =>
    createAIPlayer(a, `Player${i + 1}`, { characterClass: 'Fighter' })
  );

  const runner = new TestRunner({ maxTurns: 3, logger: consoleLogger });

  console.log('\n' + '='.repeat(60));
  console.log('AI PLAYER INTEGRATION TEST');
  console.log('Testing DM with different player archetypes');
  console.log('='.repeat(60) + '\n');

  const results = await runner.runBatchTests(players, createTestOrchestratorWrapper);

  console.log('\n\n' + '='.repeat(60));
  console.log('FINAL REPORT');
  console.log('='.repeat(60));
  console.log(generateTestReport(results));
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (command === 'single' && args[1]) {
  runSingleArchetypeTest(args[1]).catch(console.error);
} else if (command === 'all' || !command) {
  runAllArchetypeTests().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node test-ai-players.js           # Run all archetypes');
  console.log('  node test-ai-players.js all       # Run all archetypes');
  console.log('  node test-ai-players.js single <archetype>');
  console.log('');
  console.log('Archetypes: combat, roleplay, explorer, newplayer');
}
