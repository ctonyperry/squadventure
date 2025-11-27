/**
 * NPC Memory & Relationships System
 *
 * Tracks NPC relationships with players, conversation history,
 * and faction-based information sharing.
 */

import type { EntityId, LocationId } from '@ai-dm/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Relationship level with a player or entity
 */
export type RelationshipLevel =
  | 'hostile'
  | 'unfriendly'
  | 'neutral'
  | 'friendly'
  | 'allied';

/**
 * Numeric mapping for relationship levels
 */
export const RELATIONSHIP_SCORES: Record<RelationshipLevel, number> = {
  hostile: -100,
  unfriendly: -50,
  neutral: 0,
  friendly: 50,
  allied: 100,
};

/**
 * Get relationship level from score
 */
export function getRelationshipLevel(score: number): RelationshipLevel {
  if (score <= -75) return 'hostile';
  if (score <= -25) return 'unfriendly';
  if (score < 25) return 'neutral';
  if (score < 75) return 'friendly';
  return 'allied';
}

/**
 * A single memory/interaction record
 */
export interface NPCMemory {
  id: string;
  /** When this memory was created */
  timestamp: Date;
  /** Type of interaction */
  type: 'conversation' | 'action' | 'gift' | 'combat' | 'quest' | 'observation';
  /** Summary of what happened */
  summary: string;
  /** Impact on relationship (-100 to +100) */
  relationshipImpact: number;
  /** Location where this occurred */
  locationId?: LocationId;
  /** Related entities involved */
  involvedEntities?: EntityId[];
  /** Tags for searchability */
  tags?: string[];
  /** Importance level for memory pruning */
  importance: 'trivial' | 'minor' | 'notable' | 'significant' | 'critical';
}

/**
 * NPC relationship with a specific entity
 */
export interface NPCRelationship {
  /** The entity this relationship is with */
  entityId: EntityId;
  /** Entity name for display */
  entityName: string;
  /** Current relationship score (-100 to +100) */
  score: number;
  /** Current relationship level */
  level: RelationshipLevel;
  /** First met timestamp */
  firstMet: Date;
  /** Last interaction timestamp */
  lastInteraction: Date;
  /** Number of interactions */
  interactionCount: number;
  /** Known information about this entity */
  knownFacts: string[];
  /** Memories with this entity */
  memories: NPCMemory[];
}

/**
 * Information that can be shared within a faction
 */
export interface FactionIntelligence {
  id: string;
  /** What the information is about */
  subject: string;
  /** The actual information */
  content: string;
  /** Source NPC who learned this */
  sourceNpcId: EntityId;
  /** When this was learned */
  learnedAt: Date;
  /** NPCs who have been told this */
  sharedWith: EntityId[];
  /** How sensitive/secret this is */
  sensitivity: 'public' | 'private' | 'secret' | 'critical';
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Complete NPC memory state
 */
export interface NPCMemoryState {
  /** The NPC this state belongs to */
  npcId: EntityId;
  /** NPC's faction if any */
  factionId?: EntityId;
  /** Relationships with other entities */
  relationships: Map<EntityId, NPCRelationship>;
  /** General memories not tied to specific relationships */
  generalMemories: NPCMemory[];
  /** Known faction intelligence */
  factionIntelligence: FactionIntelligence[];
  /** Disposition modifier (affects all relationship starting points) */
  baseDisposition: number;
  /** Maximum memories to retain per relationship */
  memoryCapacity: number;
}

// ============================================================================
// NPC Memory Manager Class
// ============================================================================

/**
 * Manages NPC memories and relationships
 */
export class NPCMemoryManager {
  private npcStates: Map<EntityId, NPCMemoryState> = new Map();
  private factionMembers: Map<EntityId, EntityId[]> = new Map(); // factionId -> npcIds
  private nextMemoryId = 1;
  private nextIntelId = 1;

  // ==========================================================================
  // NPC Registration
  // ==========================================================================

  /**
   * Register an NPC with the memory system
   */
  registerNPC(
    npcId: EntityId,
    options?: {
      factionId?: EntityId;
      baseDisposition?: number;
      memoryCapacity?: number;
    }
  ): void {
    if (this.npcStates.has(npcId)) {
      return; // Already registered
    }

    const state: NPCMemoryState = {
      npcId,
      relationships: new Map(),
      generalMemories: [],
      factionIntelligence: [],
      baseDisposition: options?.baseDisposition ?? 0,
      memoryCapacity: options?.memoryCapacity ?? 50,
    };

    if (options?.factionId) {
      state.factionId = options.factionId;
    }

    this.npcStates.set(npcId, state);

    // Track faction membership
    if (options?.factionId) {
      const members = this.factionMembers.get(options.factionId) ?? [];
      members.push(npcId);
      this.factionMembers.set(options.factionId, members);
    }
  }

  /**
   * Get an NPC's memory state
   */
  getNPCState(npcId: EntityId): NPCMemoryState | undefined {
    return this.npcStates.get(npcId);
  }

  // ==========================================================================
  // Relationship Management
  // ==========================================================================

  /**
   * Get relationship between NPC and an entity
   */
  getRelationship(npcId: EntityId, targetId: EntityId): NPCRelationship | null {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return null;
    }
    return state.relationships.get(targetId) ?? null;
  }

  /**
   * Initialize a new relationship
   */
  initializeRelationship(
    npcId: EntityId,
    targetId: EntityId,
    targetName: string,
    options?: {
      initialScore?: number;
      knownFacts?: string[];
    }
  ): NPCRelationship | null {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return null;
    }

    const initialScore = (options?.initialScore ?? 0) + state.baseDisposition;
    const now = new Date();

    const relationship: NPCRelationship = {
      entityId: targetId,
      entityName: targetName,
      score: Math.max(-100, Math.min(100, initialScore)),
      level: getRelationshipLevel(initialScore),
      firstMet: now,
      lastInteraction: now,
      interactionCount: 0,
      knownFacts: options?.knownFacts ?? [],
      memories: [],
    };

    state.relationships.set(targetId, relationship);
    return relationship;
  }

  /**
   * Modify relationship score
   */
  modifyRelationship(
    npcId: EntityId,
    targetId: EntityId,
    change: number,
    reason?: string
  ): { success: boolean; newScore?: number; newLevel?: RelationshipLevel; message: string } {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return { success: false, message: 'NPC not registered.' };
    }

    const relationship = state.relationships.get(targetId);
    if (!relationship) {
      return { success: false, message: 'No relationship with target.' };
    }

    const oldLevel = relationship.level;
    relationship.score = Math.max(-100, Math.min(100, relationship.score + change));
    relationship.level = getRelationshipLevel(relationship.score);
    relationship.lastInteraction = new Date();
    relationship.interactionCount++;

    // Record this as a memory if there's a reason
    if (reason) {
      this.addMemory(npcId, targetId, {
        type: 'action',
        summary: reason,
        relationshipImpact: change,
        importance: Math.abs(change) >= 20 ? 'notable' : 'minor',
      });
    }

    const levelChanged = oldLevel !== relationship.level;
    const direction = change > 0 ? 'improved' : 'worsened';

    return {
      success: true,
      newScore: relationship.score,
      newLevel: relationship.level,
      message: levelChanged
        ? `Relationship ${direction} to ${relationship.level}`
        : `Relationship ${direction} (${change >= 0 ? '+' : ''}${change})`,
    };
  }

  /**
   * Get relationship level string
   */
  getRelationshipSummary(npcId: EntityId, targetId: EntityId): string {
    const rel = this.getRelationship(npcId, targetId);
    if (!rel) {
      return 'No relationship established';
    }
    return `${rel.level} (${rel.score}/100, ${rel.interactionCount} interactions)`;
  }

  // ==========================================================================
  // Memory Management
  // ==========================================================================

  /**
   * Add a memory to an NPC about a specific entity
   */
  addMemory(
    npcId: EntityId,
    targetId: EntityId,
    memory: Omit<NPCMemory, 'id' | 'timestamp'>
  ): NPCMemory | null {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return null;
    }

    const relationship = state.relationships.get(targetId);
    if (!relationship) {
      return null;
    }

    const newMemory: NPCMemory = {
      ...memory,
      id: `mem_${this.nextMemoryId++}`,
      timestamp: new Date(),
    };

    relationship.memories.push(newMemory);

    // Apply relationship impact
    if (memory.relationshipImpact !== 0) {
      relationship.score = Math.max(
        -100,
        Math.min(100, relationship.score + memory.relationshipImpact)
      );
      relationship.level = getRelationshipLevel(relationship.score);
    }

    // Prune old memories if over capacity
    this.pruneMemories(relationship, state.memoryCapacity);

    return newMemory;
  }

  /**
   * Add a general memory not tied to a specific relationship
   */
  addGeneralMemory(
    npcId: EntityId,
    memory: Omit<NPCMemory, 'id' | 'timestamp'>
  ): NPCMemory | null {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return null;
    }

    const newMemory: NPCMemory = {
      ...memory,
      id: `mem_${this.nextMemoryId++}`,
      timestamp: new Date(),
    };

    state.generalMemories.push(newMemory);

    // Prune if over capacity
    while (state.generalMemories.length > state.memoryCapacity) {
      // Remove least important, oldest memories first
      const sorted = [...state.generalMemories].sort((a, b) => {
        const importanceOrder = { trivial: 0, minor: 1, notable: 2, significant: 3, critical: 4 };
        const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        if (impDiff !== 0) return impDiff;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });
      const toRemove = sorted[0];
      if (toRemove) {
        state.generalMemories = state.generalMemories.filter((m) => m.id !== toRemove.id);
      } else {
        break;
      }
    }

    return newMemory;
  }

  /**
   * Record a conversation between NPC and entity
   */
  recordConversation(
    npcId: EntityId,
    targetId: EntityId,
    summary: string,
    options?: {
      relationshipImpact?: number;
      learnedFacts?: string[];
      importance?: NPCMemory['importance'];
      locationId?: LocationId;
    }
  ): { success: boolean; message: string } {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return { success: false, message: 'NPC not registered.' };
    }

    let relationship = state.relationships.get(targetId);
    if (!relationship) {
      return { success: false, message: 'No relationship with target.' };
    }

    // Add memory
    const memoryData: Omit<NPCMemory, 'id' | 'timestamp'> = {
      type: 'conversation',
      summary,
      relationshipImpact: options?.relationshipImpact ?? 0,
      importance: options?.importance ?? 'minor',
    };
    if (options?.locationId) {
      memoryData.locationId = options.locationId;
    }
    this.addMemory(npcId, targetId, memoryData);

    // Add learned facts
    if (options?.learnedFacts) {
      for (const fact of options.learnedFacts) {
        if (!relationship.knownFacts.includes(fact)) {
          relationship.knownFacts.push(fact);
        }
      }
    }

    relationship.lastInteraction = new Date();
    relationship.interactionCount++;

    return { success: true, message: `Conversation recorded with ${relationship.entityName}` };
  }

  /**
   * Get all memories about a specific entity
   */
  getMemoriesAbout(npcId: EntityId, targetId: EntityId): NPCMemory[] {
    const relationship = this.getRelationship(npcId, targetId);
    return relationship?.memories ?? [];
  }

  /**
   * Search NPC memories by tag or type
   */
  searchMemories(
    npcId: EntityId,
    criteria: {
      type?: NPCMemory['type'];
      tags?: string[];
      minImportance?: NPCMemory['importance'];
      afterDate?: Date;
    }
  ): NPCMemory[] {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return [];
    }

    const importanceOrder = { trivial: 0, minor: 1, notable: 2, significant: 3, critical: 4 };
    const minImp = criteria.minImportance ? importanceOrder[criteria.minImportance] : 0;

    const allMemories: NPCMemory[] = [
      ...state.generalMemories,
      ...Array.from(state.relationships.values()).flatMap((r) => r.memories),
    ];

    return allMemories.filter((m) => {
      if (criteria.type && m.type !== criteria.type) return false;
      if (criteria.tags && !criteria.tags.some((t) => m.tags?.includes(t))) return false;
      if (importanceOrder[m.importance] < minImp) return false;
      if (criteria.afterDate && m.timestamp < criteria.afterDate) return false;
      return true;
    });
  }

  private pruneMemories(relationship: NPCRelationship, capacity: number): void {
    if (relationship.memories.length <= capacity) {
      return;
    }

    // Sort by importance (ascending) then by age (ascending)
    const importanceOrder = { trivial: 0, minor: 1, notable: 2, significant: 3, critical: 4 };
    const sorted = [...relationship.memories].sort((a, b) => {
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (impDiff !== 0) return impDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Keep the most important/recent memories
    relationship.memories = sorted.slice(-capacity);
  }

  // ==========================================================================
  // Faction Intelligence Sharing
  // ==========================================================================

  /**
   * Add intelligence that can be shared within a faction
   */
  addFactionIntelligence(
    npcId: EntityId,
    intel: Omit<FactionIntelligence, 'id' | 'sourceNpcId' | 'learnedAt' | 'sharedWith'>
  ): FactionIntelligence | null {
    const state = this.npcStates.get(npcId);
    if (!state || !state.factionId) {
      return null;
    }

    const newIntel: FactionIntelligence = {
      ...intel,
      id: `intel_${this.nextIntelId++}`,
      sourceNpcId: npcId,
      learnedAt: new Date(),
      sharedWith: [npcId],
    };

    state.factionIntelligence.push(newIntel);
    return newIntel;
  }

  /**
   * Share intelligence with faction members
   */
  shareFactionIntelligence(
    factionId: EntityId,
    intelId: string,
    options?: {
      maxRecipients?: number;
      sensitivityThreshold?: FactionIntelligence['sensitivity'];
    }
  ): { success: boolean; sharedWith: EntityId[]; message: string } {
    const members = this.factionMembers.get(factionId) ?? [];
    if (members.length === 0) {
      return { success: false, sharedWith: [], message: 'No faction members.' };
    }

    // Find the intel
    let intel: FactionIntelligence | undefined;
    let sourceState: NPCMemoryState | undefined;

    for (const memberId of members) {
      const state = this.npcStates.get(memberId);
      if (state) {
        intel = state.factionIntelligence.find((i) => i.id === intelId);
        if (intel) {
          sourceState = state;
          break;
        }
      }
    }

    if (!intel || !sourceState) {
      return { success: false, sharedWith: [], message: 'Intelligence not found.' };
    }

    // Check sensitivity threshold
    const sensitivityOrder = { public: 0, private: 1, secret: 2, critical: 3 };
    const threshold = options?.sensitivityThreshold ?? 'critical';
    if (sensitivityOrder[intel.sensitivity] > sensitivityOrder[threshold]) {
      return {
        success: false,
        sharedWith: [],
        message: 'Intelligence too sensitive to share.',
      };
    }

    // Share with members who don't have it yet
    const maxRecipients = options?.maxRecipients ?? members.length;
    const newRecipients: EntityId[] = [];

    for (const memberId of members) {
      if (intel.sharedWith.includes(memberId)) {
        continue;
      }
      if (newRecipients.length >= maxRecipients) {
        break;
      }

      const memberState = this.npcStates.get(memberId);
      if (memberState) {
        // Add intel to this member's knowledge
        const existingIntel = memberState.factionIntelligence.find((i) => i.id === intelId);
        if (!existingIntel) {
          memberState.factionIntelligence.push({ ...intel });
        }
        intel.sharedWith.push(memberId);
        newRecipients.push(memberId);
      }
    }

    return {
      success: true,
      sharedWith: newRecipients,
      message: `Intelligence shared with ${newRecipients.length} faction member(s).`,
    };
  }

  /**
   * Get all intelligence an NPC knows
   */
  getNPCIntelligence(npcId: EntityId): FactionIntelligence[] {
    const state = this.npcStates.get(npcId);
    return state?.factionIntelligence ?? [];
  }

  /**
   * Check if NPC knows specific intelligence
   */
  npcKnowsIntel(npcId: EntityId, intelId: string): boolean {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return false;
    }
    return state.factionIntelligence.some((i) => i.id === intelId);
  }

  // ==========================================================================
  // Known Facts Management
  // ==========================================================================

  /**
   * Add a known fact about an entity
   */
  addKnownFact(npcId: EntityId, targetId: EntityId, fact: string): boolean {
    const relationship = this.getRelationship(npcId, targetId);
    if (!relationship) {
      return false;
    }
    if (!relationship.knownFacts.includes(fact)) {
      relationship.knownFacts.push(fact);
    }
    return true;
  }

  /**
   * Get all facts an NPC knows about an entity
   */
  getKnownFacts(npcId: EntityId, targetId: EntityId): string[] {
    const relationship = this.getRelationship(npcId, targetId);
    return relationship?.knownFacts ?? [];
  }

  // ==========================================================================
  // Summary & Export
  // ==========================================================================

  /**
   * Get a summary of an NPC's relationships
   */
  getRelationshipsSummary(npcId: EntityId): string {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return 'NPC not registered.';
    }

    const lines: string[] = [`=== Relationships for ${npcId} ===`];

    if (state.relationships.size === 0) {
      lines.push('No relationships established.');
    } else {
      const relationships = Array.from(state.relationships.values());
      relationships.sort((a, b) => b.score - a.score);

      for (const rel of relationships) {
        lines.push(`  ${rel.entityName}: ${rel.level} (${rel.score})`);
        lines.push(`    Interactions: ${rel.interactionCount}, Known facts: ${rel.knownFacts.length}`);
      }
    }

    if (state.factionId) {
      lines.push(`\nFaction: ${state.factionId}`);
      lines.push(`Intelligence items: ${state.factionIntelligence.length}`);
    }

    return lines.join('\n');
  }

  /**
   * Export NPC memory state
   */
  exportNPCState(npcId: EntityId): NPCMemoryState | null {
    const state = this.npcStates.get(npcId);
    if (!state) {
      return null;
    }

    // Convert Map to serializable format
    return {
      ...state,
      relationships: new Map(state.relationships),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an NPC memory manager instance
 */
export function createNPCMemoryManager(): NPCMemoryManager {
  return new NPCMemoryManager();
}
