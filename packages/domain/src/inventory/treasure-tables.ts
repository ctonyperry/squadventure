/**
 * Treasure Generation Tables (DMG Chapter 7)
 *
 * Implements treasure tables for generating loot based on Challenge Rating.
 */

import type { Currency } from '@ai-dm/shared';
import { createEmptyCurrency, addCurrency } from './inventory-manager.js';

// ============================================================================
// Types
// ============================================================================

export interface TreasureRoll {
  /** Dice notation for rolling (e.g., "2d6x100") */
  dice: string;
  /** Weight/probability (1-100 range) */
  weight: number;
}

export interface GemOrArt {
  name: string;
  value: number; // in gold pieces
}

export interface MagicItemRoll {
  /** Table to roll on (A-I) */
  table: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
  /** How many times to roll */
  rolls: number;
  /** Weight/probability (1-100 range) */
  weight: number;
}

export interface TreasureHoardResult {
  coins: Currency;
  gems: GemOrArt[];
  artObjects: GemOrArt[];
  magicItems: string[];
  totalGoldValue: number;
}

export interface IndividualTreasureResult {
  coins: Currency;
  totalGoldValue: number;
}

// ============================================================================
// Gem Tables (DMG p.134)
// ============================================================================

export const GEMS_10GP: GemOrArt[] = [
  { name: 'Azurite (opaque mottled deep blue)', value: 10 },
  { name: 'Banded Agate (translucent striped brown/blue/white/red)', value: 10 },
  { name: 'Blue Quartz (transparent pale blue)', value: 10 },
  { name: 'Eye Agate (translucent circles of gray/white/brown/blue/green)', value: 10 },
  { name: 'Hematite (opaque gray-black)', value: 10 },
  { name: 'Lapis Lazuli (opaque light/dark blue with yellow flecks)', value: 10 },
  { name: 'Malachite (opaque striated light/dark green)', value: 10 },
  { name: 'Moss Agate (translucent pink/yellow-white with gray/green moss markings)', value: 10 },
  { name: 'Obsidian (opaque black)', value: 10 },
  { name: 'Rhodochrosite (opaque light pink)', value: 10 },
  { name: 'Tiger Eye (translucent brown with golden center)', value: 10 },
  { name: 'Turquoise (opaque light blue-green)', value: 10 },
];

export const GEMS_50GP: GemOrArt[] = [
  { name: 'Bloodstone (opaque dark gray with red flecks)', value: 50 },
  { name: 'Carnelian (opaque orange to red-brown)', value: 50 },
  { name: 'Chalcedony (opaque white)', value: 50 },
  { name: 'Chrysoprase (translucent green)', value: 50 },
  { name: 'Citrine (transparent pale yellow-brown)', value: 50 },
  { name: 'Jasper (opaque blue, black, or brown)', value: 50 },
  { name: 'Moonstone (translucent white with pale blue glow)', value: 50 },
  { name: 'Onyx (opaque bands of black and white)', value: 50 },
  { name: 'Quartz (transparent white, smoky gray, or yellow)', value: 50 },
  { name: 'Sardonyx (opaque bands of red and white)', value: 50 },
  { name: 'Star Rose Quartz (translucent rosy stone with white star-shaped center)', value: 50 },
  { name: 'Zircon (transparent pale blue-green)', value: 50 },
];

export const GEMS_100GP: GemOrArt[] = [
  { name: 'Amber (transparent watery gold to rich gold)', value: 100 },
  { name: 'Amethyst (transparent deep purple)', value: 100 },
  { name: 'Chrysoberyl (transparent yellow-green to pale green)', value: 100 },
  { name: 'Coral (opaque crimson)', value: 100 },
  { name: 'Garnet (transparent red, brown-green, or violet)', value: 100 },
  { name: 'Jade (translucent light green, deep green, or white)', value: 100 },
  { name: 'Jet (opaque deep black)', value: 100 },
  { name: 'Pearl (opaque lustrous white, yellow, or pink)', value: 100 },
  { name: 'Spinel (transparent red, red-brown, or deep green)', value: 100 },
  { name: 'Tourmaline (transparent pale green, blue, brown, or red)', value: 100 },
];

export const GEMS_500GP: GemOrArt[] = [
  { name: 'Alexandrite (transparent dark green)', value: 500 },
  { name: 'Aquamarine (transparent pale blue-green)', value: 500 },
  { name: 'Black Pearl (opaque pure black)', value: 500 },
  { name: 'Blue Spinel (transparent deep blue)', value: 500 },
  { name: 'Peridot (transparent rich olive green)', value: 500 },
  { name: 'Topaz (transparent golden yellow)', value: 500 },
];

export const GEMS_1000GP: GemOrArt[] = [
  { name: 'Black Opal (translucent dark green with black mottling and golden flecks)', value: 1000 },
  { name: 'Blue Sapphire (transparent blue-white to medium blue)', value: 1000 },
  { name: 'Emerald (transparent deep bright green)', value: 1000 },
  { name: 'Fire Opal (translucent fiery red)', value: 1000 },
  { name: 'Opal (translucent pale blue with green and golden mottling)', value: 1000 },
  { name: 'Star Ruby (translucent ruby with white star-shaped center)', value: 1000 },
  { name: 'Star Sapphire (translucent blue sapphire with white star-shaped center)', value: 1000 },
  { name: 'Yellow Sapphire (transparent fiery yellow or yellow-green)', value: 1000 },
];

export const GEMS_5000GP: GemOrArt[] = [
  { name: 'Black Sapphire (translucent lustrous black with glowing highlights)', value: 5000 },
  { name: 'Diamond (transparent blue-white, canary, pink, brown, or blue)', value: 5000 },
  { name: 'Jacinth (transparent fiery orange)', value: 5000 },
  { name: 'Ruby (transparent clear red to deep crimson)', value: 5000 },
];

// ============================================================================
// Art Objects Tables (DMG p.135)
// ============================================================================

export const ART_25GP: GemOrArt[] = [
  { name: 'Silver ewer', value: 25 },
  { name: 'Carved bone statuette', value: 25 },
  { name: 'Small gold bracelet', value: 25 },
  { name: 'Cloth-of-gold vestments', value: 25 },
  { name: 'Black velvet mask stitched with silver thread', value: 25 },
  { name: 'Copper chalice with silver filigree', value: 25 },
  { name: 'Pair of engraved bone dice', value: 25 },
  { name: 'Small mirror set in a painted wooden frame', value: 25 },
  { name: 'Embroidered silk handkerchief', value: 25 },
  { name: 'Gold locket with a painted portrait inside', value: 25 },
];

export const ART_250GP: GemOrArt[] = [
  { name: 'Gold ring set with bloodstones', value: 250 },
  { name: 'Carved ivory statuette', value: 250 },
  { name: 'Large gold bracelet', value: 250 },
  { name: 'Silver necklace with a gemstone pendant', value: 250 },
  { name: 'Bronze crown', value: 250 },
  { name: 'Silk robe with gold embroidery', value: 250 },
  { name: 'Large well-made tapestry', value: 250 },
  { name: 'Brass mug with jade inlay', value: 250 },
  { name: 'Box of turquoise animal figurines', value: 250 },
  { name: 'Gold bird cage with electrum filigree', value: 250 },
];

export const ART_750GP: GemOrArt[] = [
  { name: 'Silver chalice set with moonstones', value: 750 },
  { name: 'Silver-plated steel longsword with jet set in hilt', value: 750 },
  { name: 'Carved harp of exotic wood with ivory inlay and zircon gems', value: 750 },
  { name: 'Small gold idol', value: 750 },
  { name: 'Gold dragon comb set with red garnets as eyes', value: 750 },
  { name: 'Bottle stopper cork embossed with gold leaf and set with amethysts', value: 750 },
  { name: 'Ceremonial electrum dagger with a black pearl in the pommel', value: 750 },
  { name: 'Silver and gold brooch', value: 750 },
  { name: 'Obsidian statuette with gold fittings and inlay', value: 750 },
  { name: 'Painted gold war mask', value: 750 },
];

export const ART_2500GP: GemOrArt[] = [
  { name: 'Fine gold chain set with a fire opal', value: 2500 },
  { name: 'Old masterpiece painting', value: 2500 },
  { name: 'Embroidered silk and velvet mantle set with numerous moonstones', value: 2500 },
  { name: 'Platinum bracelet set with a sapphire', value: 2500 },
  { name: 'Embroidered glove set with jewel chips', value: 2500 },
  { name: 'Jeweled anklet', value: 2500 },
  { name: 'Gold music box', value: 2500 },
  { name: 'Gold circlet set with four aquamarines', value: 2500 },
  { name: 'Eye patch with a mock eye set in blue sapphire and moonstone', value: 2500 },
  { name: 'A necklace string of small pink pearls', value: 2500 },
];

export const ART_7500GP: GemOrArt[] = [
  { name: 'Jeweled gold crown', value: 7500 },
  { name: 'Jeweled platinum ring', value: 7500 },
  { name: 'Small gold statuette set with rubies', value: 7500 },
  { name: 'Gold cup set with emeralds', value: 7500 },
  { name: 'Gold jewelry box with platinum filigree', value: 7500 },
  { name: 'Painted gold child\'s sarcophagus', value: 7500 },
  { name: 'Jade game board with solid gold playing pieces', value: 7500 },
  { name: 'Bejeweled ivory drinking horn with gold filigree', value: 7500 },
];

// ============================================================================
// Magic Item Tables (DMG p.144-149) - Simplified for SRD
// ============================================================================

export const MAGIC_TABLE_A: string[] = [
  'Potion of Healing',
  'Spell Scroll (cantrip)',
  'Potion of Climbing',
  'Spell Scroll (1st level)',
  'Spell Scroll (2nd level)',
  'Potion of Greater Healing',
];

export const MAGIC_TABLE_B: string[] = [
  'Potion of Greater Healing',
  'Potion of Fire Breath',
  'Potion of Resistance',
  'Ammunition +1',
  'Potion of Animal Friendship',
  'Potion of Hill Giant Strength',
  'Potion of Growth',
  'Potion of Water Breathing',
  'Spell Scroll (2nd level)',
  'Spell Scroll (3rd level)',
  'Bag of Holding',
  'Driftglobe',
];

export const MAGIC_TABLE_C: string[] = [
  'Potion of Superior Healing',
  'Spell Scroll (4th level)',
  'Ammunition +2',
  'Potion of Clairvoyance',
  'Potion of Diminution',
  'Potion of Gaseous Form',
  'Potion of Frost Giant Strength',
  'Potion of Stone Giant Strength',
  'Potion of Heroism',
  'Potion of Invulnerability',
  'Potion of Mind Reading',
  'Spell Scroll (5th level)',
  'Elixir of Health',
  'Oil of Etherealness',
  'Potion of Fire Giant Strength',
  'Potion of Flying',
  'Potion of Speed',
  'Potion of Supreme Healing',
  'Spell Scroll (6th level)',
];

export const MAGIC_TABLE_F: string[] = [
  'Weapon +1',
  'Shield +1',
  'Sentinel Shield',
  'Amulet of Proof against Detection and Location',
  'Boots of Elvenkind',
  'Boots of Striding and Springing',
  'Bracers of Archery',
  'Brooch of Shielding',
  'Broom of Flying',
  'Cloak of Elvenkind',
  'Cloak of Protection',
  'Gauntlets of Ogre Power',
  'Hat of Disguise',
  'Javelin of Lightning',
  'Pearl of Power',
  'Ring of Jumping',
  'Ring of Mind Shielding',
  'Ring of Warmth',
  'Ring of Water Walking',
  'Rod of the Pact Keeper +1',
  'Slippers of Spider Climbing',
  'Staff of the Adder',
  'Staff of the Python',
  'Sword of Vengeance',
  'Trident of Fish Command',
  'Wand of Magic Missiles',
  'Wand of the War Mage +1',
  'Wand of Web',
  'Armor +1',
];

export const MAGIC_TABLE_G: string[] = [
  'Weapon +2',
  'Armor +1 (any)',
  'Amulet of Health',
  'Belt of Dwarvenkind',
  'Belt of Hill Giant Strength',
  'Boots of Speed',
  'Bracers of Defense',
  'Cloak of Displacement',
  'Cloak of the Bat',
  'Cube of Force',
  'Flame Tongue',
  'Gem of Seeing',
  'Helm of Teleportation',
  'Ioun Stone (various)',
  'Mace of Disruption',
  'Necklace of Fireballs',
  'Periapt of Health',
  'Periapt of Wound Closure',
  'Ring of Evasion',
  'Ring of Feather Falling',
  'Ring of Free Action',
  'Ring of Protection',
  'Ring of Resistance',
  'Ring of Spell Storing',
  'Ring of X-ray Vision',
  'Robe of Eyes',
  'Rod of Rulership',
  'Staff of Charming',
  'Staff of Healing',
  'Staff of Swarming Insects',
  'Staff of the Woodlands',
  'Stone of Controlling Earth Elementals',
  'Sun Blade',
  'Wand of Binding',
  'Wand of Enemy Detection',
  'Wand of Fear',
  'Wand of Fireballs',
  'Wand of Lightning Bolts',
  'Wand of Paralysis',
  'Wand of the War Mage +2',
];

export const MAGIC_TABLE_H: string[] = [
  'Weapon +3',
  'Amulet of the Planes',
  'Belt of Fire Giant Strength',
  'Belt of Frost Giant Strength',
  'Belt of Stone Giant Strength',
  'Carpet of Flying',
  'Cloak of Arachnida',
  'Crystal Ball',
  'Efreeti Bottle',
  'Figurine of Wondrous Power (obsidian steed)',
  'Horn of Valhalla (bronze)',
  'Instrument of the Bards',
  'Manual of Bodily Health',
  'Manual of Gainful Exercise',
  'Manual of Golems',
  'Manual of Quickness of Action',
  'Mirror of Life Trapping',
  'Ring of Regeneration',
  'Ring of Shooting Stars',
  'Ring of Telekinesis',
  'Robe of Scintillating Colors',
  'Robe of Stars',
  'Rod of Absorption',
  'Rod of Alertness',
  'Rod of Security',
  'Scimitar of Speed',
  'Shield +2',
  'Staff of Fire',
  'Staff of Frost',
  'Staff of Power',
  'Staff of Striking',
  'Staff of Thunder and Lightning',
  'Tome of Clear Thought',
  'Tome of Leadership and Influence',
  'Tome of Understanding',
  'Wand of Polymorph',
  'Wand of the War Mage +3',
  'Armor +2 (any)',
];

export const MAGIC_TABLE_I: string[] = [
  'Defender',
  'Hammer of Thunderbolts',
  'Luck Blade',
  'Sword of Answering',
  'Holy Avenger',
  'Ring of Djinni Summoning',
  'Ring of Elemental Command',
  'Ring of Invisibility',
  'Ring of Spell Turning',
  'Ring of Three Wishes',
  'Rod of Lordly Might',
  'Staff of the Magi',
  'Vorpal Sword',
  'Belt of Cloud Giant Strength',
  'Belt of Storm Giant Strength',
  'Armor +3',
  'Cloak of Invisibility',
  'Crystal Ball (legendary property)',
  'Efreeti Chain',
  'Ioun Stone (greater absorption)',
  'Ioun Stone (mastery)',
  'Ioun Stone (regeneration)',
  'Robe of the Archmagi',
  'Rod of Resurrection',
  'Sphere of Annihilation',
  'Talisman of Pure Good',
  'Talisman of the Sphere',
  'Talisman of Ultimate Evil',
  'Tome of the Stilled Tongue',
];

// ============================================================================
// Treasure Tables by CR (DMG p.136-139)
// ============================================================================

export type CRRange = '0-4' | '5-10' | '11-16' | '17+';

export function getCRRange(cr: number): CRRange {
  if (cr <= 4) return '0-4';
  if (cr <= 10) return '5-10';
  if (cr <= 16) return '11-16';
  return '17+';
}

/**
 * Individual treasure tables (per creature)
 */
export const INDIVIDUAL_TREASURE: Record<CRRange, { coins: TreasureRoll[] }> = {
  '0-4': {
    coins: [
      { dice: '5d6_cp', weight: 30 },
      { dice: '4d6_sp', weight: 60 },
      { dice: '3d6_ep', weight: 70 },
      { dice: '3d6_gp', weight: 95 },
      { dice: '1d6_pp', weight: 100 },
    ],
  },
  '5-10': {
    coins: [
      { dice: '4d6x100_cp_1d6x10_ep', weight: 30 },
      { dice: '6d6x10_sp_2d6x10_gp', weight: 60 },
      { dice: '3d6x10_ep_2d6x10_gp', weight: 70 },
      { dice: '4d6x10_gp', weight: 95 },
      { dice: '2d6x10_gp_3d6_pp', weight: 100 },
    ],
  },
  '11-16': {
    coins: [
      { dice: '4d6x100_sp_1d6x100_gp', weight: 20 },
      { dice: '1d6x100_ep_1d6x100_gp', weight: 35 },
      { dice: '2d6x100_gp_1d6x10_pp', weight: 75 },
      { dice: '2d6x100_gp_2d6x10_pp', weight: 100 },
    ],
  },
  '17+': {
    coins: [
      { dice: '2d6x1000_ep_8d6x100_gp', weight: 15 },
      { dice: '1d6x1000_gp_1d6x100_pp', weight: 55 },
      { dice: '1d6x1000_gp_2d6x100_pp', weight: 100 },
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Roll dice from notation like "2d6" or "3d6+5"
 */
export function rollDice(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return 0;

  const numDice = parseInt(match[1]!);
  const dieSize = parseInt(match[2]!);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }

  return total + modifier;
}

/**
 * Roll a d100 (percentile)
 */
export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * Select random item from array
 */
export function randomFrom<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

/**
 * Parse complex coin notation and roll
 */
export function rollCoins(notation: string): Currency {
  const currency = createEmptyCurrency();

  // Parse notation like "5d6_cp" or "4d6x100_cp_1d6x10_ep"
  const parts = notation.split('_');

  for (let i = 0; i < parts.length - 1; i += 2) {
    const diceStr = parts[i]!;
    const coinType = parts[i + 1] as keyof Currency;

    // Handle multipliers like "4d6x100"
    const [dice, multiplier] = diceStr.split('x');
    let amount = rollDice(dice!);
    if (multiplier) {
      amount *= parseInt(multiplier);
    }

    if (coinType in currency) {
      currency[coinType] = (currency[coinType] ?? 0) + amount;
    }
  }

  return currency;
}

/**
 * Get gems of a specific value tier
 */
export function getGemsForValue(value: number): GemOrArt[] {
  switch (value) {
    case 10:
      return GEMS_10GP;
    case 50:
      return GEMS_50GP;
    case 100:
      return GEMS_100GP;
    case 500:
      return GEMS_500GP;
    case 1000:
      return GEMS_1000GP;
    case 5000:
      return GEMS_5000GP;
    default:
      return [];
  }
}

/**
 * Get art objects of a specific value tier
 */
export function getArtForValue(value: number): GemOrArt[] {
  switch (value) {
    case 25:
      return ART_25GP;
    case 250:
      return ART_250GP;
    case 750:
      return ART_750GP;
    case 2500:
      return ART_2500GP;
    case 7500:
      return ART_7500GP;
    default:
      return [];
  }
}

/**
 * Get magic items from a table
 */
export function getMagicItemTable(table: string): string[] {
  switch (table.toUpperCase()) {
    case 'A':
      return MAGIC_TABLE_A;
    case 'B':
      return MAGIC_TABLE_B;
    case 'C':
      return MAGIC_TABLE_C;
    case 'F':
      return MAGIC_TABLE_F;
    case 'G':
      return MAGIC_TABLE_G;
    case 'H':
      return MAGIC_TABLE_H;
    case 'I':
      return MAGIC_TABLE_I;
    default:
      return MAGIC_TABLE_A;
  }
}

/**
 * Roll on a magic item table
 */
export function rollMagicItem(table: string): string {
  const items = getMagicItemTable(table);
  return randomFrom(items);
}

/**
 * Calculate total gold value of currency
 */
export function currencyToGold(currency: Currency): number {
  return (
    currency.copper / 100 +
    currency.silver / 10 +
    currency.electrum / 2 +
    currency.gold +
    currency.platinum * 10
  );
}
