/**
 * D&D 5e Death Saving Throw mechanics
 */

import type { CharacterSheet, DeathSaves } from '@ai-dm/shared';

/**
 * Create initial death saves state
 */
export function createDeathSaves(): DeathSaves {
  return {
    successes: 0,
    failures: 0,
    stable: false,
  };
}

/**
 * Result of making a death saving throw
 */
export interface DeathSaveResult {
  roll: number;
  success: boolean;
  criticalSuccess: boolean; // Nat 20
  criticalFailure: boolean; // Nat 1
  totalSuccesses: number;
  totalFailures: number;
  outcome: 'continues' | 'stabilized' | 'regained_consciousness' | 'dead';
  hpRegained?: number;
}

/**
 * Check if character is dying (at 0 HP and not stable)
 */
export function isDying(character: CharacterSheet): boolean {
  return (
    character.stats.hitPoints.current <= 0 &&
    (!character.deathSaves || !character.deathSaves.stable)
  );
}

/**
 * Check if character is unconscious (at 0 HP but stable)
 */
export function isUnconscious(character: CharacterSheet): boolean {
  return (
    character.stats.hitPoints.current <= 0 &&
    character.deathSaves?.stable === true
  );
}

/**
 * Check if character is dead
 */
export function isDead(character: CharacterSheet): boolean {
  return (
    character.deathSaves !== undefined &&
    character.deathSaves.failures >= 3
  );
}

/**
 * Make a death saving throw
 */
export function makeDeathSave(character: CharacterSheet): DeathSaveResult {
  // Initialize death saves if not present
  if (!character.deathSaves) {
    character.deathSaves = createDeathSaves();
  }

  const roll = Math.floor(Math.random() * 20) + 1;
  const criticalSuccess = roll === 20;
  const criticalFailure = roll === 1;
  const success = roll >= 10;

  // Apply the result
  if (criticalSuccess) {
    // Natural 20: Regain 1 HP and become conscious
    character.stats.hitPoints.current = 1;
    resetDeathSaves(character);

    return {
      roll,
      success: true,
      criticalSuccess: true,
      criticalFailure: false,
      totalSuccesses: 0,
      totalFailures: 0,
      outcome: 'regained_consciousness',
      hpRegained: 1,
    };
  }

  if (criticalFailure) {
    // Natural 1: Two failures
    character.deathSaves.failures += 2;
  } else if (success) {
    character.deathSaves.successes += 1;
  } else {
    character.deathSaves.failures += 1;
  }

  // Check outcomes
  let outcome: DeathSaveResult['outcome'] = 'continues';

  if (character.deathSaves.failures >= 3) {
    outcome = 'dead';
  } else if (character.deathSaves.successes >= 3) {
    character.deathSaves.stable = true;
    outcome = 'stabilized';
  }

  return {
    roll,
    success,
    criticalSuccess,
    criticalFailure,
    totalSuccesses: character.deathSaves.successes,
    totalFailures: character.deathSaves.failures,
    outcome,
  };
}

/**
 * Reset death saves (called when HP is regained)
 */
export function resetDeathSaves(character: CharacterSheet): void {
  // Remove death saves entirely when the character regains HP
  delete character.deathSaves;
}

/**
 * Apply damage to a dying character
 * @returns true if this kills the character
 */
export function applyDamageWhileDying(
  character: CharacterSheet,
  damage: number,
  isCritical: boolean = false
): { dead: boolean; failuresAdded: number } {
  if (!character.deathSaves) {
    character.deathSaves = createDeathSaves();
  }

  // Check for massive damage (instant death)
  if (damage >= character.stats.hitPoints.max) {
    character.deathSaves.failures = 3;
    return { dead: true, failuresAdded: 3 };
  }

  // Critical hits cause 2 failures, regular damage causes 1
  const failuresToAdd = isCritical ? 2 : 1;
  character.deathSaves.failures += failuresToAdd;

  // No longer stable if was stable
  character.deathSaves.stable = false;

  return {
    dead: character.deathSaves.failures >= 3,
    failuresAdded: failuresToAdd,
  };
}

/**
 * Stabilize a dying character
 */
export function stabilize(character: CharacterSheet): boolean {
  if (character.stats.hitPoints.current > 0) {
    return false; // Already conscious
  }

  if (!character.deathSaves) {
    character.deathSaves = createDeathSaves();
  }

  if (character.deathSaves.failures >= 3) {
    return false; // Already dead
  }

  character.deathSaves.stable = true;
  return true;
}

/**
 * Heal a dying/unconscious character
 * @returns true if successfully healed
 */
export function healDyingCharacter(
  character: CharacterSheet,
  healAmount: number
): boolean {
  if (healAmount <= 0) {
    return false;
  }

  const maxHp = character.stats.hitPoints.max;
  character.stats.hitPoints.current = Math.min(healAmount, maxHp);

  // Reset death saves on gaining HP
  resetDeathSaves(character);

  return true;
}

/**
 * Format death saves for display
 */
export function formatDeathSaves(character: CharacterSheet): string {
  if (character.stats.hitPoints.current > 0) {
    return `${character.name} is conscious and healthy.`;
  }

  if (!character.deathSaves) {
    return `${character.name} is at 0 HP (death saves not started).`;
  }

  if (character.deathSaves.failures >= 3) {
    return `${character.name} is DEAD.`;
  }

  if (character.deathSaves.stable) {
    return `${character.name} is unconscious but STABLE (0 HP).`;
  }

  const successes = '●'.repeat(character.deathSaves.successes) + '○'.repeat(3 - character.deathSaves.successes);
  const failures = '●'.repeat(character.deathSaves.failures) + '○'.repeat(3 - character.deathSaves.failures);

  return [
    `${character.name} is DYING (0 HP)`,
    `Successes: [${successes}] (${character.deathSaves.successes}/3)`,
    `Failures:  [${failures}] (${character.deathSaves.failures}/3)`,
  ].join('\n');
}

/**
 * Check the status at 0 HP
 */
export function getZeroHPStatus(character: CharacterSheet): 'dying' | 'stable' | 'dead' | 'conscious' {
  if (character.stats.hitPoints.current > 0) {
    return 'conscious';
  }

  if (!character.deathSaves) {
    return 'dying';
  }

  if (character.deathSaves.failures >= 3) {
    return 'dead';
  }

  if (character.deathSaves.stable) {
    return 'stable';
  }

  return 'dying';
}
