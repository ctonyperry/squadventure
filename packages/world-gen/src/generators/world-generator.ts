/**
 * World Generator
 *
 * Orchestrates the layered world generation pipeline.
 */

import type {
  WorldBrief,
  WorldTemplate,
  WorldFoundation,
  FactionsLayer,
  LocationsLayer,
  NPCsLayer,
  CampaignArcLayer,
  EncountersLayer,
  GenerationProgress,
  GenerationResult,
  GenerationLayer,
} from '../types.js';
import {
  SYSTEM_PROMPT,
  getFoundationPrompt,
  getFactionsPrompt,
  getLocationsPrompt,
  getNPCsPrompt,
  getCampaignArcPrompt,
  getEncountersPrompt,
} from '../prompts/index.js';
import {
  validateFoundation,
  validateFactions,
  validateLocations,
  validateNPCs,
  validateCampaignArc,
  validateEncounters,
  validateWorldTemplate,
} from '../validators/index.js';

// =============================================================================
// Types
// =============================================================================

export interface GeneratorOptions {
  /** Chat client for LLM calls */
  chatClient: ChatClient;

  /** Callback for progress updates */
  onProgress?: (progress: GenerationProgress) => void;

  /** Callback after each layer completes */
  onLayerComplete?: (layer: GenerationLayer, data: unknown) => void;

  /** Maximum retries per layer on validation failure */
  maxRetries?: number;

  /** Model to use for generation */
  model?: string;
}

export interface ChatClient {
  chat(options: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    responseFormat?: { type: 'json_object' };
  }): Promise<{ content: string; tokensUsed?: number }>;
}

// =============================================================================
// World Generator
// =============================================================================

export class WorldGenerator {
  private chatClient: ChatClient;
  private onProgress: ((progress: GenerationProgress) => void) | undefined;
  private onLayerComplete: ((layer: GenerationLayer, data: unknown) => void) | undefined;
  private maxRetries: number;
  private model: string;

  private progress: GenerationProgress;
  private totalTokens = 0;

  constructor(options: GeneratorOptions) {
    this.chatClient = options.chatClient;
    if (options.onProgress) {
      this.onProgress = options.onProgress;
    }
    if (options.onLayerComplete) {
      this.onLayerComplete = options.onLayerComplete;
    }
    this.maxRetries = options.maxRetries ?? 2;
    this.model = options.model ?? 'gpt-4o-mini';

    this.progress = {
      currentLayer: 'foundation',
      completedLayers: [],
      errors: [],
      warnings: [],
      startedAt: new Date(),
      layerStartedAt: new Date(),
    };
  }

  /**
   * Generate a complete world from a brief
   */
  async generate(brief: WorldBrief): Promise<GenerationResult<WorldTemplate>> {
    this.progress.startedAt = new Date();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Layer 1: Foundation
      const foundation = await this.generateLayer<WorldFoundation>(
        'foundation',
        getFoundationPrompt(brief),
        (data) => validateFoundation(data)
      );
      if (!foundation.success || !foundation.data) {
        return { success: false, errors: foundation.errors, warnings };
      }

      // Layer 2: Factions
      const factions = await this.generateLayer<FactionsLayer>(
        'factions',
        getFactionsPrompt(brief, foundation.data),
        (data) => validateFactions(data)
      );
      if (!factions.success || !factions.data) {
        return { success: false, errors: factions.errors, warnings };
      }

      // Layer 3: Locations
      const locations = await this.generateLayer<LocationsLayer>(
        'locations',
        getLocationsPrompt(brief, foundation.data, factions.data),
        (data) => validateLocations(data, factions.data!)
      );
      if (!locations.success || !locations.data) {
        return { success: false, errors: locations.errors, warnings };
      }

      // Layer 4: NPCs
      const npcs = await this.generateLayer<NPCsLayer>(
        'npcs',
        getNPCsPrompt(brief, foundation.data, factions.data, locations.data),
        (data) => validateNPCs(data, factions.data!, locations.data!)
      );
      if (!npcs.success || !npcs.data) {
        return { success: false, errors: npcs.errors, warnings };
      }

      // Layer 5: Campaign Arc
      const campaign = await this.generateLayer<CampaignArcLayer>(
        'campaign',
        getCampaignArcPrompt(
          brief,
          foundation.data,
          factions.data,
          locations.data,
          npcs.data
        ),
        (data) => validateCampaignArc(data, npcs.data!, locations.data!)
      );
      if (!campaign.success || !campaign.data) {
        return { success: false, errors: campaign.errors, warnings };
      }

      // Layer 6: Encounters
      const encounters = await this.generateLayer<EncountersLayer>(
        'encounters',
        getEncountersPrompt(brief, locations.data, campaign.data),
        (data) => validateEncounters(data, locations.data!)
      );
      if (!encounters.success || !encounters.data) {
        return { success: false, errors: encounters.errors, warnings };
      }

      // Assemble complete template
      const template: WorldTemplate = {
        id: foundation.data.id,
        version: '1.0.0',
        createdAt: new Date(),
        brief,
        foundation: foundation.data,
        factions: factions.data,
        locations: locations.data,
        npcs: npcs.data,
        campaignArc: campaign.data,
        encounters: encounters.data,
        metadata: {
          generatedBy: 'WorldGenerator',
          generationTimeMs: Date.now() - this.progress.startedAt.getTime(),
          validationPassed: true,
          validationWarnings: warnings,
        },
      };

      // Final validation
      const validation = validateWorldTemplate(template);
      template.metadata.validationPassed = validation.valid;
      template.metadata.validationWarnings = validation.errors
        .filter((e) => e.severity === 'warning')
        .map((e) => `${e.layer}:${e.path}: ${e.message}`);

      if (!validation.valid) {
        const criticalErrors = validation.errors
          .filter((e) => e.severity === 'error')
          .map((e) => `${e.layer}:${e.path}: ${e.message}`);
        return {
          success: false,
          data: template,
          errors: criticalErrors,
          warnings: template.metadata.validationWarnings,
          tokensUsed: this.totalTokens,
        };
      }

      return {
        success: true,
        data: template,
        errors: [],
        warnings: template.metadata.validationWarnings,
        tokensUsed: this.totalTokens,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [...errors, `Generation failed: ${message}`],
        warnings,
        tokensUsed: this.totalTokens,
      };
    }
  }

  /**
   * Generate a single layer with retries
   */
  private async generateLayer<T>(
    layer: GenerationLayer,
    prompt: string,
    validate: (data: T) => Array<{ severity: string; message: string }>
  ): Promise<GenerationResult<T>> {
    this.progress.currentLayer = layer;
    this.progress.layerStartedAt = new Date();
    this.notifyProgress();

    let lastErrors: string[] = [];

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.chatClient.chat({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          model: this.model,
          temperature: 0.7,
          responseFormat: { type: 'json_object' },
        });

        if (response.tokensUsed) {
          this.totalTokens += response.tokensUsed;
        }

        // Parse JSON response
        let data: T;
        try {
          data = JSON.parse(response.content) as T;
        } catch {
          lastErrors = [`Failed to parse JSON response for ${layer}`];
          continue;
        }

        // Validate
        const validationErrors = validate(data);
        const errors = validationErrors.filter((e) => e.severity === 'error');
        const warnings = validationErrors.filter((e) => e.severity === 'warning');

        if (errors.length > 0) {
          lastErrors = errors.map((e) => e.message);
          continue;
        }

        // Success
        this.progress.completedLayers.push(layer);
        this.progress.warnings.push(...warnings.map((w) => `${layer}: ${w.message}`));
        this.notifyProgress();
        this.onLayerComplete?.(layer, data);

        const result: GenerationResult<T> = {
          success: true,
          data,
          errors: [],
          warnings: warnings.map((w) => w.message),
        };
        if (response.tokensUsed !== undefined) {
          result.tokensUsed = response.tokensUsed;
        }
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastErrors = [`API error: ${message}`];
      }
    }

    this.progress.errors.push(`${layer}: ${lastErrors.join(', ')}`);
    this.notifyProgress();

    return {
      success: false,
      errors: lastErrors,
      warnings: [],
    };
  }

  private notifyProgress(): void {
    this.onProgress?.({ ...this.progress });
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createWorldGenerator(options: GeneratorOptions): WorldGenerator {
  return new WorldGenerator(options);
}
