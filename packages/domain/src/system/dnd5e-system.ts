/**
 * D&D 5e SRD Game System Implementation
 *
 * Loads game data from JSON config files and implements the GameSystem interface.
 */

import type { AbilityScores } from '@ai-dm/shared';
import type {
  GameSystem,
  RaceDefinition,
  ClassDefinition,
  BackgroundDefinition,
  ProgressionSystem,
  MagicSystem,
  CombatSystem,
  CasterType,
  RacesConfig,
  ClassesConfig,
  BackgroundsConfig,
  ProgressionConfig,
  SpellSlotsConfig,
  SystemConfig,
} from './game-system.js';

// ============================================================================
// Embedded Config Data (to avoid runtime file loading issues)
// These are loaded from data/systems/dnd5e/*.json at build time
// ============================================================================

// Import JSON data - these will be bundled at compile time
// For now, we'll embed the data directly to avoid file system dependencies

const RACES_DATA: RacesConfig = {
  version: '1.0.0',
  races: {
    human: {
      name: 'Human',
      abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
      size: 'Medium',
      speed: 30,
      traits: ['Extra Language'],
      languages: ['Common', 'One extra language'],
    },
    elf: {
      name: 'Elf (High)',
      abilityBonuses: { dexterity: 2, intelligence: 1 },
      size: 'Medium',
      speed: 30,
      traits: ['Darkvision', 'Fey Ancestry', 'Trance', 'Keen Senses', 'Cantrip'],
      languages: ['Common', 'Elvish'],
    },
    dwarf: {
      name: 'Dwarf (Hill)',
      abilityBonuses: { constitution: 2, wisdom: 1 },
      size: 'Medium',
      speed: 25,
      traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning', 'Dwarven Toughness'],
      languages: ['Common', 'Dwarvish'],
    },
    halfling: {
      name: 'Halfling (Lightfoot)',
      abilityBonuses: { dexterity: 2, charisma: 1 },
      size: 'Small',
      speed: 25,
      traits: ['Lucky', 'Brave', 'Halfling Nimbleness', 'Naturally Stealthy'],
      languages: ['Common', 'Halfling'],
    },
    dragonborn: {
      name: 'Dragonborn',
      abilityBonuses: { strength: 2, charisma: 1 },
      size: 'Medium',
      speed: 30,
      traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
      languages: ['Common', 'Draconic'],
    },
    gnome: {
      name: 'Gnome (Rock)',
      abilityBonuses: { intelligence: 2, constitution: 1 },
      size: 'Small',
      speed: 25,
      traits: ['Darkvision', 'Gnome Cunning', "Artificer's Lore", 'Tinker'],
      languages: ['Common', 'Gnomish'],
    },
    halfElf: {
      name: 'Half-Elf',
      abilityBonuses: { charisma: 2 },
      size: 'Medium',
      speed: 30,
      traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
      languages: ['Common', 'Elvish', 'One extra language'],
      additionalAbilityBonuses: { count: 2, amount: 1, excludes: ['charisma'] },
    },
    halfOrc: {
      name: 'Half-Orc',
      abilityBonuses: { strength: 2, constitution: 1 },
      size: 'Medium',
      speed: 30,
      traits: ['Darkvision', 'Menacing', 'Relentless Endurance', 'Savage Attacks'],
      languages: ['Common', 'Orc'],
    },
    tiefling: {
      name: 'Tiefling',
      abilityBonuses: { intelligence: 1, charisma: 2 },
      size: 'Medium',
      speed: 30,
      traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
      languages: ['Common', 'Infernal'],
    },
  },
};

const CLASSES_DATA: ClassesConfig = {
  version: '1.0.0',
  classes: {
    fighter: {
      name: 'Fighter',
      hitDie: 10,
      primaryAbility: 'strength',
      savingThrows: ['strength', 'constitution'],
      armorProficiencies: ['Light', 'Medium', 'Heavy', 'Shields'],
      weaponProficiencies: ['Simple', 'Martial'],
      skillChoices: {
        count: 2,
        options: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
      },
      features: [
        { level: 1, name: 'Fighting Style', description: 'Choose a fighting style specialization.' },
        { level: 1, name: 'Second Wind', description: 'Regain 1d10 + level HP as a bonus action (short rest).' },
        { level: 2, name: 'Action Surge', description: 'Take an additional action (short rest).' },
      ],
      startingEquipment: ['Chain mail or leather + longbow', 'Martial weapon + shield or two martial weapons', 'Light crossbow + 20 bolts or two handaxes', "Dungeoneer's pack or explorer's pack"],
    },
    rogue: {
      name: 'Rogue',
      hitDie: 8,
      primaryAbility: 'dexterity',
      savingThrows: ['dexterity', 'intelligence'],
      armorProficiencies: ['Light'],
      weaponProficiencies: ['Simple', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'],
      skillChoices: {
        count: 4,
        options: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
      },
      features: [
        { level: 1, name: 'Sneak Attack', description: '1d6 extra damage when attacking with advantage or ally nearby.' },
        { level: 1, name: "Thieves' Cant", description: 'Secret language of thieves.' },
        { level: 2, name: 'Cunning Action', description: 'Dash, Disengage, or Hide as a bonus action.' },
      ],
      startingEquipment: ['Rapier or shortsword', 'Shortbow + quiver + 20 arrows or shortsword', "Burglar's pack, dungeoneer's pack, or explorer's pack", "Leather armor, two daggers, thieves' tools"],
    },
    wizard: {
      name: 'Wizard',
      hitDie: 6,
      primaryAbility: 'intelligence',
      savingThrows: ['intelligence', 'wisdom'],
      armorProficiencies: [],
      weaponProficiencies: ['Dagger', 'Dart', 'Sling', 'Quarterstaff', 'Light crossbow'],
      skillChoices: {
        count: 2,
        options: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
      },
      features: [
        { level: 1, name: 'Spellcasting', description: 'Cast wizard spells using Intelligence.' },
        { level: 1, name: 'Arcane Recovery', description: 'Recover spell slots on a short rest.' },
      ],
      startingEquipment: ['Quarterstaff or dagger', 'Component pouch or arcane focus', "Scholar's pack or explorer's pack", 'Spellbook'],
    },
    cleric: {
      name: 'Cleric',
      hitDie: 8,
      primaryAbility: 'wisdom',
      savingThrows: ['wisdom', 'charisma'],
      armorProficiencies: ['Light', 'Medium', 'Shields'],
      weaponProficiencies: ['Simple'],
      skillChoices: {
        count: 2,
        options: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
      },
      features: [
        { level: 1, name: 'Spellcasting', description: 'Cast cleric spells using Wisdom.' },
        { level: 1, name: 'Divine Domain', description: 'Choose a domain that grants additional features.' },
      ],
      startingEquipment: ['Mace or warhammer (if proficient)', 'Scale mail, leather, or chain mail (if proficient)', 'Light crossbow + 20 bolts or simple weapon', "Priest's pack or explorer's pack", 'Shield and holy symbol'],
    },
  },
};

const BACKGROUNDS_DATA: BackgroundsConfig = {
  version: '1.0.0',
  backgrounds: {
    acolyte: {
      name: 'Acolyte',
      skillProficiencies: ['Insight', 'Religion'],
      toolProficiencies: [],
      languages: 2,
      equipment: ['Holy symbol', 'Prayer book or wheel', '5 sticks of incense', 'Vestments', 'Common clothes', '15 gp'],
      feature: { name: 'Shelter of the Faithful', description: 'You and your companions can receive free healing and care at temples of your faith.' },
      traits: ['I idolize a particular hero of my faith.', 'I can find common ground between the fiercest enemies.'],
      ideals: ['Tradition', 'Charity', 'Change', 'Power', 'Faith', 'Aspiration'],
      bonds: ['I would die to recover an ancient relic.', 'I owe my life to the priest who took me in.'],
      flaws: ['I judge others harshly.', 'I put too much trust in those who wield power within my temple.'],
    },
    criminal: {
      name: 'Criminal',
      skillProficiencies: ['Deception', 'Stealth'],
      toolProficiencies: ['One type of gaming set', "Thieves' tools"],
      languages: 0,
      equipment: ['Crowbar', 'Dark common clothes with hood', '15 gp'],
      feature: { name: 'Criminal Contact', description: 'You have a reliable contact in the criminal underworld.' },
      traits: ['I always have a plan for when things go wrong.', 'I am incredibly slow to trust.'],
      ideals: ['Honor', 'Freedom', 'Charity', 'Greed', 'People', 'Redemption'],
      bonds: ["I'm trying to pay off an old debt.", 'Someone I loved died because of a mistake I made.'],
      flaws: ["When I see something valuable, I can't think about anything but how to steal it.", 'I turn tail and run when things look bad.'],
    },
    folkHero: {
      name: 'Folk Hero',
      skillProficiencies: ['Animal Handling', 'Survival'],
      toolProficiencies: ["One type of artisan's tools", 'Vehicles (land)'],
      languages: 0,
      equipment: ["Artisan's tools", 'Shovel', 'Iron pot', 'Common clothes', '10 gp'],
      feature: { name: 'Rustic Hospitality', description: 'Common folk will shelter you from the law (but not danger).' },
      traits: ['I judge people by their actions, not words.', "If someone is in trouble, I'm always ready to help."],
      ideals: ['Respect', 'Fairness', 'Freedom', 'Might', 'Sincerity', 'Destiny'],
      bonds: ['I have a family, but I have no idea where they are.', 'I protect those who cannot protect themselves.'],
      flaws: ['I have a weakness for the vices of the city.', 'Secretly, I believe things would be better if I were a tyrant.'],
    },
    noble: {
      name: 'Noble',
      skillProficiencies: ['History', 'Persuasion'],
      toolProficiencies: ['One type of gaming set'],
      languages: 1,
      equipment: ['Fine clothes', 'Signet ring', 'Scroll of pedigree', '25 gp'],
      feature: { name: 'Position of Privilege', description: 'People assume you have the right to be wherever you are. Common folk accommodate you.' },
      traits: ['My eloquent flattery makes everyone I talk to feel important.', 'Despite my noble birth, I do not place myself above other folk.'],
      ideals: ['Respect', 'Responsibility', 'Independence', 'Power', 'Family', 'Noble Obligation'],
      bonds: ['I will face any challenge to win the approval of my family.', "My house's alliance with another noble family must be sustained."],
      flaws: ['I secretly believe everyone is beneath me.', 'I hide a truly scandalous secret.'],
    },
    soldier: {
      name: 'Soldier',
      skillProficiencies: ['Athletics', 'Intimidation'],
      toolProficiencies: ['One type of gaming set', 'Vehicles (land)'],
      languages: 0,
      equipment: ['Insignia of rank', 'Trophy from fallen enemy', 'Bone dice or deck of cards', 'Common clothes', '10 gp'],
      feature: { name: 'Military Rank', description: 'Soldiers loyal to your former military organization recognize your authority.' },
      traits: ["I'm always polite and respectful.", 'I can stare down a hell hound without flinching.'],
      ideals: ['Greater Good', 'Responsibility', 'Independence', 'Might', 'Live and Let Live', 'Nation'],
      bonds: ['I would still lay down my life for the people I served with.', 'Someone saved my life on the battlefield.'],
      flaws: ['I made a terrible mistake in battle that cost many lives.', 'My hatred of my enemies is blind and unreasoning.'],
    },
  },
};

const PROGRESSION_DATA: ProgressionConfig = {
  version: '1.0.0',
  maxLevel: 20,
  xpThresholds: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000],
  proficiencyByLevel: [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6],
  crXpRewards: {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100,
    '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400,
    '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
    '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
    '29': 135000, '30': 155000,
  },
  standardArray: [15, 14, 13, 12, 10, 8],
};

const SPELL_SLOTS_DATA: SpellSlotsConfig = {
  version: '1.0.0',
  spellLevels: 9,
  fullCasterSlots: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ],
  halfCasterSlots: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
  ],
  casterTypes: {
    wizard: 'full', cleric: 'full', druid: 'full', bard: 'full', sorcerer: 'full', warlock: 'full',
    paladin: 'half', ranger: 'half', fighter: 'none', rogue: 'none', barbarian: 'none', monk: 'none',
  },
  spellcastingAbility: {
    wizard: 'intelligence', cleric: 'wisdom', druid: 'wisdom', bard: 'charisma',
    sorcerer: 'charisma', warlock: 'charisma', paladin: 'charisma', ranger: 'wisdom',
  },
  cantripsKnown: {
    wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
};

// ============================================================================
// Progression System Implementation
// ============================================================================

class Dnd5eProgressionSystem implements ProgressionSystem {
  readonly maxLevel: number;
  readonly xpThresholds: number[];
  readonly proficiencyByLevel: number[];
  readonly crXpRewards: Record<string, number>;
  readonly standardArray: number[];

  constructor(config: ProgressionConfig) {
    this.maxLevel = config.maxLevel;
    this.xpThresholds = config.xpThresholds;
    this.proficiencyByLevel = config.proficiencyByLevel;
    this.crXpRewards = config.crXpRewards;
    this.standardArray = config.standardArray;
  }

  getXPThreshold(level: number): number {
    if (level < 1 || level > this.maxLevel) return 0;
    return this.xpThresholds[level - 1] ?? 0;
  }

  getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= this.maxLevel) return Infinity;
    return this.xpThresholds[currentLevel] ?? Infinity;
  }

  getProficiencyBonus(level: number): number {
    if (level < 1) return 2;
    if (level > this.maxLevel) return 6;
    return this.proficiencyByLevel[level - 1] ?? 2;
  }

  getXPForCR(cr: string | number): number {
    return this.crXpRewards[String(cr)] ?? 0;
  }
}

// ============================================================================
// Magic System Implementation
// ============================================================================

class Dnd5eMagicSystem implements MagicSystem {
  readonly spellLevels: number;
  readonly fullCasterSlots: number[][];
  readonly halfCasterSlots: number[][];
  readonly casterTypes: Record<string, CasterType>;
  readonly spellcastingAbility: Record<string, keyof AbilityScores>;
  readonly cantripsKnown: Record<string, number[]>;

  constructor(config: SpellSlotsConfig) {
    this.spellLevels = config.spellLevels;
    this.fullCasterSlots = config.fullCasterSlots;
    this.halfCasterSlots = config.halfCasterSlots;
    this.casterTypes = config.casterTypes;
    this.spellcastingAbility = config.spellcastingAbility;
    this.cantripsKnown = config.cantripsKnown;
  }

  getSpellSlots(className: string, level: number): number[] {
    const casterType = this.getCasterType(className);
    if (casterType === 'none' || level < 1) {
      return [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    const clampedLevel = Math.min(level, 20);
    const progression = casterType === 'full' ? this.fullCasterSlots : this.halfCasterSlots;
    return progression[clampedLevel - 1] ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  getCasterType(className: string): CasterType {
    return this.casterTypes[className.toLowerCase()] ?? 'none';
  }

  getSpellcastingAbility(className: string): keyof AbilityScores | undefined {
    return this.spellcastingAbility[className.toLowerCase()];
  }
}

// ============================================================================
// Combat System Implementation
// ============================================================================

class Dnd5eCombatSystem implements CombatSystem {
  readonly damageTypes: string[] = [
    'bludgeoning', 'piercing', 'slashing', 'fire', 'cold', 'lightning', 'thunder',
    'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic',
  ];

  readonly conditions: string[] = [
    'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
    'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
    'restrained', 'stunned', 'unconscious',
  ];

  readonly diceTypes: number[] = [4, 6, 8, 10, 12, 20, 100];

  calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  calculateSpellSaveDC(abilityScore: number, proficiencyBonus: number): number {
    return 8 + proficiencyBonus + this.calculateAbilityModifier(abilityScore);
  }

  calculateSpellAttackBonus(abilityScore: number, proficiencyBonus: number): number {
    return proficiencyBonus + this.calculateAbilityModifier(abilityScore);
  }
}

// ============================================================================
// D&D 5e Game System
// ============================================================================

/**
 * D&D 5e SRD Game System Implementation
 */
export class Dnd5eGameSystem implements GameSystem {
  readonly id = 'dnd5e';
  readonly name = 'Dungeons & Dragons 5th Edition';
  readonly version = '1.0.0';
  readonly description = 'D&D 5e System Reference Document (SRD) implementation';

  readonly races: Record<string, RaceDefinition>;
  readonly classes: Record<string, ClassDefinition>;
  readonly backgrounds: Record<string, BackgroundDefinition>;

  readonly progression: ProgressionSystem;
  readonly magic: MagicSystem;
  readonly combat: CombatSystem;

  constructor() {
    this.races = RACES_DATA.races;
    this.classes = CLASSES_DATA.classes;
    this.backgrounds = BACKGROUNDS_DATA.backgrounds;

    this.progression = new Dnd5eProgressionSystem(PROGRESSION_DATA);
    this.magic = new Dnd5eMagicSystem(SPELL_SLOTS_DATA);
    this.combat = new Dnd5eCombatSystem();
  }

  calculateAbilityModifier(score: number): number {
    return this.combat.calculateAbilityModifier(score);
  }

  calculateProficiencyBonus(level: number): number {
    return this.progression.getProficiencyBonus(level);
  }

  getRace(raceKey: string): RaceDefinition | undefined {
    return this.races[raceKey];
  }

  getClass(classKey: string): ClassDefinition | undefined {
    return this.classes[classKey];
  }

  getBackground(backgroundKey: string): BackgroundDefinition | undefined {
    return this.backgrounds[backgroundKey];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let _dnd5eSystem: Dnd5eGameSystem | null = null;

/**
 * Get the singleton D&D 5e game system instance
 */
export function getDnd5eSystem(): Dnd5eGameSystem {
  if (!_dnd5eSystem) {
    _dnd5eSystem = new Dnd5eGameSystem();
  }
  return _dnd5eSystem;
}

/**
 * Create a new D&D 5e game system instance (for testing)
 */
export function createDnd5eSystem(): Dnd5eGameSystem {
  return new Dnd5eGameSystem();
}
