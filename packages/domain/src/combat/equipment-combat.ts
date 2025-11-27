/**
 * Equipment-aware combat utilities
 * Integrates inventory system with combat mechanics
 */

import type {
  CharacterSheet,
  CharacterInventory,
  ItemEntity,
  WeaponDetails,
  AbilityScores,
  WorldState,
  EntityId,
} from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';
import type { ToolDefinition } from '../tools/tool-registry.js';
import type { CombatManager, AttackResult } from './combat-manager.js';
import { InventoryManager } from '../inventory/inventory-manager.js';

/**
 * Attack statistics calculated from equipment
 */
export interface EquipmentAttackStats {
  attackBonus: number;
  damageNotation: string;
  damageType: string;
  weaponName: string;
  isRanged: boolean;
  properties: string[];
}

/**
 * Calculate attack statistics from equipped weapon
 */
export function calculateAttackStats(
  character: CharacterSheet,
  weapon: ItemEntity,
  worldState: WorldState
): EquipmentAttackStats {
  const weaponDetails = weapon.weaponDetails;
  if (!weaponDetails) {
    throw new Error(`${weapon.name} has no weapon details`);
  }

  const abilityScores = character.stats.abilityScores;
  const proficiencyBonus = character.stats.proficiencyBonus ?? 2;

  // Determine ability modifier
  let abilityMod: number;
  if (weaponDetails.weaponType === 'ranged') {
    abilityMod = getModifier(abilityScores.dexterity);
  } else if (weaponDetails.properties.includes('finesse')) {
    // Finesse: use higher of STR or DEX
    const strMod = getModifier(abilityScores.strength);
    const dexMod = getModifier(abilityScores.dexterity);
    abilityMod = Math.max(strMod, dexMod);
  } else {
    abilityMod = getModifier(abilityScores.strength);
  }

  // Check proficiency
  let isProficient = false;
  const proficiencies = character.proficiencies.weapons;

  // Check for specific weapon or category proficiency
  if (
    proficiencies.includes(weapon.name) ||
    proficiencies.includes('Simple') && weaponDetails.category === 'simple' ||
    proficiencies.includes('Martial') && weaponDetails.category === 'martial'
  ) {
    isProficient = true;
  }

  const attackBonus = abilityMod + (isProficient ? proficiencyBonus : 0);

  // Build damage notation
  let damageNotation = weaponDetails.damageDice;
  if (abilityMod !== 0) {
    damageNotation += abilityMod > 0 ? `+${abilityMod}` : `${abilityMod}`;
  }

  return {
    attackBonus,
    damageNotation,
    damageType: weaponDetails.damageType,
    weaponName: weapon.name,
    isRanged: weaponDetails.weaponType === 'ranged',
    properties: weaponDetails.properties,
  };
}

/**
 * Get unarmed attack stats
 */
export function getUnarmedAttackStats(character: CharacterSheet): EquipmentAttackStats {
  const strMod = getModifier(character.stats.abilityScores.strength);
  const proficiencyBonus = character.stats.proficiencyBonus ?? 2;

  return {
    attackBonus: strMod + proficiencyBonus, // All characters are proficient with unarmed
    damageNotation: `1${strMod >= 0 ? '+' + strMod : strMod}`,
    damageType: 'bludgeoning',
    weaponName: 'Unarmed Strike',
    isRanged: false,
    properties: [],
  };
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Context for equipment-aware combat tools
 */
export interface EquipmentCombatContext {
  combatManager: CombatManager;
  worldState: WorldState;
  getPlayerCharacter: () => CharacterSheet | undefined;
  getEntityStats: (id: EntityId) => {
    name: string;
    armorClass: number;
    hitPoints: { current: number; max: number };
    abilityScores: AbilityScores;
    proficiencyBonus?: number;
  } | null;
}

/**
 * Create weapon attack tool - automatically uses equipped weapon
 */
export function createWeaponAttackTool(
  getContext: () => EquipmentCombatContext
): ToolDefinition<
  {
    targetId: string;
    useOffhand?: boolean;
    advantage?: boolean;
    disadvantage?: boolean;
  },
  AttackResult | string
> {
  return {
    tool: {
      name: 'weapon_attack',
      description: `Make an attack with the currently equipped weapon. Automatically calculates attack bonus and damage based on weapon stats and character abilities.`,
      parameters: {
        type: 'object',
        properties: {
          targetId: {
            type: 'string',
            description: 'Entity ID of the target',
          },
          useOffhand: {
            type: 'boolean',
            description: 'Use offhand weapon instead of main hand',
          },
          advantage: {
            type: 'boolean',
            description: 'Force advantage on the attack roll',
          },
          disadvantage: {
            type: 'boolean',
            description: 'Force disadvantage on the attack roll',
          },
        },
        required: ['targetId'],
      },
    },
    handler: async ({ targetId, useOffhand, advantage, disadvantage }) => {
      const { combatManager, worldState, getPlayerCharacter } = getContext();
      const character = getPlayerCharacter();

      if (!character) {
        return 'No player character found.';
      }

      const inventoryManager = new InventoryManager(worldState);

      // Get weapon from inventory
      const weaponSlot = useOffhand ? 'offHand' : 'mainHand';
      const weaponId = character.inventory.equipped[weaponSlot];

      let attackStats: EquipmentAttackStats;

      if (weaponId) {
        const weapon = inventoryManager.getItem(weaponId);
        if (!weapon || weapon.itemType !== 'weapon') {
          // Check if it's a shield (can't attack with it normally)
          if (weapon?.armorDetails?.armorType === 'shield') {
            return `Cannot attack with a shield. Use your main hand weapon or unarmed strike.`;
          }
          return `No weapon equipped in ${useOffhand ? 'off hand' : 'main hand'}. Making unarmed attack.`;
        }
        attackStats = calculateAttackStats(character, weapon, worldState);
      } else {
        attackStats = getUnarmedAttackStats(character);
      }

      const options: { advantage?: boolean; disadvantage?: boolean } = {};
      if (advantage !== undefined) options.advantage = advantage;
      if (disadvantage !== undefined) options.disadvantage = disadvantage;

      const result = combatManager.makeAttack(
        character.id,
        createEntityId(targetId),
        attackStats.attackBonus,
        attackStats.damageNotation,
        attackStats.damageType,
        options
      );

      // Enhance narrative with weapon name
      if (result.hits) {
        result.narrative = `${result.attacker} attacks ${result.target} with ${attackStats.weaponName}! ${result.narrative}`;
      } else {
        result.narrative = `${result.attacker} swings ${attackStats.weaponName} at ${result.target}. ${result.narrative}`;
      }

      return result;
    },
  };
}

/**
 * Create tool to show attack options based on equipment
 */
export function createShowAttackOptionsTool(
  getContext: () => EquipmentCombatContext
): ToolDefinition<Record<string, never>, string> {
  return {
    tool: {
      name: 'show_attack_options',
      description: `Show available attack options based on equipped weapons and abilities.`,
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

      const inventoryManager = new InventoryManager(worldState);
      const lines: string[] = ['=== ATTACK OPTIONS ==='];

      // Main hand weapon
      const mainHandId = character.inventory.equipped.mainHand;
      if (mainHandId) {
        const weapon = inventoryManager.getItem(mainHandId);
        if (weapon && weapon.itemType === 'weapon') {
          const stats = calculateAttackStats(character, weapon, worldState);
          lines.push(`\nMain Hand: ${stats.weaponName}`);
          lines.push(`  Attack: +${stats.attackBonus}`);
          lines.push(`  Damage: ${stats.damageNotation} ${stats.damageType}`);
          if (stats.properties.length > 0) {
            lines.push(`  Properties: ${stats.properties.join(', ')}`);
          }
        }
      } else {
        const unarmed = getUnarmedAttackStats(character);
        lines.push(`\nMain Hand: Unarmed Strike`);
        lines.push(`  Attack: +${unarmed.attackBonus}`);
        lines.push(`  Damage: ${unarmed.damageNotation} ${unarmed.damageType}`);
      }

      // Off hand weapon (if dual wielding)
      const offHandId = character.inventory.equipped.offHand;
      if (offHandId) {
        const offhand = inventoryManager.getItem(offHandId);
        if (offhand && offhand.itemType === 'weapon' && offhand.weaponDetails) {
          const stats = calculateAttackStats(character, offhand, worldState);
          lines.push(`\nOff Hand: ${stats.weaponName}`);
          lines.push(`  Attack: +${stats.attackBonus}`);
          // Off-hand attacks don't add ability modifier to damage (unless negative)
          const abilityMod = getModifier(character.stats.abilityScores.dexterity);
          const offhandDamage = offhand.weaponDetails.damageDice + (abilityMod < 0 ? `${abilityMod}` : '');
          lines.push(`  Damage: ${offhandDamage} ${stats.damageType}`);
          if (stats.properties.length > 0) {
            lines.push(`  Properties: ${stats.properties.join(', ')}`);
          }
        }
      }

      // Show AC
      lines.push(`\nArmor Class: ${character.stats.armorClass}`);

      return lines.join('\n');
    },
  };
}
