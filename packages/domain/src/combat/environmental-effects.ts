/**
 * Environmental Effects System
 *
 * Implements D&D 5e environmental hazards, terrain effects, and conditions.
 * Based on DMG Chapter 5 (Adventure Environments).
 */

import type { EntityId, AbilityScores } from '@ai-dm/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Light levels affecting vision and combat
 */
export type LightLevel = 'bright' | 'dim' | 'darkness' | 'magical_darkness';

/**
 * Terrain types that affect movement and combat
 */
export type TerrainType =
  | 'normal'
  | 'difficult'
  | 'hazardous'
  | 'underwater'
  | 'climbing'
  | 'flying';

/**
 * Weather conditions
 */
export type WeatherCondition =
  | 'clear'
  | 'precipitation' // Rain/snow
  | 'heavy_precipitation'
  | 'fog'
  | 'extreme_cold'
  | 'extreme_heat'
  | 'strong_wind'
  | 'storm';

/**
 * Environmental hazard types
 */
export type HazardType =
  | 'falling'
  | 'suffocation'
  | 'drowning'
  | 'fire'
  | 'acid'
  | 'frigid_water'
  | 'lava'
  | 'quicksand'
  | 'slippery_ice'
  | 'thin_ice'
  | 'desecrated_ground'
  | 'razorvine'
  | 'cave_in';

/**
 * Active environmental effect on the battlefield
 */
export interface EnvironmentalEffect {
  id: string;
  type: HazardType | TerrainType | WeatherCondition;
  name: string;
  description: string;
  /** Area affected (could be entire battlefield or specific zones) */
  area: 'entire' | { x: number; y: number; radius: number }[];
  /** Effects applied */
  effects: EnvironmentEffectDetails;
  /** Duration in rounds (0 = permanent) */
  duration: number;
  /** Source of the effect */
  source: string;
}

export interface EnvironmentEffectDetails {
  /** Movement speed multiplier (0.5 = half speed) */
  movementMultiplier?: number;
  /** Additional movement cost per square */
  additionalMovementCost?: number;
  /** Damage per turn */
  damage?: {
    dice: string;
    type: string;
    saveDC?: number;
    saveAbility?: keyof AbilityScores;
    saveHalves?: boolean;
  };
  /** Required save to avoid/reduce effects */
  savingThrow?: {
    ability: keyof AbilityScores;
    dc: number;
    frequency: 'start_of_turn' | 'end_of_turn' | 'on_enter' | 'continuous';
    failureEffect: string;
    successEffect?: string;
  };
  /** Vision penalties */
  visionPenalty?: {
    type: 'disadvantage' | 'blocked' | 'heavily_obscured' | 'lightly_obscured';
    range?: number;
  };
  /** Attack roll modifiers */
  attackModifier?: {
    type: 'advantage' | 'disadvantage';
    condition?: string;
  };
  /** Conditions applied */
  appliesConditions?: string[];
  /** Special rules text */
  specialRules?: string[];
}

// ============================================================================
// Environmental Effect Definitions
// ============================================================================

/**
 * Light level effects on combat
 */
export const LIGHT_EFFECTS: Record<LightLevel, EnvironmentEffectDetails> = {
  bright: {},
  dim: {
    visionPenalty: { type: 'lightly_obscured' },
    attackModifier: { type: 'disadvantage', condition: 'Perception checks relying on sight' },
  },
  darkness: {
    visionPenalty: { type: 'heavily_obscured' },
    attackModifier: { type: 'disadvantage', condition: 'Attack rolls without darkvision' },
    appliesConditions: ['blinded'],
    specialRules: ['Creatures without darkvision are effectively blinded'],
  },
  magical_darkness: {
    visionPenalty: { type: 'blocked' },
    appliesConditions: ['blinded'],
    specialRules: ['Darkvision cannot penetrate magical darkness', 'Nonmagical light cannot illuminate'],
  },
};

/**
 * Terrain effects
 */
export const TERRAIN_EFFECTS: Record<TerrainType, EnvironmentEffectDetails> = {
  normal: {},
  difficult: {
    movementMultiplier: 0.5,
    specialRules: ['Each foot of movement costs 2 feet'],
  },
  hazardous: {
    movementMultiplier: 0.5,
    damage: { dice: '1d4', type: 'piercing' },
    specialRules: ['Counts as difficult terrain', 'May cause damage when moving through'],
  },
  underwater: {
    movementMultiplier: 0.5,
    attackModifier: { type: 'disadvantage', condition: 'Melee attacks without swimming speed' },
    specialRules: [
      'Ranged weapon attacks miss beyond normal range',
      'Ranged weapon attacks have disadvantage',
      'Creatures without swim speed have disadvantage on attacks',
      'Fire damage halved, lightning damage doubled',
    ],
  },
  climbing: {
    movementMultiplier: 0.5,
    specialRules: ['Each foot of climbing costs 2 feet', 'May require Athletics checks'],
  },
  flying: {
    specialRules: ['Must have fly speed or be under effect of flight magic', 'Falling may occur if knocked prone'],
  },
};

/**
 * Weather condition effects
 */
export const WEATHER_EFFECTS: Record<WeatherCondition, EnvironmentEffectDetails> = {
  clear: {},
  precipitation: {
    visionPenalty: { type: 'lightly_obscured' },
    specialRules: ['Light rain or snow', 'Ranged attacks have disadvantage beyond 30 feet'],
  },
  heavy_precipitation: {
    visionPenalty: { type: 'heavily_obscured' },
    specialRules: ['Heavy rain or blizzard', 'Ranged attacks beyond 5 feet have disadvantage'],
  },
  fog: {
    visionPenalty: { type: 'heavily_obscured' },
    specialRules: ['Vision limited to 30 feet or less'],
  },
  extreme_cold: {
    savingThrow: {
      ability: 'constitution',
      dc: 10,
      frequency: 'continuous',
      failureEffect: 'Gain one level of exhaustion',
      successEffect: 'No effect for 1 hour',
    },
    specialRules: [
      'DC increases by 1 for each hour exposed',
      'Creatures with cold resistance/immunity auto-succeed',
      'Warm clothing provides advantage on save',
    ],
  },
  extreme_heat: {
    savingThrow: {
      ability: 'constitution',
      dc: 5,
      frequency: 'continuous',
      failureEffect: 'Gain one level of exhaustion',
      successEffect: 'No effect for 1 hour',
    },
    specialRules: [
      'DC increases by 1 for each hour exposed',
      'Creatures in heavy armor/heavy clothing have disadvantage',
      'Creatures with fire resistance/immunity auto-succeed',
    ],
  },
  strong_wind: {
    attackModifier: { type: 'disadvantage', condition: 'Ranged weapon attacks' },
    specialRules: [
      'Disadvantage on Perception checks relying on hearing',
      'Extinguishes open flames',
      'Disperses fog',
      'Flying becomes difficult',
    ],
  },
  storm: {
    visionPenalty: { type: 'heavily_obscured' },
    attackModifier: { type: 'disadvantage', condition: 'Ranged weapon attacks' },
    specialRules: [
      'Combines effects of heavy precipitation and strong wind',
      'Lightning may strike randomly',
      'Thunder deafens temporarily',
    ],
  },
};

/**
 * Hazard definitions with damage and save info
 */
export const HAZARD_DEFINITIONS: Record<HazardType, {
  name: string;
  description: string;
  effects: EnvironmentEffectDetails;
}> = {
  falling: {
    name: 'Falling',
    description: 'Damage from falling from height',
    effects: {
      damage: { dice: '1d6', type: 'bludgeoning' },
      specialRules: [
        '1d6 bludgeoning damage per 10 feet fallen (max 20d6)',
        'Creature lands prone unless damage avoided',
      ],
    },
  },
  suffocation: {
    name: 'Suffocation',
    description: 'Running out of air or being choked',
    effects: {
      specialRules: [
        'Can hold breath for 1 + CON modifier minutes (minimum 30 seconds)',
        'When out of breath, survive for CON modifier rounds (minimum 1)',
        'At start of next turn after 0 rounds, drop to 0 HP and dying',
      ],
    },
  },
  drowning: {
    name: 'Drowning',
    description: 'Underwater without air',
    effects: {
      specialRules: [
        'Same as suffocation rules',
        'Falling unconscious underwater: dropping to 0 HP',
      ],
    },
  },
  fire: {
    name: 'Fire Hazard',
    description: 'Burning terrain or catching fire',
    effects: {
      damage: { dice: '1d10', type: 'fire' },
      specialRules: [
        'Take damage when entering or starting turn in fire',
        'If catching fire: 1d10 fire damage at start of each turn',
        'Action to extinguish (or DC 10 DEX save)',
      ],
    },
  },
  acid: {
    name: 'Acid Pool',
    description: 'Corrosive liquid hazard',
    effects: {
      damage: { dice: '2d6', type: 'acid' },
      specialRules: ['Take damage when entering or starting turn in acid'],
    },
  },
  frigid_water: {
    name: 'Frigid Water',
    description: 'Extremely cold water',
    effects: {
      savingThrow: {
        ability: 'constitution',
        dc: 10,
        frequency: 'on_enter',
        failureEffect: 'Gain one level of exhaustion',
        successEffect: 'No effect',
      },
      specialRules: [
        'DC increases by 5 for each minute immersed',
        'Creatures with cold resistance/immunity auto-succeed',
      ],
    },
  },
  lava: {
    name: 'Lava',
    description: 'Molten rock',
    effects: {
      damage: { dice: '10d10', type: 'fire' },
      specialRules: [
        '10d10 fire damage on contact',
        '18d10 fire damage when submerged',
        'Objects take damage too',
      ],
    },
  },
  quicksand: {
    name: 'Quicksand',
    description: 'Sinking sand trap',
    effects: {
      movementMultiplier: 0,
      savingThrow: {
        ability: 'strength',
        dc: 10,
        frequency: 'start_of_turn',
        failureEffect: 'Sink 1d4 feet deeper',
        successEffect: 'No additional sinking',
      },
      specialRules: [
        'Creature sinks 1d4+1 feet on entering',
        'At depth equal to height: completely submerged',
        'Escaping requires STR check vs DC 10 + feet sunk',
      ],
    },
  },
  slippery_ice: {
    name: 'Slippery Ice',
    description: 'Smooth ice surface',
    effects: {
      movementMultiplier: 0.5,
      savingThrow: {
        ability: 'dexterity',
        dc: 10,
        frequency: 'on_enter',
        failureEffect: 'Fall prone',
        successEffect: 'No effect',
      },
      specialRules: ['Difficult terrain', 'DEX save or fall prone when moving more than 10 feet'],
    },
  },
  thin_ice: {
    name: 'Thin Ice',
    description: 'Ice that might break',
    effects: {
      savingThrow: {
        ability: 'dexterity',
        dc: 10,
        frequency: 'on_enter',
        failureEffect: 'Ice breaks, fall into frigid water below',
      },
      specialRules: [
        '10-foot square can support 200 lbs',
        'Weight threshold varies',
        'Breaking through subjects creature to frigid water',
      ],
    },
  },
  desecrated_ground: {
    name: 'Desecrated Ground',
    description: 'Unholy ground that corrupts',
    effects: {
      specialRules: [
        'Undead have advantage on saving throws',
        'Healing spells have disadvantage (or auto-fail certain effects)',
        'Fiends and undead cannot be turned',
      ],
    },
  },
  razorvine: {
    name: 'Razorvine',
    description: 'Sharp, dangerous plant growth',
    effects: {
      damage: {
        dice: '1d10',
        type: 'slashing',
        saveDC: 10,
        saveAbility: 'dexterity',
        saveHalves: true,
      },
      specialRules: ['DEX save DC 10 when entering or touching', 'Vulnerable to fire'],
    },
  },
  cave_in: {
    name: 'Cave-In/Collapse',
    description: 'Falling debris',
    effects: {
      damage: {
        dice: '4d10',
        type: 'bludgeoning',
        saveDC: 15,
        saveAbility: 'dexterity',
        saveHalves: true,
      },
      specialRules: [
        'DEX save DC 15 for half damage',
        'Failure: buried (restrained, suffocating)',
        'Escape requires DC 20 Athletics check',
      ],
    },
  },
};

// ============================================================================
// Environment Manager Class
// ============================================================================

/**
 * Manages environmental effects for combat and exploration
 */
export class EnvironmentManager {
  private activeEffects: Map<string, EnvironmentalEffect> = new Map();
  private currentLight: LightLevel = 'bright';
  private currentWeather: WeatherCondition = 'clear';
  private currentTerrain: TerrainType = 'normal';
  private nextEffectId = 1;

  /**
   * Set the ambient light level
   */
  setLightLevel(level: LightLevel): string {
    const oldLevel = this.currentLight;
    this.currentLight = level;

    const effects = LIGHT_EFFECTS[level];
    const messages: string[] = [`Light level changed from ${oldLevel} to ${level}.`];

    if (effects.visionPenalty) {
      messages.push(`Vision: ${effects.visionPenalty.type.replace('_', ' ')}`);
    }
    if (effects.specialRules) {
      messages.push(...effects.specialRules.map((r) => `  • ${r}`));
    }

    return messages.join('\n');
  }

  /**
   * Get current light level and effects
   */
  getLightLevel(): { level: LightLevel; effects: EnvironmentEffectDetails } {
    return { level: this.currentLight, effects: LIGHT_EFFECTS[this.currentLight] };
  }

  /**
   * Set the weather condition
   */
  setWeather(weather: WeatherCondition): string {
    const oldWeather = this.currentWeather;
    this.currentWeather = weather;

    const effects = WEATHER_EFFECTS[weather];
    const messages: string[] = [`Weather changed from ${oldWeather} to ${weather}.`];

    if (effects.savingThrow) {
      messages.push(`Save Required: DC ${effects.savingThrow.dc} ${effects.savingThrow.ability.toUpperCase()}`);
    }
    if (effects.specialRules) {
      messages.push(...effects.specialRules.map((r) => `  • ${r}`));
    }

    return messages.join('\n');
  }

  /**
   * Get current weather and effects
   */
  getWeather(): { condition: WeatherCondition; effects: EnvironmentEffectDetails } {
    return { condition: this.currentWeather, effects: WEATHER_EFFECTS[this.currentWeather] };
  }

  /**
   * Set the default terrain type
   */
  setTerrain(terrain: TerrainType): string {
    const oldTerrain = this.currentTerrain;
    this.currentTerrain = terrain;

    const effects = TERRAIN_EFFECTS[terrain];
    const messages: string[] = [`Terrain changed from ${oldTerrain} to ${terrain}.`];

    if (effects.movementMultiplier && effects.movementMultiplier !== 1) {
      messages.push(`Movement: ${Math.floor(effects.movementMultiplier * 100)}% speed`);
    }
    if (effects.specialRules) {
      messages.push(...effects.specialRules.map((r) => `  • ${r}`));
    }

    return messages.join('\n');
  }

  /**
   * Get current terrain and effects
   */
  getTerrain(): { type: TerrainType; effects: EnvironmentEffectDetails } {
    return { type: this.currentTerrain, effects: TERRAIN_EFFECTS[this.currentTerrain] };
  }

  /**
   * Add an environmental hazard
   */
  addHazard(
    hazardType: HazardType,
    options?: {
      area?: 'entire' | { x: number; y: number; radius: number }[];
      duration?: number;
      source?: string;
    }
  ): { id: string; message: string } {
    const definition = HAZARD_DEFINITIONS[hazardType];
    const id = `env_${this.nextEffectId++}`;

    const effect: EnvironmentalEffect = {
      id,
      type: hazardType,
      name: definition.name,
      description: definition.description,
      area: options?.area ?? 'entire',
      effects: definition.effects,
      duration: options?.duration ?? 0,
      source: options?.source ?? 'Environment',
    };

    this.activeEffects.set(id, effect);

    const messages: string[] = [`${definition.name} hazard added.`];
    if (definition.effects.damage) {
      messages.push(`Damage: ${definition.effects.damage.dice} ${definition.effects.damage.type}`);
    }
    if (definition.effects.savingThrow) {
      messages.push(`Save: DC ${definition.effects.savingThrow.dc} ${definition.effects.savingThrow.ability.toUpperCase()}`);
    }
    if (definition.effects.specialRules) {
      messages.push('Rules:');
      messages.push(...definition.effects.specialRules.map((r) => `  • ${r}`));
    }

    return { id, message: messages.join('\n') };
  }

  /**
   * Remove an environmental hazard
   */
  removeHazard(id: string): { success: boolean; message: string } {
    const effect = this.activeEffects.get(id);
    if (!effect) {
      return { success: false, message: 'Hazard not found.' };
    }

    this.activeEffects.delete(id);
    return { success: true, message: `${effect.name} hazard removed.` };
  }

  /**
   * Get all active effects
   */
  getActiveEffects(): EnvironmentalEffect[] {
    return Array.from(this.activeEffects.values());
  }

  /**
   * Calculate falling damage
   */
  calculateFallingDamage(heightFeet: number): { dice: string; avgDamage: number; message: string } {
    const d6Count = Math.min(Math.floor(heightFeet / 10), 20);
    const avgDamage = Math.floor(d6Count * 3.5);

    return {
      dice: `${d6Count}d6`,
      avgDamage,
      message: `Falling ${heightFeet} feet: ${d6Count}d6 bludgeoning damage (avg ${avgDamage}). Creature lands prone.`,
    };
  }

  /**
   * Get suffocation status
   */
  getSuffocationStatus(conModifier: number, roundsWithoutAir: number): {
    status: 'breathing' | 'holding' | 'choking' | 'dying';
    message: string;
  } {
    const holdMinutes = Math.max(1 + conModifier, 0.5);
    const holdRounds = Math.floor(holdMinutes * 10); // 10 rounds per minute
    const chokingRounds = Math.max(conModifier, 1);

    if (roundsWithoutAir <= 0) {
      return {
        status: 'breathing',
        message: `Breathing normally. Can hold breath for ${holdMinutes} minute(s).`,
      };
    }

    if (roundsWithoutAir <= holdRounds) {
      const remaining = holdRounds - roundsWithoutAir;
      return {
        status: 'holding',
        message: `Holding breath. ${remaining} rounds remaining before choking.`,
      };
    }

    const chokingRoundsElapsed = roundsWithoutAir - holdRounds;
    if (chokingRoundsElapsed < chokingRounds) {
      const remaining = chokingRounds - chokingRoundsElapsed;
      return {
        status: 'choking',
        message: `CHOKING! ${remaining} rounds until death. Cannot breathe!`,
      };
    }

    return {
      status: 'dying',
      message: 'Suffocated! Drop to 0 HP and dying.',
    };
  }

  /**
   * Get environment summary
   */
  getSummary(): string {
    const lines: string[] = ['=== ENVIRONMENT ==='];

    lines.push(`Light: ${this.currentLight}`);
    lines.push(`Weather: ${this.currentWeather}`);
    lines.push(`Terrain: ${this.currentTerrain}`);

    if (this.activeEffects.size > 0) {
      lines.push('\nActive Hazards:');
      for (const effect of this.activeEffects.values()) {
        lines.push(`  • ${effect.name} (${effect.source})`);
        if (effect.duration > 0) {
          lines.push(`    Duration: ${effect.duration} rounds remaining`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Process end of round (decrement durations)
   */
  processEndOfRound(): string[] {
    const expiredEffects: string[] = [];

    for (const [id, effect] of this.activeEffects) {
      if (effect.duration > 0) {
        effect.duration--;
        if (effect.duration <= 0) {
          expiredEffects.push(`${effect.name} hazard has ended.`);
          this.activeEffects.delete(id);
        }
      }
    }

    return expiredEffects;
  }

  /**
   * Clear all effects
   */
  clearAll(): void {
    this.activeEffects.clear();
    this.currentLight = 'bright';
    this.currentWeather = 'clear';
    this.currentTerrain = 'normal';
  }
}

/**
 * Create an environment manager instance
 */
export function createEnvironmentManager(): EnvironmentManager {
  return new EnvironmentManager();
}
