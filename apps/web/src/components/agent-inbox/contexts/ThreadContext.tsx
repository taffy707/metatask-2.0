"use client";

import {
  HumanResponse,
  ThreadData,
  EnhancedThreadStatus,
} from "@/components/agent-inbox/types";
import { toast } from "sonner";
import { createClient } from "@/lib/client";
import { Run, Thread, ThreadStatus } from "@langchain/langgraph-sdk";
import React, {
  Dispatch,
  SetStateAction,
  useTransition,
  useRef,
  useCallback,
} from "react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { IMPROPER_SCHEMA } from "../constants";
import {
  getInterruptFromThread,
  processThreadWithoutInterrupts,
} from "./utils";
import { logger } from "../utils/logger";
import { useAuthContext } from "@/providers/Auth";
import { ThreadBatchProcessor } from "../utils/thread-batch-processor";
import { performanceMonitor } from "@/lib/performance-monitor";

type ThreadContentType<
  ThreadValues extends Record<string, any> = Record<string, any>,
> = {
  loading: boolean;
  isChangingThreads: boolean;
  threadData: ThreadData<ThreadValues>[];
  hasMoreThreads: boolean;
  ignoreThread: (threadId: string) => Promise<void>;
  fetchThreads: (agentId: string, deploymentId: string) => Promise<void>;
  setThreadData: Dispatch<SetStateAction<ThreadData<Record<string, any>>[]>>;
  sendHumanResponse: <TStream extends boolean = false>(
    _threadId: string,
    _response: HumanResponse[],
    _options?: {
      stream?: TStream;
    },
  ) => TStream extends true
    ?
        | AsyncGenerator<{
            event: Record<string, any>;
            data: any;
          }>
        | undefined
    : Promise<Run> | undefined;
  fetchSingleThread: (
    _threadId: string,
  ) => Promise<ThreadData<ThreadValues> | undefined>;
};

const ThreadsContext = React.createContext<ThreadContentType | undefined>(
  undefined,
);

// Internal component that uses the context
function ThreadsProviderInternal<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ children }: { children: React.ReactNode }): React.ReactElement {
  const { session } = useAuthContext();
  const [agentInboxId] = useQueryState("agentInbox");
  const [isPending] = useTransition();

  // Get thread filter query params using the custom hook
  const [inboxParam] = useQueryState(
    "inbox",
    parseAsString.withDefault("interrupted"),
  );
  const [offsetParam] = useQueryState("offset", parseAsInteger.withDefault(0));
  const [limitParam] = useQueryState("limit", parseAsInteger.withDefault(5)); // Reduced from 10 to 5 for faster loading

  const [loading, setLoading] = React.useState(false);
  const [threadData, setThreadData] = React.useState<
    ThreadData<Record<string, any>>[]
  >([]);
  const [hasMoreThreads, setHasMoreThreads] = React.useState(true);

  // Performance optimization: debounce requests and cache results
  const requestCacheRef = useRef(
    new Map<string, Promise<ThreadData<Record<string, any>>[]>>(),
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const batchProcessorRef = useRef(ThreadBatchProcessor.getInstance());

  const fetchThreads = useCallback(
    async (agentId: string, deploymentId: string) => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Create cache key for request deduplication
      const cacheKey = `${agentId}:${deploymentId}:${inboxParam}:${offsetParam}:${limitParam}`;

      // Return existing promise if same request is already in flight
      if (requestCacheRef.current.has(cacheKey)) {
        const existingRequest = requestCacheRef.current.get(cacheKey)!;
        try {
          const cachedResult = await existingRequest;
          setThreadData(cachedResult);
          setHasMoreThreads(cachedResult.length === limitParam);
          setLoading(false);
          return;
        } catch (_error) {
          // If cached request failed, continue with new request
          requestCacheRef.current.delete(cacheKey);
        }
      }
      if (!session?.accessToken) {
        toast.error("No access token found", {
          richColors: true,
        });
        return;
      }
      if (!agentInboxId) {
        toast.error("No agent inbox ID found", {
          richColors: true,
        });
        return;
      }

      setLoading(true);

      const client = createClient(deploymentId, session.accessToken);

      // Create the request promise for caching
      const requestPromise = executeThreadsFetch(
        client,
        agentId,
        abortController.signal,
      );
      requestCacheRef.current.set(cacheKey, requestPromise);

      try {
        const processedData = await requestPromise;

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        setThreadData(processedData);
        setHasMoreThreads(processedData.length === limitParam);
      } catch (e) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        logger.error("Failed to fetch threads", e);
        toast.error("Failed to load threads. Please try again.");
      } finally {
        // Clean up cache and loading state
        requestCacheRef.current.delete(cacheKey);
        setLoading(false);

        // Clear abort controller if it's the current one
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [offsetParam, limitParam, inboxParam, session?.accessToken, agentInboxId],
  );

  // Extracted method for the actual API calls to improve performance
  const executeThreadsFetch = useCallback(
    async (
      client: any,
      agentId: string,
      abortSignal: AbortSignal,
    ): Promise<ThreadData<Record<string, any>>[]> => {
      const timerName = `fetch-threads-${agentId}`;
      performanceMonitor.startTimer(timerName, {
        agentId,
        inbox: inboxParam,
        limit: limitParam,
        offset: offsetParam,
      });

      // Use the values from queryParams
      const limit = limitParam;
      const offset = offsetParam;

      if (!limit) {
        throw new Error("Limit query param not found");
      }

      if (!offset && offset !== 0) {
        throw new Error("Offset query param not found");
      }

      if (limit > 100) {
        throw new Error("Cannot fetch more than 100 threads at a time");
      }

      // Handle inbox filtering differently based on type
      let statusInput: { status?: ThreadStatus } = {};
      if (inboxParam !== "all" && inboxParam !== "human_response_needed") {
        statusInput = { status: inboxParam as ThreadStatus };
      }

      const threadSearchArgs = {
        offset,
        limit,
        ...statusInput,
        metadata: {
          assistant_id: agentId,
        },
      };

      // Add retry logic for thread search with exponential backoff
      let threads;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          // Add timeout to thread search request
          const searchPromise = client.threads.search(threadSearchArgs);
          const timeoutPromise = new Promise((_, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Thread search request timeout"));
            }, 20000); // 20 second timeout

            abortSignal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new Error("Request aborted"));
            });
          });

          threads = await Promise.race([searchPromise, timeoutPromise]);
          break; // Success, exit retry loop
        } catch (error: any) {
          retryCount++;

          if (retryCount > maxRetries) {
            throw error; // Give up after max retries
          }

          // Check if request was aborted
          if (abortSignal.aborted) {
            throw new Error("Request aborted");
          }

          // Exponential backoff: wait 1s, then 2s, then 4s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          console.warn(
            `Thread search attempt ${retryCount} failed, retrying in ${delay}ms...`,
          );

          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, delay);
            abortSignal.addEventListener("abort", () => {
              clearTimeout(timeout);
              resolve(undefined);
            });
          });
        }
      }

      // Check for abort before processing
      if (abortSignal.aborted) {
        throw new Error("Request aborted");
      }

      // Use optimized batch processor for better performance
      const processedData = await batchProcessorRef.current.processThreadsBatch(
        threads as Thread<ThreadValues>[],
        client,
        inboxParam,
        abortSignal,
      );

      const sortedData = processedData.sort((a, b) => {
        return (
          new Date(b.thread.created_at).getTime() -
          new Date(a.thread.created_at).getTime()
        );
      });

      performanceMonitor.endTimer(timerName, {
        threadsCount: sortedData.length,
        hasExpensiveOperations: sortedData.some(
          (d) => d.status === "interrupted" && !d.interrupts,
        ),
      });

      return sortedData;
    },
    [limitParam, offsetParam, inboxParam],
  );

  // Effect to fetch threads when parameters change
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!agentInboxId || !inboxParam || offsetParam == null || !limitParam) {
      return;
    }

    const [assistantId, deploymentId] = agentInboxId.split(":");

    try {
      // Fetch threads
      fetchThreads(assistantId, deploymentId);
    } catch (e) {
      logger.error("Error occurred while fetching threads", e);
      toast.error("Failed to load threads. Please try again.");
      // Always reset loading state in case of error
      setLoading(false);
    }

    // Cleanup function to abort ongoing requests when component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [agentInboxId, inboxParam, offsetParam, limitParam, fetchThreads]);

  const fetchSingleThread = React.useCallback(
    async (threadId: string): Promise<ThreadData<ThreadValues> | undefined> => {
      if (!session?.accessToken) {
        toast.error("No access token found", {
          richColors: true,
        });
        return;
      }
      if (!agentInboxId) {
        toast.error("No agent inbox ID found when fetching thread.", {
          richColors: true,
        });
        return;
      }

      const [_, deploymentId] = agentInboxId.split(":");
      const client = createClient(deploymentId, session.accessToken);

      try {
        const thread = await client.threads.get(threadId);
        const currentThread = thread as Thread<ThreadValues>;

        if (thread.status === "interrupted") {
          const threadInterrupts = getInterruptFromThread(currentThread);

          if (!threadInterrupts || !threadInterrupts.length) {
            const state = await client.threads.getState(threadId);
            const processedThread = processThreadWithoutInterrupts(
              currentThread,
              {
                thread_state: state,
                thread_id: threadId,
              },
            );

            if (processedThread) {
              return processedThread as ThreadData<ThreadValues>;
            }
          }

          // Return interrupted thread data
          return {
            thread: currentThread,
            status: "interrupted",
            interrupts: threadInterrupts,
            invalidSchema:
              !threadInterrupts ||
              threadInterrupts.length === 0 ||
              threadInterrupts.some(
                (interrupt) =>
                  interrupt?.action_request?.action === IMPROPER_SCHEMA ||
                  !interrupt?.action_request?.action,
              ),
          };
        }

        // Check for special human_response_needed status
        if (inboxParam === "human_response_needed") {
          return {
            thread: currentThread,
            status: "human_response_needed" as EnhancedThreadStatus,
            interrupts: undefined,
            invalidSchema: undefined,
          };
        }

        // Normal non-interrupted thread
        return {
          thread: currentThread,
          status: currentThread.status,
          interrupts: undefined,
          invalidSchema: undefined,
        };
      } catch (error) {
        logger.error("Error fetching single thread", error);
        toast.error("Failed to load thread details. Please try again.");
        return undefined;
      }
    },
    [inboxParam, agentInboxId, session?.accessToken],
  );

  const ignoreThread = async (threadId: string) => {
    if (!session?.accessToken) {
      toast.error("No access token found", {
        richColors: true,
      });
      return;
    }
    if (!agentInboxId) {
      toast.error("No agent inbox ID found when fetching thread.", {
        richColors: true,
      });
      return;
    }

    const [_, deploymentId] = agentInboxId.split(":");
    const client = createClient(deploymentId, session.accessToken);

    try {
      setLoading(true);
      await client.threads.updateState(threadId, {
        values: null,
        asNode: "__end__",
      });

      setThreadData((prev) => {
        return prev.filter((p) => p.thread.thread_id !== threadId);
      });
      toast("Success", {
        description: "Ignored thread",
        duration: 3000,
      });
    } catch (e) {
      logger.error("Error ignoring thread", e);
      toast.error("Failed to ignore thread. Please try again.", {
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendHumanResponse = <TStream extends boolean = false>(
    threadId: string,
    response: HumanResponse[],
    options?: {
      stream?: TStream;
    },
  ): TStream extends true
    ?
        | AsyncGenerator<{
            event: Record<string, any>;
            data: any;
          }>
        | undefined
    : Promise<Run> | undefined => {
    if (!session?.accessToken) {
      toast.error("No access token found", {
        richColors: true,
      });
      return;
    }
    if (!agentInboxId) {
      toast.error("No agent inbox ID found when fetching thread.", {
        richColors: true,
      });
      return;
    }

    const [assistantId, deploymentId] = agentInboxId.split(":");
    const client = createClient(deploymentId, session.accessToken);

    try {
      if (options?.stream) {
        return client.runs.stream(threadId, assistantId, {
          command: {
            resume: response,
          },
          streamMode: "events",
        }) as any; // Type assertion needed due to conditional return type
      }
      return client.runs.create(threadId, assistantId, {
        command: {
          resume: response,
        },
      }) as any; // Type assertion needed due to conditional return type
    } catch (e: any) {
      logger.error("Error sending human response", e);
      throw e;
    }
  };

  const contextValue: ThreadContentType = {
    loading,
    isChangingThreads: isPending,
    threadData,
    hasMoreThreads,
    ignoreThread,
    sendHumanResponse,
    fetchThreads,
    fetchSingleThread,
    setThreadData,
  };

  return (
    <ThreadsContext.Provider value={contextValue}>
      {children}
    </ThreadsContext.Provider>
  );
}

// Export the wrapped provider
export function ThreadsProvider<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ThreadsProviderInternal<ThreadValues>>{children}</ThreadsProviderInternal>
  );
}

export function useThreadsContext<
  T extends Record<string, any> = Record<string, any>,
>() {
  const context = React.useContext(ThreadsContext) as ThreadContentType<T>;
  if (context === undefined) {
    throw new Error("useThreadsContext must be used within a ThreadsProvider");
  }
  return context;
}
