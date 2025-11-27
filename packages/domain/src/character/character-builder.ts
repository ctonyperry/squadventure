import type {
  CharacterSheet,
  EntityId,
  AbilityScores,
  CreatureStats,
  CharacterInventory,
  ItemEntity,
} from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';
import {
  createEmptyInventory,
  createItem,
  getClassStartingEquipment,
  getClassStartingGold,
  type ItemTemplate,
} from '../inventory/index.js';
import { createSpellcasting, CLASS_CASTER_TYPE } from '../magic/index.js';

/**
 * D&D 5e Race data
 */
export interface RaceData {
  name: string;
  abilityBonuses: Partial<AbilityScores>;
  size: 'Small' | 'Medium';
  speed: number;
  traits: string[];
  languages: string[];
}

/**
 * D&D 5e Class data
 */
export interface ClassData {
  name: string;
  hitDie: number;
  primaryAbility: keyof AbilityScores;
  savingThrows: (keyof AbilityScores)[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  skillChoices: { count: number; options: string[] };
  features: { level: number; name: string; description: string }[];
  startingEquipment: string[];
}

/**
 * D&D 5e Background data
 */
export interface BackgroundData {
  name: string;
  skillProficiencies: string[];
  toolProficiencies: string[];
  languages: number;
  equipment: string[];
  feature: { name: string; description: string };
  traits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
}

/**
 * SRD Races
 */
export const SRD_RACES: Record<string, RaceData> = {
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
    traits: ['Darkvision', 'Gnome Cunning', 'Artificer\'s Lore', 'Tinker'],
    languages: ['Common', 'Gnomish'],
  },
  halfElf: {
    name: 'Half-Elf',
    abilityBonuses: { charisma: 2 }, // +1 to two others (choice)
    size: 'Medium',
    speed: 30,
    traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
    languages: ['Common', 'Elvish', 'One extra language'],
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
};

/**
 * SRD Classes
 */
export const SRD_CLASSES: Record<string, ClassData> = {
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
    startingEquipment: ['Chain mail or leather + longbow', 'Martial weapon + shield or two martial weapons', 'Light crossbow + 20 bolts or two handaxes', 'Dungeoneer\'s pack or explorer\'s pack'],
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
      { level: 1, name: 'Thieves\' Cant', description: 'Secret language of thieves.' },
      { level: 2, name: 'Cunning Action', description: 'Dash, Disengage, or Hide as a bonus action.' },
    ],
    startingEquipment: ['Rapier or shortsword', 'Shortbow + quiver + 20 arrows or shortsword', 'Burglar\'s pack, dungeoneer\'s pack, or explorer\'s pack', 'Leather armor, two daggers, thieves\' tools'],
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
    startingEquipment: ['Quarterstaff or dagger', 'Component pouch or arcane focus', 'Scholar\'s pack or explorer\'s pack', 'Spellbook'],
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
    startingEquipment: ['Mace or warhammer (if proficient)', 'Scale mail, leather, or chain mail (if proficient)', 'Light crossbow + 20 bolts or simple weapon', 'Priest\'s pack or explorer\'s pack', 'Shield and holy symbol'],
  },
};

/**
 * SRD Backgrounds
 */
export const SRD_BACKGROUNDS: Record<string, BackgroundData> = {
  acolyte: {
    name: 'Acolyte',
    skillProficiencies: ['Insight', 'Religion'],
    toolProficiencies: [],
    languages: 2,
    equipment: ['Holy symbol', 'Prayer book or wheel', '5 sticks of incense', 'Vestments', 'Common clothes', '15 gp'],
    feature: {
      name: 'Shelter of the Faithful',
      description: 'You and your companions can receive free healing and care at temples of your faith.',
    },
    traits: ['I idolize a particular hero of my faith.', 'I can find common ground between the fiercest enemies.'],
    ideals: ['Tradition', 'Charity', 'Change', 'Power', 'Faith', 'Aspiration'],
    bonds: ['I would die to recover an ancient relic.', 'I owe my life to the priest who took me in.'],
    flaws: ['I judge others harshly.', 'I put too much trust in those who wield power within my temple.'],
  },
  criminal: {
    name: 'Criminal',
    skillProficiencies: ['Deception', 'Stealth'],
    toolProficiencies: ['One type of gaming set', 'Thieves\' tools'],
    languages: 0,
    equipment: ['Crowbar', 'Dark common clothes with hood', '15 gp'],
    feature: {
      name: 'Criminal Contact',
      description: 'You have a reliable contact in the criminal underworld.',
    },
    traits: ['I always have a plan for when things go wrong.', 'I am incredibly slow to trust.'],
    ideals: ['Honor', 'Freedom', 'Charity', 'Greed', 'People', 'Redemption'],
    bonds: ['I\'m trying to pay off an old debt.', 'Someone I loved died because of a mistake I made.'],
    flaws: ['When I see something valuable, I can\'t think about anything but how to steal it.', 'I turn tail and run when things look bad.'],
  },
  folkHero: {
    name: 'Folk Hero',
    skillProficiencies: ['Animal Handling', 'Survival'],
    toolProficiencies: ['One type of artisan\'s tools', 'Vehicles (land)'],
    languages: 0,
    equipment: ['Artisan\'s tools', 'Shovel', 'Iron pot', 'Common clothes', '10 gp'],
    feature: {
      name: 'Rustic Hospitality',
      description: 'Common folk will shelter you from the law (but not danger).',
    },
    traits: ['I judge people by their actions, not words.', 'If someone is in trouble, I\'m always ready to help.'],
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
    feature: {
      name: 'Position of Privilege',
      description: 'People assume you have the right to be wherever you are. Common folk accommodate you.',
    },
    traits: ['My eloquent flattery makes everyone I talk to feel important.', 'Despite my noble birth, I do not place myself above other folk.'],
    ideals: ['Respect', 'Responsibility', 'Independence', 'Power', 'Family', 'Noble Obligation'],
    bonds: ['I will face any challenge to win the approval of my family.', 'My house\'s alliance with another noble family must be sustained.'],
    flaws: ['I secretly believe everyone is beneath me.', 'I hide a truly scandalous secret.'],
  },
  soldier: {
    name: 'Soldier',
    skillProficiencies: ['Athletics', 'Intimidation'],
    toolProficiencies: ['One type of gaming set', 'Vehicles (land)'],
    languages: 0,
    equipment: ['Insignia of rank', 'Trophy from fallen enemy', 'Bone dice or deck of cards', 'Common clothes', '10 gp'],
    feature: {
      name: 'Military Rank',
      description: 'Soldiers loyal to your former military organization recognize your authority.',
    },
    traits: ['I\'m always polite and respectful.', 'I can stare down a hell hound without flinching.'],
    ideals: ['Greater Good', 'Responsibility', 'Independence', 'Might', 'Live and Let Live', 'Nation'],
    bonds: ['I would still lay down my life for the people I served with.', 'Someone saved my life on the battlefield.'],
    flaws: ['I made a terrible mistake in battle that cost many lives.', 'My hatred of my enemies is blind and unreasoning.'],
  },
};

/**
 * Result of building a character - includes created items for world state
 */
export interface CharacterBuildResult {
  character: CharacterSheet;
  createdItems: ItemEntity[];
}

/**
 * Character builder class
 */
export class CharacterBuilder {
  private character: Partial<CharacterSheet> = {};
  private abilityScores: AbilityScores = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };
  private createdItems: ItemEntity[] = [];
  private inventory: CharacterInventory;

  constructor(name: string) {
    this.character.name = name;
    this.character.id = createEntityId(`char_${Date.now()}`);
    this.character.level = 1;
    this.character.features = [];
    this.character.proficiencies = {
      armor: [],
      weapons: [],
      tools: [],
      languages: [],
    };
    this.inventory = createEmptyInventory(10); // Default STR 10
  }

  /**
   * Set race
   */
  setRace(raceKey: string): this {
    const race = SRD_RACES[raceKey];
    if (!race) throw new Error(`Unknown race: ${raceKey}`);

    this.character.race = race.name;

    // Apply ability bonuses
    for (const [ability, bonus] of Object.entries(race.abilityBonuses)) {
      const key = ability as keyof AbilityScores;
      this.abilityScores[key] += bonus;
    }

    // Add traits and languages
    this.character.features = [...(this.character.features ?? []), ...race.traits];
    this.character.proficiencies!.languages.push(...race.languages);

    return this;
  }

  /**
   * Set class
   */
  setClass(classKey: string): this {
    const charClass = SRD_CLASSES[classKey];
    if (!charClass) throw new Error(`Unknown class: ${classKey}`);

    this.character.class = charClass.name;

    // Add proficiencies
    this.character.proficiencies!.armor.push(...charClass.armorProficiencies);
    this.character.proficiencies!.weapons.push(...charClass.weaponProficiencies);

    // Add level 1 features
    const level1Features = charClass.features
      .filter((f) => f.level === 1)
      .map((f) => `${f.name}: ${f.description}`);
    this.character.features = [...(this.character.features ?? []), ...level1Features];

    return this;
  }

  /**
   * Set background
   */
  setBackground(backgroundKey: string): this {
    const background = SRD_BACKGROUNDS[backgroundKey];
    if (!background) throw new Error(`Unknown background: ${backgroundKey}`);

    this.character.background = background.name;
    this.character.proficiencies!.tools.push(...background.toolProficiencies);

    // Add background feature
    this.character.features = [
      ...(this.character.features ?? []),
      `${background.feature.name}: ${background.feature.description}`,
    ];

    return this;
  }

  /**
   * Set ability scores using standard array
   */
  setAbilityScoresStandardArray(assignment: Record<keyof AbilityScores, number>): this {
    const standardArray = [15, 14, 13, 12, 10, 8];
    const values = Object.values(assignment);

    // Verify valid standard array usage
    const sortedValues = [...values].sort((a, b) => b - a);
    const sortedStandard = [...standardArray].sort((a, b) => b - a);

    if (JSON.stringify(sortedValues) !== JSON.stringify(sortedStandard)) {
      throw new Error('Invalid standard array assignment');
    }

    for (const [ability, value] of Object.entries(assignment)) {
      const key = ability as keyof AbilityScores;
      // Add to existing (which may have racial bonuses)
      this.abilityScores[key] = value + (this.abilityScores[key] - 10);
    }

    return this;
  }

  /**
   * Set ability scores directly
   */
  setAbilityScores(scores: AbilityScores): this {
    this.abilityScores = { ...scores };
    return this;
  }

  /**
   * Add starting equipment for the character's class
   */
  addClassStartingEquipment(): this {
    if (!this.character.class) {
      throw new Error('Class must be set before adding starting equipment');
    }

    const classKey = Object.entries(SRD_CLASSES).find(
      ([_, c]) => c.name === this.character.class
    )?.[0];

    if (!classKey) return this;

    const equipment = getClassStartingEquipment(classKey);
    const startingGold = getClassStartingGold(classKey);

    // Create items and add to inventory
    for (const template of equipment) {
      const item = createItem(template);
      this.createdItems.push(item);

      // Auto-equip weapons and armor
      if (item.itemType === 'weapon' && !this.inventory.equipped.mainHand) {
        this.inventory.equipped.mainHand = item.id;
      } else if (item.itemType === 'armor') {
        if (item.armorDetails?.armorType === 'shield' && !this.inventory.equipped.offHand) {
          this.inventory.equipped.offHand = item.id;
        } else if (!this.inventory.equipped.armor) {
          this.inventory.equipped.armor = item.id;
        } else {
          this.inventory.backpack.push(item.id);
        }
      } else {
        this.inventory.backpack.push(item.id);
      }
    }

    // Add starting gold
    this.inventory.currency.gold = startingGold;

    return this;
  }

  /**
   * Add a specific item to the character
   */
  addItem(template: ItemTemplate, equip = false): this {
    const item = createItem(template);
    this.createdItems.push(item);

    if (equip) {
      if (item.itemType === 'weapon') {
        this.inventory.equipped.mainHand = item.id;
      } else if (item.itemType === 'armor') {
        if (item.armorDetails?.armorType === 'shield') {
          this.inventory.equipped.offHand = item.id;
        } else {
          this.inventory.equipped.armor = item.id;
        }
      }
    } else {
      this.inventory.backpack.push(item.id);
    }

    return this;
  }

  /**
   * Add currency to the character
   */
  addGold(amount: number): this {
    this.inventory.currency.gold += amount;
    return this;
  }

  /**
   * Build the final character sheet
   */
  build(): CharacterSheet {
    if (!this.character.name) throw new Error('Character name required');
    if (!this.character.race) throw new Error('Race required');
    if (!this.character.class) throw new Error('Class required');
    if (!this.character.background) throw new Error('Background required');

    const charClass = Object.values(SRD_CLASSES).find((c) => c.name === this.character.class);
    const hitDie = charClass?.hitDie ?? 8;
    const conMod = this.getModifier(this.abilityScores.constitution);
    const dexMod = this.getModifier(this.abilityScores.dexterity);

    // Calculate AC from equipped armor
    let armorClass = 10 + dexMod; // Unarmored default
    const equippedArmorId = this.inventory.equipped.armor;
    const equippedShieldId = this.inventory.equipped.offHand;

    if (equippedArmorId) {
      const armor = this.createdItems.find((i) => i.id === equippedArmorId);
      if (armor?.armorDetails) {
        const details = armor.armorDetails;
        armorClass = details.baseAC;
        if (details.armorType === 'light') {
          armorClass += dexMod;
        } else if (details.armorType === 'medium') {
          armorClass += Math.min(dexMod, details.maxDexBonus ?? 2);
        }
      }
    }

    if (equippedShieldId) {
      const shield = this.createdItems.find((i) => i.id === equippedShieldId);
      if (shield?.armorDetails?.armorType === 'shield') {
        armorClass += shield.armorDetails.baseAC;
      }
    }

    // Update carrying capacity based on strength
    this.inventory.carryingCapacity = this.abilityScores.strength * 15;

    const stats: CreatureStats = {
      abilityScores: this.abilityScores,
      armorClass,
      hitPoints: {
        current: hitDie + conMod,
        max: hitDie + conMod,
      },
      speed: 30,
      proficiencyBonus: 2,
    };

    // Initialize spellcasting for caster classes
    const classKeyEntry = Object.entries(SRD_CLASSES).find(
      ([_, c]) => c.name === this.character.class
    );
    const classKey = classKeyEntry?.[0];

    const casterType = classKey ? CLASS_CASTER_TYPE[classKey] : undefined;
    const spellcasting = casterType && casterType !== 'none' && classKey
      ? createSpellcasting(
          classKey,
          this.character.level!,
          this.abilityScores,
          stats.proficiencyBonus!
        )
      : undefined;

    const result: CharacterSheet = {
      id: this.character.id!,
      name: this.character.name,
      race: this.character.race,
      class: this.character.class,
      level: this.character.level!,
      background: this.character.background,
      stats,
      inventory: this.inventory,
      features: this.character.features!,
      proficiencies: this.character.proficiencies!,
    };

    // Only add spellcasting if the character is a caster (exactOptionalPropertyTypes)
    if (spellcasting) {
      result.spellcasting = spellcasting;
    }

    return result;
  }

  /**
   * Build and return both character and created items
   */
  buildWithItems(): CharacterBuildResult {
    return {
      character: this.build(),
      createdItems: this.createdItems,
    };
  }

  private getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
}

/**
 * Quick character creation with defaults
 */
export function createQuickCharacter(
  name: string,
  race: string,
  charClass: string,
  background: string
): CharacterSheet {
  const result = createQuickCharacterWithItems(name, race, charClass, background);
  return result.character;
}

/**
 * Quick character creation with defaults, returning items too
 */
export function createQuickCharacterWithItems(
  name: string,
  race: string,
  charClass: string,
  background: string
): CharacterBuildResult {
  const classData = SRD_CLASSES[charClass];
  if (!classData) throw new Error(`Unknown class: ${charClass}`);

  // Assign standard array based on class primary ability
  const primary = classData.primaryAbility;
  const standardAssignment: Record<keyof AbilityScores, number> = {
    strength: 10,
    dexterity: 10,
    constitution: 13,
    intelligence: 10,
    wisdom: 10,
    charisma: 8,
  };

  // Put 15 in primary, 14 in secondary
  standardAssignment[primary] = 15;
  if (primary !== 'constitution') {
    standardAssignment.constitution = 14;
  } else {
    standardAssignment.dexterity = 14;
  }

  // Distribute remaining: 13, 12, 10, 8
  const remaining = [12, 10, 8];
  let idx = 0;
  for (const ability of Object.keys(standardAssignment) as (keyof AbilityScores)[]) {
    if (standardAssignment[ability] === 10 && ability !== primary) {
      standardAssignment[ability] = remaining[idx]!;
      idx++;
      if (idx >= remaining.length) break;
    }
  }

  return new CharacterBuilder(name)
    .setRace(race)
    .setClass(charClass)
    .setBackground(background)
    .setAbilityScoresStandardArray(standardAssignment)
    .addClassStartingEquipment()
    .buildWithItems();
}
