/**
 * Batch Processing for LLM Requests
 *
 * Handles queuing, prioritization, rate limiting, and
 * parallel execution of LLM requests.
 */

import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
} from '@ai-dm/shared';
import type { LLMAdapter } from './adapter.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Priority levels for batch requests
 */
export type BatchPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

const PRIORITY_VALUES: Record<BatchPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
};

/**
 * Batch request item
 */
export interface BatchRequest {
  id: string;
  request: LLMCompletionRequest;
  priority: BatchPriority;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Batch result
 */
export interface BatchResult {
  id: string;
  success: boolean;
  response?: LLMCompletionResponse;
  error?: string;
  latencyMs: number;
  processedAt: Date;
}

/**
 * Batch job containing multiple requests
 */
export interface BatchJob {
  id: string;
  requests: BatchRequest[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results: BatchResult[];
}

/**
 * Batch processor configuration
 */
export interface BatchProcessorConfig {
  /** Maximum concurrent requests (default: 3) */
  maxConcurrency?: number;
  /** Maximum requests per minute (default: 60) */
  rateLimitPerMinute?: number;
  /** Maximum queue size (default: 1000) */
  maxQueueSize?: number;
  /** Request timeout in ms (default: 60000) */
  timeoutMs?: number;
  /** Retry failed requests (default: true) */
  retryOnFailure?: boolean;
  /** Maximum retries (default: 2) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelayMs?: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  queueSize: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTimeMs: number;
  averageProcessTimeMs: number;
}

// =============================================================================
// Batch Processor
// =============================================================================

/**
 * Manages batch processing of LLM requests
 */
export class BatchProcessor {
  private adapter: LLMAdapter;
  private config: Required<BatchProcessorConfig>;
  private queue: BatchRequest[] = [];
  private processing: Set<string> = new Set();
  private results: Map<string, BatchResult> = new Map();
  private requestCounter = 0;
  private jobCounter = 0;

  // Rate limiting
  private requestTimestamps: number[] = [];

  // Statistics
  private stats = {
    completed: 0,
    failed: 0,
    totalWaitTime: 0,
    totalProcessTime: 0,
  };

  // Event handlers
  private onComplete?: (result: BatchResult) => void;
  private onError?: (requestId: string, error: string) => void;

  // Processing state
  private isProcessing = false;
  private processPromise: Promise<void> | null = null;

  constructor(adapter: LLMAdapter, config: BatchProcessorConfig = {}) {
    this.adapter = adapter;
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 3,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 60,
      maxQueueSize: config.maxQueueSize ?? 1000,
      timeoutMs: config.timeoutMs ?? 60000,
      retryOnFailure: config.retryOnFailure ?? true,
      maxRetries: config.maxRetries ?? 2,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  /**
   * Add a single request to the queue
   */
  enqueue(
    request: LLMCompletionRequest,
    priority: BatchPriority = 'normal',
    metadata?: Record<string, unknown>
  ): string {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const id = `req_${Date.now()}_${++this.requestCounter}`;
    const batchRequest: BatchRequest = {
      id,
      request,
      priority,
      createdAt: new Date(),
    };

    if (metadata !== undefined) {
      batchRequest.metadata = metadata;
    }

    this.insertByPriority(batchRequest);
    this.startProcessing();

    return id;
  }

  /**
   * Add multiple requests as a batch job
   */
  enqueueBatch(
    requests: Array<{
      request: LLMCompletionRequest;
      priority?: BatchPriority;
      metadata?: Record<string, unknown>;
    }>
  ): BatchJob {
    const jobId = `job_${Date.now()}_${++this.jobCounter}`;
    const batchRequests: BatchRequest[] = [];

    for (const item of requests) {
      const id = `req_${Date.now()}_${++this.requestCounter}`;
      const batchRequest: BatchRequest = {
        id,
        request: item.request,
        priority: item.priority ?? 'normal',
        createdAt: new Date(),
      };

      if (item.metadata !== undefined) {
        batchRequest.metadata = item.metadata;
      }

      batchRequests.push(batchRequest);
      this.insertByPriority(batchRequest);
    }

    const job: BatchJob = {
      id: jobId,
      requests: batchRequests,
      status: 'pending',
      createdAt: new Date(),
      results: [],
    };

    this.startProcessing();

    return job;
  }

  /**
   * Get result for a request (if completed)
   */
  getResult(requestId: string): BatchResult | undefined {
    return this.results.get(requestId);
  }

  /**
   * Wait for a specific request to complete
   */
  async waitForResult(requestId: string, timeoutMs?: number): Promise<BatchResult> {
    const timeout = timeoutMs ?? this.config.timeoutMs;
    const startTime = Date.now();

    while (true) {
      const result = this.results.get(requestId);
      if (result) {
        return result;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for request ${requestId}`);
      }

      await this.sleep(100);
    }
  }

  /**
   * Wait for a batch job to complete
   */
  async waitForJob(job: BatchJob, timeoutMs?: number): Promise<BatchJob> {
    const timeout = timeoutMs ?? this.config.timeoutMs * job.requests.length;
    const startTime = Date.now();

    while (true) {
      let allComplete = true;
      for (const req of job.requests) {
        const result = this.results.get(req.id);
        if (result) {
          if (!job.results.find((r) => r.id === req.id)) {
            job.results.push(result);
          }
        } else {
          allComplete = false;
        }
      }

      if (allComplete) {
        job.status = job.results.some((r) => !r.success) ? 'failed' : 'completed';
        job.completedAt = new Date();
        return job;
      }

      if (Date.now() - startTime > timeout) {
        job.status = 'failed';
        throw new Error(`Timeout waiting for job ${job.id}`);
      }

      await this.sleep(100);
    }
  }

  /**
   * Cancel a pending request
   */
  cancel(requestId: string): boolean {
    const index = this.queue.findIndex((r) => r.id === requestId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all pending requests
   */
  clearQueue(): number {
    const count = this.queue.length;
    this.queue = [];
    return count;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const totalCompleted = this.stats.completed + this.stats.failed;
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      averageWaitTimeMs:
        totalCompleted > 0 ? this.stats.totalWaitTime / totalCompleted : 0,
      averageProcessTimeMs:
        totalCompleted > 0 ? this.stats.totalProcessTime / totalCompleted : 0,
    };
  }

  /**
   * Set completion callback
   */
  onRequestComplete(handler: (result: BatchResult) => void): void {
    this.onComplete = handler;
  }

  /**
   * Set error callback
   */
  onRequestError(handler: (requestId: string, error: string) => void): void {
    this.onError = handler;
  }

  /**
   * Stop processing (gracefully)
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    if (this.processPromise) {
      await this.processPromise;
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private insertByPriority(request: BatchRequest): void {
    const priority = PRIORITY_VALUES[request.priority];
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      if (PRIORITY_VALUES[this.queue[i]!.priority] > priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, request);
  }

  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processPromise = this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing && this.queue.length > 0) {
      // Check rate limit
      if (!this.canMakeRequest()) {
        await this.sleep(100);
        continue;
      }

      // Check concurrency
      if (this.processing.size >= this.config.maxConcurrency) {
        await this.sleep(50);
        continue;
      }

      // Get next request
      const request = this.queue.shift();
      if (!request) continue;

      // Process asynchronously
      this.processRequest(request);
    }

    this.isProcessing = false;
    this.processPromise = null;
  }

  private async processRequest(
    batchRequest: BatchRequest,
    retryCount = 0
  ): Promise<void> {
    this.processing.add(batchRequest.id);
    this.recordRequestTimestamp();

    const startTime = Date.now();
    const waitTime = startTime - batchRequest.createdAt.getTime();

    try {
      const response = await Promise.race([
        this.adapter.complete(batchRequest.request),
        this.timeout(this.config.timeoutMs),
      ]);

      const processTime = Date.now() - startTime;

      const result: BatchResult = {
        id: batchRequest.id,
        success: true,
        response: response as LLMCompletionResponse,
        latencyMs: processTime,
        processedAt: new Date(),
      };

      this.results.set(batchRequest.id, result);
      this.stats.completed++;
      this.stats.totalWaitTime += waitTime;
      this.stats.totalProcessTime += processTime;

      this.onComplete?.(result);
    } catch (error) {
      const processTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Retry logic
      if (
        this.config.retryOnFailure &&
        retryCount < this.config.maxRetries
      ) {
        await this.sleep(this.config.retryDelayMs * (retryCount + 1));
        this.processing.delete(batchRequest.id);
        await this.processRequest(batchRequest, retryCount + 1);
        return;
      }

      const result: BatchResult = {
        id: batchRequest.id,
        success: false,
        error: errorMessage,
        latencyMs: processTime,
        processedAt: new Date(),
      };

      this.results.set(batchRequest.id, result);
      this.stats.failed++;
      this.stats.totalWaitTime += waitTime;
      this.stats.totalProcessTime += processTime;

      this.onError?.(batchRequest.id, errorMessage);
      this.onComplete?.(result);
    } finally {
      this.processing.delete(batchRequest.id);
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => t > oneMinuteAgo
    );

    return this.requestTimestamps.length < this.config.rateLimitPerMinute;
  }

  private recordRequestTimestamp(): void {
    this.requestTimestamps.push(Date.now());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a batch processor for an adapter
 */
export function createBatchProcessor(
  adapter: LLMAdapter,
  config?: BatchProcessorConfig
): BatchProcessor {
  return new BatchProcessor(adapter, config);
}
