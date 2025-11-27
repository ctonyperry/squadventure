/**
 * Generation Prompt Templates
 *
 * Structured prompts for each generation layer.
 */

import type {
  WorldBrief,
  WorldFoundation,
  FactionsLayer,
  LocationsLayer,
  NPCsLayer,
  CampaignArcLayer,
} from '../types.js';

// =============================================================================
// System Prompt
// =============================================================================

export const SYSTEM_PROMPT = `You are a creative world-building assistant for tabletop RPGs.
You generate detailed, internally consistent content that follows D&D 5e conventions.

Guidelines:
- Generate content in valid JSON format matching the requested schema
- Ensure all IDs are unique and follow the pattern: type_name_random (e.g., "loc_ironforge_7x2k")
- Create interconnected content that references other generated elements
- Balance creativity with playability
- Consider level-appropriate challenges and rewards
- Leave room for player agency and DM improvisation
- Include secrets and hidden elements that reward exploration

When generating:
- Be specific with descriptions but leave room for interpretation
- Create NPCs with clear motivations that can drive gameplay
- Design locations with multiple points of interest
- Build factions with conflicting goals that create tension
- Structure campaigns with clear dramatic arcs`;

// =============================================================================
// Layer 1: Foundation
// =============================================================================

export function getFoundationPrompt(brief: WorldBrief): string {
  return `Generate the foundation layer for a D&D world based on this brief:

**World Name**: ${brief.name}
**Genre**: ${brief.genre}${brief.customGenre ? ` (${brief.customGenre})` : ''}
**Themes**: ${brief.themes.join(', ')}
**Tone**: ${brief.tone}
**Level Range**: ${brief.levelRange.min}-${brief.levelRange.max}
${brief.requirements ? `**Requirements**: ${brief.requirements.join(', ')}` : ''}
${brief.inspirations ? `**Inspirations**: ${brief.inspirations.join(', ')}` : ''}

Generate a WorldFoundation object with:
- Unique id (format: world_[name]_[random])
- Geography overview and major landmarks
- Historical timeline with 3-5 major eras
- Appropriate magic and technology levels
- 3-5 world-specific rules or quirks

Return ONLY valid JSON matching the WorldFoundation schema.`;
}

// =============================================================================
// Layer 2: Factions
// =============================================================================

export function getFactionsPrompt(
  brief: WorldBrief,
  foundation: WorldFoundation
): string {
  return `Generate factions for the world "${foundation.name}".

**World Context**:
- Setting: ${foundation.settingType}
- Magic Level: ${foundation.magicLevel}
- Technology: ${foundation.technologyLevel}
- Current Year: ${foundation.history.currentYear} (${foundation.history.calendarName})

**Campaign Brief**:
- Themes: ${brief.themes.join(', ')}
- Tone: ${brief.tone}
- Level Range: ${brief.levelRange.min}-${brief.levelRange.max}

Generate a FactionsLayer with:
- 4-6 distinct factions with conflicting goals
- Clear power dynamics and tensions
- At least one faction that could be allied with players
- At least one faction that opposes players
- Political landscape description
- 2-3 major conflicts between factions

For each faction:
- Unique id (format: faction_[name]_[random])
- Clear goals and values
- Resources and influence level
- Allies and enemies (reference other faction IDs)
- At least 2 secrets players could uncover

Return ONLY valid JSON matching the FactionsLayer schema.`;
}

// =============================================================================
// Layer 3: Locations
// =============================================================================

export function getLocationsPrompt(
  brief: WorldBrief,
  foundation: WorldFoundation,
  factions: FactionsLayer
): string {
  const factionNames = factions.factions.map((f) => `${f.name} (${f.id})`).join(', ');

  return `Generate locations for the world "${foundation.name}".

**World Context**:
- Geography: ${foundation.geography.overview}
- Major Landmarks: ${foundation.geography.majorLandmarks.join(', ')}
- Scale: ${foundation.geography.scale}

**Existing Factions**: ${factionNames}

**Campaign Brief**:
- Level Range: ${brief.levelRange.min}-${brief.levelRange.max}
- Tone: ${brief.tone}

Generate a LocationsLayer with:
- 8-12 locations of varying types
- At least 1 major city (starting hub)
- At least 2 dungeons/adventure sites
- At least 2 wilderness areas
- Points of interest for each location
- Travel connections forming a logical network
- Danger levels appropriate for suggested levels

For each location:
- Unique id (format: loc_[name]_[random])
- Control by appropriate faction (use faction IDs)
- 2-4 points of interest
- Connections to other locations (use location IDs)
- At least 1 secret

Ensure locations span the level range:
- Levels ${brief.levelRange.min}-${Math.floor((brief.levelRange.max - brief.levelRange.min) / 3) + brief.levelRange.min}: Starting areas, safe zones
- Levels ${Math.floor((brief.levelRange.max - brief.levelRange.min) / 3) + brief.levelRange.min + 1}-${Math.floor((brief.levelRange.max - brief.levelRange.min) * 2 / 3) + brief.levelRange.min}: Mid-game locations
- Levels ${Math.floor((brief.levelRange.max - brief.levelRange.min) * 2 / 3) + brief.levelRange.min + 1}-${brief.levelRange.max}: Endgame areas

Return ONLY valid JSON matching the LocationsLayer schema.`;
}

// =============================================================================
// Layer 4: NPCs
// =============================================================================

export function getNPCsPrompt(
  brief: WorldBrief,
  foundation: WorldFoundation,
  factions: FactionsLayer,
  locations: LocationsLayer
): string {
  const factionInfo = factions.factions
    .map((f) => `- ${f.name} (${f.id}): ${f.goals[0]}`)
    .join('\n');
  const locationInfo = locations.locations
    .map((l) => `- ${l.name} (${l.id}): ${l.type}`)
    .join('\n');

  return `Generate NPCs for the world "${foundation.name}".

**Factions**:
${factionInfo}

**Locations**:
${locationInfo}

**Campaign Brief**:
- Themes: ${brief.themes.join(', ')}
- Tone: ${brief.tone}

Generate an NPCsLayer with:
- 15-20 NPCs distributed across locations
- At least 1 leader per faction
- Mix of helpful, neutral, and hostile NPCs
- Variety of races and occupations
- NPCs with conflicting loyalties
- At least 3 NPCs who can give quest hooks

For each NPC:
- Unique id (format: npc_[name]_[random])
- Clear personality traits and motivations
- Location (use location ID)
- Faction memberships (use faction IDs)
- Relationships with other NPCs (use NPC IDs)
- Knowledge they possess that players might need
- At least 1 secret

Include:
- A potential patron for the party
- An information broker
- A rival adventurer or group
- Someone with a dark secret
- A potential ally who becomes enemy (or vice versa)

Return ONLY valid JSON matching the NPCsLayer schema.`;
}

// =============================================================================
// Layer 5: Campaign Arc
// =============================================================================

export function getCampaignArcPrompt(
  brief: WorldBrief,
  foundation: WorldFoundation,
  factions: FactionsLayer,
  locations: LocationsLayer,
  npcs: NPCsLayer
): string {
  const antagonistCandidates = npcs.npcs
    .filter((n) => n.secrets.length > 0)
    .slice(0, 5)
    .map((n) => `- ${n.name} (${n.id}): ${n.motivations[0]}`)
    .join('\n');

  return `Design the campaign arc for "${foundation.name}".

**World Context**:
- Themes: ${brief.themes.join(', ')}
- Tone: ${brief.tone}
- Level Range: ${brief.levelRange.min}-${brief.levelRange.max}
${brief.estimatedSessions ? `- Target Sessions: ~${brief.estimatedSessions}` : ''}

**Major Conflicts**:
${factions.majorConflicts.map((c) => `- ${c.name}: ${c.description}`).join('\n')}

**Potential Antagonists**:
${antagonistCandidates}

Generate a CampaignArcLayer with:
- Central conflict that ties to world themes
- Main antagonist (can be new or from existing NPCs)
- 3-5 chapters spanning the level range
- Multiple possible endings (at least 3)
- 2-3 subplots

For each chapter:
- Unique id (format: chapter_[number]_[random])
- Level range appropriate to campaign progression
- Key locations (use location IDs)
- Key NPCs (use NPC IDs)
- 3-5 story beats with clear progression
- Player choice points

Story beat types:
- introduction: Sets up the chapter
- rising-action: Builds tension
- climax: Major confrontation or revelation
- resolution: Consequences and setup for next chapter
- optional: Side content players might miss

Create endings that:
- Feel earned based on player choices
- Have varying tones (triumphant, bittersweet, etc.)
- Account for different player strategies

Return ONLY valid JSON matching the CampaignArcLayer schema.`;
}

// =============================================================================
// Layer 6: Encounters
// =============================================================================

export function getEncountersPrompt(
  brief: WorldBrief,
  locations: LocationsLayer,
  campaignArc: CampaignArcLayer
): string {
  const dangerousLocations = locations.locations
    .filter((l) => l.dangerLevel !== 'safe')
    .map((l) => `- ${l.name} (${l.id}): ${l.dangerLevel}, levels ${l.suggestedLevel?.min || '?'}-${l.suggestedLevel?.max || '?'}`)
    .join('\n');

  return `Generate encounters and rewards for the campaign.

**Dangerous Locations**:
${dangerousLocations}

**Campaign Chapters**:
${campaignArc.chapters.map((c) => `- Chapter ${c.number}: ${c.name} (levels ${c.levelRange.min}-${c.levelRange.max})`).join('\n')}

**Level Range**: ${brief.levelRange.min}-${brief.levelRange.max}

Generate an EncountersLayer with:

**Encounters** (20-30 total):
- Combat encounters using D&D 5e creatures
- Social encounters with stakes
- Exploration challenges
- Puzzles and traps
- Mix of difficulties (easy through deadly)
- Alternative resolutions where appropriate

For each encounter:
- Unique id (format: enc_[type]_[name]_[random])
- Location reference (use location ID)
- Appropriate creature CRs for suggested level
- Tactics and environment considerations
- Rewards (XP, gold, items, information)

**Treasure Hoards** (5-8):
- Spread across the level range
- Include magic items appropriate to tier
- Guard conditions or puzzles
- Mix of coins, gems, art objects, magic items

**Random Encounter Tables** (one per dangerous location):
- 6-8 entries per table
- Weighted by likelihood
- Variety of encounter types

Use D&D 5e standard monsters and appropriate treasure values.

Return ONLY valid JSON matching the EncountersLayer schema.`;
}
