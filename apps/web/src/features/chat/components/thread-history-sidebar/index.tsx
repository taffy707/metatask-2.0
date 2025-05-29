"use client";

import { cn } from "@/lib/utils";
import { Message, Thread } from "@langchain/langgraph-sdk";
import {
  useEffect,
  useState,
  forwardRef,
  ForwardedRef,
  useMemo,
  useCallback,
} from "react";
import { useQueryState } from "nuqs";
import { createClient } from "@/lib/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuthContext } from "@/providers/Auth";
import { MessageContent } from "@langchain/core/messages";
import { FileClock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { performanceMonitor } from "@/lib/performance-monitor";

// High-performance cache with instant loading
class ThreadsCache {
  private static instance: ThreadsCache;
  private cache = new Map<string, { data: Thread[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = "thread_history_cache";

  static getInstance(): ThreadsCache {
    if (!ThreadsCache.instance) {
      ThreadsCache.instance = new ThreadsCache();
    }
    return ThreadsCache.instance;
  }

  constructor() {
    this.loadFromStorage();
  }

  private getCacheKey(agentId: string, deploymentId: string): string {
    return `${agentId}:${deploymentId}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch {
      // Silent fail, start with empty cache
    }
  }

  private saveToStorage(): void {
    try {
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Silent fail if storage is full
    }
  }

  get(agentId: string, deploymentId: string): Thread[] | null {
    const key = this.getCacheKey(agentId, deploymentId);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return cached.data;
  }

  set(agentId: string, deploymentId: string, data: Thread[]): void {
    const key = this.getCacheKey(agentId, deploymentId);
    this.cache.set(key, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now(),
    });
    this.saveToStorage();
  }

  invalidate(agentId: string, deploymentId: string): void {
    const key = this.getCacheKey(agentId, deploymentId);
    this.cache.delete(key);
    this.saveToStorage();
  }
}

// Request deduplication to prevent duplicate API calls
class RequestManager {
  private static instance: RequestManager;
  private activeRequests = new Map<string, Promise<Thread[]>>();

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  async fetchThreads(
    agentId: string,
    deploymentId: string,
    accessToken: string,
  ): Promise<Thread[]> {
    const key = `${agentId}:${deploymentId}`;

    // Return existing promise if request is already in flight
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    // Create new request
    const requestPromise = this.createRequest(
      agentId,
      deploymentId,
      accessToken,
    );
    this.activeRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up completed request
      this.activeRequests.delete(key);
    }
  }

  private async createRequest(
    agentId: string,
    deploymentId: string,
    accessToken: string,
  ): Promise<Thread[]> {
    const timerName = `thread-history-${agentId}`;
    performanceMonitor.startTimer(timerName, { agentId, deploymentId });

    try {
      const client = createClient(deploymentId, accessToken);
      const threads = await client.threads.search({
        limit: 100,
        metadata: {
          assistant_id: agentId,
        },
      });

      performanceMonitor.endTimer(timerName, {
        threadsCount: threads.length,
        fromCache: false,
      });

      return threads;
    } catch (error) {
      performanceMonitor.endTimer(timerName, {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  isRequestActive(agentId: string, deploymentId: string): boolean {
    const key = `${agentId}:${deploymentId}`;
    return this.activeRequests.has(key);
  }
}

const getMessageStringContent = (
  content: MessageContent | undefined,
): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  const texts = content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text);
  return texts.join(" ");
};

/**
 * Returns the first human message from a thread
 * @param thread The thread to get the first human message from
 * @returns The first human message content, or an empty string if no human message is found
 */
function getFirstHumanMessageContent(thread: Thread) {
  try {
    if (
      Array.isArray(thread.values) ||
      !("messages" in thread.values) ||
      !thread.values.messages ||
      !Array.isArray(thread.values.messages) ||
      !thread.values.messages.length
    )
      return "";
    const castMessages = thread.values.messages as Message[];

    const firstHumanMsg = castMessages.find((msg) => msg.type === "human");
    return getMessageStringContent(firstHumanMsg?.content);
  } catch (e) {
    console.error("Failed to get human message from thread", {
      thread,
      error: e,
    });
    return "";
  }
}

const formatDate = (date: string) => {
  try {
    return format(new Date(date), "MM/dd/yyyy - h:mm a");
  } catch (e) {
    console.error("Failed to format date", { date, error: e });
    return "";
  }
};

export interface ThreadHistorySidebarProps {
  className?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

type ThreadsState = {
  data: Thread[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
};

export const ThreadHistorySidebar = forwardRef<
  HTMLDivElement,
  ThreadHistorySidebarProps
>(({ className, open, setOpen }, ref: ForwardedRef<HTMLDivElement>) => {
  const { session } = useAuthContext();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [agentId] = useQueryState("agentId");
  const [deploymentId] = useQueryState("deploymentId");

  const cache = useMemo(() => ThreadsCache.getInstance(), []);
  const requestManager = useMemo(() => RequestManager.getInstance(), []);

  // Initialize with cached data immediately for instant loading
  const [threadsState, setThreadsState] = useState<ThreadsState>(() => {
    if (agentId && deploymentId) {
      const cached = cache.get(agentId, deploymentId);
      if (cached) {
        return {
          data: cached,
          loading: false,
          error: null,
          fromCache: true,
        };
      }
    }
    return {
      data: [],
      loading: false,
      error: null,
      fromCache: false,
    };
  });

  // Ultra-fast fetch with aggressive caching
  const fetchThreads = useCallback(
    async (
      _agentId: string,
      _deploymentId: string,
      accessToken: string,
      backgroundRefresh = false,
    ) => {
      // Check if request is already in flight
      if (requestManager.isRequestActive(_agentId, _deploymentId)) {
        return;
      }

      // For background refresh, don't show loading state
      if (!backgroundRefresh) {
        setThreadsState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));
      }

      try {
        // Use request manager for deduplication
        const threads = await requestManager.fetchThreads(
          _agentId,
          _deploymentId,
          accessToken,
        );

        // Cache the results immediately
        cache.set(_agentId, _deploymentId, threads);

        setThreadsState({
          data: threads,
          loading: false,
          error: null,
          fromCache: false,
        });
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "Failed to fetch threads";

        setThreadsState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        // Only show toast for non-background errors
        if (!backgroundRefresh) {
          toast.error("Failed to load thread history");
        }
      }
    },
    [cache, requestManager],
  );

  // Instant cache loading on parameter changes
  useEffect(() => {
    if (!agentId || !deploymentId || !session?.accessToken) {
      return;
    }

    // Check cache first for instant loading
    const cached = cache.get(agentId, deploymentId);
    if (cached) {
      setThreadsState({
        data: cached,
        loading: false,
        error: null,
        fromCache: true,
      });

      // Start background refresh for fresh data only if cache is older than 1 minute
      const cachedEntry = cache.get(agentId, deploymentId);
      const cacheTimestamp = cachedEntry
        ? (cachedEntry as any).timestamp || 0
        : 0;
      const isStale = Date.now() - cacheTimestamp > 60000; // 1 minute

      if (isStale && session?.accessToken) {
        setTimeout(() => {
          if (session?.accessToken) {
            fetchThreads(agentId, deploymentId, session.accessToken, true);
          }
        }, 100); // Small delay to prevent flash
      }
    } else {
      // No cache, fetch immediately
      fetchThreads(agentId, deploymentId, session.accessToken);
    }
  }, [agentId, deploymentId, session?.accessToken, cache, fetchThreads]);

  const handleChangeThread = (id: string) => {
    if (threadId === id) return;
    setThreadId(id);
    setOpen(false);
  };

  const handleRetry = useCallback(() => {
    if (agentId && deploymentId && session?.accessToken) {
      fetchThreads(agentId, deploymentId, session.accessToken);
    }
  }, [agentId, deploymentId, session?.accessToken, fetchThreads]);

  return (
    <div
      ref={ref}
      className={cn(
        "fixed top-0 right-0 z-10 h-screen border-l border-gray-200 bg-white shadow-lg transition-all duration-300",
        open ? "w-80 md:w-xl" : "w-0 overflow-hidden border-l-0",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">History</h2>
              {threadsState.fromCache && (
                <div
                  className="size-2 rounded-full bg-blue-500 opacity-50"
                  title="Loaded from cache"
                />
              )}
            </div>
          </div>

          {threadsState.loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={`thread-loading-${index}`}
                  className="h-12 w-full rounded"
                />
              ))}
            </div>
          ) : threadsState.error ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <AlertCircle className="text-destructive size-8" />
              <div>
                <p className="text-destructive font-medium">
                  Failed to load history
                </p>
                <p className="mt-1 text-xs">{threadsState.error}</p>
              </div>
              <Button
                onClick={handleRetry}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
              >
                <RefreshCw className="mr-1 size-3" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {threadsState.data.length === 0 ? (
                <div className="flex h-full flex-1 items-center justify-center gap-2">
                  <FileClock className="size-6" />
                  <p>No threads found</p>
                </div>
              ) : (
                threadsState.data.map((thread) => {
                  const isSelected = thread.thread_id === threadId;
                  return (
                    <div
                      key={thread.thread_id}
                      className={cn(
                        "flex items-center justify-between p-4 transition-all duration-300 hover:cursor-pointer hover:bg-gray-50",
                        isSelected
                          ? "bg-gray-100 hover:cursor-default hover:bg-gray-100"
                          : "",
                      )}
                      onClick={() => handleChangeThread(thread.thread_id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-gray-200" />
                        <div className="flex flex-col">
                          <p className="line-clamp-1 truncate text-sm font-medium">
                            {getFirstHumanMessageContent(thread) ||
                              thread.thread_id}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(thread.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ThreadHistorySidebar.displayName = "ThreadHistorySidebar";
