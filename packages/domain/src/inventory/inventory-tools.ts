/**
 * DM Tools for inventory management
 */

import type { ToolDefinition } from '../tools/tool-registry.js';
import type {
  WorldState,
  CharacterSheet,
  EntityId,
  EquipmentSlot,
  ItemEntity,
} from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';
import { InventoryManager } from './inventory-manager.js';
import { ALL_ITEMS, createItem } from './standard-items.js';

/**
 * Context for inventory tools
 */
export interface InventoryToolContext {
  worldState: WorldState;
  getPlayerCharacter: () => CharacterSheet | undefined;
  updatePlayerCharacter: (character: CharacterSheet) => void;
}

/**
 * Create give item tool
 */
export function createGiveItemTool(
  getContext: () => InventoryToolContext
): ToolDefinition<{ itemName: string; quantity?: number }, string> {
  return {
    tool: {
      name: 'give_item',
      description: `Give an item to the player character. Use standard item names like 'longsword', 'potion of healing', 'leather armor', etc.`,
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'Name of the item to give (e.g., "longsword", "potion of healing")',
          },
          quantity: {
            type: 'number',
            description: 'Number of items to give (default 1)',
          },
        },
        required: ['itemName'],
      },
    },
    handler: async ({ itemName, quantity = 1 }) => {
      const { worldState, getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      // Find item template by name
      const normalizedName = itemName.toLowerCase().replace(/\s+/g, '');
      const templateKey = Object.keys(ALL_ITEMS).find(
        (key) =>
          key.toLowerCase() === normalizedName ||
          ALL_ITEMS[key]?.name.toLowerCase().replace(/\s+/g, '') === normalizedName
      );

      if (!templateKey) {
        return `Item "${itemName}" not found. Try common items like: longsword, dagger, leather armor, potion of healing, torch.`;
      }

      const template = ALL_ITEMS[templateKey];
      if (!template) {
        return `Item "${itemName}" not found.`;
      }

      const manager = new InventoryManager(worldState);
      const addedItems: string[] = [];

      for (let i = 0; i < quantity; i++) {
        const item = createItem(template);
        // Add to world state
        worldState.entities.set(item.id, item);

        // Add to character inventory
        const result = manager.addToBackpack(character.inventory, item.id);
        if (result.success) {
          addedItems.push(item.name);
        }
      }

      updatePlayerCharacter(character);

      if (addedItems.length === 0) {
        return `Failed to add ${itemName} to inventory.`;
      }

      if (quantity === 1) {
        return `Added ${template.name} to inventory.`;
      }
      return `Added ${quantity}x ${template.name} to inventory.`;
    },
  };
}

/**
 * Create take item tool (remove from player)
 */
export function createTakeItemTool(
  getContext: () => InventoryToolContext
): ToolDefinition<{ itemName: string }, string> {
  return {
    tool: {
      name: 'take_item',
      description: `Remove an item from the player character's inventory.`,
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'Name of the item to remove',
          },
        },
        required: ['itemName'],
      },
    },
    handler: async ({ itemName }) => {
      const { worldState, getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const manager = new InventoryManager(worldState);
      const normalizedName = itemName.toLowerCase();

      // Search backpack for item
      for (const itemId of character.inventory.backpack) {
        const item = manager.getItem(itemId);
        if (item && item.name.toLowerCase().includes(normalizedName)) {
          const result = manager.removeFromBackpack(character.inventory, itemId);
          if (result.success) {
            updatePlayerCharacter(character);
            return `Removed ${item.name} from inventory.`;
          }
        }
      }

      return `Item "${itemName}" not found in inventory.`;
    },
  };
}

/**
 * Create equip item tool
 */
export function createEquipItemTool(
  getContext: () => InventoryToolContext
): ToolDefinition<{ itemName: string; slot?: string }, string> {
  return {
    tool: {
      name: 'equip_item',
      description: `Equip an item from the player's backpack. Weapons go to mainHand, armor to armor slot, shields to offHand.`,
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'Name of the item to equip',
          },
          slot: {
            type: 'string',
            description: 'Equipment slot (mainHand, offHand, armor, head, etc.)',
          },
        },
        required: ['itemName'],
      },
    },
    handler: async ({ itemName, slot }) => {
      const { worldState, getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const manager = new InventoryManager(worldState);
      const normalizedName = itemName.toLowerCase();

      // Find item in backpack
      let targetItemId: EntityId | undefined;
      for (const itemId of character.inventory.backpack) {
        const item = manager.getItem(itemId);
        if (item && item.name.toLowerCase().includes(normalizedName)) {
          targetItemId = itemId;
          break;
        }
      }

      if (!targetItemId) {
        return `Item "${itemName}" not found in backpack.`;
      }

      const targetSlot = slot as EquipmentSlot | undefined;
      const result = manager.equipItem(character.inventory, targetItemId, targetSlot);

      if (result.success) {
        // Recalculate AC if armor changed
        if (targetSlot === 'armor' || targetSlot === 'offHand' || !targetSlot) {
          const dexMod = Math.floor(
            (character.stats.abilityScores.dexterity - 10) / 2
          );
          character.stats.armorClass = manager.calculateArmorClass(
            character.inventory,
            dexMod
          );
        }
        updatePlayerCharacter(character);
      }

      return result.message;
    },
  };
}

/**
 * Create unequip item tool
 */
export function createUnequipItemTool(
  getContext: () => InventoryToolContext
): ToolDefinition<{ slot: string }, string> {
  return {
    tool: {
      name: 'unequip_item',
      description: `Unequip an item from a slot and put it in the backpack.`,
      parameters: {
        type: 'object',
        properties: {
          slot: {
            type: 'string',
            description: 'Equipment slot to unequip from (mainHand, offHand, armor, etc.)',
          },
        },
        required: ['slot'],
      },
    },
    handler: async ({ slot }) => {
      const { worldState, getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const manager = new InventoryManager(worldState);
      const equipSlot = slot as EquipmentSlot;

      const result = manager.unequipItem(character.inventory, equipSlot);

      if (result.success) {
        // Recalculate AC if armor changed
        if (equipSlot === 'armor' || equipSlot === 'offHand') {
          const dexMod = Math.floor(
            (character.stats.abilityScores.dexterity - 10) / 2
          );
          character.stats.armorClass = manager.calculateArmorClass(
            character.inventory,
            dexMod
          );
        }
        updatePlayerCharacter(character);
      }

      return result.message;
    },
  };
}

/**
 * Create check inventory tool
 */
export function createCheckInventoryTool(
  getContext: () => InventoryToolContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'check_inventory',
      description: `View the player character's current inventory, equipped items, and currency.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const { worldState, getPlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const manager = new InventoryManager(worldState);
      return manager.formatInventory(character.inventory);
    },
  };
}

/**
 * Create use consumable tool
 */
export function createUseConsumableTool(
  getContext: () => InventoryToolContext
): ToolDefinition<{ itemName: string }, string> {
  return {
    tool: {
      name: 'use_consumable',
      description: `Use a consumable item like a potion. Returns the effect that should be applied.`,
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'Name of the consumable to use',
          },
        },
        required: ['itemName'],
      },
    },
    handler: async ({ itemName }) => {
      const { worldState, getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const manager = new InventoryManager(worldState);
      const normalizedName = itemName.toLowerCase();

      // Find consumable in backpack
      for (const itemId of character.inventory.backpack) {
        const item = manager.getItem(itemId);
        if (
          item &&
          item.itemType === 'consumable' &&
          item.name.toLowerCase().includes(normalizedName)
        ) {
          const result = manager.useConsumable(character.inventory, itemId);
          if (result.success) {
            updatePlayerCharacter(character);
            if (result.effect) {
              return `Used ${item.name}. Effect: ${result.effect}`;
            }
          }
          return result.message;
        }
      }

      return `Consumable "${itemName}" not found in inventory.`;
    },
  };
}

/**
 * Create modify currency tool
 */
export function createModifyCurrencyTool(
  getContext: () => InventoryToolContext
): ToolDefinition<{ gold?: number; silver?: number; copper?: number; action: string }, string> {
  return {
    tool: {
      name: 'modify_currency',
      description: `Add or remove currency from the player. Use positive numbers to add, negative to remove.`,
      parameters: {
        type: 'object',
        properties: {
          gold: {
            type: 'number',
            description: 'Amount of gold to add/remove',
          },
          silver: {
            type: 'number',
            description: 'Amount of silver to add/remove',
          },
          copper: {
            type: 'number',
            description: 'Amount of copper to add/remove',
          },
          action: {
            type: 'string',
            enum: ['add', 'remove'],
            description: 'Whether to add or remove currency',
          },
        },
        required: ['action'],
      },
    },
    handler: async ({ gold = 0, silver = 0, copper = 0, action }) => {
      const { getPlayerCharacter, updatePlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const currency = character.inventory.currency;
      const multiplier = action === 'remove' ? -1 : 1;

      // Apply changes
      currency.gold += gold * multiplier;
      currency.silver += silver * multiplier;
      currency.copper += copper * multiplier;

      // Prevent negative values
      if (currency.gold < 0 || currency.silver < 0 || currency.copper < 0) {
        // Revert
        currency.gold -= gold * multiplier;
        currency.silver -= silver * multiplier;
        currency.copper -= copper * multiplier;
        return 'Insufficient funds.';
      }

      updatePlayerCharacter(character);

      const parts: string[] = [];
      if (gold) parts.push(`${gold} gp`);
      if (silver) parts.push(`${silver} sp`);
      if (copper) parts.push(`${copper} cp`);

      return `${action === 'add' ? 'Added' : 'Removed'} ${parts.join(', ')}. Current balance: ${currency.gold} gp, ${currency.silver} sp, ${currency.copper} cp`;
    },
  };
}

/**
 * Create all inventory tools
 */
export function createInventoryTools(
  getContext: () => InventoryToolContext
): ToolDefinition<any, any>[] {
  return [
    createGiveItemTool(getContext),
    createTakeItemTool(getContext),
    createEquipItemTool(getContext),
    createUnequipItemTool(getContext),
    createCheckInventoryTool(getContext),
    createUseConsumableTool(getContext),
    createModifyCurrencyTool(getContext),
  ];
}
