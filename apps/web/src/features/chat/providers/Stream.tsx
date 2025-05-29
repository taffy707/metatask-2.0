"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { useAgentsContext } from "@/providers/Agents";
import { toast } from "sonner";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";
import { useAuthContext } from "@/providers/Auth";
import { getDeployments } from "@/lib/environment/deployments";

export type StateType = { messages: Message[]; ui?: UIMessage[] };

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream>;
const StreamContext = createContext<StreamContextType | undefined>(undefined);

const StreamSession = ({
  children,
  agentId,
  deploymentId,
  accessToken,
  useProxyRoute,
}: {
  children: ReactNode;
  agentId: string;
  deploymentId: string;
  accessToken?: string;
  useProxyRoute?: boolean;
}) => {
  if (!useProxyRoute && !accessToken) {
    toast.error("Access token must be provided if not using proxy route");
  }

  const deployment = getDeployments().find((d) => d.id === deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  let deploymentUrl = deployment.deploymentUrl;
  if (useProxyRoute) {
    const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
    if (!baseApiUrl) {
      throw new Error(
        "Failed to create client: Base API URL not configured. Please set NEXT_PUBLIC_BASE_API_URL",
      );
    }
    deploymentUrl = `${baseApiUrl}/langgraph/proxy/${deploymentId}`;
  }

  const [threadId, setThreadId] = useQueryState("threadId");
  const streamValue = useTypedStream({
    apiUrl: deploymentUrl,
    assistantId: agentId,
    threadId: threadId ?? null,
    onCustomEvent: (event, options) => {
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event);
        return { ...prev, ui };
      });
    },
    onThreadId: (id) => {
      setThreadId(id);
    },
    defaultHeaders: {
      ...(!useProxyRoute
        ? {
            Authorization: `Bearer ${accessToken}`,
            "x-supabase-access-token": accessToken,
          }
        : {
            "x-auth-scheme": "langsmith",
          }),
    },
  });

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { agents, loading } = useAgentsContext();
  const [agentId, setAgentId] = useQueryState("agentId");
  const [deploymentId, setDeploymentId] = useQueryState("deploymentId");
  const { session } = useAuthContext();

  // Auto-select default agent if no agent is selected
  useEffect(() => {
    if (!agentId && !deploymentId && agents.length > 0 && !loading) {
      const defaultAgent = agents.find(isUserSpecifiedDefaultAgent);
      if (defaultAgent) {
        setAgentId(defaultAgent.assistant_id);
        setDeploymentId(defaultAgent.deploymentId);
      }
    }
  }, [agentId, deploymentId, agents, loading, setAgentId, setDeploymentId]);

  if (!agentId || !deploymentId) {
    // Return a mock stream context when no agent is selected
    const mockStreamValue = {
      messages: [],
      isLoading: false,
      error: null,
      submit: () => {},
      stop: () => {},
      interrupt: null,
    } as any;
    
    return (
      <StreamContext.Provider value={mockStreamValue}>
        {children}
      </StreamContext.Provider>
    );
  }

  const useProxyRoute = process.env.NEXT_PUBLIC_USE_LANGSMITH_AUTH === "true";
  if (!useProxyRoute && !session?.accessToken) {
    toast.error("Access token must be provided if not using proxy route");
    return null;
  }

  return (
    <StreamSession
      agentId={agentId}
      deploymentId={deploymentId}
      accessToken={session?.accessToken ?? undefined}
      useProxyRoute={useProxyRoute}
    >
      {children}
    </StreamSession>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
