/**
 * Environmental Effects DM Tools
 *
 * Tools for managing environmental hazards, terrain, lighting, and weather.
 */

import type { ToolDefinition } from './tool-registry.js';
import {
  createEnvironmentManager,
  EnvironmentManager,
  type LightLevel,
  type TerrainType,
  type WeatherCondition,
  type HazardType,
  type EnvironmentalEffect,
  LIGHT_EFFECTS,
  TERRAIN_EFFECTS,
  WEATHER_EFFECTS,
  HAZARD_DEFINITIONS,
} from '../combat/environmental-effects.js';

// Singleton environment manager
let environmentManager: EnvironmentManager | null = null;

function getManager(): EnvironmentManager {
  if (!environmentManager) {
    environmentManager = createEnvironmentManager();
  }
  return environmentManager;
}

/**
 * Reset the environment manager (for testing or new encounters)
 */
export function resetEnvironmentManager(): void {
  environmentManager = null;
}

// ============================================================================
// Set Light Level Tool
// ============================================================================

interface SetLightLevelArgs {
  /** Light level to set */
  level: LightLevel;
}

interface SetLightLevelResult {
  success: boolean;
  level: LightLevel;
  effects: string[];
  message: string;
}

export function createSetLightLevelTool(): ToolDefinition<
  SetLightLevelArgs,
  SetLightLevelResult
> {
  return {
    tool: {
      name: 'set_light_level',
      description:
        'Set the ambient light level for the current encounter area. ' +
        'Affects vision, stealth, and attack rolls.',
      parameters: {
        type: 'object' as const,
        properties: {
          level: {
            type: 'string',
            enum: ['bright', 'dim', 'darkness', 'magical_darkness'],
            description: 'Light level to set (bright, dim, darkness, or magical_darkness)',
          },
        },
        required: ['level'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const message = manager.setLightLevel(args.level);
      const effects = LIGHT_EFFECTS[args.level];

      const effectsList: string[] = [];
      if (effects.visionPenalty) {
        effectsList.push(`Vision: ${effects.visionPenalty.type.replace(/_/g, ' ')}`);
      }
      if (effects.attackModifier) {
        effectsList.push(`Attacks: ${effects.attackModifier.type} (${effects.attackModifier.condition})`);
      }
      if (effects.appliesConditions) {
        effectsList.push(`Conditions: ${effects.appliesConditions.join(', ')}`);
      }
      if (effects.specialRules) {
        effectsList.push(...effects.specialRules);
      }

      return {
        success: true,
        level: args.level,
        effects: effectsList,
        message,
      };
    },
  };
}

// ============================================================================
// Set Weather Tool
// ============================================================================

interface SetWeatherArgs {
  /** Weather condition to set */
  condition: WeatherCondition;
}

interface SetWeatherResult {
  success: boolean;
  condition: WeatherCondition;
  effects: string[];
  message: string;
}

export function createSetWeatherTool(): ToolDefinition<
  SetWeatherArgs,
  SetWeatherResult
> {
  return {
    tool: {
      name: 'set_weather',
      description:
        'Set the current weather condition. Affects visibility, ranged attacks, and may require saving throws.',
      parameters: {
        type: 'object' as const,
        properties: {
          condition: {
            type: 'string',
            enum: ['clear', 'precipitation', 'heavy_precipitation', 'fog', 'extreme_cold', 'extreme_heat', 'strong_wind', 'storm'],
            description: 'Weather condition to set',
          },
        },
        required: ['condition'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const message = manager.setWeather(args.condition);
      const effects = WEATHER_EFFECTS[args.condition];

      const effectsList: string[] = [];
      if (effects.visionPenalty) {
        effectsList.push(`Vision: ${effects.visionPenalty.type.replace(/_/g, ' ')}`);
      }
      if (effects.savingThrow) {
        effectsList.push(`Save: DC ${effects.savingThrow.dc} ${effects.savingThrow.ability.toUpperCase()} (${effects.savingThrow.failureEffect})`);
      }
      if (effects.attackModifier) {
        effectsList.push(`Attacks: ${effects.attackModifier.type} (${effects.attackModifier.condition})`);
      }
      if (effects.specialRules) {
        effectsList.push(...effects.specialRules);
      }

      return {
        success: true,
        condition: args.condition,
        effects: effectsList,
        message,
      };
    },
  };
}

// ============================================================================
// Set Terrain Tool
// ============================================================================

interface SetTerrainArgs {
  /** Terrain type to set */
  terrain: TerrainType;
}

interface SetTerrainResult {
  success: boolean;
  terrain: TerrainType;
  effects: string[];
  message: string;
}

export function createSetTerrainTool(): ToolDefinition<
  SetTerrainArgs,
  SetTerrainResult
> {
  return {
    tool: {
      name: 'set_terrain',
      description:
        'Set the default terrain type for the encounter area. Affects movement speed and may impose penalties.',
      parameters: {
        type: 'object' as const,
        properties: {
          terrain: {
            type: 'string',
            enum: ['normal', 'difficult', 'hazardous', 'underwater', 'climbing', 'flying'],
            description: 'Terrain type to set',
          },
        },
        required: ['terrain'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const message = manager.setTerrain(args.terrain);
      const effects = TERRAIN_EFFECTS[args.terrain];

      const effectsList: string[] = [];
      if (effects.movementMultiplier !== undefined && effects.movementMultiplier !== 1) {
        effectsList.push(`Movement: ${Math.floor(effects.movementMultiplier * 100)}% speed`);
      }
      if (effects.attackModifier) {
        effectsList.push(`Attacks: ${effects.attackModifier.type} (${effects.attackModifier.condition})`);
      }
      if (effects.specialRules) {
        effectsList.push(...effects.specialRules);
      }

      return {
        success: true,
        terrain: args.terrain,
        effects: effectsList,
        message,
      };
    },
  };
}

// ============================================================================
// Add Hazard Tool
// ============================================================================

interface AddHazardArgs {
  /** Type of hazard to add */
  hazard_type: HazardType;
  /** Duration in rounds (0 = permanent) */
  duration?: number;
  /** Source of the hazard */
  source?: string;
}

interface AddHazardResult {
  success: boolean;
  hazardId: string;
  hazardName: string;
  effects: string[];
  message: string;
}

export function createAddHazardTool(): ToolDefinition<
  AddHazardArgs,
  AddHazardResult
> {
  return {
    tool: {
      name: 'add_environmental_hazard',
      description:
        'Add an environmental hazard to the encounter area. ' +
        'Hazards can cause damage, require saving throws, or impose conditions.',
      parameters: {
        type: 'object' as const,
        properties: {
          hazard_type: {
            type: 'string',
            enum: [
              'falling', 'suffocation', 'drowning', 'fire', 'acid',
              'frigid_water', 'lava', 'quicksand', 'slippery_ice',
              'thin_ice', 'desecrated_ground', 'razorvine', 'cave_in',
            ],
            description: 'Type of hazard to add',
          },
          duration: {
            type: 'number',
            description: 'Duration in rounds (0 = permanent, default: 0)',
          },
          source: {
            type: 'string',
            description: 'Source of the hazard (e.g., "Fire Elemental", "Trap", "Natural")',
          },
        },
        required: ['hazard_type'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const options: { duration?: number; source?: string } = {};
      if (args.duration !== undefined) {
        options.duration = args.duration;
      }
      if (args.source !== undefined) {
        options.source = args.source;
      }
      const result = manager.addHazard(args.hazard_type, options);

      const definition = HAZARD_DEFINITIONS[args.hazard_type];
      const effectsList: string[] = [];
      if (definition.effects.damage) {
        effectsList.push(`Damage: ${definition.effects.damage.dice} ${definition.effects.damage.type}`);
      }
      if (definition.effects.savingThrow) {
        effectsList.push(`Save: DC ${definition.effects.savingThrow.dc} ${definition.effects.savingThrow.ability.toUpperCase()}`);
      }
      if (definition.effects.specialRules) {
        effectsList.push(...definition.effects.specialRules);
      }

      return {
        success: true,
        hazardId: result.id,
        hazardName: definition.name,
        effects: effectsList,
        message: result.message,
      };
    },
  };
}

// ============================================================================
// Remove Hazard Tool
// ============================================================================

interface RemoveHazardArgs {
  /** ID of the hazard to remove */
  hazard_id: string;
}

interface RemoveHazardResult {
  success: boolean;
  message: string;
}

export function createRemoveHazardTool(): ToolDefinition<
  RemoveHazardArgs,
  RemoveHazardResult
> {
  return {
    tool: {
      name: 'remove_environmental_hazard',
      description: 'Remove an environmental hazard from the encounter area.',
      parameters: {
        type: 'object' as const,
        properties: {
          hazard_id: {
            type: 'string',
            description: 'ID of the hazard to remove (from add_environmental_hazard result)',
          },
        },
        required: ['hazard_id'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const result = manager.removeHazard(args.hazard_id);
      return result;
    },
  };
}

// ============================================================================
// Calculate Falling Damage Tool
// ============================================================================

interface CalculateFallingDamageArgs {
  /** Height fallen in feet */
  height_feet: number;
}

interface CalculateFallingDamageResult {
  success: boolean;
  dice: string;
  averageDamage: number;
  maxDamage: number;
  message: string;
}

export function createCalculateFallingDamageTool(): ToolDefinition<
  CalculateFallingDamageArgs,
  CalculateFallingDamageResult
> {
  return {
    tool: {
      name: 'calculate_falling_damage',
      description:
        'Calculate falling damage based on height. ' +
        'Returns dice formula and average/max damage.',
      parameters: {
        type: 'object' as const,
        properties: {
          height_feet: {
            type: 'number',
            description: 'Height fallen in feet',
          },
        },
        required: ['height_feet'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const result = manager.calculateFallingDamage(args.height_feet);
      const d6Count = Math.min(Math.floor(args.height_feet / 10), 20);

      return {
        success: true,
        dice: result.dice,
        averageDamage: result.avgDamage,
        maxDamage: d6Count * 6,
        message: result.message,
      };
    },
  };
}

// ============================================================================
// Get Suffocation Status Tool
// ============================================================================

interface GetSuffocationStatusArgs {
  /** Creature's Constitution modifier */
  con_modifier: number;
  /** Rounds without air */
  rounds_without_air: number;
}

interface GetSuffocationStatusResult {
  success: boolean;
  status: 'breathing' | 'holding' | 'choking' | 'dying';
  message: string;
}

export function createGetSuffocationStatusTool(): ToolDefinition<
  GetSuffocationStatusArgs,
  GetSuffocationStatusResult
> {
  return {
    tool: {
      name: 'get_suffocation_status',
      description:
        'Get the suffocation/drowning status for a creature. ' +
        'Tracks breath holding and choking rounds.',
      parameters: {
        type: 'object' as const,
        properties: {
          con_modifier: {
            type: 'number',
            description: "Creature's Constitution modifier",
          },
          rounds_without_air: {
            type: 'number',
            description: 'Number of rounds without air',
          },
        },
        required: ['con_modifier', 'rounds_without_air'],
      },
    },
    handler: async (args) => {
      const manager = getManager();
      const result = manager.getSuffocationStatus(args.con_modifier, args.rounds_without_air);

      return {
        success: true,
        status: result.status,
        message: result.message,
      };
    },
  };
}

// ============================================================================
// Get Environment Summary Tool
// ============================================================================

interface GetEnvironmentSummaryArgs {
  // No arguments needed
}

interface GetEnvironmentSummaryResult {
  success: boolean;
  light: LightLevel;
  weather: WeatherCondition;
  terrain: TerrainType;
  activeHazards: Array<{
    id: string;
    name: string;
    source: string;
    duration: number;
  }>;
  summary: string;
}

export function createGetEnvironmentSummaryTool(): ToolDefinition<
  GetEnvironmentSummaryArgs,
  GetEnvironmentSummaryResult
> {
  return {
    tool: {
      name: 'get_environment_summary',
      description: 'Get a summary of all current environmental conditions and active hazards.',
      parameters: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const manager = getManager();
      const light = manager.getLightLevel();
      const weather = manager.getWeather();
      const terrain = manager.getTerrain();
      const hazards = manager.getActiveEffects();
      const summary = manager.getSummary();

      return {
        success: true,
        light: light.level,
        weather: weather.condition,
        terrain: terrain.type,
        activeHazards: hazards.map((h) => ({
          id: h.id,
          name: h.name,
          source: h.source,
          duration: h.duration,
        })),
        summary,
      };
    },
  };
}

// ============================================================================
// Process End of Round Tool
// ============================================================================

interface ProcessEnvironmentRoundArgs {
  // No arguments needed
}

interface ProcessEnvironmentRoundResult {
  success: boolean;
  expiredEffects: string[];
  message: string;
}

export function createProcessEnvironmentRoundTool(): ToolDefinition<
  ProcessEnvironmentRoundArgs,
  ProcessEnvironmentRoundResult
> {
  return {
    tool: {
      name: 'process_environment_round',
      description:
        'Process end of round for environmental effects. ' +
        'Decrements durations and removes expired hazards.',
      parameters: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    handler: async () => {
      const manager = getManager();
      const expired = manager.processEndOfRound();

      const message = expired.length > 0
        ? `Environment round processed. ${expired.join(' ')}`
        : 'Environment round processed. No effects expired.';

      return {
        success: true,
        expiredEffects: expired,
        message,
      };
    },
  };
}

// ============================================================================
// Get All Environment Tools
// ============================================================================

export function getEnvironmentTools(): ToolDefinition<Record<string, unknown>, unknown>[] {
  return [
    createSetLightLevelTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createSetWeatherTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createSetTerrainTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createAddHazardTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createRemoveHazardTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createCalculateFallingDamageTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createGetSuffocationStatusTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createGetEnvironmentSummaryTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
    createProcessEnvironmentRoundTool() as unknown as ToolDefinition<Record<string, unknown>, unknown>,
  ];
}
