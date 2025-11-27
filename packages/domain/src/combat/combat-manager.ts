import type {
  CombatState,
  CombatParticipant,
  EntityId,
  CreatureStats,
  AbilityScores,
  DiceRoll,
} from '@ai-dm/shared';
import { createEntityId } from '@ai-dm/shared';

/**
 * D&D 5e Conditions
 */
export type Condition =
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
  | 'exhaustion1'
  | 'exhaustion2'
  | 'exhaustion3'
  | 'exhaustion4'
  | 'exhaustion5'
  | 'exhaustion6'
  | 'concentrating';

/**
 * Condition effects for reference
 */
export const CONDITION_EFFECTS: Record<Condition, string[]> = {
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
  exhaustion1: ['Disadvantage on ability checks'],
  exhaustion2: ['Speed halved'],
  exhaustion3: ['Disadvantage on attacks and saves'],
  exhaustion4: ['HP maximum halved'],
  exhaustion5: ['Speed reduced to 0'],
  exhaustion6: ['Death'],
  concentrating: ['Must maintain concentration, CON save on damage'],
};

/**
 * Attack result details
 */
export interface AttackResult {
  attacker: string;
  target: string;
  attackRoll: DiceRoll;
  isCritical: boolean;
  isCriticalMiss: boolean;
  hits: boolean;
  targetAC: number;
  damage?: DiceRoll;
  damageType?: string;
  totalDamage?: number;
  narrative: string;
}

/**
 * Saving throw result
 */
export interface SavingThrowResult {
  entity: string;
  ability: keyof AbilityScores;
  dc: number;
  roll: DiceRoll;
  modifier: number;
  total: number;
  success: boolean;
  hasAdvantage: boolean;
  hasDisadvantage: boolean;
  narrative: string;
}

/**
 * Combat manager handles all combat mechanics
 */
export class CombatManager {
  private state: CombatState | null = null;
  private participantStats: Map<EntityId, CreatureStats> = new Map();

  /**
   * Start a new combat encounter
   */
  startCombat(
    participants: Array<{
      entityId: EntityId;
      name: string;
      isPlayer: boolean;
      stats: CreatureStats;
      initiativeBonus?: number;
    }>
  ): CombatState {
    // Roll initiative for all participants
    const combatParticipants: CombatParticipant[] = participants.map((p) => {
      const dexMod = this.getAbilityModifier(p.stats.abilityScores.dexterity);
      const bonus = p.initiativeBonus ?? dexMod;
      const roll = this.rollDie(20);
      const initiative = roll + bonus;

      // Store stats for later reference
      this.participantStats.set(p.entityId, p.stats);

      return {
        entityId: p.entityId,
        name: p.name,
        initiative,
        isPlayer: p.isPlayer,
        conditions: [],
      };
    });

    // Sort by initiative (highest first), with DEX as tiebreaker
    combatParticipants.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      const aDex = this.participantStats.get(a.entityId)?.abilityScores.dexterity ?? 10;
      const bDex = this.participantStats.get(b.entityId)?.abilityScores.dexterity ?? 10;
      return bDex - aDex;
    });

    this.state = {
      isActive: true,
      round: 1,
      participants: combatParticipants,
      currentTurnIndex: 0,
    };

    return this.state;
  }

  /**
   * End combat
   */
  endCombat(): void {
    this.state = null;
    this.participantStats.clear();
  }

  /**
   * Get current combat state
   */
  getState(): CombatState | null {
    return this.state;
  }

  /**
   * Get current turn participant
   */
  getCurrentParticipant(): CombatParticipant | null {
    if (!this.state) return null;
    return this.state.participants[this.state.currentTurnIndex] ?? null;
  }

  /**
   * Advance to next turn
   */
  nextTurn(): CombatParticipant | null {
    if (!this.state) return null;

    this.state.currentTurnIndex++;

    // Check if round is complete
    if (this.state.currentTurnIndex >= this.state.participants.length) {
      this.state.currentTurnIndex = 0;
      this.state.round++;
    }

    // Skip dead/removed participants
    const current = this.getCurrentParticipant();
    if (current?.conditions.includes('unconscious') || current?.conditions.includes('dead')) {
      return this.nextTurn();
    }

    return current;
  }

  /**
   * Make an attack roll
   */
  makeAttack(
    attackerId: EntityId,
    targetId: EntityId,
    attackBonus: number,
    damageNotation: string,
    damageType: string,
    options?: {
      advantage?: boolean;
      disadvantage?: boolean;
      targetAC?: number;
    }
  ): AttackResult {
    const attacker = this.getParticipant(attackerId);
    const target = this.getParticipant(targetId);
    const targetStats = this.participantStats.get(targetId);

    if (!attacker || !target) {
      throw new Error('Attacker or target not found in combat');
    }

    const targetAC = options?.targetAC ?? targetStats?.armorClass ?? 10;

    // Check for conditions affecting the roll
    const hasAdvantage = options?.advantage || this.hasAdvantageOnAttack(attackerId, targetId);
    const hasDisadvantage = options?.disadvantage || this.hasDisadvantageOnAttack(attackerId, targetId);

    // Roll attack
    const attackRoll = this.rollD20WithAdvantage(hasAdvantage, hasDisadvantage);
    const total = attackRoll.total + attackBonus;

    const isCritical = attackRoll.results[0] === 20;
    const isCriticalMiss = attackRoll.results[0] === 1;
    const hits = !isCriticalMiss && (isCritical || total >= targetAC);

    const result: AttackResult = {
      attacker: attacker.name,
      target: target.name,
      attackRoll: { ...attackRoll, purpose: 'attack roll' },
      isCritical,
      isCriticalMiss,
      hits,
      targetAC,
      narrative: '',
    };

    // Roll damage if hit
    if (hits) {
      const damage = this.rollDamage(damageNotation, isCritical);
      result.damage = { ...damage, purpose: 'damage' };
      result.damageType = damageType;
      result.totalDamage = damage.total;
    }

    // Generate narrative
    result.narrative = this.generateAttackNarrative(result);

    return result;
  }

  /**
   * Make a saving throw
   */
  makeSavingThrow(
    entityId: EntityId,
    ability: keyof AbilityScores,
    dc: number,
    options?: {
      advantage?: boolean;
      disadvantage?: boolean;
      proficient?: boolean;
    }
  ): SavingThrowResult {
    const participant = this.getParticipant(entityId);
    const stats = this.participantStats.get(entityId);

    if (!participant || !stats) {
      throw new Error('Entity not found in combat');
    }

    const abilityScore = stats.abilityScores[ability];
    const modifier = this.getAbilityModifier(abilityScore);
    const profBonus = options?.proficient && stats.proficiencyBonus ? stats.proficiencyBonus : 0;
    const totalMod = modifier + profBonus;

    // Check conditions
    const hasAdvantage = options?.advantage ?? false;
    let hasDisadvantage = options?.disadvantage ?? false;

    // Certain conditions cause auto-fail or disadvantage
    if (
      (ability === 'strength' || ability === 'dexterity') &&
      (participant.conditions.includes('paralyzed') ||
        participant.conditions.includes('stunned') ||
        participant.conditions.includes('unconscious'))
    ) {
      // Auto-fail
      return {
        entity: participant.name,
        ability,
        dc,
        roll: { notation: '1d20', results: [1], total: 1, purpose: 'saving throw' },
        modifier: totalMod,
        total: 1 + totalMod,
        success: false,
        hasAdvantage: false,
        hasDisadvantage: false,
        narrative: `${participant.name} automatically fails the ${ability} saving throw due to their condition.`,
      };
    }

    if (participant.conditions.includes('poisoned')) {
      hasDisadvantage = true;
    }

    const roll = this.rollD20WithAdvantage(hasAdvantage, hasDisadvantage);
    const total = roll.total + totalMod;
    const success = total >= dc;

    return {
      entity: participant.name,
      ability,
      dc,
      roll: { ...roll, purpose: 'saving throw' },
      modifier: totalMod,
      total,
      success,
      hasAdvantage,
      hasDisadvantage,
      narrative: `${participant.name} rolls a ${total} on their ${ability} saving throw (DC ${dc}): ${success ? 'SUCCESS' : 'FAILURE'}!`,
    };
  }

  /**
   * Apply a condition to a participant
   */
  applyCondition(entityId: EntityId, condition: Condition): string {
    const participant = this.getParticipant(entityId);
    if (!participant) {
      throw new Error('Entity not found in combat');
    }

    if (!participant.conditions.includes(condition)) {
      participant.conditions.push(condition);
    }

    const effects = CONDITION_EFFECTS[condition];
    return `${participant.name} is now ${condition}.\nEffects:\n${effects.map((e) => `  • ${e}`).join('\n')}`;
  }

  /**
   * Remove a condition from a participant
   */
  removeCondition(entityId: EntityId, condition: Condition): string {
    const participant = this.getParticipant(entityId);
    if (!participant) {
      throw new Error('Entity not found in combat');
    }

    const index = participant.conditions.indexOf(condition);
    if (index > -1) {
      participant.conditions.splice(index, 1);
      return `${participant.name} is no longer ${condition}.`;
    }

    return `${participant.name} was not ${condition}.`;
  }

  /**
   * Apply damage to a participant
   */
  applyDamage(entityId: EntityId, damage: number): string {
    const stats = this.participantStats.get(entityId);
    const participant = this.getParticipant(entityId);

    if (!stats || !participant) {
      throw new Error('Entity not found in combat');
    }

    const previousHP = stats.hitPoints.current;
    stats.hitPoints.current = Math.max(0, stats.hitPoints.current - damage);

    let narrative = `${participant.name} takes ${damage} damage (${previousHP} → ${stats.hitPoints.current} HP).`;

    // Check for unconscious/death
    if (stats.hitPoints.current === 0) {
      if (participant.isPlayer) {
        this.applyCondition(entityId, 'unconscious');
        narrative += ` ${participant.name} falls unconscious and must make death saving throws!`;
      } else {
        participant.conditions.push('dead');
        narrative += ` ${participant.name} is defeated!`;
      }
    }

    return narrative;
  }

  /**
   * Heal a participant
   */
  applyHealing(entityId: EntityId, healing: number): string {
    const stats = this.participantStats.get(entityId);
    const participant = this.getParticipant(entityId);

    if (!stats || !participant) {
      throw new Error('Entity not found in combat');
    }

    const previousHP = stats.hitPoints.current;
    stats.hitPoints.current = Math.min(stats.hitPoints.max, stats.hitPoints.current + healing);

    // Remove unconscious if healed from 0
    if (previousHP === 0 && stats.hitPoints.current > 0) {
      this.removeCondition(entityId, 'unconscious');
    }

    return `${participant.name} regains ${healing} HP (${previousHP} → ${stats.hitPoints.current} HP).`;
  }

  /**
   * Get combat summary
   */
  getSummary(): string {
    if (!this.state) {
      return 'No combat is currently active.';
    }

    const lines: string[] = [
      `=== COMBAT - Round ${this.state.round} ===`,
      '',
    ];

    this.state.participants.forEach((p, i) => {
      const stats = this.participantStats.get(p.entityId);
      const hp = stats ? `${stats.hitPoints.current}/${stats.hitPoints.max} HP` : 'HP unknown';
      const current = i === this.state!.currentTurnIndex ? ' ← CURRENT' : '';
      const conditions = p.conditions.length > 0 ? ` [${p.conditions.join(', ')}]` : '';
      const type = p.isPlayer ? '🛡️' : '👹';

      lines.push(`${type} ${p.initiative}: ${p.name} (${hp})${conditions}${current}`);
    });

    return lines.join('\n');
  }

  // ============ Private Helpers ============

  private getParticipant(entityId: EntityId): CombatParticipant | undefined {
    return this.state?.participants.find((p) => p.entityId === entityId);
  }

  private getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  private rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  private rollD20WithAdvantage(
    advantage: boolean,
    disadvantage: boolean
  ): Omit<DiceRoll, 'purpose'> {
    const roll1 = this.rollDie(20);
    const roll2 = this.rollDie(20);

    // Advantage and disadvantage cancel out
    if (advantage && disadvantage) {
      return { notation: '1d20', results: [roll1], total: roll1 };
    }

    if (advantage) {
      const best = Math.max(roll1, roll2);
      return { notation: '1d20 (advantage)', results: [roll1, roll2], total: best };
    }

    if (disadvantage) {
      const worst = Math.min(roll1, roll2);
      return { notation: '1d20 (disadvantage)', results: [roll1, roll2], total: worst };
    }

    return { notation: '1d20', results: [roll1], total: roll1 };
  }

  private rollDamage(notation: string, critical: boolean): Omit<DiceRoll, 'purpose'> {
    // Parse notation like "2d6+3"
    const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) {
      throw new Error(`Invalid damage notation: ${notation}`);
    }

    let numDice = parseInt(match[1]!);
    const dieSize = parseInt(match[2]!);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    // Critical doubles the dice
    if (critical) {
      numDice *= 2;
    }

    const results: number[] = [];
    for (let i = 0; i < numDice; i++) {
      results.push(this.rollDie(dieSize));
    }

    const total = results.reduce((sum, r) => sum + r, 0) + modifier;
    const displayNotation = critical ? `${notation} (CRITICAL!)` : notation;

    return { notation: displayNotation, results, total };
  }

  private hasAdvantageOnAttack(attackerId: EntityId, targetId: EntityId): boolean {
    const target = this.getParticipant(targetId);
    if (!target) return false;

    // Advantage conditions
    return (
      target.conditions.includes('blinded') ||
      target.conditions.includes('paralyzed') ||
      target.conditions.includes('stunned') ||
      target.conditions.includes('unconscious') ||
      target.conditions.includes('restrained')
    );
  }

  private hasDisadvantageOnAttack(attackerId: EntityId, targetId: EntityId): boolean {
    const attacker = this.getParticipant(attackerId);
    if (!attacker) return false;

    return (
      attacker.conditions.includes('blinded') ||
      attacker.conditions.includes('frightened') ||
      attacker.conditions.includes('poisoned') ||
      attacker.conditions.includes('prone') ||
      attacker.conditions.includes('restrained')
    );
  }

  private generateAttackNarrative(result: AttackResult): string {
    if (result.isCriticalMiss) {
      return `${result.attacker} swings wildly at ${result.target} but critically misses! (Natural 1)`;
    }

    if (result.isCritical) {
      return `CRITICAL HIT! ${result.attacker} strikes ${result.target} with devastating precision for ${result.totalDamage} ${result.damageType} damage!`;
    }

    if (result.hits) {
      return `${result.attacker} hits ${result.target} (${result.attackRoll.total} vs AC ${result.targetAC}) for ${result.totalDamage} ${result.damageType} damage!`;
    }

    return `${result.attacker}'s attack misses ${result.target} (${result.attackRoll.total} vs AC ${result.targetAC}).`;
  }
}
