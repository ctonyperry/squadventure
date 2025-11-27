import type { WorldState, EntityId, LocationId } from '@ai-dm/shared';
import {
  WorldBuilder,
  createDescription,
  createAmbiance,
  createPersonality,
  createAbilityScores,
  createCreatureStats,
} from './world-builder.js';

/**
 * Creates the sample Rusty Tankard tavern world
 */
export function createRustyTankardWorld(): WorldState {
  const builder = new WorldBuilder(
    'rusty-tankard',
    'The Rusty Tankard',
    'A cozy tavern in the village of Millbrook, known for its warm hearth and colorful patrons.'
  );

  // Main tavern room
  const tavernId = builder.addLocation({
    id: 'tavern_main',
    name: 'The Rusty Tankard - Main Hall',
    description: createDescription(
      'A warm, inviting tavern with rough-hewn wooden beams overhead and a massive stone fireplace dominating one wall. Round tables are scattered throughout, while a long oak bar runs along the eastern wall. The air is thick with the smell of roasting meat and spilled ale.',
      {
        sight: 'Firelight dances across weathered faces, casting long shadows across the room. A mounted boar\'s head above the fireplace seems to watch the patrons.',
        sound: 'The crackle of the fire mingles with murmured conversations and the occasional burst of laughter.',
        smell: 'Roasting venison, fresh bread, and the yeasty tang of ale.',
        touch: 'The wooden floor is sticky underfoot from years of spilled drinks.',
        hiddenDetails: [
          'A loose floorboard near the bar conceals a small cache of coins.',
          'The mounted boar head has glass eyes that are actually peepholes.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'moderate', 'peaceful', 'warm'),
  });

  // Back room
  const backRoomId = builder.addLocation({
    id: 'tavern_back',
    name: 'The Rusty Tankard - Back Room',
    description: createDescription(
      'A small, private room behind the main hall, furnished with a single table and chairs. The walls are lined with old maps and hunting trophies. A door in the back leads to the kitchen.',
      {
        sight: 'Candlelight illuminates dusty maps showing trade routes across the realm.',
        sound: 'The sounds from the main hall are muffled here, making private conversation easy.',
        hiddenDetails: [
          'One of the maps shows the location of a forgotten dwarven mine.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'quiet', 'neutral', 'comfortable'),
  });

  // Connect locations
  builder.connectLocations(
    tavernId,
    backRoomId,
    'through a wooden door to the back',
    'through the door to the main hall'
  );

  // NPCs

  // Hilda the Barkeep
  const hildaId = builder.addNPC({
    id: 'hilda',
    name: 'Hilda Stoutbrew',
    description: createDescription(
      'A stout, middle-aged dwarven woman with a perpetual knowing smile and arms like tree trunks. Her gray-streaked auburn hair is pulled back in a practical braid, and she wears a well-worn leather apron covered in various stains.',
      {
        hiddenDetails: [
          'Former adventurer who retired after a run-in with a beholder.',
          'Knows the location of three hidden treasure caches in the nearby wilderness.',
        ],
      }
    ),
    personality: createPersonality(
      ['Observant', 'Pragmatic', 'Warmhearted'],
      ['Community - "This tavern is the heart of Millbrook, and I its keeper."'],
      ['Owes a life debt to the local temple for healing her after her last adventure.'],
      ['Cannot resist a good drinking contest.'],
      {
        speakingStyle: 'Direct and earthy, with colorful dwarven expressions.',
        mannerisms: [
          'Wipes down the bar even when it\'s clean.',
          'Sizes up newcomers with a quick glance.',
        ],
      }
    ),
    knowledge: [
      'Local gossip and rumors.',
      'The roads are dangerous lately - bandits spotted near the old mill.',
      'Lord Ashworth is looking for adventurers for some task.',
      'The old mine to the north has been making strange sounds.',
    ],
    motivation: 'Protect the tavern and keep her regulars safe and happy.',
    attitude: 'friendly',
    stats: createCreatureStats(
      createAbilityScores(14, 10, 16, 12, 14, 13),
      12,
      45,
      25
    ),
  });

  // Marcus the Mysterious Stranger
  const marcusId = builder.addNPC({
    id: 'marcus',
    name: 'Marcus the Hooded',
    description: createDescription(
      'A lean figure in a travel-worn dark cloak, hood pulled low to shadow his features. What visible skin shows bears old, faded scars. He nurses a single drink at a corner table, watching the room.',
      {
        hiddenDetails: [
          'Former assassin seeking redemption.',
          'Has a bounty on his head from the Crimson Hand guild.',
          'Carries a magical dagger that whispers the names of those it has killed.',
        ],
      }
    ),
    personality: createPersonality(
      ['Cautious', 'Observant', 'Haunted'],
      ['Redemption - "Everyone deserves a second chance, even me."'],
      ['Seeking to right the wrongs of his past by protecting the innocent.'],
      ['Paranoid - always sits with his back to the wall.'],
      {
        speakingStyle: 'Quiet and measured, chooses words carefully.',
        mannerisms: [
          'Constantly scans the room.',
          'Never sits with his back to a door.',
          'Fingers a hidden blade when nervous.',
        ],
      }
    ),
    knowledge: [
      'The underworld of the region - criminal organizations, smuggling routes.',
      'The Crimson Hand guild is planning something big.',
      'There is a safe house for those fleeing danger, hidden in the forest.',
    ],
    motivation: 'Atone for past sins by protecting those who cannot protect themselves.',
    attitude: 'neutral',
    stats: createCreatureStats(
      createAbilityScores(12, 18, 12, 14, 16, 10),
      15,
      55,
      30
    ),
  });

  // Old Benson the Storyteller
  const bensonId = builder.addNPC({
    id: 'benson',
    name: 'Old Benson',
    description: createDescription(
      'A wizened old man with a wild white beard and twinkling eyes that suggest he knows more than he lets on. He wears patched robes that were once fine, and carries a gnarled walking stick.',
      {
        hiddenDetails: [
          'Was once a court wizard but left under mysterious circumstances.',
          'His walking stick is actually a Staff of the Adder in disguise.',
          'Can cast detect magic at will.',
        ],
      }
    ),
    personality: createPersonality(
      ['Whimsical', 'Wise', 'Cryptic'],
      ['Knowledge - "Stories are just truth wearing a costume."'],
      ['Watches over promising young adventurers.'],
      ['Cannot resist telling a story, even at inappropriate times.'],
      {
        speakingStyle: 'Speaks in riddles and parables, often frustratingly indirect.',
        mannerisms: [
          'Strokes his beard when thinking.',
          'Laughs at his own jokes.',
          'Refers to everyone as "young one" regardless of their age.',
        ],
      }
    ),
    knowledge: [
      'Ancient lore and legends of the realm.',
      'The old temple in the woods was once dedicated to a god now forgotten.',
      'The strange lights seen near the forest are actually a portal opening.',
      'There is a prophecy about heroes who will save the realm from darkness.',
    ],
    motivation: 'Guide worthy heroes toward their destiny.',
    attitude: 'friendly',
    stats: createCreatureStats(
      createAbilityScores(8, 10, 10, 18, 16, 14),
      12,
      30,
      25
    ),
  });

  // Place NPCs in locations
  builder.placeEntity(hildaId, tavernId);
  builder.placeEntity(marcusId, tavernId);
  builder.placeEntity(bensonId, tavernId);

  // Add some items
  const swordId = builder.addItem({
    id: 'rusty_sword',
    name: 'Rusty Shortsword',
    description: createDescription(
      'An old shortsword hanging on the wall as decoration, its blade pitted with rust.',
      {
        hiddenDetails: ['Despite appearances, the blade is still sharp and functional.'],
      }
    ),
    itemType: 'weapon',
    value: 5,
    weight: 2,
    magical: false,
  });

  builder.placeEntity(swordId, tavernId);

  // Add lore
  builder.addLore({
    category: 'Local History',
    content: 'The Rusty Tankard has stood for over a century, serving travelers on the old trade road. Its current owner, Hilda Stoutbrew, won the deed in a legendary drinking contest twenty years ago.',
    isPublicKnowledge: true,
  });

  builder.addLore({
    category: 'Rumors',
    content: 'Strange lights have been seen in the forest to the north. Some say it\'s will-o\'-wisps, others claim it\'s something far worse.',
    isPublicKnowledge: true,
  });

  builder.addLore({
    category: 'Secrets',
    content: 'The Rusty Tankard was once a safe house for the resistance during the Tyrant\'s War. Hidden passages still exist beneath the cellar.',
    isPublicKnowledge: false,
  });

  // Set flags
  builder.setFlag('tavern_open', true);
  builder.setFlag('fire_lit', true);

  // Set counters
  builder.setCounter('patron_count', 12);
  builder.setCounter('hour_of_day', 20); // 8 PM

  return builder.build();
}

/**
 * Export sample worlds for easy access
 */
export const sampleWorlds = {
  rustyTankard: createRustyTankardWorld,
};
