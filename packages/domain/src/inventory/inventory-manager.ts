/**
 * Inventory management for D&D 5e characters
 */

import type {
  ItemEntity,
  EntityId,
  CharacterInventory,
  EquipmentSlot,
  EquippedItems,
  Currency,
  WeaponDetails,
  ArmorDetails,
  CharacterSheet,
  WorldState,
} from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';

/**
 * Create an empty inventory
 */
export function createEmptyInventory(strengthScore: number): CharacterInventory {
  return {
    equipped: {},
    backpack: [],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 0,
      platinum: 0,
    },
    carryingCapacity: strengthScore * 15,
    currentWeight: 0,
  };
}

/**
 * Create an empty currency object
 */
export function createEmptyCurrency(): Currency {
  return {
    copper: 0,
    silver: 0,
    electrum: 0,
    gold: 0,
    platinum: 0,
  };
}

/**
 * Convert currency to total copper pieces for comparison
 */
export function currencyToCopper(currency: Currency): number {
  return (
    currency.copper +
    currency.silver * 10 +
    currency.electrum * 50 +
    currency.gold * 100 +
    currency.platinum * 1000
  );
}

/**
 * Convert copper to optimal currency denominations
 */
export function copperToCurrency(totalCopper: number): Currency {
  let remaining = totalCopper;

  const platinum = Math.floor(remaining / 1000);
  remaining -= platinum * 1000;

  const gold = Math.floor(remaining / 100);
  remaining -= gold * 100;

  const electrum = Math.floor(remaining / 50);
  remaining -= electrum * 50;

  const silver = Math.floor(remaining / 10);
  remaining -= silver * 10;

  return {
    platinum,
    gold,
    electrum,
    silver,
    copper: remaining,
  };
}

/**
 * Add currency to existing currency
 */
export function addCurrency(current: Currency, toAdd: Currency): Currency {
  return {
    copper: current.copper + toAdd.copper,
    silver: current.silver + toAdd.silver,
    electrum: current.electrum + toAdd.electrum,
    gold: current.gold + toAdd.gold,
    platinum: current.platinum + toAdd.platinum,
  };
}

/**
 * Check if can afford and subtract currency
 */
export function subtractCurrency(current: Currency, cost: Currency): Currency | null {
  const currentCopper = currencyToCopper(current);
  const costCopper = currencyToCopper(cost);

  if (currentCopper < costCopper) {
    return null; // Can't afford
  }

  return copperToCurrency(currentCopper - costCopper);
}

/**
 * Inventory manager class
 */
export class InventoryManager {
  private worldState: WorldState;

  constructor(worldState: WorldState) {
    this.worldState = worldState;
  }

  /**
   * Get item from world state
   */
  getItem(itemId: EntityId): ItemEntity | undefined {
    const entity = this.worldState.entities.get(itemId);
    if (entity && entity.type === 'item') {
      return entity as ItemEntity;
    }
    return undefined;
  }

  /**
   * Calculate total weight of inventory
   */
  calculateWeight(inventory: CharacterInventory): number {
    let totalWeight = 0;

    // Weight of equipped items
    for (const itemId of Object.values(inventory.equipped)) {
      if (itemId) {
        const item = this.getItem(itemId);
        if (item?.weight) {
          totalWeight += item.weight;
        }
      }
    }

    // Weight of backpack items
    for (const itemId of inventory.backpack) {
      const item = this.getItem(itemId);
      if (item?.weight) {
        totalWeight += item.weight;
      }
    }

    // Currency weight (50 coins = 1 lb)
    const totalCoins =
      inventory.currency.copper +
      inventory.currency.silver +
      inventory.currency.electrum +
      inventory.currency.gold +
      inventory.currency.platinum;
    totalWeight += totalCoins / 50;

    return totalWeight;
  }

  /**
   * Check if character is encumbered
   */
  isEncumbered(inventory: CharacterInventory): boolean {
    return inventory.currentWeight > inventory.carryingCapacity;
  }

  /**
   * Add item to backpack
   */
  addToBackpack(
    inventory: CharacterInventory,
    itemId: EntityId
  ): { success: boolean; message: string } {
    const item = this.getItem(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    inventory.backpack.push(itemId);
    inventory.currentWeight = this.calculateWeight(inventory);

    if (this.isEncumbered(inventory)) {
      return {
        success: true,
        message: `Added ${item.name} to backpack. Warning: You are now encumbered!`,
      };
    }

    return { success: true, message: `Added ${item.name} to backpack.` };
  }

  /**
   * Remove item from backpack
   */
  removeFromBackpack(
    inventory: CharacterInventory,
    itemId: EntityId
  ): { success: boolean; message: string } {
    const index = inventory.backpack.indexOf(itemId);
    if (index === -1) {
      return { success: false, message: 'Item not in backpack' };
    }

    const item = this.getItem(itemId);
    inventory.backpack.splice(index, 1);
    inventory.currentWeight = this.calculateWeight(inventory);

    return { success: true, message: `Removed ${item?.name ?? 'item'} from backpack.` };
  }

  /**
   * Determine valid equipment slot for an item
   */
  getValidSlot(item: ItemEntity): EquipmentSlot | null {
    if (item.itemType === 'weapon') {
      return 'mainHand';
    }
    if (item.itemType === 'armor') {
      const armorType = item.armorDetails?.armorType;
      if (armorType === 'shield') {
        return 'offHand';
      }
      return 'armor';
    }
    // Magic items could go to various slots based on properties
    if (item.magical && item.properties) {
      if (item.properties.includes('ring')) return 'ring1';
      if (item.properties.includes('amulet') || item.properties.includes('necklace')) return 'neck';
      if (item.properties.includes('cloak')) return 'cloak';
      if (item.properties.includes('boots')) return 'boots';
      if (item.properties.includes('gloves') || item.properties.includes('gauntlets')) return 'gloves';
      if (item.properties.includes('helm') || item.properties.includes('hat')) return 'head';
      if (item.properties.includes('belt')) return 'belt';
    }
    return null;
  }

  /**
   * Equip an item from backpack
   */
  equipItem(
    inventory: CharacterInventory,
    itemId: EntityId,
    slot?: EquipmentSlot
  ): { success: boolean; message: string; unequipped?: EntityId } {
    const item = this.getItem(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    // Determine slot
    const targetSlot = slot ?? this.getValidSlot(item);
    if (!targetSlot) {
      return { success: false, message: `${item.name} cannot be equipped` };
    }

    // Check if item is in backpack
    const backpackIndex = inventory.backpack.indexOf(itemId);

    // Get currently equipped item in slot
    const currentlyEquipped = inventory.equipped[targetSlot];
    let unequippedItem: EntityId | undefined;

    // Unequip current item if any
    if (currentlyEquipped) {
      inventory.backpack.push(currentlyEquipped);
      unequippedItem = currentlyEquipped;
    }

    // Remove from backpack if it was there
    if (backpackIndex !== -1) {
      inventory.backpack.splice(backpackIndex, 1);
    }

    // Equip the new item
    inventory.equipped[targetSlot] = itemId;
    inventory.currentWeight = this.calculateWeight(inventory);

    const unequippedName = unequippedItem ? this.getItem(unequippedItem)?.name : undefined;
    const message = unequippedName
      ? `Equipped ${item.name} (unequipped ${unequippedName})`
      : `Equipped ${item.name}`;

    const result: { success: boolean; message: string; unequipped?: EntityId } = {
      success: true,
      message,
    };
    if (unequippedItem) {
      result.unequipped = unequippedItem;
    }
    return result;
  }

  /**
   * Unequip an item to backpack
   */
  unequipItem(
    inventory: CharacterInventory,
    slot: EquipmentSlot
  ): { success: boolean; message: string } {
    const itemId = inventory.equipped[slot];
    if (!itemId) {
      return { success: false, message: `Nothing equipped in ${slot}` };
    }

    const item = this.getItem(itemId);
    delete inventory.equipped[slot];
    inventory.backpack.push(itemId);
    inventory.currentWeight = this.calculateWeight(inventory);

    return { success: true, message: `Unequipped ${item?.name ?? 'item'}` };
  }

  /**
   * Get equipped weapon details for combat
   */
  getEquippedWeapon(inventory: CharacterInventory): {
    item: ItemEntity;
    details: WeaponDetails;
  } | null {
    const mainHandId = inventory.equipped.mainHand;
    if (!mainHandId) return null;

    const item = this.getItem(mainHandId);
    if (!item || item.itemType !== 'weapon' || !item.weaponDetails) {
      return null;
    }

    return { item, details: item.weaponDetails };
  }

  /**
   * Calculate AC from equipped armor
   */
  calculateArmorClass(inventory: CharacterInventory, dexModifier: number): number {
    const armorId = inventory.equipped.armor;
    const shieldId = inventory.equipped.offHand;

    let baseAC = 10 + dexModifier; // Unarmored

    if (armorId) {
      const armor = this.getItem(armorId);
      if (armor?.armorDetails) {
        const details = armor.armorDetails;
        baseAC = details.baseAC;

        // Apply dex modifier based on armor type
        if (details.armorType === 'light') {
          baseAC += dexModifier;
        } else if (details.armorType === 'medium') {
          baseAC += Math.min(dexModifier, details.maxDexBonus ?? 2);
        }
        // Heavy armor: no dex bonus
      }
    }

    // Add shield bonus
    if (shieldId) {
      const shield = this.getItem(shieldId);
      if (shield?.armorDetails?.armorType === 'shield') {
        baseAC += shield.armorDetails.baseAC;
      }
    }

    return baseAC;
  }

  /**
   * Use a consumable item
   */
  useConsumable(
    inventory: CharacterInventory,
    itemId: EntityId
  ): { success: boolean; message: string; effect?: string } {
    const item = this.getItem(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    if (item.itemType !== 'consumable' || !item.consumableDetails) {
      return { success: false, message: `${item.name} is not a consumable item` };
    }

    const details = item.consumableDetails;
    if (details.uses <= 0) {
      return { success: false, message: `${item.name} has no uses remaining` };
    }

    // Reduce uses
    details.uses -= 1;

    // Remove from inventory if depleted
    if (details.uses <= 0) {
      this.removeFromBackpack(inventory, itemId);
    }

    return {
      success: true,
      message: `Used ${item.name}. ${details.uses}/${details.maxUses} uses remaining.`,
      effect: details.effect,
    };
  }

  /**
   * Format inventory for display
   */
  formatInventory(inventory: CharacterInventory): string {
    const lines: string[] = ['=== INVENTORY ==='];

    // Currency
    const { currency } = inventory;
    const coinParts: string[] = [];
    if (currency.platinum > 0) coinParts.push(`${currency.platinum} pp`);
    if (currency.gold > 0) coinParts.push(`${currency.gold} gp`);
    if (currency.electrum > 0) coinParts.push(`${currency.electrum} ep`);
    if (currency.silver > 0) coinParts.push(`${currency.silver} sp`);
    if (currency.copper > 0) coinParts.push(`${currency.copper} cp`);
    lines.push(`Currency: ${coinParts.length > 0 ? coinParts.join(', ') : 'None'}`);

    // Equipment
    lines.push('\nEquipped:');
    const slotNames: Record<EquipmentSlot, string> = {
      mainHand: 'Main Hand',
      offHand: 'Off Hand',
      armor: 'Armor',
      head: 'Head',
      cloak: 'Cloak',
      neck: 'Neck',
      ring1: 'Ring 1',
      ring2: 'Ring 2',
      belt: 'Belt',
      boots: 'Boots',
      gloves: 'Gloves',
    };

    for (const [slot, displayName] of Object.entries(slotNames)) {
      const itemId = inventory.equipped[slot as EquipmentSlot];
      if (itemId) {
        const item = this.getItem(itemId);
        lines.push(`  ${displayName}: ${item?.name ?? 'Unknown'}`);
      }
    }

    // Backpack
    lines.push('\nBackpack:');
    if (inventory.backpack.length === 0) {
      lines.push('  (empty)');
    } else {
      const itemCounts = new Map<string, number>();
      for (const itemId of inventory.backpack) {
        const item = this.getItem(itemId);
        const name = item?.name ?? 'Unknown';
        itemCounts.set(name, (itemCounts.get(name) ?? 0) + 1);
      }
      for (const [name, count] of itemCounts) {
        lines.push(`  ${name}${count > 1 ? ` (x${count})` : ''}`);
      }
    }

    // Weight
    lines.push(
      `\nWeight: ${inventory.currentWeight.toFixed(1)} / ${inventory.carryingCapacity} lbs`
    );
    if (this.isEncumbered(inventory)) {
      lines.push('  ** ENCUMBERED **');
    }

    return lines.join('\n');
  }
}
