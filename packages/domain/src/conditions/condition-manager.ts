/**
 * Enhanced Conditions Manager with duration tracking, source tracking, and automatic expiration
 */

import type { EntityId, AbilityScores } from '@ai-dm/shared';

/**
 * D&D 5e Condition types
 */
export type ConditionType =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'
  | 'concentrating';

/**
 * Duration types for conditions
 */
export type DurationType =
  | { type: 'rounds'; rounds: number }
  | { type: 'minutes'; minutes: number }
  | { type: 'until_save'; ability: keyof AbilityScores; dc: number; saveFrequency: 'start_of_turn' | 'end_of_turn' }
  | { type: 'until_rest'; restType: 'short' | 'long' }
  | { type: 'until_removed' }
  | { type: 'concentration'; concentratorId: EntityId };

/**
 * Instance of an active condition on an entity
 */
export interface ConditionInstance {
  /** Unique ID for this condition instance */
  id: string;
  /** The condition type */
  condition: ConditionType;
  /** What caused this condition (spell name, creature, etc.) */
  source: string;
  /** Entity ID of who/what applied the condition */
  sourceEntityId?: EntityId;
  /** How long the condition lasts */
  duration: DurationType;
  /** Remaining duration (for rounds/minutes) */
  remaining?: number;
  /** When the condition was applied */
  appliedAt: {
    round: number;
    turnIndex: number;
  };
  /** Exhaustion level (1-6) if this is exhaustion */
  exhaustionLevel?: number;
}

/**
 * Condition effects lookup (matches existing CONDITION_EFFECTS)
 */
export const CONDITION_EFFECTS: Record<ConditionType, string[]> = {
  blinded: [
    'Cannot see, auto-fails checks requiring sight',
    'Attack rolls have disadvantage',
    'Attacks against have advantage',
  ],
  charmed: [
    'Cannot attack the charmer',
    'Charmer has advantage on social checks',
  ],
  deafened: ['Cannot hear, auto-fails checks requiring hearing'],
  frightened: [
    'Disadvantage on ability checks and attacks while source visible',
    'Cannot willingly move closer to source',
  ],
  grappled: ['Speed becomes 0', 'Ends if grappler incapacitated or forced apart'],
  incapacitated: ['Cannot take actions or reactions'],
  invisible: [
    'Cannot be seen without special sense',
    'Attack rolls have advantage',
    'Attacks against have disadvantage',
  ],
  paralyzed: [
    'Incapacitated, cannot move or speak',
    'Auto-fails STR and DEX saves',
    'Attacks have advantage, crits if within 5 feet',
  ],
  petrified: [
    'Transformed to stone, incapacitated',
    'Resistance to all damage, immune to poison/disease',
    'Auto-fails STR and DEX saves',
  ],
  poisoned: ['Disadvantage on attack rolls and ability checks'],
  prone: [
    'Can only crawl (costs extra movement)',
    'Disadvantage on attack rolls',
    'Attacks within 5ft have advantage, beyond have disadvantage',
  ],
  restrained: [
    'Speed becomes 0',
    'Disadvantage on attack rolls and DEX saves',
    'Attacks against have advantage',
  ],
  stunned: [
    'Incapacitated, cannot move, can only speak falteringly',
    'Auto-fails STR and DEX saves',
    'Attacks against have advantage',
  ],
  unconscious: [
    'Incapacitated, cannot move or speak, unaware',
    'Drops held items, falls prone',
    'Auto-fails STR and DEX saves',
    'Attacks have advantage, crits within 5 feet',
  ],
  exhaustion: [
    'Level 1: Disadvantage on ability checks',
    'Level 2: Speed halved',
    'Level 3: Disadvantage on attacks and saves',
    'Level 4: HP maximum halved',
    'Level 5: Speed reduced to 0',
    'Level 6: Death',
  ],
  concentrating: ['Must maintain concentration, CON save on damage'],
};

/**
 * Result of checking conditions at turn start/end
 */
export interface ConditionCheckResult {
  expired: ConditionInstance[];
  saveRequired: Array<{
    condition: ConditionInstance;
    ability: keyof AbilityScores;
    dc: number;
  }>;
  reminders: string[];
}

/**
 * Manages conditions for all entities
 */
export class ConditionManager {
  private conditions: Map<EntityId, ConditionInstance[]> = new Map();
  private nextId = 1;

  /**
   * Apply a condition to an entity
   */
  applyCondition(
    entityId: EntityId,
    entityName: string,
    condition: ConditionType,
    source: string,
    duration: DurationType,
    currentRound: number,
    currentTurnIndex: number,
    options?: {
      sourceEntityId?: EntityId;
      exhaustionLevel?: number;
    }
  ): { instance: ConditionInstance; message: string } {
    const entityConditions = this.conditions.get(entityId) ?? [];

    // Check for stacking rules
    const existing = entityConditions.find((c) => c.condition === condition);
    if (existing && condition !== 'exhaustion') {
      // Most conditions don't stack - refresh duration instead
      existing.duration = duration;
      existing.source = source;
      if (duration.type === 'rounds') {
        existing.remaining = duration.rounds;
      } else if (duration.type === 'minutes') {
        existing.remaining = duration.minutes * 10; // Convert to rounds
      }

      return {
        instance: existing,
        message: `${entityName}'s ${condition} condition has been refreshed from ${source}.`,
      };
    }

    // Handle exhaustion specially - it stacks
    if (condition === 'exhaustion') {
      const exhaustionLevel = options?.exhaustionLevel ?? 1;
      const currentExhaustion = entityConditions.find((c) => c.condition === 'exhaustion');

      if (currentExhaustion) {
        const newLevel = Math.min(6, (currentExhaustion.exhaustionLevel ?? 1) + exhaustionLevel);
        currentExhaustion.exhaustionLevel = newLevel;
        currentExhaustion.source = source;

        if (newLevel >= 6) {
          return {
            instance: currentExhaustion,
            message: `${entityName} has reached exhaustion level 6 and dies!`,
          };
        }

        return {
          instance: currentExhaustion,
          message: `${entityName}'s exhaustion increases to level ${newLevel}. ${this.getExhaustionEffects(newLevel)}`,
        };
      }
    }

    // Create new condition instance
    const instance: ConditionInstance = {
      id: `cond_${this.nextId++}`,
      condition,
      source,
      duration,
      appliedAt: { round: currentRound, turnIndex: currentTurnIndex },
    };

    if (options?.sourceEntityId) {
      instance.sourceEntityId = options.sourceEntityId;
    }

    if (condition === 'exhaustion') {
      instance.exhaustionLevel = options?.exhaustionLevel ?? 1;
    }

    if (duration.type === 'rounds') {
      instance.remaining = duration.rounds;
    } else if (duration.type === 'minutes') {
      instance.remaining = duration.minutes * 10;
    }

    entityConditions.push(instance);
    this.conditions.set(entityId, entityConditions);

    const effects = CONDITION_EFFECTS[condition];
    let effectsStr = effects.map((e) => `  • ${e}`).join('\n');

    if (condition === 'exhaustion' && instance.exhaustionLevel) {
      effectsStr = this.getExhaustionEffects(instance.exhaustionLevel);
    }

    return {
      instance,
      message: `${entityName} is now ${condition} (from ${source}).\nEffects:\n${effectsStr}`,
    };
  }

  /**
   * Remove a condition from an entity
   */
  removeCondition(
    entityId: EntityId,
    entityName: string,
    conditionOrId: ConditionType | string
  ): { removed: boolean; message: string } {
    const entityConditions = this.conditions.get(entityId);
    if (!entityConditions) {
      return { removed: false, message: `${entityName} has no conditions.` };
    }

    // Find by ID or by condition type
    const index = entityConditions.findIndex(
      (c) => c.id === conditionOrId || c.condition === conditionOrId
    );

    if (index === -1) {
      return { removed: false, message: `${entityName} does not have that condition.` };
    }

    const removed = entityConditions.splice(index, 1)[0]!;

    // If exhaustion, reduce level instead of removing
    if (removed.condition === 'exhaustion' && (removed.exhaustionLevel ?? 1) > 1) {
      removed.exhaustionLevel = (removed.exhaustionLevel ?? 1) - 1;
      entityConditions.push(removed);
      return {
        removed: false,
        message: `${entityName}'s exhaustion decreases to level ${removed.exhaustionLevel}.`,
      };
    }

    return { removed: true, message: `${entityName} is no longer ${removed.condition}.` };
  }

  /**
   * Get all conditions for an entity
   */
  getConditions(entityId: EntityId): ConditionInstance[] {
    return this.conditions.get(entityId) ?? [];
  }

  /**
   * Get simple condition types for an entity (for combat manager compatibility)
   */
  getConditionTypes(entityId: EntityId): string[] {
    const conditions = this.conditions.get(entityId) ?? [];
    return conditions.map((c) => {
      if (c.condition === 'exhaustion' && c.exhaustionLevel) {
        return `exhaustion${c.exhaustionLevel}`;
      }
      return c.condition;
    });
  }

  /**
   * Check conditions at start of turn
   */
  checkStartOfTurn(
    entityId: EntityId,
    entityName: string,
    currentRound: number
  ): ConditionCheckResult {
    const result: ConditionCheckResult = {
      expired: [],
      saveRequired: [],
      reminders: [],
    };

    const entityConditions = this.conditions.get(entityId);
    if (!entityConditions) return result;

    for (const condition of entityConditions) {
      // Check for saves at start of turn
      if (
        condition.duration.type === 'until_save' &&
        condition.duration.saveFrequency === 'start_of_turn'
      ) {
        result.saveRequired.push({
          condition,
          ability: condition.duration.ability,
          dc: condition.duration.dc,
        });
        result.reminders.push(
          `${entityName} must make a DC ${condition.duration.dc} ${condition.duration.ability} save to end ${condition.condition} (from ${condition.source}).`
        );
      }

      // Add reminders for ongoing conditions
      if (condition.remaining !== undefined && condition.remaining <= 2) {
        result.reminders.push(
          `${entityName}'s ${condition.condition} will end in ${condition.remaining} round${condition.remaining !== 1 ? 's' : ''}.`
        );
      }
    }

    return result;
  }

  /**
   * Check conditions at end of turn - handles expiration
   */
  checkEndOfTurn(
    entityId: EntityId,
    entityName: string,
    currentRound: number
  ): ConditionCheckResult {
    const result: ConditionCheckResult = {
      expired: [],
      saveRequired: [],
      reminders: [],
    };

    const entityConditions = this.conditions.get(entityId);
    if (!entityConditions) return result;

    const toRemove: string[] = [];

    for (const condition of entityConditions) {
      // Decrement remaining duration
      if (condition.remaining !== undefined) {
        condition.remaining--;

        if (condition.remaining <= 0) {
          result.expired.push(condition);
          toRemove.push(condition.id);
          result.reminders.push(
            `${entityName}'s ${condition.condition} (from ${condition.source}) has ended.`
          );
          continue;
        }
      }

      // Check for saves at end of turn
      if (
        condition.duration.type === 'until_save' &&
        condition.duration.saveFrequency === 'end_of_turn'
      ) {
        result.saveRequired.push({
          condition,
          ability: condition.duration.ability,
          dc: condition.duration.dc,
        });
        result.reminders.push(
          `${entityName} must make a DC ${condition.duration.dc} ${condition.duration.ability} save to end ${condition.condition} (from ${condition.source}).`
        );
      }
    }

    // Remove expired conditions
    for (const id of toRemove) {
      const index = entityConditions.findIndex((c) => c.id === id);
      if (index > -1) {
        entityConditions.splice(index, 1);
      }
    }

    return result;
  }

  /**
   * Handle successful save to end a condition
   */
  handleSuccessfulSave(
    entityId: EntityId,
    entityName: string,
    conditionId: string
  ): { removed: boolean; message: string } {
    return this.removeCondition(entityId, entityName, conditionId);
  }

  /**
   * Clear conditions on rest
   */
  clearOnRest(entityId: EntityId, entityName: string, restType: 'short' | 'long'): string[] {
    const entityConditions = this.conditions.get(entityId);
    if (!entityConditions) return [];

    const removed: string[] = [];

    for (let i = entityConditions.length - 1; i >= 0; i--) {
      const condition = entityConditions[i]!;

      // Check if condition ends on this rest type
      if (condition.duration.type === 'until_rest') {
        if (
          condition.duration.restType === restType ||
          (condition.duration.restType === 'short' && restType === 'long')
        ) {
          removed.push(`${condition.condition} (from ${condition.source})`);
          entityConditions.splice(i, 1);
        }
      }

      // Long rest reduces exhaustion by 1
      if (restType === 'long' && condition.condition === 'exhaustion') {
        if ((condition.exhaustionLevel ?? 1) > 1) {
          condition.exhaustionLevel = (condition.exhaustionLevel ?? 1) - 1;
          removed.push(`exhaustion reduced to level ${condition.exhaustionLevel}`);
        } else {
          removed.push('exhaustion');
          entityConditions.splice(i, 1);
        }
      }
    }

    return removed;
  }

  /**
   * Break concentration for an entity
   */
  breakConcentration(concentratorId: EntityId): Array<{ entityId: EntityId; condition: string }> {
    const broken: Array<{ entityId: EntityId; condition: string }> = [];

    for (const [entityId, conditions] of this.conditions.entries()) {
      for (let i = conditions.length - 1; i >= 0; i--) {
        const condition = conditions[i]!;
        if (
          condition.duration.type === 'concentration' &&
          condition.duration.concentratorId === concentratorId
        ) {
          broken.push({ entityId, condition: condition.condition });
          conditions.splice(i, 1);
        }
      }
    }

    // Also remove the concentrating condition from the caster
    const casterConditions = this.conditions.get(concentratorId);
    if (casterConditions) {
      const concIndex = casterConditions.findIndex((c) => c.condition === 'concentrating');
      if (concIndex > -1) {
        casterConditions.splice(concIndex, 1);
      }
    }

    return broken;
  }

  /**
   * Check if entity has a specific condition
   */
  hasCondition(entityId: EntityId, condition: ConditionType): boolean {
    const conditions = this.conditions.get(entityId);
    return conditions?.some((c) => c.condition === condition) ?? false;
  }

  /**
   * Get all entities with conditions (for status display)
   */
  getAllConditions(): Map<EntityId, ConditionInstance[]> {
    return new Map(this.conditions);
  }

  /**
   * Clear all conditions (e.g., when combat ends for temporary conditions)
   */
  clearCombatConditions(entityId: EntityId): void {
    const entityConditions = this.conditions.get(entityId);
    if (!entityConditions) return;

    // Keep only conditions that persist outside combat
    const persistent = entityConditions.filter(
      (c) =>
        c.duration.type === 'until_rest' ||
        c.duration.type === 'until_removed' ||
        c.condition === 'exhaustion'
    );

    this.conditions.set(entityId, persistent);
  }

  private getExhaustionEffects(level: number): string {
    const effects: string[] = [];
    if (level >= 1) effects.push('  • Disadvantage on ability checks');
    if (level >= 2) effects.push('  • Speed halved');
    if (level >= 3) effects.push('  • Disadvantage on attacks and saves');
    if (level >= 4) effects.push('  • HP maximum halved');
    if (level >= 5) effects.push('  • Speed reduced to 0');
    if (level >= 6) effects.push('  • Death');
    return effects.join('\n');
  }
}

/**
 * Create a condition manager instance
 */
export function createConditionManager(): ConditionManager {
  return new ConditionManager();
}
