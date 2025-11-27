import type { WorldState } from '@ai-dm/shared';
import {
  WorldBuilder,
  createDescription,
  createAmbiance,
  createPersonality,
  createAbilityScores,
  createCreatureStats,
} from './world-builder.js';

/**
 * Creates a dark forest exploration world
 */
export function createDarkForestWorld(): WorldState {
  const builder = new WorldBuilder(
    'dark-forest',
    'The Whispering Woods',
    'A dense, ancient forest where sunlight barely penetrates the canopy. Strange whispers echo between the trees, and travelers often lose their way.'
  );

  // Forest entrance
  const entranceId = builder.addLocation({
    id: 'forest_entrance',
    name: 'Forest Edge',
    description: createDescription(
      'The treeline looms before you like a wall of shadow. Ancient oaks stretch impossibly tall, their branches intertwining overhead to form a natural tunnel. A well-worn path disappears into the gloom.',
      {
        sight: 'Shafts of fading daylight struggle through gaps in the canopy.',
        sound: 'Birdsong fades as you approach, replaced by an unsettling silence.',
        smell: 'Damp earth, decaying leaves, and something faintly floral.',
        hiddenDetails: [
          'Claw marks on the nearest tree suggest something large passed recently.',
          'Small offerings - beads, dried flowers - hang from a low branch.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'quiet', 'eerie', 'cool'),
  });

  // Deep forest clearing
  const clearingId = builder.addLocation({
    id: 'forest_clearing',
    name: 'Moonlit Clearing',
    description: createDescription(
      'A perfect circle of grass surrounded by ancient standing stones. The canopy opens here to reveal the sky, and at night, moonlight pools in the center like liquid silver. Mushrooms grow in fairy rings around the stones.',
      {
        sight: 'The standing stones bear weathered carvings of unknown origin.',
        sound: 'A faint humming seems to emanate from the stones themselves.',
        smell: 'Wild herbs and the earthy scent of mushrooms.',
        touch: 'The air feels charged, like before a lightning storm.',
        hiddenDetails: [
          'The stones are a portal to the Feywild at midnight on full moons.',
          'One stone has a hidden compartment containing an ancient scroll.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('bright', 'quiet', 'eerie', 'comfortable'),
  });

  // Ruined shrine
  const shrineId = builder.addLocation({
    id: 'forest_shrine',
    name: 'Overgrown Shrine',
    description: createDescription(
      'Crumbling stone walls barely visible beneath centuries of ivy and moss. What was once a small temple has been reclaimed by the forest, yet the altar at its heart remains mysteriously clean.',
      {
        sight: 'Faded murals on the walls depict a forgotten nature deity.',
        sound: 'Water trickles from somewhere within the ruins.',
        smell: 'Old stone, moss, and incense - though no one has been here in ages.',
        hiddenDetails: [
          'The altar radiates faint divine magic.',
          'A hidden passage beneath leads to catacombs.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'quiet', 'peaceful', 'cool'),
  });

  // Connect locations
  builder.connectLocations(entranceId, clearingId, 'following the winding path deeper', 'back along the path to the forest edge');
  builder.connectLocations(clearingId, shrineId, 'through a gap in the stones to the east', 'west through the trees to the clearing');

  // NPCs

  // Whisper - a dryad
  const whisperId = builder.addNPC({
    id: 'whisper',
    name: 'Whisper',
    description: createDescription(
      'A dryad whose bark-like skin shifts through shades of green and brown. Her hair is a cascade of autumn leaves, and her eyes gleam like pools of amber. She moves with unnatural fluidity, more plant than humanoid.',
      {
        hiddenDetails: [
          'She is over 400 years old and remembers when the shrine was active.',
          'Her tree is dying due to a corruption spreading through the forest.',
        ],
      }
    ),
    personality: createPersonality(
      ['Enigmatic', 'Patient', 'Protective'],
      ['Balance - "The forest gives and takes in equal measure."'],
      ['Bound to protect the ancient shrine and its secrets.'],
      ['Distrusts those who carry iron weapons.'],
      {
        speakingStyle: 'Speaks in flowing, poetic phrases with long pauses.',
        mannerisms: [
          'Touches nearby plants while speaking.',
          'Her voice seems to come from multiple directions.',
        ],
      }
    ),
    knowledge: [
      'The history of the shrine and the god it honored.',
      'A corruption is spreading from the east, killing the trees.',
      'The standing stones can transport those who know the words.',
      'A pack of corrupted wolves has been hunting in the forest.',
    ],
    motivation: 'Find and stop the source of corruption before her tree dies.',
    attitude: 'neutral',
    stats: createCreatureStats(
      createAbilityScores(10, 12, 11, 14, 15, 18),
      11,
      22,
      30
    ),
  });

  // Grukk - a lost goblin
  const grukkId = builder.addNPC({
    id: 'grukk',
    name: 'Grukk the Lost',
    description: createDescription(
      'A small, bedraggled goblin with oversized ears and wide, fearful eyes. He clutches a tattered blanket and mutters to himself. Unlike most goblins, he seems more pathetic than threatening.',
      {
        hiddenDetails: [
          'Was exiled from his tribe for refusing to eat a captive.',
          'Knows the location of the goblin lair and their plans.',
        ],
      }
    ),
    personality: createPersonality(
      ['Cowardly', 'Curious', 'Surprisingly kind'],
      ['Survival - "Grukk just wants to live. Is that so bad?"'],
      ['Seeks acceptance, having been rejected by his own kind.'],
      ['Terrified of loud noises and sudden movements.'],
      {
        speakingStyle: 'Speaks in third person, high-pitched and nervous.',
        mannerisms: [
          'Flinches at sudden movements.',
          'Hoards shiny objects in his blanket.',
          'Hums tunelessly when nervous.',
        ],
      }
    ),
    knowledge: [
      'The goblin tribe is planning to attack a nearby village.',
      'There is a secret back entrance to the goblin caves.',
      'The tribe worships something dark in the deep caves.',
      'Edible plants and safe water sources in the forest.',
    ],
    motivation: 'Find somewhere safe where he can belong.',
    attitude: 'fearful',
    stats: createCreatureStats(
      createAbilityScores(8, 14, 10, 10, 8, 8),
      13,
      7,
      30
    ),
  });

  // Place NPCs
  builder.placeEntity(whisperId, clearingId);
  builder.placeEntity(grukkId, entranceId);

  // Add a hostile creature
  const shadowWolfId = builder.addCreature({
    id: 'shadow_wolf',
    name: 'Shadow Wolf',
    description: createDescription(
      'A massive wolf whose fur seems to absorb light. Its eyes glow with an unnatural purple luminescence, and wisps of shadow trail from its form as it moves.',
      {
        hiddenDetails: ['Corrupted by the same force affecting the forest.'],
      }
    ),
    stats: createCreatureStats(
      createAbilityScores(16, 15, 15, 3, 12, 6),
      13,
      37,
      50
    ),
    attitude: 'hostile',
  });

  builder.placeEntity(shadowWolfId, shrineId);

  // Items
  const ancientScrollId = builder.addItem({
    id: 'ancient_scroll',
    name: 'Scroll of Forest Speech',
    description: createDescription(
      'A weathered scroll bound in bark, containing words of power in an ancient druidic script.',
      {
        hiddenDetails: ['Contains the spell Speak with Plants.'],
      }
    ),
    itemType: 'misc',
    magical: true,
    properties: ['Contains one casting of Speak with Plants'],
  });

  builder.placeEntity(ancientScrollId, shrineId);

  // Lore
  builder.addLore({
    category: 'History',
    content: 'The Whispering Woods were once tended by druids who worshipped at the shrine. They vanished three centuries ago during the Sundering.',
    isPublicKnowledge: true,
  });

  builder.addLore({
    category: 'Rumors',
    content: 'Hunters say the wolves have been acting strange lately - organized, almost intelligent. Some have purple-glowing eyes.',
    isPublicKnowledge: true,
  });

  builder.addLore({
    category: 'Secrets',
    content: 'The corruption stems from a fractured planar breach in a cave system to the east, where something from the Shadowfell is leaking through.',
    isPublicKnowledge: false,
  });

  return builder.build();
}

/**
 * Creates a dungeon/underground world
 */
export function createGoblinCavesWorld(): WorldState {
  const builder = new WorldBuilder(
    'goblin-caves',
    'The Goblin Warrens',
    'A network of natural caves expanded by generations of goblins into a crude but effective stronghold.'
  );

  // Cave entrance
  const entranceId = builder.addLocation({
    id: 'cave_entrance',
    name: 'Cave Mouth',
    description: createDescription(
      'A jagged opening in the hillside, partially concealed by thorny bushes. The stench of goblin habitation wafts from within. Crude totems of bone and feathers flank the entrance.',
      {
        sight: 'Scratched warnings in goblin script mark the cave walls.',
        sound: 'Distant echoes of guttural voices and clanging metal.',
        smell: 'Unwashed bodies, rotting food, and damp stone.',
        hiddenDetails: [
          'A hidden pit trap lies just inside the entrance.',
          'A goblin scout watches from a concealed ledge above.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dark', 'quiet', 'tense', 'cool'),
  });

  // Guard post
  const guardPostId = builder.addLocation({
    id: 'guard_post',
    name: 'Guard Chamber',
    description: createDescription(
      'A widened section of tunnel serving as a checkpoint. Makeshift barricades of sharpened sticks and scrap metal create a chokepoint. Several goblins lounge here, gambling with knucklebones.',
      {
        sight: 'Torches in crude sconces cast dancing shadows.',
        sound: 'Goblins arguing over their game, weapons clattering.',
        smell: 'Smoke, sweat, and stale beer.',
        hiddenDetails: [
          'An alarm horn hangs by the far exit.',
          'The guards have a small stash of stolen coins.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'moderate', 'tense', 'warm'),
  });

  // Main cavern
  const mainCavernId = builder.addLocation({
    id: 'main_cavern',
    name: 'Great Cavern',
    description: createDescription(
      'A vast natural chamber that serves as the tribe\'s main living area. Crude huts and lean-tos cluster around a central fire pit. Stalactites hang from the ceiling like stone fangs.',
      {
        sight: 'Dozens of goblins go about daily activities - cooking, crafting, squabbling.',
        sound: 'A cacophony of goblin speech, crying babies, and barking cave dogs.',
        smell: 'Cooking meat (best not to ask what kind), smoke, and general squalor.',
        hiddenDetails: [
          'A hidden passage behind a hanging hide leads to the chieftain\'s quarters.',
          'The goblins have captured two human prisoners kept in a side alcove.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'loud', 'chaotic', 'warm'),
  });

  // Chieftain's chamber
  const chieftainId = builder.addLocation({
    id: 'chieftain_chamber',
    name: 'Chieftain\'s Throne Room',
    description: createDescription(
      'A smaller cave decorated with trophies and plunder. A throne of lashed bones and salvaged wood dominates the space. Crude paintings on the walls depict goblin victories.',
      {
        sight: 'Stolen treasures and weapons line the walls.',
        sound: 'The chieftain\'s pet dire rat squeaks in its cage.',
        smell: 'Better than the rest of the caves - the chieftain burns incense.',
        hiddenDetails: [
          'A locked chest contains the tribe\'s treasury.',
          'A map on the wall shows planned raids on nearby settlements.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'quiet', 'tense', 'comfortable'),
  });

  // Connect locations
  builder.connectLocations(entranceId, guardPostId, 'deeper into the cave', 'toward the entrance');
  builder.connectLocations(guardPostId, mainCavernId, 'through the checkpoint into the main cavern', 'back to the guard post');
  builder.connectLocations(mainCavernId, chieftainId, 'through a hide curtain to the chieftain\'s quarters', 'back to the main cavern');

  // NPCs/Creatures

  // Goblin Boss
  const bossBilgratId = builder.addNPC({
    id: 'boss_bilgrat',
    name: 'Boss Bilgrat',
    description: createDescription(
      'A particularly large and scarred goblin wearing a crude crown of bent metal. He carries a rusty but well-maintained sword and wears pieces of mismatched armor.',
      {
        hiddenDetails: [
          'Paranoid about assassination attempts from rivals.',
          'Secretly fears the shaman\'s growing power.',
        ],
      }
    ),
    personality: createPersonality(
      ['Cunning', 'Brutal', 'Paranoid'],
      ['Power - "Bilgrat is boss. Bilgrat stays boss."'],
      ['Will do anything to maintain control of the tribe.'],
      ['Prone to violent outbursts when challenged.'],
      {
        speakingStyle: 'Speaks loudly, demanding respect. Refers to himself in third person.',
        mannerisms: [
          'Constantly touches his crown.',
          'Tests food by making others eat first.',
        ],
      }
    ),
    knowledge: [
      'The tribe\'s full strength and defensive positions.',
      'A deal with a mysterious figure who provides weapons.',
      'The location of a secret escape tunnel.',
    ],
    motivation: 'Expand the tribe\'s territory and prove his strength.',
    attitude: 'hostile',
    stats: createCreatureStats(
      createAbilityScores(14, 14, 13, 10, 11, 12),
      17,
      33,
      30
    ),
  });

  // Goblin Shaman
  const shamanSkrixId = builder.addNPC({
    id: 'shaman_skrix',
    name: 'Skrix the Bone-Speaker',
    description: createDescription(
      'An ancient goblin draped in fetishes and bones. One eye is milky white, the other burns with unnatural purple light. She moves with a pronounced limp but radiates power.',
      {
        hiddenDetails: [
          'Has made contact with an entity from the Shadowfell.',
          'Plans to overthrow Bilgrat when the time is right.',
        ],
      }
    ),
    personality: createPersonality(
      ['Manipulative', 'Patient', 'Cruel'],
      ['Power through knowledge - "The spirits tell Skrix everything."'],
      ['Serves a dark entity in exchange for magical power.'],
      ['Believes she is destined for greatness, leading to hubris.'],
      {
        speakingStyle: 'Raspy whisper, often pauses to "listen" to spirits.',
        mannerisms: [
          'Rattles her bone staff.',
          'Her purple eye glows brighter when she uses magic.',
        ],
      }
    ),
    knowledge: [
      'Dark rituals and forbidden magic.',
      'The source of the corruption in the forest.',
      'Ancient secrets of the caves.',
    ],
    motivation: 'Complete the ritual to open a permanent portal to the Shadowfell.',
    attitude: 'hostile',
    stats: createCreatureStats(
      createAbilityScores(8, 12, 12, 15, 14, 14),
      12,
      27,
      25
    ),
  });

  // Place NPCs
  builder.placeEntity(bossBilgratId, chieftainId);
  builder.placeEntity(shamanSkrixId, mainCavernId);

  // Add goblin guards
  for (let i = 1; i <= 3; i++) {
    const guardId = builder.addCreature({
      id: `goblin_guard_${i}`,
      name: `Goblin Guard ${i}`,
      description: createDescription('A typical goblin warrior with rusty weapons and leather scraps for armor.'),
      stats: createCreatureStats(
        createAbilityScores(8, 14, 10, 10, 8, 8),
        15,
        7,
        30
      ),
      attitude: 'hostile',
    });
    builder.placeEntity(guardId, guardPostId);
  }

  // Items
  const shadowOrbId = builder.addItem({
    id: 'shadow_orb',
    name: 'Orb of Shadow',
    description: createDescription(
      'A sphere of pure darkness that seems to drink in light. Cold to the touch, it whispers promises of power to those who hold it.',
      {
        hiddenDetails: [
          'A conduit for Shadowfell energy, key to Skrix\'s ritual.',
          'Cursed - prolonged contact causes nightmares.',
        ],
      }
    ),
    itemType: 'treasure',
    magical: true,
    properties: ['Cursed', 'Key ritual component'],
  });

  builder.placeEntity(shadowOrbId, chieftainId);

  // Lore
  builder.addLore({
    category: 'History',
    content: 'The Goblin Warrens were once dwarven mines, abandoned after they dug too deep and disturbed something below.',
    isPublicKnowledge: false,
  });

  builder.addLore({
    category: 'Rumors',
    content: 'The goblins have been raiding more boldly lately, and some captives speak of strange purple lights in the caves.',
    isPublicKnowledge: true,
  });

  return builder.build();
}

/**
 * Creates a town square social hub
 */
export function createMillbrookTownSquare(): WorldState {
  const builder = new WorldBuilder(
    'millbrook-square',
    'Millbrook Town Square',
    'The bustling heart of Millbrook village, where merchants hawk wares, townsfolk gossip, and adventurers seek work.'
  );

  // Main square
  const squareId = builder.addLocation({
    id: 'town_square',
    name: 'Central Square',
    description: createDescription(
      'A cobblestone plaza surrounded by timber-framed buildings. A stone fountain depicting a local hero stands in the center, and market stalls crowd the edges. The smell of fresh bread and roasting chestnuts fills the air.',
      {
        sight: 'Colorful awnings shade merchants\' stalls. Children chase each other between the crowds.',
        sound: 'Haggling voices, cart wheels on cobblestones, a busker playing a lute.',
        smell: 'Fresh bread from the bakery, flowers from the florist, horse manure from the stables.',
        hiddenDetails: [
          'A pickpocket works the crowd near the fountain.',
          'Notice boards contain several bounty postings.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('bright', 'loud', 'peaceful', 'comfortable'),
  });

  // Blacksmith
  const smithId = builder.addLocation({
    id: 'blacksmith',
    name: 'Ironheart Forge',
    description: createDescription(
      'The clang of hammer on anvil rings from this open-fronted smithy. Weapons and tools hang from every surface, and the heat from the forge warms passersby.',
      {
        sight: 'Sparks fly from the anvil. Quality weapons gleam on display.',
        sound: 'Rhythmic hammering, the roar of the bellows, hissing steam.',
        smell: 'Hot metal, coal smoke, and leather.',
        hiddenDetails: [
          'A secret compartment behind the forge holds illegal weapons.',
          'The smith can craft silvered weapons for those who know to ask.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('bright', 'loud', 'neutral', 'hot'),
  });

  // Temple
  const templeId = builder.addLocation({
    id: 'temple',
    name: 'Temple of the Morning Light',
    description: createDescription(
      'A modest stone temple with stained glass windows depicting the sun. Candles burn at a simple altar, and the scent of incense lingers.',
      {
        sight: 'Sunlight streams through colored glass, casting rainbow patterns.',
        sound: 'Soft chanting, the rustle of robes, whispered prayers.',
        smell: 'Incense, candle wax, and old books.',
        hiddenDetails: [
          'The cellar contains healing supplies for emergencies.',
          'Ancient texts in the back room describe local history.',
        ],
      }
    ),
    connections: [],
    presentEntities: [],
    ambiance: createAmbiance('dim', 'quiet', 'peaceful', 'comfortable'),
  });

  // Connect locations
  builder.connectLocations(squareId, smithId, 'to the east, past the fountain', 'back to the central square');
  builder.connectLocations(squareId, templeId, 'up the steps to the temple entrance', 'down the steps to the square');

  // NPCs

  // Blacksmith
  const forgusId = builder.addNPC({
    id: 'forgus',
    name: 'Forgus Ironheart',
    description: createDescription(
      'A burly human with arms like tree trunks and a soot-stained leather apron. His bald head gleams with sweat, and his hands bear decades of burn scars.',
      {
        hiddenDetails: [
          'Former soldier who fought in the Border Wars.',
          'Has contacts in the underground arms trade.',
        ],
      }
    ),
    personality: createPersonality(
      ['Gruff', 'Fair', 'Proud of his craft'],
      ['Quality - "A blade should outlive the man who wields it."'],
      ['Owes a debt to Lord Ashworth for setting him up in business.'],
      ['Refuses to make weapons for those he deems dishonorable.'],
      {
        speakingStyle: 'Few words, direct. Grunts serve as punctuation.',
        mannerisms: [
          'Wipes hands on apron constantly.',
          'Tests edge of every blade before selling.',
        ],
      }
    ),
    knowledge: [
      'Quality of various weapons and armor.',
      'Local guard deployments and patrol routes.',
      'Rumors of a monster in the nearby mines.',
      'Which merchants can be trusted.',
    ],
    motivation: 'Run his forge honestly and pay back his debts.',
    attitude: 'neutral',
    stats: createCreatureStats(
      createAbilityScores(17, 10, 15, 10, 12, 10),
      14,
      52,
      30
    ),
  });

  // Priest
  const sirennaId = builder.addNPC({
    id: 'sirenna',
    name: 'Sister Sirenna',
    description: createDescription(
      'A middle-aged half-elf woman in simple white and gold robes. Her smile is warm but her eyes hold old sadness. A holy symbol of the sun hangs at her breast.',
      {
        hiddenDetails: [
          'Lost her family to a plague she couldn\'t heal.',
          'Suspects something dark is corrupting the surrounding lands.',
        ],
      }
    ),
    personality: createPersonality(
      ['Compassionate', 'Wise', 'Haunted'],
      ['Service - "We heal because we can. That is enough."'],
      ['Dedicated to protecting Millbrook and its people.'],
      ['Blames herself for those she cannot save.'],
      {
        speakingStyle: 'Gentle and measured, with occasional pauses for prayer.',
        mannerisms: [
          'Touches her holy symbol when anxious.',
          'Hums hymns while working.',
        ],
      }
    ),
    knowledge: [
      'Healing arts and religious lore.',
      'The history of the region and its temples.',
      'Whispers of undead sightings in the cemetery.',
      'Lord Ashworth\'s illness (kept secret).',
    ],
    motivation: 'Protect her flock and uncover the darkness she senses.',
    attitude: 'friendly',
    stats: createCreatureStats(
      createAbilityScores(10, 10, 12, 13, 16, 14),
      10,
      27,
      30
    ),
  });

  // Merchant
  const pippertonId = builder.addNPC({
    id: 'pipperton',
    name: 'Pipperton Quickfingers',
    description: createDescription(
      'A rotund halfling with a magnificent mustache and twinkling eyes. He wears a patchwork coat covered in pockets and always seems to have exactly what you need.',
      {
        hiddenDetails: [
          'Former member of a thieves\' guild.',
          'Knows the fence network in three cities.',
        ],
      }
    ),
    personality: createPersonality(
      ['Jovial', 'Shrewd', 'Generous with friends'],
      ['Profit - "Every deal should leave both parties smiling."'],
      ['Loyal to those who\'ve earned his trust.'],
      ['Cannot resist a good haggle, even against his interests.'],
      {
        speakingStyle: 'Fast-talking, peppered with sales pitches and compliments.',
        mannerisms: [
          'Produces items from seemingly impossible pockets.',
          'Winks conspiratorially.',
        ],
      }
    ),
    knowledge: [
      'What items are available and their fair prices.',
      'Trade routes and caravan schedules.',
      'The black market and how to access it.',
      'Gossip from every corner of the region.',
    ],
    motivation: 'Make enough coin to retire comfortably.',
    attitude: 'friendly',
    stats: createCreatureStats(
      createAbilityScores(8, 16, 10, 14, 12, 16),
      12,
      18,
      25
    ),
  });

  // Place NPCs
  builder.placeEntity(forgusId, smithId);
  builder.placeEntity(sirennaId, templeId);
  builder.placeEntity(pippertonId, squareId);

  // Lore
  builder.addLore({
    category: 'Local',
    content: 'Millbrook was founded 200 years ago around a mill powered by the brook that gives the town its name.',
    isPublicKnowledge: true,
  });

  builder.addLore({
    category: 'Rumors',
    content: 'Lord Ashworth has been ill for weeks. Some say it\'s natural, others whisper poison.',
    isPublicKnowledge: true,
  });

  builder.addLore({
    category: 'Quest Hooks',
    content: 'The notice board advertises: goblin bounty (10gp per ear), missing merchant caravan, strange lights in the old cemetery.',
    isPublicKnowledge: true,
  });

  return builder.build();
}

/**
 * Export additional worlds
 */
export const additionalWorlds = {
  darkForest: createDarkForestWorld,
  goblinCaves: createGoblinCavesWorld,
  millbrookSquare: createMillbrookTownSquare,
};
