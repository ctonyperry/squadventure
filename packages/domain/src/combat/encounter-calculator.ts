/**
 * Encounter Difficulty Calculator
 *
 * Implements D&D 5e encounter building rules from the DMG (pp. 81-85).
 * Calculates encounter difficulty based on party level and monster CR.
 */

/**
 * XP Thresholds by Character Level (DMG p.82)
 * Index is (level - 1), values are [Easy, Medium, Hard, Deadly]
 */
export const XP_THRESHOLDS_BY_LEVEL: readonly [number, number, number, number][] = [
  [25, 50, 75, 100], // Level 1
  [50, 100, 150, 200], // Level 2
  [75, 150, 225, 400], // Level 3
  [125, 250, 375, 500], // Level 4
  [250, 500, 750, 1100], // Level 5
  [300, 600, 900, 1400], // Level 6
  [350, 750, 1100, 1700], // Level 7
  [450, 900, 1400, 2100], // Level 8
  [550, 1100, 1600, 2400], // Level 9
  [600, 1200, 1900, 2800], // Level 10
  [800, 1600, 2400, 3600], // Level 11
  [1000, 2000, 3000, 4500], // Level 12
  [1100, 2200, 3400, 5100], // Level 13
  [1250, 2500, 3800, 5700], // Level 14
  [1400, 2800, 4300, 6400], // Level 15
  [1600, 3200, 4800, 7200], // Level 16
  [2000, 3900, 5900, 8800], // Level 17
  [2100, 4200, 6300, 9500], // Level 18
  [2400, 4900, 7300, 10900], // Level 19
  [2800, 5700, 8500, 12700], // Level 20
];

/**
 * Encounter multiplier based on number of monsters (DMG p.82)
 * These are adjusted for standard party size (3-5 characters)
 */
export const ENCOUNTER_MULTIPLIERS: readonly { min: number; max: number; multiplier: number }[] = [
  { min: 1, max: 1, multiplier: 1 },
  { min: 2, max: 2, multiplier: 1.5 },
  { min: 3, max: 6, multiplier: 2 },
  { min: 7, max: 10, multiplier: 2.5 },
  { min: 11, max: 14, multiplier: 3 },
  { min: 15, max: Infinity, multiplier: 4 },
];

/**
 * CR to XP mapping (matches progression.json crXpRewards)
 */
export const CR_XP_MAP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

/**
 * Difficulty levels for encounters
 */
export type EncounterDifficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';

/**
 * Result of calculating encounter difficulty
 */
export interface EncounterDifficultyResult {
  /** Calculated difficulty level */
  difficulty: EncounterDifficulty;
  /** Total base XP from all monsters (before multiplier) */
  baseXP: number;
  /** Adjusted XP after applying encounter multiplier */
  adjustedXP: number;
  /** The multiplier applied based on monster count */
  multiplier: number;
  /** XP thresholds for this party */
  thresholds: {
    easy: number;
    medium: number;
    hard: number;
    deadly: number;
  };
  /** Narrative description of the difficulty */
  description: string;
  /** XP to award if encounter is won (base XP, not adjusted) */
  xpReward: number;
}

/**
 * Party composition for encounter calculations
 */
export interface PartyComposition {
  /** Array of character levels */
  levels: number[];
}

/**
 * Monster entry for encounter building
 */
export interface EncounterMonster {
  /** Challenge Rating (e.g., "1/4", "2", "10") */
  cr: string;
  /** Number of this monster type */
  count: number;
  /** Optional name for display */
  name?: string;
}

/**
 * Suggested encounter composition
 */
export interface EncounterSuggestion {
  /** Monsters in this suggestion */
  monsters: Array<{ cr: string; count: number }>;
  /** Expected difficulty */
  difficulty: EncounterDifficulty;
  /** Total base XP */
  baseXP: number;
  /** Adjusted XP */
  adjustedXP: number;
}

/**
 * Get XP thresholds for a single character level
 */
export function getXPThresholdsForLevel(level: number): {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
} {
  const clampedLevel = Math.max(1, Math.min(20, level));
  const thresholds = XP_THRESHOLDS_BY_LEVEL[clampedLevel - 1]!;

  return {
    easy: thresholds[0],
    medium: thresholds[1],
    hard: thresholds[2],
    deadly: thresholds[3],
  };
}

/**
 * Calculate combined XP thresholds for a party
 */
export function getPartyXPThresholds(party: PartyComposition): {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
} {
  const totals = { easy: 0, medium: 0, hard: 0, deadly: 0 };

  for (const level of party.levels) {
    const thresholds = getXPThresholdsForLevel(level);
    totals.easy += thresholds.easy;
    totals.medium += thresholds.medium;
    totals.hard += thresholds.hard;
    totals.deadly += thresholds.deadly;
  }

  return totals;
}

/**
 * Get the encounter multiplier based on number of monsters
 * Adjusts for party size (DMG p.83)
 */
export function getEncounterMultiplier(monsterCount: number, partySize: number): number {
  // Find base multiplier
  const entry = ENCOUNTER_MULTIPLIERS.find((e) => monsterCount >= e.min && monsterCount <= e.max);
  let multiplier = entry?.multiplier ?? 4;

  // Adjust for party size
  if (partySize < 3) {
    // Small party - use next higher multiplier
    const currentIndex = ENCOUNTER_MULTIPLIERS.findIndex(
      (e) => monsterCount >= e.min && monsterCount <= e.max
    );
    if (currentIndex < ENCOUNTER_MULTIPLIERS.length - 1) {
      multiplier = ENCOUNTER_MULTIPLIERS[currentIndex + 1]!.multiplier;
    }
  } else if (partySize >= 6) {
    // Large party - use next lower multiplier
    const currentIndex = ENCOUNTER_MULTIPLIERS.findIndex(
      (e) => monsterCount >= e.min && monsterCount <= e.max
    );
    if (currentIndex > 0) {
      multiplier = ENCOUNTER_MULTIPLIERS[currentIndex - 1]!.multiplier;
    } else {
      multiplier = 0.5; // Single monster vs large party
    }
  }

  return multiplier;
}

/**
 * Get XP value for a Challenge Rating (internal helper)
 */
function getCRXP(cr: string): number {
  return CR_XP_MAP[cr] ?? 0;
}

/**
 * Calculate encounter difficulty
 */
export function calculateEncounterDifficulty(
  party: PartyComposition,
  monsters: EncounterMonster[]
): EncounterDifficultyResult {
  const partySize = party.levels.length;
  const thresholds = getPartyXPThresholds(party);

  // Calculate total base XP
  let baseXP = 0;
  let totalMonsters = 0;

  for (const monster of monsters) {
    const xp = getCRXP(monster.cr);
    baseXP += xp * monster.count;
    totalMonsters += monster.count;
  }

  // Apply multiplier
  const multiplier = getEncounterMultiplier(totalMonsters, partySize);
  const adjustedXP = Math.floor(baseXP * multiplier);

  // Determine difficulty
  let difficulty: EncounterDifficulty;
  if (adjustedXP >= thresholds.deadly) {
    difficulty = 'deadly';
  } else if (adjustedXP >= thresholds.hard) {
    difficulty = 'hard';
  } else if (adjustedXP >= thresholds.medium) {
    difficulty = 'medium';
  } else if (adjustedXP >= thresholds.easy) {
    difficulty = 'easy';
  } else {
    difficulty = 'trivial';
  }

  // Generate description
  const description = generateDifficultyDescription(difficulty, adjustedXP, thresholds, monsters);

  return {
    difficulty,
    baseXP,
    adjustedXP,
    multiplier,
    thresholds,
    description,
    xpReward: baseXP, // Award base XP, not adjusted
  };
}

/**
 * Generate a narrative description of encounter difficulty
 */
function generateDifficultyDescription(
  difficulty: EncounterDifficulty,
  adjustedXP: number,
  thresholds: { easy: number; medium: number; hard: number; deadly: number },
  monsters: EncounterMonster[]
): string {
  const monsterSummary = monsters
    .map((m) => `${m.count}x CR ${m.cr}${m.name ? ` (${m.name})` : ''}`)
    .join(', ');

  const descriptions: Record<EncounterDifficulty, string> = {
    trivial: `This encounter (${monsterSummary}) is trivial for the party. The monsters pose little threat and resources will barely be taxed.`,
    easy: `This encounter (${monsterSummary}) is EASY. The party should win without significant resource expenditure or risk of death.`,
    medium: `This encounter (${monsterSummary}) is MEDIUM difficulty. Some resources may be expended, and weaker characters might take damage, but there's little risk of death.`,
    hard: `This encounter (${monsterSummary}) is HARD. This will be a serious challenge. Characters may go down, and resource management becomes important. Retreat is a valid option.`,
    deadly: `This encounter (${monsterSummary}) is DEADLY! Character death is a real possibility. The party should consider this carefully - tactics, terrain, and luck will matter greatly.`,
  };

  let desc = descriptions[difficulty];

  // Add XP comparison
  const nextThreshold =
    difficulty === 'trivial'
      ? thresholds.easy
      : difficulty === 'easy'
        ? thresholds.medium
        : difficulty === 'medium'
          ? thresholds.hard
          : difficulty === 'hard'
            ? thresholds.deadly
            : null;

  if (nextThreshold) {
    const xpToNext = nextThreshold - adjustedXP;
    desc += ` (${xpToNext} adjusted XP below next difficulty tier)`;
  } else if (difficulty === 'deadly') {
    const xpOver = adjustedXP - thresholds.deadly;
    if (xpOver > 0) {
      desc += ` (${xpOver} adjusted XP over deadly threshold)`;
    }
  }

  return desc;
}

/**
 * Suggest balanced encounters for a target difficulty
 */
export function suggestEncounters(
  party: PartyComposition,
  targetDifficulty: EncounterDifficulty,
  options?: {
    /** Minimum number of monsters */
    minMonsters?: number;
    /** Maximum number of monsters */
    maxMonsters?: number;
    /** Restrict to specific CRs */
    allowedCRs?: string[];
  }
): EncounterSuggestion[] {
  const thresholds = getPartyXPThresholds(party);
  const partySize = party.levels.length;

  // Get target XP range
  const targetRange = getTargetXPRange(targetDifficulty, thresholds);
  const suggestions: EncounterSuggestion[] = [];

  const minMonsters = options?.minMonsters ?? 1;
  const maxMonsters = options?.maxMonsters ?? 8;
  const allowedCRs = options?.allowedCRs ?? Object.keys(CR_XP_MAP);

  // Generate suggestions for different monster counts
  for (let count = minMonsters; count <= maxMonsters; count++) {
    const multiplier = getEncounterMultiplier(count, partySize);
    const targetBaseXP = Math.floor(targetRange.target / multiplier);

    // Find CR that gets close to target
    for (const cr of allowedCRs) {
      const xpPerMonster = getCRXP(cr);
      if (xpPerMonster === 0) continue;

      const baseXP = xpPerMonster * count;
      const adjustedXP = Math.floor(baseXP * multiplier);

      // Check if within target range
      if (adjustedXP >= targetRange.min && adjustedXP <= targetRange.max) {
        suggestions.push({
          monsters: [{ cr, count }],
          difficulty: targetDifficulty,
          baseXP,
          adjustedXP,
        });
      }
    }
  }

  // Sort by how close to target
  suggestions.sort(
    (a, b) =>
      Math.abs(a.adjustedXP - targetRange.target) - Math.abs(b.adjustedXP - targetRange.target)
  );

  // Return top suggestions (limit to avoid overwhelming)
  return suggestions.slice(0, 5);
}

/**
 * Get target XP range for a difficulty level
 */
function getTargetXPRange(
  difficulty: EncounterDifficulty,
  thresholds: { easy: number; medium: number; hard: number; deadly: number }
): { min: number; max: number; target: number } {
  switch (difficulty) {
    case 'trivial':
      return { min: 0, max: thresholds.easy - 1, target: Math.floor(thresholds.easy * 0.5) };
    case 'easy':
      return {
        min: thresholds.easy,
        max: thresholds.medium - 1,
        target: Math.floor((thresholds.easy + thresholds.medium) / 2),
      };
    case 'medium':
      return {
        min: thresholds.medium,
        max: thresholds.hard - 1,
        target: Math.floor((thresholds.medium + thresholds.hard) / 2),
      };
    case 'hard':
      return {
        min: thresholds.hard,
        max: thresholds.deadly - 1,
        target: Math.floor((thresholds.hard + thresholds.deadly) / 2),
      };
    case 'deadly':
      return {
        min: thresholds.deadly,
        max: thresholds.deadly * 2,
        target: Math.floor(thresholds.deadly * 1.25),
      };
  }
}

/**
 * Calculate the adventuring day XP budget (DMG p.84)
 */
export function getAdventuringDayXPBudget(party: PartyComposition): number {
  // Adjusted XP per day by level (DMG p.84)
  const dailyBudgetByLevel: number[] = [
    300, // Level 1
    600, // Level 2
    1200, // Level 3
    1700, // Level 4
    3500, // Level 5
    4000, // Level 6
    5000, // Level 7
    6000, // Level 8
    7500, // Level 9
    9000, // Level 10
    10500, // Level 11
    11500, // Level 12
    13500, // Level 13
    15000, // Level 14
    18000, // Level 15
    20000, // Level 16
    25000, // Level 17
    27000, // Level 18
    30000, // Level 19
    40000, // Level 20
  ];

  let totalBudget = 0;
  for (const level of party.levels) {
    const clampedLevel = Math.max(1, Math.min(20, level));
    totalBudget += dailyBudgetByLevel[clampedLevel - 1]!;
  }

  return totalBudget;
}

/**
 * Calculate average party level
 */
export function getAveragePartyLevel(party: PartyComposition): number {
  if (party.levels.length === 0) return 1;
  const sum = party.levels.reduce((a, b) => a + b, 0);
  return Math.round(sum / party.levels.length);
}

/**
 * Get recommended CR range for a party
 */
export function getRecommendedCRRange(party: PartyComposition): {
  minCR: string;
  maxCR: string;
  soloMonsterCR: string;
} {
  const avgLevel = getAveragePartyLevel(party);

  // General guidelines from DMG
  // Easy solo: CR = APL - 2
  // Medium solo: CR = APL
  // Hard solo: CR = APL + 2
  // Deadly solo: CR = APL + 4

  const crValues = Object.keys(CR_XP_MAP);

  const getCRAtIndex = (index: number): string => {
    const clampedIndex = Math.max(0, Math.min(crValues.length - 1, index));
    return crValues[clampedIndex]!;
  };

  // Find the index for average party level
  const aplIndex = crValues.findIndex(
    (cr) => !cr.includes('/') && parseInt(cr) >= Math.max(1, avgLevel - 2)
  );

  return {
    minCR: getCRAtIndex(Math.max(0, aplIndex - 4)),
    maxCR: getCRAtIndex(Math.min(crValues.length - 1, aplIndex + 4)),
    soloMonsterCR: getCRAtIndex(aplIndex),
  };
}

/**
 * Format XP value with commas
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Create a summary string for an encounter
 */
export function getEncounterSummary(
  party: PartyComposition,
  monsters: EncounterMonster[]
): string {
  const result = calculateEncounterDifficulty(party, monsters);
  const partyLevels = party.levels.join(', ');

  const lines = [
    `=== ENCOUNTER DIFFICULTY ===`,
    `Party: ${party.levels.length} characters (levels: ${partyLevels})`,
    ``,
    `Monsters:`,
    ...monsters.map(
      (m) => `  • ${m.count}x CR ${m.cr}${m.name ? ` (${m.name})` : ''} = ${formatXP(getCRXP(m.cr) * m.count)} XP`
    ),
    ``,
    `Base XP: ${formatXP(result.baseXP)}`,
    `Multiplier: ×${result.multiplier} (${monsters.reduce((sum, m) => sum + m.count, 0)} monsters)`,
    `Adjusted XP: ${formatXP(result.adjustedXP)}`,
    ``,
    `Party Thresholds:`,
    `  Easy: ${formatXP(result.thresholds.easy)} | Medium: ${formatXP(result.thresholds.medium)}`,
    `  Hard: ${formatXP(result.thresholds.hard)} | Deadly: ${formatXP(result.thresholds.deadly)}`,
    ``,
    `DIFFICULTY: ${result.difficulty.toUpperCase()}`,
    ``,
    result.description,
    ``,
    `XP Reward (if won): ${formatXP(result.xpReward)} (${formatXP(Math.floor(result.xpReward / party.levels.length))} per character)`,
  ];

  return lines.join('\n');
}
