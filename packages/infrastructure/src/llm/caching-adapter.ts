/**
 * LLM Response Caching Adapter
 *
 * Wraps any LLM adapter to provide response caching,
 * reducing API costs by reusing identical responses.
 */

import { createHash } from 'crypto';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
} from '@ai-dm/shared';
import type { LLMAdapter, LLMStreamChunk } from './adapter.js';

// =============================================================================
// Cache Types
// =============================================================================

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  response: LLMCompletionResponse;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  requestHash: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  totalSize: number;
  savedTokens: number;
  savedCost: number;
}

/**
 * Cache configuration
 */
export interface CachingAdapterConfig {
  /** Time-to-live for cache entries in milliseconds (default: 1 hour) */
  ttlMs?: number;
  /** Maximum number of cache entries (default: 1000) */
  maxEntries?: number;
  /** Whether to cache responses with tool calls (default: false) */
  cacheToolCalls?: boolean;
  /** Cost per 1000 input tokens for savings calculation */
  inputTokenCost?: number;
  /** Cost per 1000 output tokens for savings calculation */
  outputTokenCost?: number;
  /** Fields to exclude from cache key (e.g., temperature for deterministic caching) */
  excludeFromKey?: (keyof LLMCompletionRequest)[];
}

// =============================================================================
// Caching Adapter
// =============================================================================

/**
 * LLM adapter that caches responses to reduce API calls
 */
export class CachingAdapter implements LLMAdapter {
  private adapter: LLMAdapter;
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CachingAdapterConfig>;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    savedTokens: 0,
  };

  constructor(adapter: LLMAdapter, config: CachingAdapterConfig = {}) {
    this.adapter = adapter;
    this.config = {
      ttlMs: config.ttlMs ?? 60 * 60 * 1000, // 1 hour
      maxEntries: config.maxEntries ?? 1000,
      cacheToolCalls: config.cacheToolCalls ?? false,
      inputTokenCost: config.inputTokenCost ?? 0.00015, // GPT-4o-mini default
      outputTokenCost: config.outputTokenCost ?? 0.0006,
      excludeFromKey: config.excludeFromKey ?? [],
    };
  }

  getName(): string {
    return `cached-${this.adapter.getName()}`;
  }

  isConfigured(): boolean {
    return this.adapter.isConfigured();
  }

  /**
   * Get a completion, checking cache first
   */
  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    // Check if request should bypass cache
    if (this.shouldBypassCache(request)) {
      return this.adapter.complete(request);
    }

    const cacheKey = this.computeCacheKey(request);

    // Check cache
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt >= Date.now()) {
      this.stats.hits++;
      this.stats.savedTokens += cachedEntry.response.usage.totalTokens;
      cachedEntry.hitCount++;
      return { ...cachedEntry.response };
    } else if (cachedEntry) {
      // Expired - remove it
      this.cache.delete(cacheKey);
    }

    // Cache miss - call adapter
    this.stats.misses++;
    const response = await this.adapter.complete(request);

    // Store in cache (unless it has tool calls and we're not caching those)
    if (this.shouldCache(response)) {
      this.addToCache(cacheKey, response);
    }

    return response;
  }

  /**
   * Stream responses (not cached - streaming is for real-time interaction)
   */
  async *stream(
    request: LLMCompletionRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    // Streaming bypasses cache - it's for real-time interaction
    yield* this.adapter.stream(request);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    // Calculate approximate cache size
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry.response).length;
    }

    // Calculate cost savings
    const savedCost =
      (this.stats.savedTokens / 1000) *
      ((this.config.inputTokenCost + this.config.outputTokenCost) / 2);

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      entries: this.cache.size,
      totalSize,
      savedTokens: this.stats.savedTokens,
      savedCost,
    };
  }

  /**
   * Clear all cached entries
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache entry count
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidateByPattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let invalidated = 0;

    for (const [key, entry] of this.cache) {
      // Check if any message content matches the pattern
      const requestJson = JSON.stringify(entry.response);
      if (regex.test(requestJson)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Pre-warm cache with known responses
   */
  warmCache(entries: Array<{ request: LLMCompletionRequest; response: LLMCompletionResponse }>): void {
    for (const { request, response } of entries) {
      const cacheKey = this.computeCacheKey(request);
      this.addToCache(cacheKey, response);
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private computeCacheKey(request: LLMCompletionRequest): string {
    // Create a normalized version of the request for hashing
    const keyObj: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      tools: request.tools,
      maxTokens: request.maxTokens,
    };

    // Optionally include temperature (exclude for more cache hits)
    if (!this.config.excludeFromKey.includes('temperature')) {
      keyObj['temperature'] = request.temperature;
    }

    const json = JSON.stringify(keyObj, Object.keys(keyObj).sort());
    return createHash('sha256').update(json).digest('hex');
  }

  private getFromCache(key: string): LLMCompletionResponse | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  private addToCache(key: string, response: LLMCompletionResponse): void {
    // Enforce max entries (LRU-style: remove oldest)
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const now = Date.now();
    const entry: CacheEntry = {
      response: { ...response },
      createdAt: now,
      expiresAt: now + this.config.ttlMs,
      hitCount: 0,
      requestHash: key,
    };

    this.cache.set(key, entry);
  }

  private evictOldest(): void {
    let oldest: { key: string; createdAt: number } | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { key, createdAt: entry.createdAt };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
    }
  }

  private shouldBypassCache(request: LLMCompletionRequest): boolean {
    // Bypass if explicitly marked
    if ((request as LLMCompletionRequest & { skipCache?: boolean }).skipCache) {
      return true;
    }

    // Could add more bypass conditions here
    return false;
  }

  private shouldCache(response: LLMCompletionResponse): boolean {
    // Don't cache if response has tool calls and we're not caching those
    if (response.toolCalls && response.toolCalls.length > 0) {
      return this.config.cacheToolCalls;
    }

    // Don't cache incomplete responses
    if (response.finishReason === 'length') {
      return false;
    }

    return true;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Wrap an adapter with caching
 */
export function withCaching(
  adapter: LLMAdapter,
  config?: CachingAdapterConfig
): CachingAdapter {
  return new CachingAdapter(adapter, config);
}
