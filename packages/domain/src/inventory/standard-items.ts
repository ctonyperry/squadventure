/**
 * Standard D&D 5e SRD Items
 */

import type {
  ItemEntity,
  WeaponDetails,
  ArmorDetails,
  ConsumableDetails,
  EntityId,
} from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';

/**
 * Item template without ID (ID is generated on creation)
 */
export type ItemTemplate = Omit<ItemEntity, 'id'>;

/**
 * Create an item entity from a template
 */
export function createItem(template: ItemTemplate, id?: string): ItemEntity {
  return {
    ...template,
    id: createEntityId(id ?? `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
  };
}

// ============================================================================
// WEAPONS - Simple Melee
// ============================================================================

export const SIMPLE_MELEE_WEAPONS: Record<string, ItemTemplate> = {
  club: {
    type: 'item',
    itemType: 'weapon',
    name: 'Club',
    description: { text: 'A simple wooden club.' },
    value: 0.1, // 1 sp
    weight: 2,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d4',
      damageType: 'bludgeoning',
      properties: ['light'],
    },
  },
  dagger: {
    type: 'item',
    itemType: 'weapon',
    name: 'Dagger',
    description: { text: 'A small blade useful for close combat or throwing.' },
    value: 2,
    weight: 1,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d4',
      damageType: 'piercing',
      properties: ['finesse', 'light', 'thrown'],
      range: { normal: 20, long: 60 },
    },
  },
  greatclub: {
    type: 'item',
    itemType: 'weapon',
    name: 'Greatclub',
    description: { text: 'A large, heavy wooden club.' },
    value: 0.2,
    weight: 10,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d8',
      damageType: 'bludgeoning',
      properties: ['two-handed'],
    },
  },
  handaxe: {
    type: 'item',
    itemType: 'weapon',
    name: 'Handaxe',
    description: { text: 'A small axe that can be thrown.' },
    value: 5,
    weight: 2,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'slashing',
      properties: ['light', 'thrown'],
      range: { normal: 20, long: 60 },
    },
  },
  javelin: {
    type: 'item',
    itemType: 'weapon',
    name: 'Javelin',
    description: { text: 'A light spear designed for throwing.' },
    value: 0.5,
    weight: 2,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'piercing',
      properties: ['thrown'],
      range: { normal: 30, long: 120 },
    },
  },
  mace: {
    type: 'item',
    itemType: 'weapon',
    name: 'Mace',
    description: { text: 'A metal head mounted on a wooden shaft.' },
    value: 5,
    weight: 4,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'bludgeoning',
      properties: [],
    },
  },
  quarterstaff: {
    type: 'item',
    itemType: 'weapon',
    name: 'Quarterstaff',
    description: { text: 'A versatile wooden staff.' },
    value: 0.2,
    weight: 4,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'bludgeoning',
      properties: ['versatile'],
      versatileDice: '1d8',
    },
  },
  spear: {
    type: 'item',
    itemType: 'weapon',
    name: 'Spear',
    description: { text: 'A pointed shaft for thrusting or throwing.' },
    value: 1,
    weight: 3,
    weaponDetails: {
      category: 'simple',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'piercing',
      properties: ['thrown', 'versatile'],
      range: { normal: 20, long: 60 },
      versatileDice: '1d8',
    },
  },
};

// ============================================================================
// WEAPONS - Simple Ranged
// ============================================================================

export const SIMPLE_RANGED_WEAPONS: Record<string, ItemTemplate> = {
  lightCrossbow: {
    type: 'item',
    itemType: 'weapon',
    name: 'Light Crossbow',
    description: { text: 'A small crossbow that fires bolts.' },
    value: 25,
    weight: 5,
    weaponDetails: {
      category: 'simple',
      weaponType: 'ranged',
      damageDice: '1d8',
      damageType: 'piercing',
      properties: ['ammunition', 'loading', 'two-handed'],
      range: { normal: 80, long: 320 },
    },
  },
  shortbow: {
    type: 'item',
    itemType: 'weapon',
    name: 'Shortbow',
    description: { text: 'A small bow favored by scouts and hunters.' },
    value: 25,
    weight: 2,
    weaponDetails: {
      category: 'simple',
      weaponType: 'ranged',
      damageDice: '1d6',
      damageType: 'piercing',
      properties: ['ammunition', 'two-handed'],
      range: { normal: 80, long: 320 },
    },
  },
};

// ============================================================================
// WEAPONS - Martial Melee
// ============================================================================

export const MARTIAL_MELEE_WEAPONS: Record<string, ItemTemplate> = {
  battleaxe: {
    type: 'item',
    itemType: 'weapon',
    name: 'Battleaxe',
    description: { text: 'A heavy axe designed for combat.' },
    value: 10,
    weight: 4,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '1d8',
      damageType: 'slashing',
      properties: ['versatile'],
      versatileDice: '1d10',
    },
  },
  greatsword: {
    type: 'item',
    itemType: 'weapon',
    name: 'Greatsword',
    description: { text: 'A massive two-handed blade.' },
    value: 50,
    weight: 6,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '2d6',
      damageType: 'slashing',
      properties: ['heavy', 'two-handed'],
    },
  },
  longsword: {
    type: 'item',
    itemType: 'weapon',
    name: 'Longsword',
    description: { text: 'A versatile one-handed sword.' },
    value: 15,
    weight: 3,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '1d8',
      damageType: 'slashing',
      properties: ['versatile'],
      versatileDice: '1d10',
    },
  },
  rapier: {
    type: 'item',
    itemType: 'weapon',
    name: 'Rapier',
    description: { text: 'A thin, sharp blade perfect for precise strikes.' },
    value: 25,
    weight: 2,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '1d8',
      damageType: 'piercing',
      properties: ['finesse'],
    },
  },
  scimitar: {
    type: 'item',
    itemType: 'weapon',
    name: 'Scimitar',
    description: { text: 'A curved blade designed for slashing.' },
    value: 25,
    weight: 3,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'slashing',
      properties: ['finesse', 'light'],
    },
  },
  shortsword: {
    type: 'item',
    itemType: 'weapon',
    name: 'Shortsword',
    description: { text: 'A short blade favored by rogues.' },
    value: 10,
    weight: 2,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '1d6',
      damageType: 'piercing',
      properties: ['finesse', 'light'],
    },
  },
  warhammer: {
    type: 'item',
    itemType: 'weapon',
    name: 'Warhammer',
    description: { text: 'A hammer designed for breaking armor.' },
    value: 15,
    weight: 2,
    weaponDetails: {
      category: 'martial',
      weaponType: 'melee',
      damageDice: '1d8',
      damageType: 'bludgeoning',
      properties: ['versatile'],
      versatileDice: '1d10',
    },
  },
};

// ============================================================================
// WEAPONS - Martial Ranged
// ============================================================================

export const MARTIAL_RANGED_WEAPONS: Record<string, ItemTemplate> = {
  longbow: {
    type: 'item',
    itemType: 'weapon',
    name: 'Longbow',
    description: { text: 'A tall bow with excellent range.' },
    value: 50,
    weight: 2,
    weaponDetails: {
      category: 'martial',
      weaponType: 'ranged',
      damageDice: '1d8',
      damageType: 'piercing',
      properties: ['ammunition', 'heavy', 'two-handed'],
      range: { normal: 150, long: 600 },
    },
  },
  heavyCrossbow: {
    type: 'item',
    itemType: 'weapon',
    name: 'Heavy Crossbow',
    description: { text: 'A powerful crossbow requiring two hands to reload.' },
    value: 50,
    weight: 18,
    weaponDetails: {
      category: 'martial',
      weaponType: 'ranged',
      damageDice: '1d10',
      damageType: 'piercing',
      properties: ['ammunition', 'heavy', 'loading', 'two-handed'],
      range: { normal: 100, long: 400 },
    },
  },
  handCrossbow: {
    type: 'item',
    itemType: 'weapon',
    name: 'Hand Crossbow',
    description: { text: 'A small crossbow that can be fired with one hand.' },
    value: 75,
    weight: 3,
    weaponDetails: {
      category: 'martial',
      weaponType: 'ranged',
      damageDice: '1d6',
      damageType: 'piercing',
      properties: ['ammunition', 'light', 'loading'],
      range: { normal: 30, long: 120 },
    },
  },
};

// ============================================================================
// ARMOR
// ============================================================================

export const ARMOR: Record<string, ItemTemplate> = {
  // Light Armor
  padded: {
    type: 'item',
    itemType: 'armor',
    name: 'Padded Armor',
    description: { text: 'Quilted layers of cloth and batting.' },
    value: 5,
    weight: 8,
    armorDetails: {
      armorType: 'light',
      baseAC: 11,
      stealthDisadvantage: true,
    },
  },
  leather: {
    type: 'item',
    itemType: 'armor',
    name: 'Leather Armor',
    description: { text: 'Breastplate and shoulder protectors made of stiffened leather.' },
    value: 10,
    weight: 10,
    armorDetails: {
      armorType: 'light',
      baseAC: 11,
    },
  },
  studdedLeather: {
    type: 'item',
    itemType: 'armor',
    name: 'Studded Leather',
    description: { text: 'Leather armor reinforced with metal rivets.' },
    value: 45,
    weight: 13,
    armorDetails: {
      armorType: 'light',
      baseAC: 12,
    },
  },

  // Medium Armor
  hide: {
    type: 'item',
    itemType: 'armor',
    name: 'Hide Armor',
    description: { text: 'Crude armor made of thick furs and pelts.' },
    value: 10,
    weight: 12,
    armorDetails: {
      armorType: 'medium',
      baseAC: 12,
      maxDexBonus: 2,
    },
  },
  chainShirt: {
    type: 'item',
    itemType: 'armor',
    name: 'Chain Shirt',
    description: { text: 'A shirt of interlocking metal rings worn between cloth.' },
    value: 50,
    weight: 20,
    armorDetails: {
      armorType: 'medium',
      baseAC: 13,
      maxDexBonus: 2,
    },
  },
  scaleMail: {
    type: 'item',
    itemType: 'armor',
    name: 'Scale Mail',
    description: { text: 'A coat and leggings covered with overlapping metal scales.' },
    value: 50,
    weight: 45,
    armorDetails: {
      armorType: 'medium',
      baseAC: 14,
      maxDexBonus: 2,
      stealthDisadvantage: true,
    },
  },
  breastplate: {
    type: 'item',
    itemType: 'armor',
    name: 'Breastplate',
    description: { text: 'A fitted metal chest piece with flexible leather.' },
    value: 400,
    weight: 20,
    armorDetails: {
      armorType: 'medium',
      baseAC: 14,
      maxDexBonus: 2,
    },
  },
  halfPlate: {
    type: 'item',
    itemType: 'armor',
    name: 'Half Plate',
    description: { text: 'Shaped metal plates covering most of the body.' },
    value: 750,
    weight: 40,
    armorDetails: {
      armorType: 'medium',
      baseAC: 15,
      maxDexBonus: 2,
      stealthDisadvantage: true,
    },
  },

  // Heavy Armor
  ringMail: {
    type: 'item',
    itemType: 'armor',
    name: 'Ring Mail',
    description: { text: 'Leather armor with heavy rings sewn into it.' },
    value: 30,
    weight: 40,
    armorDetails: {
      armorType: 'heavy',
      baseAC: 14,
      stealthDisadvantage: true,
    },
  },
  chainMail: {
    type: 'item',
    itemType: 'armor',
    name: 'Chain Mail',
    description: { text: 'A full suit of interlocking metal rings.' },
    value: 75,
    weight: 55,
    armorDetails: {
      armorType: 'heavy',
      baseAC: 16,
      strengthRequirement: 13,
      stealthDisadvantage: true,
    },
  },
  splint: {
    type: 'item',
    itemType: 'armor',
    name: 'Splint Armor',
    description: { text: 'Strips of metal riveted to a leather backing.' },
    value: 200,
    weight: 60,
    armorDetails: {
      armorType: 'heavy',
      baseAC: 17,
      strengthRequirement: 15,
      stealthDisadvantage: true,
    },
  },
  plate: {
    type: 'item',
    itemType: 'armor',
    name: 'Plate Armor',
    description: { text: 'Interlocking metal plates covering the entire body.' },
    value: 1500,
    weight: 65,
    armorDetails: {
      armorType: 'heavy',
      baseAC: 18,
      strengthRequirement: 15,
      stealthDisadvantage: true,
    },
  },

  // Shield
  shield: {
    type: 'item',
    itemType: 'armor',
    name: 'Shield',
    description: { text: 'A wooden or metal shield strapped to the arm.' },
    value: 10,
    weight: 6,
    armorDetails: {
      armorType: 'shield',
      baseAC: 2,
    },
  },
};

// ============================================================================
// CONSUMABLES
// ============================================================================

export const CONSUMABLES: Record<string, ItemTemplate> = {
  potionOfHealing: {
    type: 'item',
    itemType: 'consumable',
    name: 'Potion of Healing',
    description: { text: 'A red liquid that glimmers when agitated. Restores 2d4+2 HP.' },
    value: 50,
    weight: 0.5,
    magical: true,
    consumableDetails: {
      uses: 1,
      maxUses: 1,
      effect: 'Heal 2d4+2 hit points',
      healingDice: '2d4+2',
    },
  },
  potionOfGreaterHealing: {
    type: 'item',
    itemType: 'consumable',
    name: 'Potion of Greater Healing',
    description: { text: 'A more potent healing potion. Restores 4d4+4 HP.' },
    value: 150,
    weight: 0.5,
    magical: true,
    consumableDetails: {
      uses: 1,
      maxUses: 1,
      effect: 'Heal 4d4+4 hit points',
      healingDice: '4d4+4',
    },
  },
  antitoxin: {
    type: 'item',
    itemType: 'consumable',
    name: 'Antitoxin',
    description: { text: 'A vial of liquid that grants advantage on saves vs poison for 1 hour.' },
    value: 50,
    weight: 0,
    consumableDetails: {
      uses: 1,
      maxUses: 1,
      effect: 'Advantage on saving throws against poison for 1 hour',
    },
  },
  rations: {
    type: 'item',
    itemType: 'consumable',
    name: 'Rations (1 day)',
    description: { text: 'Dried food suitable for travel.' },
    value: 0.5,
    weight: 2,
    consumableDetails: {
      uses: 1,
      maxUses: 1,
      effect: 'Sustenance for one day',
    },
  },
  torch: {
    type: 'item',
    itemType: 'consumable',
    name: 'Torch',
    description: { text: 'A wooden rod soaked in tallow. Burns for 1 hour.' },
    value: 0.01,
    weight: 1,
    consumableDetails: {
      uses: 1,
      maxUses: 1,
      effect: 'Bright light 20ft, dim light 20ft more for 1 hour',
    },
  },
};

// ============================================================================
// ADVENTURING GEAR
// ============================================================================

export const ADVENTURING_GEAR: Record<string, ItemTemplate> = {
  backpack: {
    type: 'item',
    itemType: 'gear',
    name: 'Backpack',
    description: { text: 'A leather pack for carrying equipment.' },
    value: 2,
    weight: 5,
  },
  bedroll: {
    type: 'item',
    itemType: 'gear',
    name: 'Bedroll',
    description: { text: 'A simple sleeping roll.' },
    value: 1,
    weight: 7,
  },
  rope: {
    type: 'item',
    itemType: 'gear',
    name: 'Rope (50 ft)',
    description: { text: 'Hemp rope, useful for climbing and binding.' },
    value: 1,
    weight: 10,
  },
  graplingHook: {
    type: 'item',
    itemType: 'gear',
    name: 'Grappling Hook',
    description: { text: 'A metal hook for climbing.' },
    value: 2,
    weight: 4,
  },
  lantern: {
    type: 'item',
    itemType: 'gear',
    name: 'Lantern (Hooded)',
    description: { text: 'A lantern that can be shuttered to block light.' },
    value: 5,
    weight: 2,
  },
  tinderbox: {
    type: 'item',
    itemType: 'gear',
    name: 'Tinderbox',
    description: { text: 'Flint, firesteel, and tinder for starting fires.' },
    value: 0.5,
    weight: 1,
  },
  waterskin: {
    type: 'item',
    itemType: 'gear',
    name: 'Waterskin',
    description: { text: 'A leather container for water.' },
    value: 0.2,
    weight: 5,
  },
  thievesTools: {
    type: 'item',
    itemType: 'tool',
    name: "Thieves' Tools",
    description: { text: 'A set of lockpicks and other tools for bypassing locks.' },
    value: 25,
    weight: 1,
  },
  healersKit: {
    type: 'item',
    itemType: 'gear',
    name: "Healer's Kit",
    description: { text: 'A kit with bandages and salves. 10 uses.' },
    value: 5,
    weight: 3,
  },
  holySymbol: {
    type: 'item',
    itemType: 'gear',
    name: 'Holy Symbol',
    description: { text: 'A religious symbol used as a spellcasting focus.' },
    value: 5,
    weight: 1,
  },
  arcaneFocus: {
    type: 'item',
    itemType: 'gear',
    name: 'Arcane Focus (Crystal)',
    description: { text: 'A crystal used as a spellcasting focus.' },
    value: 10,
    weight: 1,
  },
  componentPouch: {
    type: 'item',
    itemType: 'gear',
    name: 'Component Pouch',
    description: { text: 'A pouch containing spell components.' },
    value: 25,
    weight: 2,
  },
  spellbook: {
    type: 'item',
    itemType: 'gear',
    name: 'Spellbook',
    description: { text: 'A leather-bound book for recording spells.' },
    value: 50,
    weight: 3,
  },
};

// ============================================================================
// AMMUNITION
// ============================================================================

export const AMMUNITION: Record<string, ItemTemplate> = {
  arrows: {
    type: 'item',
    itemType: 'gear',
    name: 'Arrows (20)',
    description: { text: 'A quiver of 20 arrows.' },
    value: 1,
    weight: 1,
  },
  bolts: {
    type: 'item',
    itemType: 'gear',
    name: 'Crossbow Bolts (20)',
    description: { text: 'A case of 20 crossbow bolts.' },
    value: 1,
    weight: 1.5,
  },
};

// ============================================================================
// ALL ITEMS COMBINED
// ============================================================================

export const ALL_ITEMS: Record<string, ItemTemplate> = {
  ...SIMPLE_MELEE_WEAPONS,
  ...SIMPLE_RANGED_WEAPONS,
  ...MARTIAL_MELEE_WEAPONS,
  ...MARTIAL_RANGED_WEAPONS,
  ...ARMOR,
  ...CONSUMABLES,
  ...ADVENTURING_GEAR,
  ...AMMUNITION,
};

/**
 * Helper to safely get item from record
 */
function getItem(record: Record<string, ItemTemplate>, key: string): ItemTemplate {
  const item = record[key];
  if (!item) throw new Error(`Item not found: ${key}`);
  return item;
}

/**
 * Get starting equipment for a class
 */
export function getClassStartingEquipment(className: string): ItemTemplate[] {
  const equipment: ItemTemplate[] = [];

  switch (className.toLowerCase()) {
    case 'fighter':
      equipment.push(getItem(ARMOR, 'chainMail'));
      equipment.push(getItem(MARTIAL_MELEE_WEAPONS, 'longsword'));
      equipment.push(getItem(ARMOR, 'shield'));
      equipment.push(getItem(SIMPLE_RANGED_WEAPONS, 'lightCrossbow'));
      equipment.push(getItem(AMMUNITION, 'bolts'));
      break;

    case 'rogue':
      equipment.push(getItem(ARMOR, 'leather'));
      equipment.push(getItem(MARTIAL_MELEE_WEAPONS, 'rapier'));
      equipment.push(getItem(MARTIAL_MELEE_WEAPONS, 'shortsword'));
      equipment.push(getItem(SIMPLE_MELEE_WEAPONS, 'dagger'));
      equipment.push(getItem(SIMPLE_MELEE_WEAPONS, 'dagger'));
      equipment.push(getItem(ADVENTURING_GEAR, 'thievesTools'));
      break;

    case 'wizard':
      equipment.push(getItem(SIMPLE_MELEE_WEAPONS, 'quarterstaff'));
      equipment.push(getItem(ADVENTURING_GEAR, 'spellbook'));
      equipment.push(getItem(ADVENTURING_GEAR, 'componentPouch'));
      break;

    case 'cleric':
      equipment.push(getItem(ARMOR, 'scaleMail'));
      equipment.push(getItem(SIMPLE_MELEE_WEAPONS, 'mace'));
      equipment.push(getItem(ARMOR, 'shield'));
      equipment.push(getItem(ADVENTURING_GEAR, 'holySymbol'));
      break;

    default:
      // Default adventurer kit
      equipment.push(getItem(ARMOR, 'leather'));
      equipment.push(getItem(SIMPLE_MELEE_WEAPONS, 'dagger'));
      break;
  }

  // Everyone gets basic supplies
  equipment.push(getItem(ADVENTURING_GEAR, 'backpack'));
  equipment.push(getItem(ADVENTURING_GEAR, 'bedroll'));
  equipment.push(getItem(ADVENTURING_GEAR, 'waterskin'));

  return equipment;
}

/**
 * Get starting gold for a class
 */
export function getClassStartingGold(className: string): number {
  switch (className.toLowerCase()) {
    case 'fighter':
      return 10;
    case 'rogue':
      return 15;
    case 'wizard':
      return 10;
    case 'cleric':
      return 15;
    default:
      return 10;
  }
}
