/**
 * World Generation Validators
 *
 * Validation logic for each generation layer and cross-layer consistency.
 */

import type {
  WorldTemplate,
  WorldFoundation,
  FactionsLayer,
  LocationsLayer,
  NPCsLayer,
  CampaignArcLayer,
  EncountersLayer,
  ValidationResult,
  GenerationLayer,
} from '../types.js';

type ValidationError = ValidationResult['errors'][0];

// =============================================================================
// Layer Validators
// =============================================================================

/**
 * Validate World Foundation layer
 */
export function validateFoundation(foundation: WorldFoundation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!foundation.id || !foundation.id.startsWith('world_')) {
    errors.push({
      layer: 'foundation',
      path: 'id',
      message: 'Invalid world ID format (should start with "world_")',
      severity: 'error',
    });
  }

  if (!foundation.name || foundation.name.length < 2) {
    errors.push({
      layer: 'foundation',
      path: 'name',
      message: 'World name is required and must be at least 2 characters',
      severity: 'error',
    });
  }

  if (foundation.history.majorEras.length < 2) {
    errors.push({
      layer: 'foundation',
      path: 'history.majorEras',
      message: 'World should have at least 2 historical eras',
      severity: 'warning',
    });
  }

  if (foundation.worldRules.length < 2) {
    errors.push({
      layer: 'foundation',
      path: 'worldRules',
      message: 'World should have at least 2 unique rules or quirks',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate Factions layer
 */
export function validateFactions(factions: FactionsLayer): ValidationError[] {
  const errors: ValidationError[] = [];
  const factionIds = new Set<string>();

  // Check for duplicate IDs
  for (const faction of factions.factions) {
    if (factionIds.has(faction.id)) {
      errors.push({
        layer: 'factions',
        path: `factions.${faction.id}`,
        message: `Duplicate faction ID: ${faction.id}`,
        severity: 'error',
      });
    }
    factionIds.add(faction.id);

    // Check ID format
    if (!faction.id.startsWith('faction_')) {
      errors.push({
        layer: 'factions',
        path: `factions.${faction.id}.id`,
        message: `Invalid faction ID format: ${faction.id}`,
        severity: 'error',
      });
    }

    // Check for goals
    if (faction.goals.length === 0) {
      errors.push({
        layer: 'factions',
        path: `factions.${faction.id}.goals`,
        message: `Faction "${faction.name}" has no goals`,
        severity: 'warning',
      });
    }
  }

  // Validate references
  for (const faction of factions.factions) {
    for (const allyId of faction.allies) {
      if (!factionIds.has(allyId)) {
        errors.push({
          layer: 'factions',
          path: `factions.${faction.id}.allies`,
          message: `Invalid ally reference: ${allyId}`,
          severity: 'error',
        });
      }
    }
    for (const enemyId of faction.enemies) {
      if (!factionIds.has(enemyId)) {
        errors.push({
          layer: 'factions',
          path: `factions.${faction.id}.enemies`,
          message: `Invalid enemy reference: ${enemyId}`,
          severity: 'error',
        });
      }
    }
  }

  // Check minimum factions
  if (factions.factions.length < 3) {
    errors.push({
      layer: 'factions',
      path: 'factions',
      message: 'World should have at least 3 factions',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate Locations layer
 */
export function validateLocations(
  locations: LocationsLayer,
  factions: FactionsLayer
): ValidationError[] {
  const errors: ValidationError[] = [];
  const locationIds = new Set<string>();
  const factionIds = new Set(factions.factions.map((f) => f.id));

  for (const location of locations.locations) {
    if (locationIds.has(location.id)) {
      errors.push({
        layer: 'locations',
        path: `locations.${location.id}`,
        message: `Duplicate location ID: ${location.id}`,
        severity: 'error',
      });
    }
    locationIds.add(location.id);

    if (!location.id.startsWith('loc_')) {
      errors.push({
        layer: 'locations',
        path: `locations.${location.id}.id`,
        message: `Invalid location ID format: ${location.id}`,
        severity: 'error',
      });
    }

    // Check faction reference
    if (location.controllingFaction && !factionIds.has(location.controllingFaction)) {
      errors.push({
        layer: 'locations',
        path: `locations.${location.id}.controllingFaction`,
        message: `Invalid faction reference: ${location.controllingFaction}`,
        severity: 'error',
      });
    }
  }

  // Validate connections after all locations are registered
  for (const location of locations.locations) {
    for (const connectionId of location.connections) {
      if (!locationIds.has(connectionId)) {
        errors.push({
          layer: 'locations',
          path: `locations.${location.id}.connections`,
          message: `Invalid connection reference: ${connectionId}`,
          severity: 'error',
        });
      }
    }
  }

  // Check for isolated locations
  const connectedLocations = new Set<string>();
  for (const location of locations.locations) {
    if (location.connections.length > 0) {
      connectedLocations.add(location.id);
      location.connections.forEach((c) => connectedLocations.add(c));
    }
  }
  for (const location of locations.locations) {
    if (!connectedLocations.has(location.id)) {
      errors.push({
        layer: 'locations',
        path: `locations.${location.id}`,
        message: `Location "${location.name}" is isolated (no connections)`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Validate NPCs layer
 */
export function validateNPCs(
  npcs: NPCsLayer,
  factions: FactionsLayer,
  locations: LocationsLayer
): ValidationError[] {
  const errors: ValidationError[] = [];
  const npcIds = new Set<string>();
  const factionIds = new Set(factions.factions.map((f) => f.id));
  const locationIds = new Set(locations.locations.map((l) => l.id));

  for (const npc of npcs.npcs) {
    if (npcIds.has(npc.id)) {
      errors.push({
        layer: 'npcs',
        path: `npcs.${npc.id}`,
        message: `Duplicate NPC ID: ${npc.id}`,
        severity: 'error',
      });
    }
    npcIds.add(npc.id);

    if (!npc.id.startsWith('npc_')) {
      errors.push({
        layer: 'npcs',
        path: `npcs.${npc.id}.id`,
        message: `Invalid NPC ID format: ${npc.id}`,
        severity: 'error',
      });
    }

    // Check location reference
    if (!locationIds.has(npc.locationId)) {
      errors.push({
        layer: 'npcs',
        path: `npcs.${npc.id}.locationId`,
        message: `Invalid location reference: ${npc.locationId}`,
        severity: 'error',
      });
    }

    // Check faction references
    for (const factionId of npc.factionIds) {
      if (!factionIds.has(factionId)) {
        errors.push({
          layer: 'npcs',
          path: `npcs.${npc.id}.factionIds`,
          message: `Invalid faction reference: ${factionId}`,
          severity: 'error',
        });
      }
    }
  }

  // Validate NPC relationships after all NPCs are registered
  for (const npc of npcs.npcs) {
    for (const rel of npc.relationships) {
      if (!npcIds.has(rel.npcId)) {
        errors.push({
          layer: 'npcs',
          path: `npcs.${npc.id}.relationships`,
          message: `Invalid NPC reference in relationship: ${rel.npcId}`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate Campaign Arc layer
 */
export function validateCampaignArc(
  campaign: CampaignArcLayer,
  npcs: NPCsLayer,
  locations: LocationsLayer
): ValidationError[] {
  const errors: ValidationError[] = [];
  const npcIds = new Set(npcs.npcs.map((n) => n.id));
  const locationIds = new Set(locations.locations.map((l) => l.id));
  const chapterIds = new Set<string>();

  // Check antagonist
  if (campaign.antagonist.id && !npcIds.has(campaign.antagonist.id)) {
    // Antagonist might be a new NPC created for the campaign
    errors.push({
      layer: 'campaign',
      path: 'antagonist.id',
      message: `Antagonist not found in NPCs: ${campaign.antagonist.id} (may be intentional if new)`,
      severity: 'warning',
    });
  }

  for (const chapter of campaign.chapters) {
    if (chapterIds.has(chapter.id)) {
      errors.push({
        layer: 'campaign',
        path: `chapters.${chapter.id}`,
        message: `Duplicate chapter ID: ${chapter.id}`,
        severity: 'error',
      });
    }
    chapterIds.add(chapter.id);

    if (!chapter.id.startsWith('chapter_')) {
      errors.push({
        layer: 'campaign',
        path: `chapters.${chapter.id}.id`,
        message: `Invalid chapter ID format: ${chapter.id}`,
        severity: 'error',
      });
    }

    // Check location references
    for (const locId of chapter.locations) {
      if (!locationIds.has(locId)) {
        errors.push({
          layer: 'campaign',
          path: `chapters.${chapter.id}.locations`,
          message: `Invalid location reference: ${locId}`,
          severity: 'error',
        });
      }
    }

    // Check NPC references
    for (const npcId of chapter.keyNPCs) {
      if (!npcIds.has(npcId)) {
        errors.push({
          layer: 'campaign',
          path: `chapters.${chapter.id}.keyNPCs`,
          message: `Invalid NPC reference: ${npcId}`,
          severity: 'error',
        });
      }
    }

    // Check story beats
    if (chapter.storyBeats.length < 2) {
      errors.push({
        layer: 'campaign',
        path: `chapters.${chapter.id}.storyBeats`,
        message: `Chapter "${chapter.name}" has too few story beats`,
        severity: 'warning',
      });
    }
  }

  // Check chapter progression
  const sortedChapters = [...campaign.chapters].sort((a, b) => a.number - b.number);
  for (let i = 1; i < sortedChapters.length; i++) {
    const prev = sortedChapters[i - 1];
    const curr = sortedChapters[i];
    if (prev && curr && curr.levelRange.min < prev.levelRange.min) {
      errors.push({
        layer: 'campaign',
        path: `chapters.${curr.id}`,
        message: `Level range regression: Chapter ${curr.number} starts at lower level than Chapter ${prev.number}`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Validate Encounters layer
 */
export function validateEncounters(
  encounters: EncountersLayer,
  locations: LocationsLayer
): ValidationError[] {
  const errors: ValidationError[] = [];
  const locationIds = new Set(locations.locations.map((l) => l.id));
  const encounterIds = new Set<string>();
  const treasureIds = new Set<string>();

  for (const encounter of encounters.encounters) {
    if (encounterIds.has(encounter.id)) {
      errors.push({
        layer: 'encounters',
        path: `encounters.${encounter.id}`,
        message: `Duplicate encounter ID: ${encounter.id}`,
        severity: 'error',
      });
    }
    encounterIds.add(encounter.id);

    if (!encounter.id.startsWith('enc_')) {
      errors.push({
        layer: 'encounters',
        path: `encounters.${encounter.id}.id`,
        message: `Invalid encounter ID format: ${encounter.id}`,
        severity: 'error',
      });
    }

    if (!locationIds.has(encounter.locationId)) {
      errors.push({
        layer: 'encounters',
        path: `encounters.${encounter.id}.locationId`,
        message: `Invalid location reference: ${encounter.locationId}`,
        severity: 'error',
      });
    }
  }

  for (const hoard of encounters.treasureHoards) {
    if (treasureIds.has(hoard.id)) {
      errors.push({
        layer: 'encounters',
        path: `treasureHoards.${hoard.id}`,
        message: `Duplicate treasure ID: ${hoard.id}`,
        severity: 'error',
      });
    }
    treasureIds.add(hoard.id);

    if (!locationIds.has(hoard.locationId)) {
      errors.push({
        layer: 'encounters',
        path: `treasureHoards.${hoard.id}.locationId`,
        message: `Invalid location reference: ${hoard.locationId}`,
        severity: 'error',
      });
    }
  }

  return errors;
}

// =============================================================================
// Full World Validation
// =============================================================================

/**
 * Validate a complete world template
 */
export function validateWorldTemplate(template: WorldTemplate): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Validate each layer
  allErrors.push(...validateFoundation(template.foundation));
  allErrors.push(...validateFactions(template.factions));
  allErrors.push(...validateLocations(template.locations, template.factions));
  allErrors.push(...validateNPCs(template.npcs, template.factions, template.locations));
  allErrors.push(
    ...validateCampaignArc(template.campaignArc, template.npcs, template.locations)
  );
  allErrors.push(...validateEncounters(template.encounters, template.locations));

  // Cross-layer consistency checks
  allErrors.push(...validateCrossLayerConsistency(template));

  const hasErrors = allErrors.some((e) => e.severity === 'error');

  return {
    valid: !hasErrors,
    errors: allErrors,
  };
}

/**
 * Check consistency across all layers
 */
function validateCrossLayerConsistency(template: WorldTemplate): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check that faction headquarters exist in locations
  for (const faction of template.factions.factions) {
    if (
      faction.headquarters &&
      !template.locations.locations.some((l) => l.id === faction.headquarters)
    ) {
      errors.push({
        layer: 'factions',
        path: `factions.${faction.id}.headquarters`,
        message: `Faction headquarters location not found: ${faction.headquarters}`,
        severity: 'error',
      });
    }
  }

  // Check that faction leaders exist in NPCs
  for (const faction of template.factions.factions) {
    for (const leaderId of faction.leaderIds) {
      if (!template.npcs.npcs.some((n) => n.id === leaderId)) {
        errors.push({
          layer: 'factions',
          path: `factions.${faction.id}.leaderIds`,
          message: `Faction leader NPC not found: ${leaderId}`,
          severity: 'error',
        });
      }
    }
  }

  // Check level range coverage
  const { min, max } = template.brief.levelRange;
  const coveredLevels = new Set<number>();
  for (const location of template.locations.locations) {
    if (location.suggestedLevel) {
      for (let l = location.suggestedLevel.min; l <= location.suggestedLevel.max; l++) {
        coveredLevels.add(l);
      }
    }
  }
  for (let l = min; l <= max; l++) {
    if (!coveredLevels.has(l)) {
      errors.push({
        layer: 'locations',
        path: 'locations',
        message: `Level ${l} has no appropriate locations`,
        severity: 'warning',
      });
    }
  }

  return errors;
}
