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
import { createSpellcasting } from '../magic/index.js';
import { createHitDice } from './rest-mechanics.js';
import { createExperience } from '../progression/index.js';
import { getDnd5eSystem, type RaceDefinition, type ClassDefinition, type BackgroundDefinition } from '../system/index.js';

// Re-export types for backward compatibility
export type { RaceDefinition as RaceData, ClassDefinition as ClassData, BackgroundDefinition as BackgroundData };

/**
 * Get the game system singleton
 */
const getSystem = () => getDnd5eSystem();

/**
 * SRD Races - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().races instead
 */
export const SRD_RACES = new Proxy({} as Record<string, RaceDefinition>, {
  get: (_, key: string) => getSystem().races[key],
  ownKeys: () => Object.keys(getSystem().races),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getSystem().races[key as string],
  }),
});

/**
 * SRD Classes - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().classes instead
 */
export const SRD_CLASSES = new Proxy({} as Record<string, ClassDefinition>, {
  get: (_, key: string) => getSystem().classes[key],
  ownKeys: () => Object.keys(getSystem().classes),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getSystem().classes[key as string],
  }),
});

/**
 * SRD Backgrounds - delegates to GameSystem
 * @deprecated Use getDnd5eSystem().backgrounds instead
 */
export const SRD_BACKGROUNDS = new Proxy({} as Record<string, BackgroundDefinition>, {
  get: (_, key: string) => getSystem().backgrounds[key],
  ownKeys: () => Object.keys(getSystem().backgrounds),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getSystem().backgrounds[key as string],
  }),
});

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
    const system = getSystem();
    const race = system.getRace(raceKey);
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
    const system = getSystem();
    const charClass = system.getClass(classKey);
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
    const system = getSystem();
    const background = system.getBackground(backgroundKey);
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

    const system = getSystem();
    const classKey = Object.entries(system.classes).find(
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

    const system = getSystem();
    const charClass = Object.values(system.classes).find((c) => c.name === this.character.class);
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
    const classKeyEntry = Object.entries(system.classes).find(
      ([_, c]) => c.name === this.character.class
    );
    const classKey = classKeyEntry?.[0];

    const casterType = classKey ? system.magic.getCasterType(classKey) : 'none';
    const spellcasting = casterType !== 'none' && classKey
      ? createSpellcasting(
          classKey,
          this.character.level!,
          this.abilityScores,
          stats.proficiencyBonus!
        )
      : undefined;

    // Initialize hit dice based on class
    const hitDice = classKey
      ? createHitDice(classKey, this.character.level!)
      : createHitDice('fighter', this.character.level!); // Default to d10

    // Initialize experience based on level
    const experience = createExperience(this.character.level!);

    const result: CharacterSheet = {
      id: this.character.id!,
      name: this.character.name,
      race: this.character.race,
      class: this.character.class,
      level: this.character.level!,
      experience,
      background: this.character.background,
      stats,
      inventory: this.inventory,
      hitDice,
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
  const system = getSystem();
  const classData = system.getClass(charClass);
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
