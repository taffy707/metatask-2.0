/**
 * Performance-optimized batch processor for thread state operations
 * This helps reduce the number of expensive getState() API calls by batching them
 */

import { Thread, ThreadState } from "@langchain/langgraph-sdk";
import { ThreadData } from "../types";
import { processThreadWithoutInterrupts, getInterruptFromThread } from "../contexts/utils";
import { IMPROPER_SCHEMA } from "../constants";

export class ThreadBatchProcessor {
  private static instance: ThreadBatchProcessor;
  private stateCache = new Map<string, Promise<ThreadState | null>>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  
  // Circuit breaker pattern for API failures
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly MAX_FAILURES = 3;
  private readonly FAILURE_WINDOW = 60000; // 1 minute

  static getInstance(): ThreadBatchProcessor {
    if (!ThreadBatchProcessor.instance) {
      ThreadBatchProcessor.instance = new ThreadBatchProcessor();
    }
    return ThreadBatchProcessor.instance;
  }

  /**
   * Process threads with optimized batching for expensive state operations
   */
  async processThreadsBatch<ThreadValues extends Record<string, any>>(
    threads: Thread<ThreadValues>[],
    client: any,
    inboxParam: string,
    abortSignal: AbortSignal
  ): Promise<ThreadData<ThreadValues>[]> {
    const results: ThreadData<ThreadValues>[] = [];
    const threadsNeedingState: Thread<ThreadValues>[] = [];

    // First pass: process threads that don't need expensive state calls
    for (const thread of threads) {
      if (abortSignal.aborted) {
        throw new Error('Request aborted');
      }

      // Handle special cases for human_response_needed inbox
      if (inboxParam === "human_response_needed" && thread.status !== "interrupted") {
        results.push({
          status: "human_response_needed" as any,
          thread,
          interrupts: undefined,
          invalidSchema: undefined,
        });
        continue;
      }

      if (thread.status === "interrupted") {
        // Try to get interrupts from thread data first (fast path)
        const threadInterrupts = getInterruptFromThread(thread);
        if (threadInterrupts && threadInterrupts.length > 0) {
          results.push({
            status: "interrupted" as const,
            thread,
            interrupts: threadInterrupts,
            invalidSchema: threadInterrupts.some(
              (interrupt) =>
                interrupt?.action_request?.action === IMPROPER_SCHEMA ||
                !interrupt?.action_request?.action,
            ),
          });
          continue;
        }

        // Check circuit breaker before adding expensive operations
        if (this.isCircuitOpen()) {
          // Circuit is open, skip expensive state calls
          results.push({
            status: "interrupted" as const,
            thread,
            interrupts: undefined,
            invalidSchema: true,
          });
          continue;
        }

        // Thread needs expensive state call - add to batch
        threadsNeedingState.push(thread);
      } else {
        // Non-interrupted threads are simple
        results.push({
          status: thread.status,
          thread,
          interrupts: undefined,
          invalidSchema: undefined,
        });
      }
    }

    // Second pass: batch process threads that need state calls
    if (threadsNeedingState.length > 0) {
      const stateResults = await this.batchFetchStates(
        threadsNeedingState,
        client,
        abortSignal
      );

      for (const { thread, state } of stateResults) {
        if (abortSignal.aborted) {
          throw new Error('Request aborted');
        }

        try {
          if (state) {
            const processedThread = processThreadWithoutInterrupts(thread, {
              thread_id: thread.thread_id,
              thread_state: state,
            });
            results.push(processedThread as ThreadData<ThreadValues>);
          } else {
            // If state fetch failed, mark as invalid schema
            results.push({
              status: "interrupted" as const,
              thread,
              interrupts: undefined,
              invalidSchema: true,
            });
          }
        } catch (_error) {
          // If processing failed, mark as invalid schema
          results.push({
            status: "interrupted" as const,
            thread,
            interrupts: undefined,
            invalidSchema: true,
          });
        }
      }
    }

    return results;
  }

  /**
   * Batch fetch thread states with caching and concurrent limit
   */
  private async batchFetchStates<ThreadValues extends Record<string, any>>(
    threads: Thread<ThreadValues>[],
    client: any,
    abortSignal: AbortSignal
  ): Promise<Array<{ thread: Thread<ThreadValues>; state: ThreadState<ThreadValues> | null }>> {
    // Limit concurrent state fetches to prevent overwhelming the API
    const CONCURRENT_LIMIT = 2; // Reduced from 5 to 2 for better API stability
    const results: Array<{ thread: Thread<ThreadValues>; state: ThreadState<ThreadValues> | null }> = [];

    // Process threads in batches of CONCURRENT_LIMIT
    for (let i = 0; i < threads.length; i += CONCURRENT_LIMIT) {
      if (abortSignal.aborted) {
        throw new Error('Request aborted');
      }

      const batch = threads.slice(i, i + CONCURRENT_LIMIT);
      const batchPromises = batch.map(async (thread) => {
        try {
          const state = await this.getCachedState(thread.thread_id, client, abortSignal);
          return { thread, state };
        } catch (_error) {
          // If individual state fetch fails, return null state
          return { thread, state: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get cached thread state or fetch if not cached
   */
  private async getCachedState<ThreadValues extends Record<string, any>>(
    threadId: string,
    client: any,
    abortSignal: AbortSignal
  ): Promise<ThreadState<ThreadValues> | null> {
    const cacheKey = `${threadId}:${Date.now() - (Date.now() % this.CACHE_TTL)}`;
    
    if (this.stateCache.has(cacheKey)) {
      const cached = await this.stateCache.get(cacheKey)!;
      return cached as ThreadState<ThreadValues> | null;
    }

    const statePromise = this.fetchState(threadId, client, abortSignal);
    this.stateCache.set(cacheKey, statePromise);

    // Clean up old cache entries
    setTimeout(() => {
      this.stateCache.delete(cacheKey);
    }, this.CACHE_TTL);

    return (await statePromise) as ThreadState<ThreadValues> | null;
  }

  /**
   * Fetch thread state with abort support and timeout
   */
  private async fetchState(
    threadId: string,
    client: any,
    abortSignal: AbortSignal
  ): Promise<ThreadState | null> {
    try {
      if (abortSignal.aborted) {
        throw new Error('Request aborted');
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Request timeout for thread ${threadId}`));
        }, 15000); // 15 second timeout
        
        // Clean up timeout if request completes
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Request aborted'));
        });
      });

      const statePromise = client.threads.getState(threadId);
      const state = await Promise.race([statePromise, timeoutPromise]);
      return state;
    } catch (error) {
      // If aborted, don't log as error
      if (abortSignal.aborted) {
        throw error;
      }
      
      // Track failure for circuit breaker
      this.recordFailure();
      console.warn(`Failed to fetch state for thread ${threadId}:`, error);
      return null;
    }
  }

  /**
   * Circuit breaker: check if too many recent failures
   */
  private isCircuitOpen(): boolean {
    const now = Date.now();
    
    // Reset failure count if outside failure window
    if (now - this.lastFailureTime > this.FAILURE_WINDOW) {
      this.failureCount = 0;
      return false;
    }
    
    return this.failureCount >= this.MAX_FAILURES;
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  /**
   * Clear all cached states (useful for manual refresh)
   */
  clearCache(): void {
    this.stateCache.clear();
    // Reset circuit breaker
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}