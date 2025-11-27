import type {
  WorldState,
  Location,
  LocationId,
  Entity,
  EntityId,
  NPCEntity,
  CreatureEntity,
  ItemEntity,
  FactionEntity,
  LoreEntry,
  CanonicalDescription,
  AmbianceProfile,
  PersonalityProfile,
  LocationConnection,
  CreatureStats,
  AbilityScores,
} from '@ai-dm/shared';
import { createLocationId, createEntityId } from '@ai-dm/shared';

/**
 * Builder for creating WorldState instances
 */
export class WorldBuilder {
  private world: WorldState;
  private locationCounter = 0;
  private entityCounter = 0;

  constructor(id: string, name: string, description: string) {
    this.world = {
      id,
      name,
      description,
      locations: new Map(),
      entities: new Map(),
      flags: new Map(),
      counters: new Map(),
      lore: [],
    };
  }

  /**
   * Add a location to the world
   */
  addLocation(location: Omit<Location, 'id'> & { id?: string }): LocationId {
    const id = createLocationId(location.id ?? `loc_${++this.locationCounter}`);
    this.world.locations.set(id, { ...location, id });
    return id;
  }

  /**
   * Add an NPC entity
   */
  addNPC(npc: Omit<NPCEntity, 'id' | 'type'> & { id?: string }): EntityId {
    const id = createEntityId(npc.id ?? `npc_${++this.entityCounter}`);
    const entity: NPCEntity = { ...npc, id, type: 'npc' };
    this.world.entities.set(id, entity);
    return id;
  }

  /**
   * Add a creature entity
   */
  addCreature(creature: Omit<CreatureEntity, 'id' | 'type'> & { id?: string }): EntityId {
    const id = createEntityId(creature.id ?? `creature_${++this.entityCounter}`);
    const entity: CreatureEntity = { ...creature, id, type: 'creature' };
    this.world.entities.set(id, entity);
    return id;
  }

  /**
   * Add an item entity
   */
  addItem(item: Omit<ItemEntity, 'id' | 'type'> & { id?: string }): EntityId {
    const id = createEntityId(item.id ?? `item_${++this.entityCounter}`);
    const entity: ItemEntity = { ...item, id, type: 'item' };
    this.world.entities.set(id, entity);
    return id;
  }

  /**
   * Add a faction entity
   */
  addFaction(faction: Omit<FactionEntity, 'id' | 'type'> & { id?: string }): EntityId {
    const id = createEntityId(faction.id ?? `faction_${++this.entityCounter}`);
    const entity: FactionEntity = { ...faction, id, type: 'faction' };
    this.world.entities.set(id, entity);
    return id;
  }

  /**
   * Add a lore entry
   */
  addLore(lore: Omit<LoreEntry, 'id'> & { id?: string }): string {
    const id = lore.id ?? `lore_${this.world.lore.length + 1}`;
    this.world.lore.push({ ...lore, id });
    return id;
  }

  /**
   * Set a world flag
   */
  setFlag(key: string, value: boolean): this {
    this.world.flags.set(key, value);
    return this;
  }

  /**
   * Set a world counter
   */
  setCounter(key: string, value: number): this {
    this.world.counters.set(key, value);
    return this;
  }

  /**
   * Place an entity in a location
   */
  placeEntity(entityId: EntityId, locationId: LocationId): this {
    const location = this.world.locations.get(locationId);
    if (location && !location.presentEntities.includes(entityId)) {
      location.presentEntities.push(entityId);
    }
    return this;
  }

  /**
   * Connect two locations bidirectionally
   */
  connectLocations(
    fromId: LocationId,
    toId: LocationId,
    fromDirection: string,
    toDirection: string,
    description?: string
  ): this {
    const fromLocation = this.world.locations.get(fromId);
    const toLocation = this.world.locations.get(toId);

    if (fromLocation) {
      const fromConnection: LocationConnection = {
        targetId: toId,
        direction: fromDirection,
      };
      if (description !== undefined) {
        fromConnection.description = description;
      }
      fromLocation.connections.push(fromConnection);
    }

    if (toLocation) {
      const toConnection: LocationConnection = {
        targetId: fromId,
        direction: toDirection,
      };
      if (description !== undefined) {
        toConnection.description = description;
      }
      toLocation.connections.push(toConnection);
    }

    return this;
  }

  /**
   * Build and return the world state
   */
  build(): WorldState {
    return this.world;
  }
}

/**
 * Helper to create a canonical description
 */
export function createDescription(
  text: string,
  options?: {
    sight?: string;
    sound?: string;
    smell?: string;
    touch?: string;
    hiddenDetails?: string[];
  }
): CanonicalDescription {
  const result: CanonicalDescription = { text };

  if (options?.sight || options?.sound || options?.smell || options?.touch) {
    result.sensoryDetails = {};
    if (options.sight) result.sensoryDetails.sight = options.sight;
    if (options.sound) result.sensoryDetails.sound = options.sound;
    if (options.smell) result.sensoryDetails.smell = options.smell;
    if (options.touch) result.sensoryDetails.touch = options.touch;
  }

  if (options?.hiddenDetails) {
    result.hiddenDetails = options.hiddenDetails;
  }

  return result;
}

/**
 * Helper to create an ambiance profile
 */
export function createAmbiance(
  lighting: AmbianceProfile['lighting'],
  noise: AmbianceProfile['noise'],
  mood: AmbianceProfile['mood'],
  temperature?: AmbianceProfile['temperature']
): AmbianceProfile {
  const result: AmbianceProfile = { lighting, noise, mood };
  if (temperature) {
    result.temperature = temperature;
  }
  return result;
}

/**
 * Helper to create a personality profile
 */
export function createPersonality(
  traits: string[],
  ideals: string[],
  bonds: string[],
  flaws: string[],
  options?: {
    speakingStyle?: string;
    mannerisms?: string[];
  }
): PersonalityProfile {
  const result: PersonalityProfile = { traits, ideals, bonds, flaws };
  if (options?.speakingStyle) {
    result.speakingStyle = options.speakingStyle;
  }
  if (options?.mannerisms) {
    result.mannerisms = options.mannerisms;
  }
  return result;
}

/**
 * Helper to create standard ability scores
 */
export function createAbilityScores(
  str: number,
  dex: number,
  con: number,
  int: number,
  wis: number,
  cha: number
): AbilityScores {
  return {
    strength: str,
    dexterity: dex,
    constitution: con,
    intelligence: int,
    wisdom: wis,
    charisma: cha,
  };
}

/**
 * Helper to create creature stats
 */
export function createCreatureStats(
  abilityScores: AbilityScores,
  armorClass: number,
  hitPoints: number,
  speed: number
): CreatureStats {
  return {
    abilityScores,
    armorClass,
    hitPoints: { current: hitPoints, max: hitPoints },
    speed,
  };
}
