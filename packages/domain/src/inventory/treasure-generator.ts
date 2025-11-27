/**
 * Treasure Generator
 *
 * Generates random treasure based on Challenge Rating using DMG tables.
 */

import type { Currency } from '@ai-dm/shared';
import { createEmptyCurrency, addCurrency } from './inventory-manager.js';
import {
  type CRRange,
  type GemOrArt,
  type TreasureHoardResult,
  type IndividualTreasureResult,
  getCRRange,
  INDIVIDUAL_TREASURE,
  rollD100,
  rollDice,
  rollCoins,
  randomFrom,
  getGemsForValue,
  getArtForValue,
  rollMagicItem,
  currencyToGold,
} from './treasure-tables.js';

// ============================================================================
// Hoard Tables (Simplified from DMG)
// ============================================================================

interface HoardEntry {
  weight: number;
  gems?: { value: number; dice: string };
  art?: { value: number; dice: string };
  magicItems?: { table: string; dice: string }[];
}

const HOARD_CR_0_4: { coins: string; entries: HoardEntry[] } = {
  coins: '6d6x100_cp_3d6x100_sp_2d6x10_gp',
  entries: [
    { weight: 6 },
    { weight: 16, gems: { value: 10, dice: '2d6' } },
    { weight: 26, art: { value: 25, dice: '2d4' } },
    { weight: 36, gems: { value: 50, dice: '2d6' } },
    { weight: 44, gems: { value: 10, dice: '2d6' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 52, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 60, gems: { value: 50, dice: '2d6' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 65, gems: { value: 10, dice: '2d6' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 70, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 75, gems: { value: 50, dice: '2d6' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 78, gems: { value: 10, dice: '2d6' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 80, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 85, gems: { value: 50, dice: '2d6' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 92, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 97, gems: { value: 50, dice: '2d6' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 99, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1' }] },
    { weight: 100, gems: { value: 50, dice: '2d6' }, magicItems: [{ table: 'G', dice: '1' }] },
  ],
};

const HOARD_CR_5_10: { coins: string; entries: HoardEntry[] } = {
  coins: '2d6x100_cp_2d6x1000_sp_6d6x100_gp_3d6x10_pp',
  entries: [
    { weight: 4 },
    { weight: 10, art: { value: 25, dice: '2d4' } },
    { weight: 16, gems: { value: 50, dice: '3d6' } },
    { weight: 22, gems: { value: 100, dice: '3d6' } },
    { weight: 28, art: { value: 250, dice: '2d4' } },
    { weight: 32, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 36, gems: { value: 50, dice: '3d6' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 40, gems: { value: 100, dice: '3d6' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 44, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'A', dice: '1d6' }] },
    { weight: 49, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 54, gems: { value: 50, dice: '3d6' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 59, gems: { value: 100, dice: '3d6' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 63, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'B', dice: '1d4' }] },
    { weight: 66, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 69, gems: { value: 50, dice: '3d6' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 72, gems: { value: 100, dice: '3d6' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 74, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'C', dice: '1d4' }] },
    { weight: 76, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 78, gems: { value: 50, dice: '3d6' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 79, gems: { value: 100, dice: '3d6' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 80, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 84, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 88, gems: { value: 50, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 91, gems: { value: 100, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 94, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 96, art: { value: 25, dice: '2d4' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 98, gems: { value: 50, dice: '3d6' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 99, gems: { value: 100, dice: '3d6' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 100, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'H', dice: '1' }] },
  ],
};

const HOARD_CR_11_16: { coins: string; entries: HoardEntry[] } = {
  coins: '4d6x1000_gp_5d6x100_pp',
  entries: [
    { weight: 3 },
    { weight: 6, art: { value: 250, dice: '2d4' } },
    { weight: 9, art: { value: 750, dice: '2d4' } },
    { weight: 12, gems: { value: 500, dice: '3d6' } },
    { weight: 15, gems: { value: 1000, dice: '3d6' } },
    { weight: 19, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'A', dice: '1d4' }, { table: 'B', dice: '1d6' }] },
    { weight: 23, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'A', dice: '1d4' }, { table: 'B', dice: '1d6' }] },
    { weight: 26, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'A', dice: '1d4' }, { table: 'B', dice: '1d6' }] },
    { weight: 29, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'A', dice: '1d4' }, { table: 'B', dice: '1d6' }] },
    { weight: 35, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'C', dice: '1d6' }] },
    { weight: 40, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'C', dice: '1d6' }] },
    { weight: 45, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'C', dice: '1d6' }] },
    { weight: 50, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'C', dice: '1d6' }] },
    { weight: 54, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 58, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 62, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 66, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'F', dice: '1d4' }] },
    { weight: 68, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 70, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 72, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 74, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d4' }] },
    { weight: 76, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 78, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 80, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 82, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'H', dice: '1' }] },
    { weight: 85, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'I', dice: '1' }] },
    { weight: 88, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'I', dice: '1' }] },
    { weight: 90, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'I', dice: '1' }] },
    { weight: 92, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'I', dice: '1' }] },
    { weight: 94, art: { value: 250, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1d4' }, { table: 'H', dice: '1' }] },
    { weight: 96, art: { value: 750, dice: '2d4' }, magicItems: [{ table: 'G', dice: '1d4' }, { table: 'H', dice: '1' }] },
    { weight: 98, gems: { value: 500, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d4' }, { table: 'H', dice: '1' }] },
    { weight: 100, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d4' }, { table: 'H', dice: '1' }] },
  ],
};

const HOARD_CR_17_PLUS: { coins: string; entries: HoardEntry[] } = {
  coins: '12d6x1000_gp_8d6x1000_pp',
  entries: [
    { weight: 2 },
    { weight: 5, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'C', dice: '1d8' }] },
    { weight: 8, art: { value: 2500, dice: '1d10' }, magicItems: [{ table: 'C', dice: '1d8' }] },
    { weight: 11, art: { value: 7500, dice: '1d4' }, magicItems: [{ table: 'C', dice: '1d8' }] },
    { weight: 14, gems: { value: 5000, dice: '1d8' }, magicItems: [{ table: 'C', dice: '1d8' }] },
    { weight: 22, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'F', dice: '1d6' }] },
    { weight: 30, art: { value: 2500, dice: '1d10' }, magicItems: [{ table: 'F', dice: '1d6' }] },
    { weight: 38, art: { value: 7500, dice: '1d4' }, magicItems: [{ table: 'F', dice: '1d6' }] },
    { weight: 46, gems: { value: 5000, dice: '1d8' }, magicItems: [{ table: 'F', dice: '1d6' }] },
    { weight: 52, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'G', dice: '1d6' }] },
    { weight: 58, art: { value: 2500, dice: '1d10' }, magicItems: [{ table: 'G', dice: '1d6' }] },
    { weight: 63, art: { value: 7500, dice: '1d4' }, magicItems: [{ table: 'G', dice: '1d6' }] },
    { weight: 68, gems: { value: 5000, dice: '1d8' }, magicItems: [{ table: 'G', dice: '1d6' }] },
    { weight: 69, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'H', dice: '1d6' }] },
    { weight: 70, art: { value: 2500, dice: '1d10' }, magicItems: [{ table: 'H', dice: '1d6' }] },
    { weight: 71, art: { value: 7500, dice: '1d4' }, magicItems: [{ table: 'H', dice: '1d6' }] },
    { weight: 72, gems: { value: 5000, dice: '1d8' }, magicItems: [{ table: 'H', dice: '1d6' }] },
    { weight: 74, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'I', dice: '1d4' }] },
    { weight: 76, art: { value: 2500, dice: '1d10' }, magicItems: [{ table: 'I', dice: '1d4' }] },
    { weight: 78, art: { value: 7500, dice: '1d4' }, magicItems: [{ table: 'I', dice: '1d4' }] },
    { weight: 80, gems: { value: 5000, dice: '1d8' }, magicItems: [{ table: 'I', dice: '1d4' }] },
    { weight: 85, gems: { value: 1000, dice: '3d6' }, magicItems: [{ table: 'H', dice: '1d4' }, { table: 'I', dice: '1' }] },
    { weight: 90, art: { value: 2500, dice: '1d10' }, magicItems: [{ table: 'H', dice: '1d4' }, { table: 'I', dice: '1' }] },
    { weight: 95, art: { value: 7500, dice: '1d4' }, magicItems: [{ table: 'H', dice: '1d4' }, { table: 'I', dice: '1' }] },
    { weight: 100, gems: { value: 5000, dice: '1d8' }, magicItems: [{ table: 'H', dice: '1d4' }, { table: 'I', dice: '1' }] },
  ],
};

function getHoardTable(crRange: CRRange) {
  switch (crRange) {
    case '0-4':
      return HOARD_CR_0_4;
    case '5-10':
      return HOARD_CR_5_10;
    case '11-16':
      return HOARD_CR_11_16;
    case '17+':
      return HOARD_CR_17_PLUS;
  }
}

// ============================================================================
// Treasure Generator Class
// ============================================================================

export class TreasureGenerator {
  /**
   * Generate individual treasure for a single creature
   */
  generateIndividual(cr: number): IndividualTreasureResult {
    const crRange = getCRRange(cr);
    const table = INDIVIDUAL_TREASURE[crRange];
    const roll = rollD100();

    let coinNotation = '';
    for (const entry of table.coins) {
      if (roll <= entry.weight) {
        coinNotation = entry.dice;
        break;
      }
    }

    const coins = rollCoins(coinNotation);
    const totalGoldValue = currencyToGold(coins);

    return { coins, totalGoldValue };
  }

  /**
   * Generate treasure hoard (boss/lair treasure)
   */
  generateHoard(cr: number): TreasureHoardResult {
    const crRange = getCRRange(cr);
    const hoard = getHoardTable(crRange);

    // Roll base coins
    const coins = rollCoins(hoard.coins);

    // Roll for additional treasure
    const roll = rollD100();
    let entry: HoardEntry | undefined;
    for (const e of hoard.entries) {
      if (roll <= e.weight) {
        entry = e;
        break;
      }
    }

    const gems: GemOrArt[] = [];
    const artObjects: GemOrArt[] = [];
    const magicItems: string[] = [];

    if (entry) {
      // Roll gems
      if (entry.gems) {
        const count = rollDice(entry.gems.dice);
        const gemTable = getGemsForValue(entry.gems.value);
        for (let i = 0; i < count; i++) {
          gems.push(randomFrom(gemTable));
        }
      }

      // Roll art objects
      if (entry.art) {
        const count = rollDice(entry.art.dice);
        const artTable = getArtForValue(entry.art.value);
        for (let i = 0; i < count; i++) {
          artObjects.push(randomFrom(artTable));
        }
      }

      // Roll magic items
      if (entry.magicItems) {
        for (const itemRoll of entry.magicItems) {
          const count = rollDice(itemRoll.dice);
          for (let i = 0; i < count; i++) {
            magicItems.push(rollMagicItem(itemRoll.table));
          }
        }
      }
    }

    // Calculate total value
    const gemsValue = gems.reduce((sum, g) => sum + g.value, 0);
    const artValue = artObjects.reduce((sum, a) => sum + a.value, 0);
    const totalGoldValue = currencyToGold(coins) + gemsValue + artValue;

    return {
      coins,
      gems,
      artObjects,
      magicItems,
      totalGoldValue,
    };
  }

  /**
   * Generate treasure for multiple creatures
   */
  generateForEncounter(
    creatures: Array<{ cr: number; count: number }>,
    includeHoard: boolean = false
  ): TreasureHoardResult {
    let totalCoins = createEmptyCurrency();
    const allGems: GemOrArt[] = [];
    const allArt: GemOrArt[] = [];
    const allMagicItems: string[] = [];

    // Generate individual treasure for each creature
    for (const creature of creatures) {
      for (let i = 0; i < creature.count; i++) {
        const individual = this.generateIndividual(creature.cr);
        totalCoins = addCurrency(totalCoins, individual.coins);
      }
    }

    // If this is a lair/boss encounter, add hoard treasure
    if (includeHoard) {
      // Use highest CR for hoard
      const maxCR = Math.max(...creatures.map((c) => c.cr));
      const hoard = this.generateHoard(maxCR);

      totalCoins = addCurrency(totalCoins, hoard.coins);
      allGems.push(...hoard.gems);
      allArt.push(...hoard.artObjects);
      allMagicItems.push(...hoard.magicItems);
    }

    const gemsValue = allGems.reduce((sum, g) => sum + g.value, 0);
    const artValue = allArt.reduce((sum, a) => sum + a.value, 0);
    const totalGoldValue = currencyToGold(totalCoins) + gemsValue + artValue;

    return {
      coins: totalCoins,
      gems: allGems,
      artObjects: allArt,
      magicItems: allMagicItems,
      totalGoldValue,
    };
  }

  /**
   * Format treasure for display
   */
  formatTreasure(treasure: TreasureHoardResult): string {
    const lines: string[] = ['=== TREASURE ==='];

    // Coins
    const { coins } = treasure;
    const coinParts: string[] = [];
    if (coins.platinum > 0) coinParts.push(`${coins.platinum} pp`);
    if (coins.gold > 0) coinParts.push(`${coins.gold} gp`);
    if (coins.electrum > 0) coinParts.push(`${coins.electrum} ep`);
    if (coins.silver > 0) coinParts.push(`${coins.silver} sp`);
    if (coins.copper > 0) coinParts.push(`${coins.copper} cp`);
    lines.push(`\nCoins: ${coinParts.length > 0 ? coinParts.join(', ') : 'None'}`);

    // Gems
    if (treasure.gems.length > 0) {
      lines.push('\nGems:');
      const gemCounts = new Map<string, number>();
      for (const gem of treasure.gems) {
        const key = `${gem.name} (${gem.value} gp)`;
        gemCounts.set(key, (gemCounts.get(key) ?? 0) + 1);
      }
      for (const [name, count] of gemCounts) {
        lines.push(`  ${count}x ${name}`);
      }
    }

    // Art Objects
    if (treasure.artObjects.length > 0) {
      lines.push('\nArt Objects:');
      for (const art of treasure.artObjects) {
        lines.push(`  ${art.name} (${art.value} gp)`);
      }
    }

    // Magic Items
    if (treasure.magicItems.length > 0) {
      lines.push('\nMagic Items:');
      for (const item of treasure.magicItems) {
        lines.push(`  ${item}`);
      }
    }

    lines.push(`\nTotal Value: ~${Math.floor(treasure.totalGoldValue)} gp`);

    return lines.join('\n');
  }
}

/**
 * Create a treasure generator instance
 */
export function createTreasureGenerator(): TreasureGenerator {
  return new TreasureGenerator();
}
