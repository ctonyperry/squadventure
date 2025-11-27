/**
 * AI Player Archetypes for automated testing
 * Each archetype has different play styles and generates appropriate actions
 */

import type { PlayerGamePreferences } from '@ai-dm/shared';

/**
 * Base player archetype definition
 */
export interface PlayerArchetype {
  id: string;
  name: string;
  description: string;
  profile: PlayerGamePreferences;
  actionPatterns: ActionPattern[];
  conversationStyle: ConversationStyle;
}

/**
 * How the AI player generates actions
 */
export interface ActionPattern {
  situation: string; // Regex pattern to match DM output
  actions: WeightedAction[];
}

/**
 * Weighted action for probabilistic selection
 */
export interface WeightedAction {
  action: string;
  weight: number;
  variants?: string[]; // Alternative phrasings
}

/**
 * Conversation style for generating player responses
 */
export interface ConversationStyle {
  verbosity: 'terse' | 'normal' | 'verbose';
  formality: 'casual' | 'normal' | 'formal';
  inCharacter: boolean; // Whether player speaks as character
  asksClarifyingQuestions: number; // 0-1 likelihood
  usesGameTerms: number; // 0-1 likelihood
}

/**
 * Combat-focused player archetype
 * Enjoys tactical combat, seeks out battles, optimizes damage
 */
export const COMBAT_OPTIMIZER: PlayerArchetype = {
  id: 'combat-optimizer',
  name: 'The Combat Optimizer',
  description: 'A player who loves tactical combat and optimizing damage output',
  profile: {
    experienceLevel: 'veteran',
    playStyle: {
      prefersRoleplay: 0.2,
      prefersCombat: 0.9,
      prefersExploration: 0.3,
      prefersPuzzles: 0.2,
    },
    humorReceptivity: 0.4,
    pacePreference: 'fast',
  },
  actionPatterns: [
    {
      situation: 'enemy|hostile|combat|attack|fight|creature',
      actions: [
        { action: 'I attack the nearest enemy with my weapon!', weight: 30 },
        { action: 'What are their positions? I want to optimize my attack.', weight: 20 },
        { action: 'I use my most damaging ability.', weight: 25 },
        { action: 'Can I get flanking advantage?', weight: 15 },
        { action: 'I ready an action to attack the first enemy in range.', weight: 10 },
      ],
    },
    {
      situation: 'tavern|inn|town|peaceful|social',
      actions: [
        { action: 'Are there any bounty boards or quest postings?', weight: 25 },
        { action: 'I look for anyone who might need muscle for a job.', weight: 25 },
        { action: 'Any arena or fighting pit in this town?', weight: 20 },
        { action: 'I train with my weapon while we rest.', weight: 15 },
        { action: 'I grab a drink and wait for something interesting.', weight: 15 },
      ],
    },
    {
      situation: 'treasure|loot|chest|reward',
      actions: [
        { action: 'Any magic weapons in the loot?', weight: 40 },
        { action: 'I take my share and look for combat gear.', weight: 30 },
        { action: 'Dibs on any martial equipment!', weight: 30 },
      ],
    },
  ],
  conversationStyle: {
    verbosity: 'terse',
    formality: 'casual',
    inCharacter: false,
    asksClarifyingQuestions: 0.3,
    usesGameTerms: 0.8,
  },
};

/**
 * Roleplay-focused player archetype
 * Loves character development, NPC interactions, and storytelling
 */
export const ROLEPLAY_ENTHUSIAST: PlayerArchetype = {
  id: 'roleplay-enthusiast',
  name: 'The Roleplay Enthusiast',
  description: 'A player who prioritizes character immersion and story',
  profile: {
    experienceLevel: 'veteran',
    playStyle: {
      prefersRoleplay: 0.95,
      prefersCombat: 0.3,
      prefersExploration: 0.6,
      prefersPuzzles: 0.5,
    },
    humorReceptivity: 0.7,
    pacePreference: 'measured',
  },
  actionPatterns: [
    {
      situation: 'NPC|person|character|someone|stranger|bartender|merchant',
      actions: [
        { action: '*approaches slowly* "Greetings, friend. What brings you to these parts?"', weight: 25 },
        { action: 'I introduce myself and ask about their story.', weight: 25 },
        { action: '"Well met! I am [character name]. Perhaps we can help each other?"', weight: 20 },
        { action: 'I try to read their expression. What do they seem to feel?', weight: 15 },
        { action: 'I offer to buy them a drink and hear their tale.', weight: 15 },
      ],
    },
    {
      situation: 'combat|attack|enemy|fight',
      actions: [
        { action: '*sighs* "I suppose violence is unavoidable. I ready my weapon."', weight: 25 },
        { action: 'Can I try to negotiate or intimidate them first?', weight: 30 },
        { action: '"Stand down! There is no need for bloodshed!"', weight: 25 },
        { action: 'I protect my allies while looking for a peaceful solution.', weight: 20 },
      ],
    },
    {
      situation: 'emotional|sad|tragic|story|history',
      actions: [
        { action: '*listens intently* "Please, tell me more..."', weight: 30 },
        { action: 'I express sympathy and share a similar story from my past.', weight: 25 },
        { action: '"Your burden is heavy. How can we help?"', weight: 25 },
        { action: 'I make a note of this for my character journal.', weight: 20 },
      ],
    },
  ],
  conversationStyle: {
    verbosity: 'verbose',
    formality: 'normal',
    inCharacter: true,
    asksClarifyingQuestions: 0.6,
    usesGameTerms: 0.3,
  },
};

/**
 * Explorer archetype
 * Wants to discover everything, search every corner, find all secrets
 */
export const CURIOUS_EXPLORER: PlayerArchetype = {
  id: 'curious-explorer',
  name: 'The Curious Explorer',
  description: 'A player who must investigate every detail and find every secret',
  profile: {
    experienceLevel: 'veteran',
    playStyle: {
      prefersRoleplay: 0.5,
      prefersCombat: 0.3,
      prefersExploration: 0.95,
      prefersPuzzles: 0.7,
    },
    humorReceptivity: 0.6,
    pacePreference: 'measured',
  },
  actionPatterns: [
    {
      situation: 'room|chamber|area|location|place|enter',
      actions: [
        { action: 'I carefully search the entire room. What do I find?', weight: 30 },
        { action: 'I check for hidden doors or secret passages.', weight: 25 },
        { action: 'What details do I notice that seem out of place?', weight: 20 },
        { action: 'I investigate the most interesting object in the room.', weight: 15 },
        { action: 'I look up - anything on the ceiling?', weight: 10 },
      ],
    },
    {
      situation: 'path|road|corridor|tunnel|door',
      actions: [
        { action: "Which way haven't we explored yet? Let's go there.", weight: 30 },
        { action: 'I check for tracks or signs of recent passage.', weight: 25 },
        { action: 'I listen at the door before opening.', weight: 20 },
        { action: 'What does my map show? I update it with our location.', weight: 15 },
        { action: 'Any interesting markings or runes on the walls?', weight: 10 },
      ],
    },
    {
      situation: 'combat|enemy|fight',
      actions: [
        { action: 'I look for environmental advantages we can use.', weight: 30 },
        { action: 'Any escape routes or interesting terrain features?', weight: 25 },
        { action: 'I fight while scanning for anything useful nearby.', weight: 25 },
        { action: 'After combat, I thoroughly search the bodies and area.', weight: 20 },
      ],
    },
  ],
  conversationStyle: {
    verbosity: 'normal',
    formality: 'casual',
    inCharacter: false,
    asksClarifyingQuestions: 0.8,
    usesGameTerms: 0.5,
  },
};

/**
 * Puzzle solver archetype
 * Analytical, enjoys riddles and mechanical challenges
 */
export const PUZZLE_SOLVER: PlayerArchetype = {
  id: 'puzzle-solver',
  name: 'The Puzzle Solver',
  description: 'A player who relishes intellectual challenges and riddles',
  profile: {
    experienceLevel: 'veteran',
    playStyle: {
      prefersRoleplay: 0.4,
      prefersCombat: 0.2,
      prefersExploration: 0.6,
      prefersPuzzles: 0.95,
    },
    humorReceptivity: 0.5,
    pacePreference: 'measured',
  },
  actionPatterns: [
    {
      situation: 'puzzle|riddle|mechanism|lock|code|symbol',
      actions: [
        { action: 'Let me think about this... Can you describe the symbols again?', weight: 25 },
        { action: 'Is there a pattern? I examine the details carefully.', weight: 25 },
        { action: 'What clues have we found that might relate to this?', weight: 20 },
        { action: 'I try a logical sequence based on what we know.', weight: 15 },
        { action: 'Wait - what if we approach this differently...', weight: 15 },
      ],
    },
    {
      situation: 'trap|mechanism|device',
      actions: [
        { action: 'How does it work mechanically? I examine the mechanism.', weight: 30 },
        { action: 'Can I disable it? What would I need to do?', weight: 25 },
        { action: 'I look for a way to trigger it safely from a distance.', weight: 20 },
        { action: 'Is there a pattern to when it activates?', weight: 25 },
      ],
    },
    {
      situation: 'combat|enemy|fight',
      actions: [
        { action: 'What are their weaknesses? I observe their patterns.', weight: 30 },
        { action: 'Can we use the environment to our advantage?', weight: 25 },
        { action: 'I try to figure out their strategy and counter it.', weight: 25 },
        { action: 'I support the team while analyzing the situation.', weight: 20 },
      ],
    },
  ],
  conversationStyle: {
    verbosity: 'normal',
    formality: 'normal',
    inCharacter: false,
    asksClarifyingQuestions: 0.9,
    usesGameTerms: 0.4,
  },
};

/**
 * Chaos agent archetype
 * Unpredictable, creative, sometimes disruptive but fun
 */
export const CHAOS_AGENT: PlayerArchetype = {
  id: 'chaos-agent',
  name: 'The Chaos Agent',
  description: 'An unpredictable player who keeps everyone on their toes',
  profile: {
    experienceLevel: 'veteran',
    playStyle: {
      prefersRoleplay: 0.6,
      prefersCombat: 0.5,
      prefersExploration: 0.5,
      prefersPuzzles: 0.3,
    },
    humorReceptivity: 0.9,
    pacePreference: 'fast',
  },
  actionPatterns: [
    {
      situation: '.*', // Matches anything
      actions: [
        { action: 'I do the most unexpected thing possible!', weight: 15 },
        { action: "Can I seduce the [target]?", weight: 10 },
        { action: "I cast prestidigitation to make it smell like cheese.", weight: 10 },
        { action: 'I throw my weapon at it!', weight: 10 },
        { action: 'I try to befriend it instead.', weight: 15 },
        { action: 'What happens if I lick it?', weight: 10 },
        { action: 'I loudly announce our presence!', weight: 10 },
        { action: 'Can I steal that without anyone noticing?', weight: 10 },
        { action: 'I make a dramatic speech before acting.', weight: 10 },
      ],
    },
    {
      situation: 'serious|dramatic|tense|danger',
      actions: [
        { action: 'I crack a joke to lighten the mood.', weight: 30 },
        { action: "*finger guns* \"Well this is awkward.\"", weight: 25 },
        { action: 'I do something to completely derail the tension.', weight: 25 },
        { action: 'Can I solve this with interpretive dance?', weight: 20 },
      ],
    },
  ],
  conversationStyle: {
    verbosity: 'verbose',
    formality: 'casual',
    inCharacter: true,
    asksClarifyingQuestions: 0.2,
    usesGameTerms: 0.5,
  },
};

/**
 * New player archetype
 * Learning the game, asks lots of questions, needs guidance
 */
export const NEW_PLAYER: PlayerArchetype = {
  id: 'new-player',
  name: 'The New Player',
  description: 'A player learning D&D who needs patience and guidance',
  profile: {
    experienceLevel: 'new',
    playStyle: {
      prefersRoleplay: 0.5,
      prefersCombat: 0.5,
      prefersExploration: 0.5,
      prefersPuzzles: 0.5,
    },
    humorReceptivity: 0.6,
    pacePreference: 'slow',
  },
  actionPatterns: [
    {
      situation: 'combat|attack|enemy|fight',
      actions: [
        { action: 'What are my options? What can I do?', weight: 30 },
        { action: 'How do I attack? Do I just roll a d20?', weight: 25 },
        { action: 'Which die do I roll for damage?', weight: 20 },
        { action: 'I try to hit it with my sword, I guess?', weight: 15 },
        { action: "Can I run away? I don't want to die.", weight: 10 },
      ],
    },
    {
      situation: 'NPC|person|talk|speak',
      actions: [
        { action: 'Do I need to roll something to talk to them?', weight: 25 },
        { action: 'I say hello... is that okay?', weight: 25 },
        { action: 'What should I ask them?', weight: 25 },
        { action: 'I try to be friendly.', weight: 25 },
      ],
    },
    {
      situation: 'skill|check|roll|ability',
      actions: [
        { action: 'What do I add to the roll?', weight: 30 },
        { action: 'Is that good? Did I succeed?', weight: 25 },
        { action: "Where's that on my character sheet?", weight: 25 },
        { action: 'Can you help me figure out my bonus?', weight: 20 },
      ],
    },
  ],
  conversationStyle: {
    verbosity: 'normal',
    formality: 'casual',
    inCharacter: false,
    asksClarifyingQuestions: 0.95,
    usesGameTerms: 0.1,
  },
};

/**
 * All available archetypes
 */
export const ALL_ARCHETYPES: PlayerArchetype[] = [
  COMBAT_OPTIMIZER,
  ROLEPLAY_ENTHUSIAST,
  CURIOUS_EXPLORER,
  PUZZLE_SOLVER,
  CHAOS_AGENT,
  NEW_PLAYER,
];

/**
 * Get archetype by ID
 */
export function getArchetypeById(id: string): PlayerArchetype | undefined {
  return ALL_ARCHETYPES.find(a => a.id === id);
}
