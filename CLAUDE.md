# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

**Development:**
```bash
# Start development server (from root)
yarn dev

# Start only web app
cd apps/web && yarn dev

# Build all apps
yarn build

# Build specific app
cd apps/web && yarn build
```

**Linting & Formatting:**
```bash
# Lint all apps
yarn lint

# Fix linting issues
yarn lint:fix

# Format code
yarn format

# Web app specific
cd apps/web && yarn lint && yarn format
```

## Architecture Overview

**Meta Task** - A no-code web application for building and managing LangGraph agents. Built as a Turborepo monorepo with Next.js frontend.

### Key Components

**Apps Structure:**
- `apps/web/` - Main Next.js 15 application (React 19, TypeScript)
- `apps/docs/` - Mint documentation site

**Authentication Flow:**
- Supabase-based auth with middleware protection
- Provider pattern allows swapping auth backends
- Routes: `(auth)/` for login/signup, `(app)/` for authenticated areas

**Core Features:**
- **Agent Management** (`/agents`) - Build/configure LangGraph agents via UI
- **Agent Inbox** (`/inbox`) - Thread management and agent interactions  
- **RAG Collections** (`/rag`) - Document collections with LangConnect integration
- **MCP Tools** (`/tools`) - External tool integration via Model Context Protocol

### Important Patterns

**Agent Configuration:**
- Agents are custom configurations on LangGraph graphs (same as LangGraph "assistants")
- UI fields defined via `x_metatask_ui_config` metadata in LangGraph Zod schemas
- Configuration passed to LangGraph Platform deployments

**API Integration:**
- No standalone backend required - connects directly to LangGraph Platform
- Proxy routes: `/api/langgraph/proxy/` for LangGraph API
- MCP integration: `/api/metatask_mcp/` for Model Context Protocol

**State Management:**
- Zustand for client state
- React Context for auth/global providers
- URL state with `nuqs`

### Environment Setup

**Required Environment Variables:**
- `NEXT_PUBLIC_DEPLOYMENTS` - JSON config for LangGraph Platform deployments
- `NEXT_PUBLIC_DEMO_APP` - Demo mode flag
- Supabase environment variables for authentication

**LangGraph Integration:**
- Agents must be LangGraph agents deployed on LangGraph Platform
- Latest LangGraph versions required for custom UI fields
- Revisions must be published after 05/14/2025 for proper UI config support

### Technology Stack

**Core:**
- Next.js 15, React 19, TypeScript
- Turborepo monorepo with Yarn workspaces
- LangGraph SDK (`@langchain/langgraph-sdk`)
- Model Context Protocol (`@modelcontextprotocol/sdk`)

**UI/Styling:**
- Radix UI component library
- Tailwind CSS
- React Hook Form + Zod validation

**Key Dependencies:**
- Supabase for auth/database
- Zustand for state management
- RAG via LangConnect (optional, separate server)