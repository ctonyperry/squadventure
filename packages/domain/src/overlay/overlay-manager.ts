/**
 * Overlay Manager
 *
 * Handles loading, validation, and application of world overlays.
 * Supports overlay inheritance and merging.
 */

import type {
  WorldOverlay,
  WorldOverlayConfig,
  TerminologyMap,
  CharacterRestrictions,
  RaceReskin,
  ClassReskin,
  DMGuidance,
  CustomMonster,
  CustomItem,
  CustomSpell,
} from './world-overlay.js';
import {
  createBlankOverlay,
  createEmptyTerminologyMap,
  createDefaultDMGuidance,
  createDefaultRestrictions,
} from './world-overlay.js';
import type { GameSystem } from '../system/game-system.js';

// ============================================================================
// Overlay Manager Class
// ============================================================================

/**
 * Manages world overlays for campaign settings
 */
export class OverlayManager {
  private overlays: Map<string, WorldOverlay> = new Map();
  private activeOverlay: WorldOverlay | null = null;
  private gameSystem: GameSystem;

  constructor(gameSystem: GameSystem) {
    this.gameSystem = gameSystem;
  }

  // ==========================================================================
  // Loading & Registration
  // ==========================================================================

  /**
   * Register an overlay from a config object
   */
  registerOverlay(config: WorldOverlayConfig): void {
    const overlay = config.overlay;
    this.validateOverlay(overlay);
    this.overlays.set(overlay.id, overlay);
  }

  /**
   * Register an overlay directly
   */
  registerOverlayDirect(overlay: WorldOverlay): void {
    this.validateOverlay(overlay);
    this.overlays.set(overlay.id, overlay);
  }

  /**
   * Get an overlay by ID
   */
  getOverlay(id: string): WorldOverlay | undefined {
    return this.overlays.get(id);
  }

  /**
   * Get all registered overlay IDs
   */
  getOverlayIds(): string[] {
    return Array.from(this.overlays.keys());
  }

  /**
   * Get all registered overlays
   */
  getAllOverlays(): WorldOverlay[] {
    return Array.from(this.overlays.values());
  }

  // ==========================================================================
  // Activation & Deactivation
  // ==========================================================================

  /**
   * Set the active overlay for the session
   */
  setActiveOverlay(overlayId: string): { success: boolean; message: string } {
    const overlay = this.overlays.get(overlayId);
    if (!overlay) {
      return { success: false, message: `Overlay "${overlayId}" not found.` };
    }

    // Resolve inheritance chain if needed
    const resolved = this.resolveInheritance(overlay);
    this.activeOverlay = resolved;

    return {
      success: true,
      message: `Activated overlay: ${resolved.name}`,
    };
  }

  /**
   * Clear the active overlay
   */
  clearActiveOverlay(): void {
    this.activeOverlay = null;
  }

  /**
   * Get the currently active overlay
   */
  getActiveOverlay(): WorldOverlay | null {
    return this.activeOverlay;
  }

  /**
   * Check if an overlay is active
   */
  hasActiveOverlay(): boolean {
    return this.activeOverlay !== null;
  }

  // ==========================================================================
  // Terminology Mapping
  // ==========================================================================

  /**
   * Translate a term using the active overlay
   */
  translateTerm(
    category: keyof TerminologyMap,
    term: string
  ): string {
    if (!this.activeOverlay) {
      return term;
    }
    return this.activeOverlay.terminology[category][term] ?? term;
  }

  /**
   * Translate currency amounts
   */
  translateCurrency(
    amount: number,
    currencyType: string
  ): { amount: number; type: string } {
    const translatedType = this.translateTerm('currency', currencyType);
    return { amount, type: translatedType };
  }

  /**
   * Get all terminology mappings for a category
   */
  getTerminologyForCategory(category: keyof TerminologyMap): Record<string, string> {
    if (!this.activeOverlay) {
      return {};
    }
    return { ...this.activeOverlay.terminology[category] };
  }

  // ==========================================================================
  // Character Creation Integration
  // ==========================================================================

  /**
   * Check if a race is allowed in the active overlay
   */
  isRaceAllowed(raceKey: string): boolean {
    if (!this.activeOverlay) {
      return true;
    }
    const { allowedRaces } = this.activeOverlay.restrictions;
    // Empty array = no restrictions
    if (allowedRaces.length === 0) {
      return true;
    }
    return allowedRaces.includes(raceKey);
  }

  /**
   * Check if a class is allowed in the active overlay
   */
  isClassAllowed(classKey: string): boolean {
    if (!this.activeOverlay) {
      return true;
    }
    const { allowedClasses } = this.activeOverlay.restrictions;
    if (allowedClasses.length === 0) {
      return true;
    }
    return allowedClasses.includes(classKey);
  }

  /**
   * Check if a background is allowed in the active overlay
   */
  isBackgroundAllowed(backgroundKey: string): boolean {
    if (!this.activeOverlay) {
      return true;
    }
    const { allowedBackgrounds } = this.activeOverlay.restrictions;
    if (allowedBackgrounds.length === 0) {
      return true;
    }
    return allowedBackgrounds.includes(backgroundKey);
  }

  /**
   * Check if a subclass is allowed in the active overlay
   */
  isSubclassAllowed(classKey: string, subclassKey: string): boolean {
    if (!this.activeOverlay) {
      return true;
    }
    const { allowedSubclasses } = this.activeOverlay.restrictions;
    const allowed = allowedSubclasses[classKey];
    if (!allowed || allowed.length === 0) {
      return true;
    }
    return allowed.includes(subclassKey);
  }

  /**
   * Get allowed races for character creation
   */
  getAllowedRaces(): string[] {
    const allRaces = Object.keys(this.gameSystem.races);
    if (!this.activeOverlay) {
      return allRaces;
    }
    const { allowedRaces } = this.activeOverlay.restrictions;
    if (allowedRaces.length === 0) {
      return allRaces;
    }
    return allRaces.filter((r) => allowedRaces.includes(r));
  }

  /**
   * Get allowed classes for character creation
   */
  getAllowedClasses(): string[] {
    const allClasses = Object.keys(this.gameSystem.classes);
    if (!this.activeOverlay) {
      return allClasses;
    }
    const { allowedClasses } = this.activeOverlay.restrictions;
    if (allowedClasses.length === 0) {
      return allClasses;
    }
    return allClasses.filter((c) => allowedClasses.includes(c));
  }

  /**
   * Get race display name (with reskin if applicable)
   */
  getRaceDisplayName(raceKey: string): string {
    if (!this.activeOverlay) {
      const race = this.gameSystem.getRace(raceKey);
      return race?.name ?? raceKey;
    }

    const reskin = this.activeOverlay.raceReskins[raceKey];
    if (reskin) {
      return reskin.displayName;
    }

    // Check terminology mapping
    const translated = this.translateTerm('races', raceKey);
    if (translated !== raceKey) {
      return translated;
    }

    const race = this.gameSystem.getRace(raceKey);
    return race?.name ?? raceKey;
  }

  /**
   * Get class display name (with reskin if applicable)
   */
  getClassDisplayName(classKey: string): string {
    if (!this.activeOverlay) {
      const cls = this.gameSystem.getClass(classKey);
      return cls?.name ?? classKey;
    }

    const reskin = this.activeOverlay.classReskins[classKey];
    if (reskin) {
      return reskin.displayName;
    }

    const translated = this.translateTerm('classes', classKey);
    if (translated !== classKey) {
      return translated;
    }

    const cls = this.gameSystem.getClass(classKey);
    return cls?.name ?? classKey;
  }

  /**
   * Get race reskin info
   */
  getRaceReskin(raceKey: string): RaceReskin | undefined {
    return this.activeOverlay?.raceReskins[raceKey];
  }

  /**
   * Get class reskin info
   */
  getClassReskin(classKey: string): ClassReskin | undefined {
    return this.activeOverlay?.classReskins[classKey];
  }

  // ==========================================================================
  // DM Guidance
  // ==========================================================================

  /**
   * Get DM guidance from the active overlay
   */
  getDMGuidance(): DMGuidance | null {
    return this.activeOverlay?.dmGuidance ?? null;
  }

  /**
   * Generate DM system prompt injection from active overlay
   */
  generateDMPromptInjection(): string {
    if (!this.activeOverlay) {
      return '';
    }

    const overlay = this.activeOverlay;
    const guidance = overlay.dmGuidance;
    const lines: string[] = [];

    lines.push(`\n=== CAMPAIGN SETTING: ${overlay.name} ===`);
    lines.push(overlay.settingDescription);
    lines.push('');

    // Tone
    if (guidance.tone !== 'custom') {
      lines.push(`Tone: ${guidance.tone.toUpperCase()}`);
    } else if (guidance.toneDescription) {
      lines.push(`Tone: ${guidance.toneDescription}`);
    }

    // Setting rules
    if (guidance.settingRules.length > 0) {
      lines.push('');
      lines.push('Setting Rules:');
      guidance.settingRules.forEach((rule) => {
        lines.push(`  • ${rule}`);
      });
    }

    // Themes
    if (guidance.themes.primaryThemes.length > 0) {
      lines.push('');
      lines.push(`Primary Themes: ${guidance.themes.primaryThemes.join(', ')}`);
    }
    if (guidance.themes.secondaryThemes.length > 0) {
      lines.push(`Secondary Themes: ${guidance.themes.secondaryThemes.join(', ')}`);
    }
    if (guidance.themes.motifs.length > 0) {
      lines.push(`Recurring Motifs: ${guidance.themes.motifs.join(', ')}`);
    }
    if (guidance.themes.sensitiveTopics.length > 0) {
      lines.push(`Handle Carefully: ${guidance.themes.sensitiveTopics.join(', ')}`);
    }

    // Vocabulary
    if (guidance.vocabulary.preferredTerms.length > 0) {
      lines.push('');
      lines.push(`Use terms like: ${guidance.vocabulary.preferredTerms.join(', ')}`);
    }
    if (guidance.vocabulary.avoidedTerms.length > 0) {
      lines.push(`Avoid terms like: ${guidance.vocabulary.avoidedTerms.join(', ')}`);
    }
    if (Object.keys(guidance.vocabulary.settingJargon).length > 0) {
      lines.push('');
      lines.push('Setting Jargon:');
      for (const [term, definition] of Object.entries(guidance.vocabulary.settingJargon)) {
        lines.push(`  • ${term}: ${definition}`);
      }
    }

    // Naming conventions
    if (guidance.namingConventions.length > 0) {
      lines.push('');
      lines.push('Naming Conventions:');
      guidance.namingConventions.forEach((conv) => {
        lines.push(`  ${conv.culture}: ${conv.description}`);
        if (conv.examples.length > 0) {
          lines.push(`    Examples: ${conv.examples.join(', ')}`);
        }
      });
    }

    // Custom instructions
    if (guidance.customInstructions) {
      lines.push('');
      lines.push('Additional Instructions:');
      lines.push(guidance.customInstructions);
    }

    // Roleplay guidance
    if (guidance.roleplayGuidance) {
      lines.push('');
      lines.push('Roleplay Notes:');
      lines.push(guidance.roleplayGuidance);
    }

    lines.push('');
    lines.push('=== END CAMPAIGN SETTING ===');

    return lines.join('\n');
  }

  // ==========================================================================
  // Custom Content
  // ==========================================================================

  /**
   * Get custom monsters from the active overlay
   */
  getCustomMonsters(): CustomMonster[] {
    return this.activeOverlay?.customMonsters ?? [];
  }

  /**
   * Get a custom monster by ID
   */
  getCustomMonster(id: string): CustomMonster | undefined {
    return this.activeOverlay?.customMonsters.find((m) => m.id === id);
  }

  /**
   * Get custom items from the active overlay
   */
  getCustomItems(): CustomItem[] {
    return this.activeOverlay?.customItems ?? [];
  }

  /**
   * Get a custom item by ID
   */
  getCustomItem(id: string): CustomItem | undefined {
    return this.activeOverlay?.customItems.find((i) => i.id === id);
  }

  /**
   * Get custom spells from the active overlay
   */
  getCustomSpells(): CustomSpell[] {
    return this.activeOverlay?.customSpells ?? [];
  }

  /**
   * Get a custom spell by ID
   */
  getCustomSpell(id: string): CustomSpell | undefined {
    return this.activeOverlay?.customSpells.find((s) => s.id === id);
  }

  // ==========================================================================
  // Summary & Serialization
  // ==========================================================================

  /**
   * Get a summary of the active overlay
   */
  getSummary(): string {
    if (!this.activeOverlay) {
      return 'No overlay active. Using base game system.';
    }

    const overlay = this.activeOverlay;
    const lines: string[] = [];

    lines.push(`=== ${overlay.name} ===`);
    lines.push(overlay.description);
    lines.push(`Version: ${overlay.version}`);
    lines.push(`Base System: ${overlay.baseSystem}`);

    const restrictions = overlay.restrictions;
    if (restrictions.allowedRaces.length > 0) {
      lines.push(`Allowed Races: ${restrictions.allowedRaces.length}`);
    }
    if (restrictions.allowedClasses.length > 0) {
      lines.push(`Allowed Classes: ${restrictions.allowedClasses.length}`);
    }

    const raceReskinCount = Object.keys(overlay.raceReskins).length;
    const classReskinCount = Object.keys(overlay.classReskins).length;
    if (raceReskinCount > 0) {
      lines.push(`Race Reskins: ${raceReskinCount}`);
    }
    if (classReskinCount > 0) {
      lines.push(`Class Reskins: ${classReskinCount}`);
    }

    if (overlay.customMonsters.length > 0) {
      lines.push(`Custom Monsters: ${overlay.customMonsters.length}`);
    }
    if (overlay.customItems.length > 0) {
      lines.push(`Custom Items: ${overlay.customItems.length}`);
    }
    if (overlay.customSpells.length > 0) {
      lines.push(`Custom Spells: ${overlay.customSpells.length}`);
    }

    lines.push(`Tone: ${overlay.dmGuidance.tone}`);

    return lines.join('\n');
  }

  /**
   * Export the active overlay as JSON
   */
  exportActiveOverlay(): WorldOverlayConfig | null {
    if (!this.activeOverlay) {
      return null;
    }
    return {
      version: '1.0.0',
      overlay: this.activeOverlay,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Validate an overlay against the game system
   */
  private validateOverlay(overlay: WorldOverlay): void {
    // Validate base system matches
    if (overlay.baseSystem !== this.gameSystem.id) {
      throw new Error(
        `Overlay "${overlay.id}" requires base system "${overlay.baseSystem}" ` +
        `but current system is "${this.gameSystem.id}"`
      );
    }

    // Validate allowed races exist
    for (const raceKey of overlay.restrictions.allowedRaces) {
      if (!this.gameSystem.getRace(raceKey)) {
        throw new Error(`Overlay "${overlay.id}" references unknown race: ${raceKey}`);
      }
    }

    // Validate allowed classes exist
    for (const classKey of overlay.restrictions.allowedClasses) {
      if (!this.gameSystem.getClass(classKey)) {
        throw new Error(`Overlay "${overlay.id}" references unknown class: ${classKey}`);
      }
    }

    // Validate race reskins reference valid races
    for (const raceKey of Object.keys(overlay.raceReskins)) {
      if (!this.gameSystem.getRace(raceKey)) {
        throw new Error(`Overlay "${overlay.id}" has reskin for unknown race: ${raceKey}`);
      }
    }

    // Validate class reskins reference valid classes
    for (const classKey of Object.keys(overlay.classReskins)) {
      if (!this.gameSystem.getClass(classKey)) {
        throw new Error(`Overlay "${overlay.id}" has reskin for unknown class: ${classKey}`);
      }
    }
  }

  /**
   * Resolve overlay inheritance chain
   */
  private resolveInheritance(overlay: WorldOverlay): WorldOverlay {
    if (!overlay.parentOverlay) {
      return overlay;
    }

    const parent = this.overlays.get(overlay.parentOverlay);
    if (!parent) {
      throw new Error(
        `Overlay "${overlay.id}" references unknown parent: ${overlay.parentOverlay}`
      );
    }

    // Recursively resolve parent first
    const resolvedParent = this.resolveInheritance(parent);

    // Merge child onto parent
    return this.mergeOverlays(resolvedParent, overlay);
  }

  /**
   * Merge child overlay onto parent
   */
  private mergeOverlays(parent: WorldOverlay, child: WorldOverlay): WorldOverlay {
    const merged: WorldOverlay = {
      // Child properties take precedence
      id: child.id,
      name: child.name,
      description: child.description,
      settingDescription: child.settingDescription || parent.settingDescription,
      version: child.version,
      baseSystem: child.baseSystem,

      // Merge terminology (child overrides parent)
      terminology: this.mergeTerminology(parent.terminology, child.terminology),

      // Merge restrictions (child restrictions replace parent if non-empty)
      restrictions: this.mergeRestrictions(parent.restrictions, child.restrictions),

      // Merge reskins (child overrides parent)
      raceReskins: { ...parent.raceReskins, ...child.raceReskins },
      classReskins: { ...parent.classReskins, ...child.classReskins },

      // Concatenate custom content
      customMonsters: [...parent.customMonsters, ...child.customMonsters],
      customItems: [...parent.customItems, ...child.customItems],
      customSpells: [...parent.customSpells, ...child.customSpells],

      // Merge DM guidance
      dmGuidance: this.mergeDMGuidance(parent.dmGuidance, child.dmGuidance),
    };

    // Handle optional properties
    const author = child.author || parent.author;
    if (author) {
      merged.author = author;
    }

    const tags = [...(parent.tags || []), ...(child.tags || [])];
    if (tags.length > 0) {
      merged.tags = tags;
    }

    return merged;
  }

  private mergeTerminology(parent: TerminologyMap, child: TerminologyMap): TerminologyMap {
    return {
      currency: { ...parent.currency, ...child.currency },
      magic: { ...parent.magic, ...child.magic },
      races: { ...parent.races, ...child.races },
      classes: { ...parent.classes, ...child.classes },
      items: { ...parent.items, ...child.items },
      equipment: { ...parent.equipment, ...child.equipment },
      conditions: { ...parent.conditions, ...child.conditions },
      custom: { ...parent.custom, ...child.custom },
    };
  }

  private mergeRestrictions(
    parent: CharacterRestrictions,
    child: CharacterRestrictions
  ): CharacterRestrictions {
    const merged: CharacterRestrictions = {
      // If child has empty array, use parent's; otherwise use child's
      allowedRaces:
        child.allowedRaces.length > 0 ? child.allowedRaces : parent.allowedRaces,
      allowedClasses:
        child.allowedClasses.length > 0 ? child.allowedClasses : parent.allowedClasses,
      allowedBackgrounds:
        child.allowedBackgrounds.length > 0
          ? child.allowedBackgrounds
          : parent.allowedBackgrounds,
      allowedSubclasses: {
        ...parent.allowedSubclasses,
        ...child.allowedSubclasses,
      },
    };

    const levelRange = child.levelRange || parent.levelRange;
    if (levelRange) {
      merged.levelRange = levelRange;
    }

    return merged;
  }

  private mergeDMGuidance(parent: DMGuidance, child: DMGuidance): DMGuidance {
    const merged: DMGuidance = {
      tone: child.tone || parent.tone,
      settingRules: [...parent.settingRules, ...child.settingRules],
      namingConventions: [...parent.namingConventions, ...child.namingConventions],
      themes: {
        primaryThemes: [
          ...parent.themes.primaryThemes,
          ...child.themes.primaryThemes,
        ],
        secondaryThemes: [
          ...parent.themes.secondaryThemes,
          ...child.themes.secondaryThemes,
        ],
        sensitiveTopics: [
          ...parent.themes.sensitiveTopics,
          ...child.themes.sensitiveTopics,
        ],
        motifs: [...parent.themes.motifs, ...child.themes.motifs],
      },
      vocabulary: {
        preferredTerms: [
          ...parent.vocabulary.preferredTerms,
          ...child.vocabulary.preferredTerms,
        ],
        avoidedTerms: [
          ...parent.vocabulary.avoidedTerms,
          ...child.vocabulary.avoidedTerms,
        ],
        settingJargon: {
          ...parent.vocabulary.settingJargon,
          ...child.vocabulary.settingJargon,
        },
      },
      customInstructions:
        child.customInstructions || parent.customInstructions,
    };

    // Handle optional properties
    const toneDescription = child.toneDescription || parent.toneDescription;
    if (toneDescription) {
      merged.toneDescription = toneDescription;
    }

    const roleplayGuidance = child.roleplayGuidance || parent.roleplayGuidance;
    if (roleplayGuidance) {
      merged.roleplayGuidance = roleplayGuidance;
    }

    return merged;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an overlay manager instance
 */
export function createOverlayManager(gameSystem: GameSystem): OverlayManager {
  return new OverlayManager(gameSystem);
}
