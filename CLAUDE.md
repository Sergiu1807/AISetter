# AI Appointment Setter

## Project Overview
AI-powered Instagram DM appointment setter for Vlad Gogoanta's eCommerce coaching business. Uses Claude API for conversations, ManyChat for Instagram integration, Supabase for database/auth, GHL for calendar booking.

**Live URL:** https://aisetter.iterio.ro

## Architecture

```
Vercel (Frontend)              Railway (Backend API)
├── Dashboard pages            ├── Express server
├── Login / Auth               ├── /api/webhook/manychat
├── Catch-all API proxy ──────>├── /api/leads, conversations, etc.
└── Static assets              ├── Claude AI agent
                               ├── ManyChat API client
                               └── GHL calendar booking
```

- **Frontend (Vercel):** Next.js 14 App Router, dashboard UI, Supabase SSR auth
- **Backend (Railway):** Express.js, all API routes, Claude AI, ManyChat, GHL booking
- **Database:** Supabase PostgreSQL with RLS + Realtime
- **Proxy:** `src/app/api/[...path]/route.ts` forwards all `/api/*` requests to Railway
- **Webhook:** ManyChat calls Railway directly at `https://ai-setter-api-production.up.railway.app/api/webhook/manychat`

## MCP Servers

### Supabase MCP
- Scoped to project `pcwyvcutzdazruuzjija`
- Use `execute_sql` for read queries, `apply_migration` for schema changes
- RLS enabled on all tables, Realtime on: leads, conversations, messages, activities

### Railway MCP
- Project: `ai-setter-api` (ID: `b17d9989-b1e7-43a0-80f5-d6d48b4b37fc`)
- Domain: `https://ai-setter-api-production.up.railway.app`

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS + shadcn/ui
- **Backend:** Express.js on Railway (Node.js 20)
- **Database:** Supabase (PostgreSQL) with RLS
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) with prompt caching
- **Integrations:** ManyChat (Instagram DMs), GHL (calendar booking)

## Key Conventions
- Path alias: `@/*` maps to `./src/*` (used by both frontend and server)
- Service layer: business logic in `src/services/` (shared between frontend and server)
- Server imports shared code via `@/` alias resolved to `../src/*`
- Supabase clients: `client.ts` (browser), `server.ts` (SSR), `src/lib/supabase.ts` (admin/service role)
- Files: kebab-case for utilities, PascalCase for components
- Database columns: snake_case
- Always return 200 to ManyChat webhooks (prevents retries)

## Project Structure
```
ai-setter/
├── src/                        # Shared code (frontend + server)
│   ├── app/                    # Next.js pages + catch-all proxy
│   │   ├── api/[...path]/      # Proxy to Railway
│   │   ├── dashboard/          # Dashboard pages
│   │   └── login/              # Auth page
│   ├── components/             # React components (shadcn/ui)
│   ├── services/               # Business logic (shared with server)
│   ├── lib/                    # API clients, config
│   ├── prompts/                # System prompt
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utilities
├── server/                     # Railway Express backend
│   ├── index.ts                # Entry point
│   ├── middleware/              # auth, cors, rate-limit
│   ├── routes/                 # API route handlers
│   └── lib/                    # Server-specific lib (supabase admin)
├── docs/                       # Documentation
│   ├── setup/                  # Setup guides
│   ├── architecture/           # Architecture docs
│   └── archive/                # Weekly progress reports
├── sql/                        # Database migrations
│   ├── schema/                 # Full schema
│   ├── migrations/             # Migration scripts
│   └── verify/                 # Verification queries
└── scripts/                    # Utility scripts
```

## Important File Paths
- `server/routes/webhook.ts` — Main webhook endpoint (ManyChat → Railway)
- `server/routes/*.ts` — All API route handlers
- `server/middleware/auth.ts` — JWT validation via Supabase
- `src/services/agent.service.ts` — Core AI orchestrator
- `src/services/prompt.service.ts` — Prompt building with caching
- `src/services/calendar.service.ts` — GHL calendar booking
- `src/lib/config.ts` — Environment configuration
- `src/lib/anthropic.ts` — Claude API client
- `src/lib/manychat.ts` — ManyChat API client
- `src/lib/ghl.ts` — GHL calendar integration
- `src/prompts/appointment-setter.ts` — System prompt
- `src/app/api/[...path]/route.ts` — Vercel → Railway proxy
- `railway.toml` — Railway deploy config

## Database Schema (Key Tables)
- **leads** — Lead data with status and phase (P1-P7)
- **conversations** — Conversation state per lead
- **messages** — Individual messages with sender_type (bot, lead, human)
- **activities** — Activity log
- **training_examples** — Training data for prompt improvement
- **knowledge_base** — Bot reference information
- **system_settings** — Key-value configuration

## Environment Variables

### Railway (Backend)
- `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `MANYCHAT_API_KEY`, `MANYCHAT_RESPONSE_FLOW_ID`
- `CALENDAR_LINK`, `WEBHOOK_SECRET`
- `GHL_LOCATION_ID`, `GHL_CALENDAR_ID`
- `CORS_ORIGIN`, `NODE_ENV`

### Vercel (Frontend)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RAILWAY_API_URL` — Points to Railway backend
