"use client";

import { Message, Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQueryState } from "nuqs";
import { createClient } from "@/lib/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { useAuthContext } from "@/providers/Auth";
import { MessageContent } from "@langchain/core/messages";
import { FileClock, MessageCircle, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

// High-performance cache with instant loading
class ThreadsCache {
  private static instance: ThreadsCache;
  private cache = new Map<string, { data: Thread[]; timestamp: number; }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'chat_threads_cache';

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
      timestamp: Date.now()
    });
    this.saveToStorage();
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  invalidate(agentId: string, deploymentId: string): void {
    const key = this.getCacheKey(agentId, deploymentId);
    this.cache.delete(key);
    this.saveToStorage();
  }
}

// High-performance conversation/thread message cache
class ConversationCache {
  private static instance: ConversationCache;
  private cache = new Map<string, { messages: any[]; timestamp: number; }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for conversations
  private readonly STORAGE_KEY = 'conversation_cache';
  private readonly MAX_CACHED_CONVERSATIONS = 20; // Limit memory usage

  static getInstance(): ConversationCache {
    if (!ConversationCache.instance) {
      ConversationCache.instance = new ConversationCache();
    }
    return ConversationCache.instance;
  }

  constructor() {
    this.loadFromStorage();
  }

  private getCacheKey(agentId: string, deploymentId: string, threadId: string): string {
    return `${agentId}:${deploymentId}:${threadId}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(Object.entries(parsed));
        this.cleanupExpired();
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

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
    
    // Limit cache size
    if (this.cache.size > this.MAX_CACHED_CONVERSATIONS) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      this.cache.clear();
      sortedEntries.slice(0, this.MAX_CACHED_CONVERSATIONS).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    }
  }

  get(agentId: string, deploymentId: string, threadId: string): any[] | null {
    const key = this.getCacheKey(agentId, deploymentId, threadId);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    return cached.messages;
  }

  set(agentId: string, deploymentId: string, threadId: string, messages: any[]): void {
    this.cleanupExpired();
    
    const key = this.getCacheKey(agentId, deploymentId, threadId);
    this.cache.set(key, {
      messages: [...messages], // Clone to prevent mutations
      timestamp: Date.now()
    });
    this.saveToStorage();
  }

  prefetch(agentId: string, deploymentId: string, threadId: string, accessToken: string): Promise<any[]> {
    // Return cached data immediately if available
    const cached = this.get(agentId, deploymentId, threadId);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Start async fetch for future use
    return this.fetchAndCache(agentId, deploymentId, threadId, accessToken);
  }

  private async fetchAndCache(agentId: string, deploymentId: string, threadId: string, accessToken: string): Promise<any[]> {
    try {
      const client = createClient(deploymentId, accessToken);
      
      // Fetch thread state to get messages
      const state = await client.threads.getState(threadId);
      const messages = state.values?.messages || [];
      
      // Cache the messages
      this.set(agentId, deploymentId, threadId, messages);
      
      return messages;
    } catch (e) {
      console.error("Failed to prefetch conversation:", e);
      return [];
    }
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
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
    accessToken: string
  ): Promise<Thread[]> {
    const key = `${agentId}:${deploymentId}`;
    
    // Return existing promise if request is already in flight
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    // Create new request
    const requestPromise = this.createRequest(agentId, deploymentId, accessToken);
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
    accessToken: string
  ): Promise<Thread[]> {
    const client = createClient(deploymentId, accessToken);
    const threads = await client.threads.search({
      limit: 100,
      metadata: {
        assistant_id: agentId,
      },
    });
    return threads;
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
    return format(new Date(date), "h:mm a");
  } catch (e) {
    console.error("Failed to format date", { date, error: e });
    return "";
  }
};

const getDateCategory = (dateString: string) => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else if (isThisWeek(date, { weekStartsOn: 1 })) {
    return "This Week";
  } else {
    return "Older";
  }
};

const groupThreadsByDate = (threads: Thread[]) => {
  const groups: Record<string, Thread[]> = {};
  
  threads.forEach((thread) => {
    const category = getDateCategory(thread.created_at);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(thread);
  });
  
  // Sort threads within each group by date (newest first)
  Object.keys(groups).forEach((category) => {
    groups[category].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
  
  return groups;
};

type ThreadsState = {
  data: Thread[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  lastFetch: number | null;
};

export function NavChatHistory() {
  const pathname = usePathname();
  const isOnChatPage = pathname === "/";
  const { session } = useAuthContext();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [agentId] = useQueryState("agentId");
  const [deploymentId] = useQueryState("deploymentId");
  
  const cache = useMemo(() => ThreadsCache.getInstance(), []);
  const requestManager = useMemo(() => RequestManager.getInstance(), []);
  const conversationCache = useMemo(() => ConversationCache.getInstance(), []);
  
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
          lastFetch: Date.now(),
        };
      }
    }
    return {
      data: [],
      loading: false,
      error: null,
      fromCache: false,
      lastFetch: null,
    };
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ultra-fast fetch with aggressive caching and optimistic loading
  const fetchThreads = useCallback(async (
    _agentId: string,
    _deploymentId: string,
    accessToken: string,
    backgroundRefresh = false
  ) => {
    // Check if request is already in flight
    if (requestManager.isRequestActive(_agentId, _deploymentId)) {
      return;
    }

    // For background refresh, don't show loading state
    if (!backgroundRefresh) {
      setThreadsState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));
    }

    try {
      // Use request manager for deduplication
      const threads = await requestManager.fetchThreads(_agentId, _deploymentId, accessToken);
      
      // Cache the results immediately
      cache.set(_agentId, _deploymentId, threads);
      
      setThreadsState({
        data: threads,
        loading: false,
        error: null,
        fromCache: false,
        lastFetch: Date.now(),
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch threads";
      
      setThreadsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      // Only show toast for non-background errors
      if (!backgroundRefresh) {
        toast.error("Failed to load chat history");
      }
    }
  }, [cache, requestManager]);

  // Instant cache loading on parameter changes
  useEffect(() => {
    if (!isOnChatPage) {
      setThreadsState({
        data: [],
        loading: false,
        error: null,
        fromCache: false,
        lastFetch: null,
      });
      return;
    }

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
        lastFetch: Date.now(),
      });
      
      // Start background refresh for fresh data
      setTimeout(() => {
        if (session?.accessToken) {
          fetchThreads(agentId, deploymentId, session.accessToken, true);
        }
      }, 100); // Small delay to prevent flash
    } else {
      // No cache, fetch immediately
      fetchThreads(agentId, deploymentId, session.accessToken);
    }
  }, [agentId, deploymentId, session?.accessToken, isOnChatPage, cache, fetchThreads]);

  // Smart background refresh for new threads
  useEffect(() => {
    if (!threadId || !agentId || !deploymentId || !session?.accessToken || !isOnChatPage) {
      return;
    }

    // Delay refresh to allow new thread to be created
    const refreshDelay = setTimeout(() => {
      if (session?.accessToken) {
        fetchThreads(agentId, deploymentId, session.accessToken, true);
      }
    }, 2000);

    return () => clearTimeout(refreshDelay);
  }, [threadId, agentId, deploymentId, session?.accessToken, isOnChatPage, fetchThreads]);

  // Cleanup on unmount
  useEffect(() => {
    const controller = abortControllerRef.current;
    const timeoutMap = hoverTimeouts.current;
    return () => {
      if (controller) {
        controller.abort();
      }
      // Clean up hover timeouts
      timeoutMap.forEach(timeout => clearTimeout(timeout));
      timeoutMap.clear();
    };
  }, []);

  const handleChangeThread = (id: string) => {
    if (threadId === id) return;
    setThreadId(id);
  };

  // Throttled hover preloading to prevent excessive requests
  const hoverTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const handleThreadHover = useCallback((threadIdToPreload: string) => {
    if (!agentId || !deploymentId || !session?.accessToken) return;
    
    // Clear existing timeout for this thread
    const existingTimeout = hoverTimeouts.current.get(threadIdToPreload);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Delay preloading to avoid excessive requests on quick hovers
    const timeout = setTimeout(() => {
      if (session?.accessToken) {
        conversationCache.prefetch(agentId, deploymentId, threadIdToPreload, session.accessToken);
      }
      hoverTimeouts.current.delete(threadIdToPreload);
    }, 200); // 200ms delay
    
    hoverTimeouts.current.set(threadIdToPreload, timeout);
  }, [agentId, deploymentId, session?.accessToken, conversationCache]);

  // Intelligent predictive preloading
  useEffect(() => {
    if (!agentId || !deploymentId || !session?.accessToken || threadsState.data.length === 0) {
      return;
    }

    // Smart preloading strategy:
    // 1. Current thread (if any) - highest priority
    // 2. Top 3 most recent threads - high priority
    // 3. Today's threads - medium priority
    
    const threadsToPreload = new Set<string>();
    
    // Always preload current thread
    if (threadId) {
      threadsToPreload.add(threadId);
    }
    
    // Preload recent threads (top 3)
    threadsState.data.slice(0, 3).forEach(thread => {
      threadsToPreload.add(thread.thread_id);
    });
    
    // Add today's threads for instant access
    const todayThreads = threadsState.data.filter(thread => 
      isToday(new Date(thread.created_at))
    ).slice(0, 5); // Limit to 5 today threads
    
    todayThreads.forEach(thread => {
      threadsToPreload.add(thread.thread_id);
    });

    // Preload with staggered timing to avoid overwhelming the API
    const threadsArray = Array.from(threadsToPreload);
    threadsArray.forEach((threadIdToPreload, index) => {
      setTimeout(() => {
        if (session?.accessToken) {
          conversationCache.prefetch(agentId, deploymentId, threadIdToPreload, session.accessToken);
        }
      }, index * 100); // 100ms stagger between requests
    });
    
  }, [threadsState.data, agentId, deploymentId, session?.accessToken, threadId, conversationCache]);

  const handleRetry = useCallback(() => {
    if (agentId && deploymentId && session?.accessToken) {
      fetchThreads(agentId, deploymentId, session.accessToken);
    }
  }, [agentId, deploymentId, session?.accessToken, fetchThreads]);

  // Memoize expensive operations for performance
  const groupedThreads = useMemo(() => 
    groupThreadsByDate(threadsState.data), 
    [threadsState.data]
  );
  
  const categoryOrder = useMemo(() => 
    ["Today", "Yesterday", "This Week", "Older"], 
    []
  );

  if (!isOnChatPage) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <MessageCircle className="size-4" />
        Chat History
        {threadsState.fromCache && (
          <div className="size-2 rounded-full bg-blue-500 opacity-50" title="Loaded from cache" />
        )}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {threadsState.loading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={`thread-loading-${index}`}
                className="h-8 w-full rounded"
              />
            ))}
            {threadsState.error && (
              <div className="text-xs text-orange-600 text-center py-1">
                {threadsState.error}
              </div>
            )}
          </div>
        ) : threadsState.error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center text-sm text-muted-foreground">
            <AlertCircle className="size-6 text-destructive" />
            <div>
              <p className="text-destructive font-medium">Failed to load history</p>
              <p className="text-xs mt-1">{threadsState.error}</p>
            </div>
            <Button
              onClick={handleRetry}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
            >
              <RefreshCw className="size-3 mr-1" />
              Retry
            </Button>
          </div>
        ) : threadsState.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-sm text-muted-foreground">
            <FileClock className="size-6" />
            <p>No chat history</p>
          </div>
        ) : (
          <SidebarMenu>
            {categoryOrder.map((category) => {
              const categoryThreads = groupedThreads[category];
              if (!categoryThreads || categoryThreads.length === 0) {
                return null;
              }

              return (
                <div key={category} className="space-y-1">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {category}
                  </div>
                  {categoryThreads.map((thread) => {
                    const isSelected = thread.thread_id === threadId;
                    const title = getFirstHumanMessageContent(thread) || thread.thread_id;
                    const isCached = agentId && deploymentId ? 
                      conversationCache.get(agentId, deploymentId, thread.thread_id) !== null : false;
                    
                    return (
                      <SidebarMenuItem key={thread.thread_id}>
                        <SidebarMenuButton
                          onClick={() => handleChangeThread(thread.thread_id)}
                          onMouseEnter={() => handleThreadHover(thread.thread_id)}
                          isActive={isSelected}
                          className="h-auto min-h-8 flex-col items-start gap-1 p-2"
                        >
                          <div className="flex w-full items-start justify-between">
                            <div className="line-clamp-2 text-left text-sm font-medium leading-tight flex-1">
                              {title}
                            </div>
                            {isCached && (
                              <div 
                                className="size-1.5 rounded-full bg-green-500 opacity-60 ml-1 mt-1 flex-shrink-0" 
                                title="Conversation preloaded - instant access"
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(thread.created_at)}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </div>
              );
            })}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}