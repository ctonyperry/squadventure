import type {
  GameSession,
  WorldState,
  DMPersona,
  Turn,
  LLMMessage,
  LocationId,
  SessionId,
  PersonaId,
  Scene,
  PlayerGamePreferences,
  EntityId,
  CombatState,
} from '@ai-dm/shared';
import { createSessionId, createLocationId, createEntityId } from '@ai-dm/shared';
import type { LLMAdapter } from '@ai-dm/infrastructure';
import {
  ToolRegistry,
  createRollDiceTool,
  createLookupNPCTool,
  createQueryLocationTool,
  createListEntitiesInLocationTool,
  createLookupLoreTool,
  type DMToolContext,
  CombatManager,
  createStartCombatTool,
  createEndCombatTool,
  createNextTurnTool,
  createAttackRollTool,
  createSavingThrowTool,
  createApplyConditionTool,
  createRemoveConditionTool,
  createApplyDamageTool,
  createApplyHealingTool,
  createCombatStatusTool,
  type CombatToolContext,
  SRDKnowledgeBase,
  createRulesLookupTool,
  createSpellLookupTool,
  createConditionLookupTool,
  createMonsterLookupTool,
  type RAGToolContext,
} from '@ai-dm/domain';

/**
 * Events emitted by the orchestrator
 */
export interface SessionEvents {
  onTurnStart?: (turn: 'player' | 'dm') => void;
  onTurnEnd?: (turn: Turn) => void;
  onToolCall?: (name: string, args: Record<string, unknown>, result: unknown) => void;
  onStreamChunk?: (chunk: string) => void;
  onCombatStart?: (state: CombatState) => void;
  onCombatEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Configuration for session orchestrator
 */
export interface SessionOrchestratorConfig {
  llmAdapter: LLMAdapter;
  worldState: WorldState;
  persona: DMPersona;
  startingLocationId: LocationId;
  gamePreferences?: PlayerGamePreferences;
  events?: SessionEvents;
  maxToolIterations?: number;
}

/**
 * Session orchestrator manages the main game loop
 */
export class SessionOrchestrator {
  private session: GameSession;
  private llm: LLMAdapter;
  private toolRegistry: ToolRegistry;
  private events: SessionEvents;
  private maxToolIterations: number;
  private combatManager: CombatManager;
  private knowledgeBase: SRDKnowledgeBase;

  constructor(config: SessionOrchestratorConfig) {
    this.llm = config.llmAdapter;
    this.events = config.events ?? {};
    this.maxToolIterations = config.maxToolIterations ?? 10;
    this.combatManager = new CombatManager();
    this.knowledgeBase = new SRDKnowledgeBase();

    // Initialize session
    this.session = this.createSession(config);

    // Set up tool registry
    this.toolRegistry = new ToolRegistry();
    this.setupTools();
  }

  /**
   * Create initial session state
   */
  private createSession(config: SessionOrchestratorConfig): GameSession {
    const location = config.worldState.locations.get(config.startingLocationId);
    if (!location) {
      throw new Error(`Starting location ${config.startingLocationId} not found`);
    }

    const scene: Scene = {
      locationId: config.startingLocationId,
      presentNPCs: location.presentEntities.filter((id) => {
        const entity = config.worldState.entities.get(id);
        return entity?.type === 'npc';
      }),
      mood: location.ambiance,
      activeObjectives: [],
      sceneType: 'exploration',
    };

    return {
      id: createSessionId(`session_${Date.now()}`),
      worldStateId: config.worldState.id,
      personaId: config.persona.id,
      currentScene: scene,
      playerCharacters: [],
      conversationHistory: [],
      gamePreferences: config.gamePreferences ?? {
        experienceLevel: 'casual',
        playStyle: {
          prefersRoleplay: 0.5,
          prefersCombat: 0.5,
          prefersExploration: 0.5,
          prefersPuzzles: 0.5,
        },
        humorReceptivity: 0.5,
        pacePreference: 'measured',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Set up DM tools
   */
  private setupTools(): void {
    const getDMContext = (): DMToolContext => ({
      worldState: this.getWorldState(),
      currentLocationId: this.session.currentScene.locationId,
    });

    const getCombatContext = (): CombatToolContext => ({
      combatManager: this.combatManager,
      getEntityStats: (id: EntityId) => {
        const entity = this.worldState.entities.get(id);
        if (!entity) return null;

        // Get stats from entity
        if (entity.type === 'npc' && entity.stats) {
          const result: ReturnType<CombatToolContext['getEntityStats']> = {
            name: entity.name,
            armorClass: entity.stats.armorClass,
            hitPoints: { current: entity.stats.hitPoints.current, max: entity.stats.hitPoints.max },
            abilityScores: entity.stats.abilityScores,
          };
          if (entity.stats.proficiencyBonus !== undefined) {
            result.proficiencyBonus = entity.stats.proficiencyBonus;
          }
          return result;
        }
        if (entity.type === 'creature') {
          const result: ReturnType<CombatToolContext['getEntityStats']> = {
            name: entity.name,
            armorClass: entity.stats.armorClass,
            hitPoints: { current: entity.stats.hitPoints.current, max: entity.stats.hitPoints.max },
            abilityScores: entity.stats.abilityScores,
          };
          if (entity.stats.proficiencyBonus !== undefined) {
            result.proficiencyBonus = entity.stats.proficiencyBonus;
          }
          return result;
        }

        // Default stats for entities without explicit stats
        return {
          name: entity.name,
          armorClass: 10,
          hitPoints: { current: 10, max: 10 },
          abilityScores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
          },
        };
      },
    });

    // Register exploration tools
    this.toolRegistry
      .register(createRollDiceTool())
      .register(createLookupNPCTool(getDMContext))
      .register(createQueryLocationTool(getDMContext))
      .register(createListEntitiesInLocationTool(getDMContext))
      .register(createLookupLoreTool(getDMContext));

    // Register combat tools
    this.toolRegistry
      .register(createStartCombatTool(getCombatContext))
      .register(createEndCombatTool(getCombatContext))
      .register(createNextTurnTool(getCombatContext))
      .register(createAttackRollTool(getCombatContext))
      .register(createSavingThrowTool(getCombatContext))
      .register(createApplyConditionTool(getCombatContext))
      .register(createRemoveConditionTool(getCombatContext))
      .register(createApplyDamageTool(getCombatContext))
      .register(createApplyHealingTool(getCombatContext))
      .register(createCombatStatusTool(getCombatContext));

    // Register RAG tools for rules lookup
    const getRAGContext = (): RAGToolContext => ({
      knowledgeBase: this.knowledgeBase,
    });

    this.toolRegistry
      .register(createRulesLookupTool(getRAGContext))
      .register(createSpellLookupTool(getRAGContext))
      .register(createConditionLookupTool(getRAGContext))
      .register(createMonsterLookupTool(getRAGContext));
  }

  /**
   * Get the current world state (will be mutable later)
   */
  private worldState!: WorldState;
  private getWorldState(): WorldState {
    return this.worldState;
  }

  /**
   * Initialize the orchestrator with world state
   */
  initialize(worldState: WorldState): void {
    this.worldState = worldState;
  }

  /**
   * Get the current session
   */
  getSession(): GameSession {
    return this.session;
  }

  /**
   * Get combat manager
   */
  getCombatManager(): CombatManager {
    return this.combatManager;
  }

  /**
   * Get knowledge base for rules lookup
   */
  getKnowledgeBase(): SRDKnowledgeBase {
    return this.knowledgeBase;
  }

  /**
   * Check if combat is active
   */
  isInCombat(): boolean {
    return this.combatManager.getState()?.isActive ?? false;
  }

  /**
   * Restore session from a snapshot
   */
  restoreFromSnapshot(
    snapshot: { worldState: WorldState; sessionState: GameSession; turnLog: Turn[] }
  ): void {
    // Restore world state
    this.worldState = snapshot.worldState;

    // Restore session
    this.session = {
      id: snapshot.sessionState.id,
      worldStateId: snapshot.sessionState.worldStateId,
      personaId: snapshot.sessionState.personaId,
      currentScene: snapshot.sessionState.currentScene,
      playerCharacters: snapshot.sessionState.playerCharacters,
      conversationHistory: [...snapshot.turnLog],
      gamePreferences: snapshot.sessionState.gamePreferences,
      createdAt: snapshot.sessionState.createdAt,
      updatedAt: new Date(),
    };

    // Restore combat state if present
    if (snapshot.sessionState.combat !== undefined) {
      this.session.combat = snapshot.sessionState.combat;
      // Note: CombatManager state restoration would need additional work
    }
  }

  /**
   * Process a player message and get the DM response
   */
  async processPlayerInput(input: string, persona: DMPersona): Promise<string> {
    this.events.onTurnStart?.('player');

    // Record player turn
    const playerTurn: Turn = {
      id: `turn_${Date.now()}_player`,
      timestamp: new Date(),
      role: 'player',
      content: input,
    };
    this.session.conversationHistory.push(playerTurn);
    this.events.onTurnEnd?.(playerTurn);

    // Get DM response
    this.events.onTurnStart?.('dm');
    const response = await this.getDMResponse(persona);

    // Record DM turn
    const dmTurn: Turn = {
      id: `turn_${Date.now()}_dm`,
      timestamp: new Date(),
      role: 'dm',
      content: response,
    };
    this.session.conversationHistory.push(dmTurn);
    this.events.onTurnEnd?.(dmTurn);

    this.session.updatedAt = new Date();

    // Update session combat state
    const combatState = this.combatManager.getState();
    if (combatState) {
      this.session.combat = combatState;
    }

    return response;
  }

  /**
   * Get the initial scene description
   */
  async getInitialDescription(persona: DMPersona): Promise<string> {
    // Add a system message to prompt scene description
    const systemTurn: Turn = {
      id: `turn_${Date.now()}_system`,
      timestamp: new Date(),
      role: 'system',
      content: 'The session begins. Describe the scene as the players arrive.',
    };
    this.session.conversationHistory.push(systemTurn);

    this.events.onTurnStart?.('dm');
    const response = await this.getDMResponse(persona);

    const dmTurn: Turn = {
      id: `turn_${Date.now()}_dm`,
      timestamp: new Date(),
      role: 'dm',
      content: response,
    };
    this.session.conversationHistory.push(dmTurn);
    this.events.onTurnEnd?.(dmTurn);

    return response;
  }

  /**
   * Build messages for LLM from conversation history
   */
  private buildMessages(persona: DMPersona): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // System prompt with persona
    messages.push({
      role: 'system',
      content: persona.systemPrompt,
    });

    // Add context about current scene
    const sceneContext = this.buildSceneContext();
    messages.push({
      role: 'system',
      content: sceneContext,
    });

    // Add combat context if in combat
    const combatContext = this.buildCombatContext();
    if (combatContext) {
      messages.push({
        role: 'system',
        content: combatContext,
      });
    }

    // Add conversation history
    for (const turn of this.session.conversationHistory) {
      if (turn.role === 'player') {
        messages.push({ role: 'user', content: turn.content });
      } else if (turn.role === 'dm') {
        messages.push({ role: 'assistant', content: turn.content });
      } else if (turn.role === 'system') {
        messages.push({ role: 'system', content: turn.content });
      }
    }

    return messages;
  }

  /**
   * Build context about current scene
   */
  private buildSceneContext(): string {
    const location = this.worldState.locations.get(
      this.session.currentScene.locationId
    );

    const parts: string[] = [
      'CURRENT SCENE CONTEXT:',
      `Location: ${location?.name ?? 'Unknown'}`,
    ];

    if (location) {
      // List present NPCs
      const npcs = this.session.currentScene.presentNPCs
        .map((id) => this.worldState.entities.get(id))
        .filter((e) => e !== undefined)
        .map((e) => e!.name);

      if (npcs.length > 0) {
        parts.push(`Present NPCs: ${npcs.join(', ')}`);
      }

      parts.push(`Ambiance: ${location.ambiance.mood}, ${location.ambiance.lighting} lighting`);
    }

    parts.push(
      '',
      'AVAILABLE TOOLS:',
      '- lookup_npc, query_location, list_entities: Query world state for NPCs and locations',
      '- roll_dice: Roll any dice notation (e.g., "2d6+3")',
      '- lookup_rules: Search D&D 5e rules (ability checks, combat, etc.)',
      '- lookup_spell: Look up specific spell details',
      '- lookup_condition: Look up condition effects',
      '',
      'Do not make up information - always query the world state or rules.'
    );

    return parts.join('\n');
  }

  /**
   * Build combat context if in combat
   */
  private buildCombatContext(): string | null {
    const combatState = this.combatManager.getState();
    if (!combatState) return null;

    const current = this.combatManager.getCurrentParticipant();
    const summary = this.combatManager.getSummary();

    return `COMBAT IS ACTIVE!

${summary}

COMBAT TOOLS AVAILABLE:
- attack_roll: Make an attack against a target
- saving_throw: Force a saving throw
- apply_damage / apply_healing: Modify HP
- apply_condition / remove_condition: Manage conditions
- next_turn: Advance to next combatant
- combat_status: Get current combat state
- end_combat: End the encounter

Current Turn: ${current?.name ?? 'Unknown'}
Remember to narrate combat dramatically and call for player actions on their turns.`;
  }

  /**
   * Get DM response with tool handling
   */
  private async getDMResponse(persona: DMPersona): Promise<string> {
    const messages = this.buildMessages(persona);
    let iterations = 0;

    while (iterations < this.maxToolIterations) {
      iterations++;

      const response = await this.llm.complete({
        messages,
        tools: this.toolRegistry.getTools(),
        temperature: 0.8,
      });

      // If no tool calls, return the content
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return response.content ?? '...';
      }

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.content ?? '',
        toolCalls: response.toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
      });

      // Process each tool call and add results
      for (const toolCall of response.toolCalls) {
        try {
          const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;
          const result = await this.toolRegistry.execute(toolCall.name, args);

          this.events.onToolCall?.(toolCall.name, args, result);

          // Emit combat events
          if (toolCall.name === 'start_combat') {
            const state = this.combatManager.getState();
            if (state) {
              this.events.onCombatStart?.(state);
            }
          } else if (toolCall.name === 'end_combat') {
            this.events.onCombatEnd?.();
          }

          // Add tool result
          messages.push({
            role: 'tool',
            content: JSON.stringify(result, null, 2),
            toolCallId: toolCall.id,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          messages.push({
            role: 'tool',
            content: `Error: ${errorMessage}`,
            toolCallId: toolCall.id,
          });
        }
      }
    }

    return 'The DM pauses, lost in thought...';
  }

  /**
   * Stream the DM response
   */
  async *streamPlayerInput(
    input: string,
    persona: DMPersona
  ): AsyncGenerator<string, string, unknown> {
    // Record player turn
    const playerTurn: Turn = {
      id: `turn_${Date.now()}_player`,
      timestamp: new Date(),
      role: 'player',
      content: input,
    };
    this.session.conversationHistory.push(playerTurn);

    const messages = this.buildMessages(persona);
    let fullResponse = '';

    // For streaming, we don't support tool calls in the middle
    // This is a simplified version
    for await (const chunk of this.llm.stream({
      messages,
      tools: this.toolRegistry.getTools(),
      temperature: 0.8,
    })) {
      if (chunk.content) {
        fullResponse += chunk.content;
        this.events.onStreamChunk?.(chunk.content);
        yield chunk.content;
      }
    }

    // Record DM turn
    const dmTurn: Turn = {
      id: `turn_${Date.now()}_dm`,
      timestamp: new Date(),
      role: 'dm',
      content: fullResponse,
    };
    this.session.conversationHistory.push(dmTurn);

    this.session.updatedAt = new Date();
    return fullResponse;
  }
}
