# AI Appointment Setter

## Project Overview
Next.js 14 (App Router) application that automates Instagram DM appointment setting for Vlad Gogoanta's eCommerce coaching business. Uses Claude API to handle conversations, ManyChat for Instagram integration, Supabase for database/auth, and Vercel for deployment.

**Live URL:** https://aisetter.iterio.ro

## MCP Servers

### Supabase MCP
- Scoped to project `pcwyvcutzdazruuzjija`
- Use `execute_sql` tool for read queries (SELECT)
- Use `apply_migration` tool for schema changes (CREATE, ALTER, DROP)
- All tables have Row Level Security (RLS) enabled
- Realtime enabled on: leads, conversations, messages, activities

### Vercel MCP
- Use for deployment status, environment variables, and project configuration
- Project is deployed at https://aisetter.iterio.ro

## Tech Stack
- **Framework:** Next.js 14.2.18 with App Router, TypeScript 5.6.3 (strict mode)
- **Styling:** Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **Database:** Supabase (PostgreSQL) with RLS
- **AI:** Anthropic Claude (`claude-sonnet-4-5-20250929`) with prompt caching
- **Integrations:** ManyChat API (Instagram DMs), Calendly (booking)
- **Deployment:** Vercel

## Key Conventions
- Path alias: `@/*` maps to `./src/*`
- Service layer pattern: business logic in `src/services/`
- Three Supabase clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role, bypasses RLS)
- Files: kebab-case for utilities, PascalCase for components
- Database columns: snake_case
- Always return 200 to ManyChat webhooks (prevents retries)
- Message responses are chunked by paragraphs for natural Instagram DM flow

## Database Schema (Key Tables)
- **leads** - Lead data with status (new, exploring, likely_qualified, qualified, not_fit, nurture, booked) and phase (P1-P7)
- **conversations** - Conversation state per lead, tracks bot_active and human_taken_over
- **messages** - Individual messages with sender_type (bot, lead, human)
- **activities** - Activity log (new_lead, message_sent, phase_change, call_booked, etc.)
- **training_examples** - Training data for prompt improvement with conversation snapshots
- **knowledge_base** - Information the bot can reference
- **response_templates** - Pre-made response templates
- **system_settings** - Key-value configuration

## Important File Paths
- `src/app/api/webhook/manychat/` - Main webhook endpoint (entry point for all DMs)
- `src/services/agent.service.ts` - Core orchestrator (conversation flow)
- `src/services/prompt.service.ts` - Prompt building with caching (~80% cost savings)
- `src/services/lead.service.ts` - Lead CRUD and message history
- `src/services/parser.service.ts` - Response parsing (<analysis>, <response>, <meta> sections)
- `src/prompts/appointment-setter.ts` - System prompt (76KB)
- `src/lib/supabase/` - Supabase client configurations
- `src/lib/anthropic.ts` - Claude API configuration
- `src/lib/manychat.ts` - ManyChat API client
- `src/lib/permissions.ts` - Role-based access (admin, manager, operator, viewer)
- `src/types/` - All TypeScript type definitions

## Environment Variables
Required env vars are documented in `.env.example`. Key ones:
- `ANTHROPIC_API_KEY` - Claude API key
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - Supabase access
- `MANYCHAT_API_KEY` / `MANYCHAT_RESPONSE_FLOW_ID` - ManyChat integration
- `CALENDAR_LINK` - Calendly booking URL
- `WEBHOOK_SECRET` - Webhook authentication
