"use client";

import { Message, Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState } from "react";
import { useQueryState } from "nuqs";
import { createClient } from "@/lib/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { useAuthContext } from "@/providers/Auth";
import { MessageContent } from "@langchain/core/messages";
import { FileClock, MessageCircle } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

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

export function NavChatHistory() {
  const pathname = usePathname();
  const isOnChatPage = pathname === "/";
  const { session } = useAuthContext();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useQueryState("threadId");
  const [agentId] = useQueryState("agentId");
  const [deploymentId] = useQueryState("deploymentId");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId || !deploymentId || !session?.accessToken || !isOnChatPage) return;

    const getAgentThreads = async (
      _agentId: string,
      _deploymentId: string,
      accessToken: string,
    ) => {
      setLoading(true);

      try {
        const client = createClient(_deploymentId, accessToken);

        const threads = await client.threads.search({
          limit: 100,
          metadata: {
            assistant_id: _agentId,
          },
        });
        setThreads(threads);
      } catch (e) {
        console.error("Failed to fetch threads", e);
        toast.error("Failed to fetch threads");
      } finally {
        setLoading(false);
      }
    };

    getAgentThreads(agentId, deploymentId, session.accessToken);
  }, [agentId, deploymentId, session?.accessToken, isOnChatPage]);

  const handleChangeThread = (id: string) => {
    if (threadId === id) return;
    setThreadId(id);
  };

  if (!isOnChatPage) {
    return null;
  }

  const groupedThreads = groupThreadsByDate(threads);
  const categoryOrder = ["Today", "Yesterday", "This Week", "Older"];

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <MessageCircle className="size-4" />
        Chat History
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {loading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={`thread-loading-${index}`}
                className="h-8 w-full rounded"
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
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
                    
                    return (
                      <SidebarMenuItem key={thread.thread_id}>
                        <SidebarMenuButton
                          onClick={() => handleChangeThread(thread.thread_id)}
                          isActive={isSelected}
                          className="h-auto min-h-8 flex-col items-start gap-1 p-2"
                        >
                          <div className="line-clamp-2 text-left text-sm font-medium leading-tight">
                            {title}
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