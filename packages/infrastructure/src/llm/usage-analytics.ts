/**
 * Usage Analytics
 *
 * Tracks LLM API usage, costs, and performance metrics.
 */

import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
} from '@ai-dm/shared';
import type { LLMAdapter, LLMStreamChunk } from './adapter.js';

// =============================================================================
// Analytics Types
// =============================================================================

/**
 * Single API request record
 */
export interface UsageRecord {
  id: string;
  timestamp: Date;
  model: string;
  sessionId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  cached: boolean;
  cost: number;
}

/**
 * Aggregated usage statistics
 */
export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  cacheHitRate: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  requestsPerMinute: number;
  tokensPerMinute: number;
}

/**
 * Usage breakdown by model
 */
export interface ModelUsageStats {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  averageLatencyMs: number;
}

/**
 * Usage breakdown by time period
 */
export interface PeriodUsageStats {
  periodStart: Date;
  periodEnd: Date;
  requests: number;
  tokens: number;
  cost: number;
}

/**
 * Cost configuration per model
 */
export interface ModelCostConfig {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
}

/**
 * Analytics configuration
 */
export interface UsageAnalyticsConfig {
  /** Maximum records to keep in memory */
  maxRecords?: number;
  /** Cost configuration per model */
  modelCosts?: Record<string, ModelCostConfig>;
  /** Callback when usage thresholds are exceeded */
  onThresholdExceeded?: (type: string, value: number, threshold: number) => void;
  /** Cost threshold for alerts */
  costThreshold?: number;
  /** Token threshold for alerts */
  tokenThreshold?: number;
}

// =============================================================================
// Default Model Costs (as of late 2024)
// =============================================================================

const DEFAULT_MODEL_COSTS: Record<string, ModelCostConfig> = {
  'gpt-4o': { inputPer1kTokens: 0.0025, outputPer1kTokens: 0.01 },
  'gpt-4o-mini': { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'gpt-4-turbo': { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 },
  'gpt-4': { inputPer1kTokens: 0.03, outputPer1kTokens: 0.06 },
  'gpt-3.5-turbo': { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015 },
  'claude-3-opus': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.075 },
  'claude-3-sonnet': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'claude-3-haiku': { inputPer1kTokens: 0.00025, outputPer1kTokens: 0.00125 },
};

// =============================================================================
// Usage Analytics Manager
// =============================================================================

/**
 * Tracks and analyzes LLM API usage
 */
export class UsageAnalytics {
  private records: UsageRecord[] = [];
  private config: Required<UsageAnalyticsConfig>;
  private recordCounter = 0;

  // Running totals for quick access
  private totals = {
    requests: 0,
    successful: 0,
    failed: 0,
    cached: 0,
    tokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
    latencySum: 0,
  };

  constructor(config: UsageAnalyticsConfig = {}) {
    this.config = {
      maxRecords: config.maxRecords ?? 10000,
      modelCosts: { ...DEFAULT_MODEL_COSTS, ...config.modelCosts },
      onThresholdExceeded: config.onThresholdExceeded ?? (() => {}),
      costThreshold: config.costThreshold ?? Infinity,
      tokenThreshold: config.tokenThreshold ?? Infinity,
    };
  }

  /**
   * Record a completed request
   */
  recordRequest(
    model: string,
    response: LLMCompletionResponse,
    latencyMs: number,
    options: {
      sessionId?: string;
      cached?: boolean;
      error?: string;
    } = {}
  ): UsageRecord {
    const cost = this.calculateCost(
      model,
      response.usage.promptTokens,
      response.usage.completionTokens
    );

    const record: UsageRecord = {
      id: `req_${Date.now()}_${++this.recordCounter}`,
      timestamp: new Date(),
      model,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      latencyMs,
      success: !options.error,
      cached: options.cached ?? false,
      cost,
    };

    if (options.sessionId !== undefined) {
      record.sessionId = options.sessionId;
    }

    if (options.error !== undefined) {
      record.error = options.error;
    }

    this.addRecord(record);
    this.checkThresholds();

    return record;
  }

  /**
   * Record a failed request
   */
  recordError(
    model: string,
    error: string,
    latencyMs: number,
    sessionId?: string
  ): UsageRecord {
    const record: UsageRecord = {
      id: `req_${Date.now()}_${++this.recordCounter}`,
      timestamp: new Date(),
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      success: false,
      error,
      cached: false,
      cost: 0,
    };

    if (sessionId !== undefined) {
      record.sessionId = sessionId;
    }

    this.addRecord(record);

    return record;
  }

  /**
   * Get overall usage statistics
   */
  getStats(): UsageStats {
    const latencies = this.records.map((r) => r.latencyMs).sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);

    // Calculate requests per minute (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentRequests = this.records.filter(
      (r) => r.timestamp.getTime() > fiveMinutesAgo
    );
    const recentTokens = recentRequests.reduce((sum, r) => sum + r.totalTokens, 0);

    return {
      totalRequests: this.totals.requests,
      successfulRequests: this.totals.successful,
      failedRequests: this.totals.failed,
      cachedRequests: this.totals.cached,
      cacheHitRate:
        this.totals.requests > 0
          ? this.totals.cached / this.totals.requests
          : 0,
      totalTokens: this.totals.tokens,
      promptTokens: this.totals.promptTokens,
      completionTokens: this.totals.completionTokens,
      totalCost: this.totals.cost,
      averageLatencyMs:
        this.totals.requests > 0
          ? this.totals.latencySum / this.totals.requests
          : 0,
      p95LatencyMs: latencies[p95Index] ?? 0,
      requestsPerMinute: recentRequests.length / 5,
      tokensPerMinute: recentTokens / 5,
    };
  }

  /**
   * Get usage breakdown by model
   */
  getStatsByModel(): ModelUsageStats[] {
    const byModel = new Map<
      string,
      { requests: number; tokens: number; cost: number; latencySum: number }
    >();

    for (const record of this.records) {
      const existing = byModel.get(record.model) ?? {
        requests: 0,
        tokens: 0,
        cost: 0,
        latencySum: 0,
      };

      existing.requests++;
      existing.tokens += record.totalTokens;
      existing.cost += record.cost;
      existing.latencySum += record.latencyMs;

      byModel.set(record.model, existing);
    }

    return Array.from(byModel.entries()).map(([model, data]) => ({
      model,
      requests: data.requests,
      tokens: data.tokens,
      cost: data.cost,
      averageLatencyMs: data.requests > 0 ? data.latencySum / data.requests : 0,
    }));
  }

  /**
   * Get usage for a specific time period
   */
  getStatsForPeriod(startDate: Date, endDate: Date): PeriodUsageStats {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const periodRecords = this.records.filter((r) => {
      const time = r.timestamp.getTime();
      return time >= startTime && time <= endTime;
    });

    return {
      periodStart: startDate,
      periodEnd: endDate,
      requests: periodRecords.length,
      tokens: periodRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      cost: periodRecords.reduce((sum, r) => sum + r.cost, 0),
    };
  }

  /**
   * Get hourly usage breakdown for the last N hours
   */
  getHourlyStats(hours: number = 24): PeriodUsageStats[] {
    const result: PeriodUsageStats[] = [];
    const now = new Date();

    for (let i = hours - 1; i >= 0; i--) {
      const periodEnd = new Date(now);
      periodEnd.setHours(now.getHours() - i, 0, 0, 0);

      const periodStart = new Date(periodEnd);
      periodStart.setHours(periodStart.getHours() - 1);

      result.push(this.getStatsForPeriod(periodStart, periodEnd));
    }

    return result;
  }

  /**
   * Get usage by session
   */
  getStatsBySession(): Map<string, UsageStats> {
    const bySession = new Map<string, UsageRecord[]>();

    for (const record of this.records) {
      const sessionId = record.sessionId ?? 'unknown';
      const existing = bySession.get(sessionId) ?? [];
      existing.push(record);
      bySession.set(sessionId, existing);
    }

    const result = new Map<string, UsageStats>();
    for (const [sessionId, records] of bySession) {
      const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);

      result.set(sessionId, {
        totalRequests: records.length,
        successfulRequests: records.filter((r) => r.success).length,
        failedRequests: records.filter((r) => !r.success).length,
        cachedRequests: records.filter((r) => r.cached).length,
        cacheHitRate:
          records.length > 0
            ? records.filter((r) => r.cached).length / records.length
            : 0,
        totalTokens: records.reduce((sum, r) => sum + r.totalTokens, 0),
        promptTokens: records.reduce((sum, r) => sum + r.promptTokens, 0),
        completionTokens: records.reduce(
          (sum, r) => sum + r.completionTokens,
          0
        ),
        totalCost: records.reduce((sum, r) => sum + r.cost, 0),
        averageLatencyMs:
          records.length > 0
            ? records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length
            : 0,
        p95LatencyMs: latencies[p95Index] ?? 0,
        requestsPerMinute: 0, // Not calculated per-session
        tokensPerMinute: 0,
      });
    }

    return result;
  }

  /**
   * Get recent records
   */
  getRecentRecords(limit: number = 100): UsageRecord[] {
    return this.records.slice(-limit);
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
    this.totals = {
      requests: 0,
      successful: 0,
      failed: 0,
      cached: 0,
      tokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      latencySum: 0,
    };
  }

  /**
   * Export records to JSON
   */
  exportToJson(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      records: this.records,
    });
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private addRecord(record: UsageRecord): void {
    this.records.push(record);

    // Update totals
    this.totals.requests++;
    if (record.success) this.totals.successful++;
    else this.totals.failed++;
    if (record.cached) this.totals.cached++;
    this.totals.tokens += record.totalTokens;
    this.totals.promptTokens += record.promptTokens;
    this.totals.completionTokens += record.completionTokens;
    this.totals.cost += record.cost;
    this.totals.latencySum += record.latencyMs;

    // Enforce max records
    while (this.records.length > this.config.maxRecords) {
      const removed = this.records.shift();
      if (removed) {
        this.totals.requests--;
        if (removed.success) this.totals.successful--;
        else this.totals.failed--;
        if (removed.cached) this.totals.cached--;
        this.totals.tokens -= removed.totalTokens;
        this.totals.promptTokens -= removed.promptTokens;
        this.totals.completionTokens -= removed.completionTokens;
        this.totals.cost -= removed.cost;
        this.totals.latencySum -= removed.latencyMs;
      }
    }
  }

  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const costs = this.config.modelCosts[model] ?? {
      inputPer1kTokens: 0.001,
      outputPer1kTokens: 0.002,
    };

    return (
      (promptTokens / 1000) * costs.inputPer1kTokens +
      (completionTokens / 1000) * costs.outputPer1kTokens
    );
  }

  private checkThresholds(): void {
    if (this.totals.cost > this.config.costThreshold) {
      this.config.onThresholdExceeded(
        'cost',
        this.totals.cost,
        this.config.costThreshold
      );
    }

    if (this.totals.tokens > this.config.tokenThreshold) {
      this.config.onThresholdExceeded(
        'tokens',
        this.totals.tokens,
        this.config.tokenThreshold
      );
    }
  }
}

// =============================================================================
// Analytics Adapter (wraps LLM adapter)
// =============================================================================

/**
 * LLM adapter that tracks usage analytics
 */
export class AnalyticsAdapter implements LLMAdapter {
  private adapter: LLMAdapter;
  private analytics: UsageAnalytics;
  private sessionId?: string;

  constructor(
    adapter: LLMAdapter,
    analytics: UsageAnalytics,
    sessionId?: string
  ) {
    this.adapter = adapter;
    this.analytics = analytics;
    if (sessionId !== undefined) {
      this.sessionId = sessionId;
    }
  }

  getName(): string {
    return `analytics-${this.adapter.getName()}`;
  }

  isConfigured(): boolean {
    return this.adapter.isConfigured();
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const startTime = Date.now();
    const model = request.model ?? 'unknown';

    try {
      const response = await this.adapter.complete(request);
      const latencyMs = Date.now() - startTime;

      const options: { sessionId?: string; cached?: boolean; error?: string } = {};
      if (this.sessionId !== undefined) {
        options.sessionId = this.sessionId;
      }
      this.analytics.recordRequest(model, response, latencyMs, options);

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.analytics.recordError(model, errorMessage, latencyMs, this.sessionId);

      throw error;
    }
  }

  async *stream(
    request: LLMCompletionRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    // For streaming, we can't easily track token usage
    // Just pass through and record the request
    const startTime = Date.now();

    yield* this.adapter.stream(request);

    // Note: Streaming doesn't provide token counts in the same way
    // We'd need to estimate or the caller would need to report final counts
  }

  /**
   * Get the underlying analytics instance
   */
  getAnalytics(): UsageAnalytics {
    return this.analytics;
  }

  /**
   * Set session ID for tracking
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const usageAnalytics = new UsageAnalytics();

/**
 * Wrap an adapter with analytics tracking
 */
export function withAnalytics(
  adapter: LLMAdapter,
  analytics?: UsageAnalytics,
  sessionId?: string
): AnalyticsAdapter {
  return new AnalyticsAdapter(adapter, analytics ?? usageAnalytics, sessionId);
}
