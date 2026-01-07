# AI Appointment Setter for Instagram DMs

AI-powered appointment setting agent built with Next.js, Claude API, and ManyChat integration for Vlad Gogoanta's eCommerce coaching business.

## Overview

This application receives webhooks from ManyChat when users send Instagram DMs, processes them through Claude AI with sophisticated prompt caching, manages conversation state across 7 phases (P1-P7), and returns intelligent, contextual responses to qualify leads and book appointments.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (claude-sonnet-4-5-20250929) with Prompt Caching
- **Integration**: ManyChat API for Instagram DMs
- **Deployment**: Vercel

## Project Structure

```
appointment-setter/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/manychat/route.ts    # Main webhook endpoint
│   │   │   └── health/route.ts              # Health check
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── config.ts                        # Environment config
│   │   ├── supabase.ts                      # Supabase client
│   │   ├── anthropic.ts                     # Claude API client
│   │   └── manychat.ts                      # ManyChat API client
│   ├── services/
│   │   ├── agent.service.ts                 # Core orchestrator
│   │   ├── lead.service.ts                  # Lead CRUD operations
│   │   ├── prompt.service.ts                # Prompt building
│   │   └── parser.service.ts                # Response parsing
│   ├── types/
│   │   ├── lead.types.ts                    # Lead & message types
│   │   ├── manychat.types.ts                # ManyChat API types
│   │   └── agent.types.ts                   # Agent types
│   ├── prompts/
│   │   └── appointment-setter.ts            # System prompt
│   └── utils/
│       ├── format.ts                        # Format & chunk utilities
│       └── validate.ts                      # Validation utilities
├── package.json
├── tsconfig.json
└── next.config.js
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manychat_user_id TEXT UNIQUE NOT NULL,
  instagram_handle TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  lead_source TEXT DEFAULT 'dm_direct',
  initial_engagement TEXT,
  known_details TEXT,
  conversation_phase TEXT DEFAULT 'P1',
  qualification_status TEXT DEFAULT 'new',
  collected_data JSONB DEFAULT '{}'::jsonb,
  steps_completed TEXT[] DEFAULT '{}',
  is_new BOOLEAN DEFAULT true,
  is_returning BOOLEAN DEFAULT false,
  bot_paused BOOLEAN DEFAULT false,
  needs_human BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  call_booked BOOLEAN DEFAULT false,
  call_date TIMESTAMPTZ,
  final_status TEXT DEFAULT 'in_progress',
  messages JSONB DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 0,
  last_ai_analysis TEXT,
  error_count INTEGER DEFAULT 0,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_leads_manychat_id ON leads(manychat_user_id);
CREATE INDEX idx_leads_status ON leads(qualification_status);
CREATE INDEX idx_leads_last_message ON leads(last_message_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

3. Get your Supabase URL and Service Role Key from Project Settings > API

### 3. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in all the values:

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ManyChat
MANYCHAT_API_KEY=...
MANYCHAT_RESPONSE_FLOW_ID=content20251104094228_369757

# App Configuration
CALENDAR_LINK=https://calendly.com/vlad-gogoanta/call
WEBHOOK_SECRET=your-random-secret-string
```

### 4. Add Your System Prompt

**IMPORTANT**: Replace the placeholder in `src/prompts/appointment-setter.ts` with your complete Romanian system prompt.

The file should export two constants:
- `STATIC_SYSTEM_PROMPT`: Your full system prompt (gets cached by Claude)
- `DYNAMIC_CONTEXT_TEMPLATE`: Template with variables (stays as is)

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the app running.

### 6. Test Locally with ngrok (Optional)

To test ManyChat integration locally:

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Use the HTTPS URL in ManyChat webhook settings
```

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com and import your GitHub repository
2. Add all environment variables from your `.env` file
3. Deploy

### 3. Configure ManyChat

1. In ManyChat, ensure these custom fields exist:
   - `AI > User Messages` (text)
   - `AI > Answer 1` through `AI > Answer 6` (text)

2. Set webhook URL in ManyChat:
   ```
   https://your-app.vercel.app/api/webhook/manychat
   ```

3. Ensure your response flow ID matches: `content20251104094228_369757`

## How It Works

### Conversation Flow

1. **User sends Instagram DM** → ManyChat captures it
2. **ManyChat webhook** → Calls `/api/webhook/manychat` with message
3. **Agent Service** → Orchestrates the entire flow:
   - Find or create lead in database
   - Check control flags (bot_paused, is_blocked)
   - Add message to conversation history
   - Build prompt with static (cached) and dynamic parts
   - Call Claude API with retry logic
   - Parse response (extract `<analysis>`, `<response>`, `<meta>`)
   - Update lead state (phase, qualification status, collected data)
   - Split response into 2-6 message chunks
   - Send to ManyChat via API
4. **ManyChat** → Sends chunked messages back to Instagram DM

### Prompt Caching Strategy

The system uses Claude's prompt caching to save ~80% on costs:

- **Static Prompt** (~4500 tokens): Cached for 5 minutes
  - Role definition
  - P1-P7 framework
  - Response format rules
  - Conversation examples

- **Dynamic Context** (~200-500 tokens): Not cached
  - Lead information
  - Conversation history (last 20 messages)
  - Current phase and status

### Message Chunking

Claude's responses are split into up to 6 separate Instagram messages for natural conversation flow:

1. Split by `\n\n` (paragraph breaks) first
2. If >6 paragraphs, split by sentences
3. Each chunk sent as separate message via ManyChat

### Error Handling

The system is designed to never fail:

- **Always returns 200** to ManyChat (prevents retries)
- **Retry logic** for Claude API (3 attempts with exponential backoff)
- **Fallback messages** when Claude fails
- **Graceful degradation** at every level

## API Endpoints

### POST /api/webhook/manychat

Receives ManyChat webhooks.

**Request Body**:
```json
{
  "id": "1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "ig_username": "johndoe",
  "custom_fields": {
    "AI > User Messages": "Hi, I'm interested in your coaching"
  }
}
```

**Response**:
```json
{
  "status": "ok"
}
```

Always returns 200, even on errors.

### GET /api/health

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-07T12:00:00Z",
  "service": "AI Appointment Setter",
  "version": "1.0.0"
}
```

## Database Schema

The `leads` table stores all lead information and conversation history:

- **Identification**: `id`, `manychat_user_id`, `instagram_handle`, `name`
- **Timestamps**: `created_at`, `updated_at`, `last_message_at`
- **Conversation State**: `conversation_phase` (P1-P7), `qualification_status`
- **Data**: `collected_data` (JSONB), `steps_completed` (array)
- **Control Flags**: `bot_paused`, `is_blocked`, `needs_human`
- **Messages**: `messages` (JSONB array), `message_count`

## Monitoring

### Key Metrics to Track

- Webhook response time (P95, P99)
- Claude API cache hit rate (check Anthropic dashboard)
- Error rate by type
- Conversation phase distribution
- Qualification rate

### Logging

All operations are logged:
- Webhook received
- Claude API calls (with cache status)
- Parse errors
- Database errors
- ManyChat API errors

Check Vercel logs for production issues.

## Cost Optimization

### Expected Costs (1000 messages/day)

- **Claude API**: ~$15-20/month (with caching)
  - Without caching: ~$150/month
  - **Savings**: 90% through prompt caching
- **Supabase**: Free tier sufficient
- **Vercel**: Free tier sufficient

**Total**: ~$20/month

## Troubleshooting

### Issue: Webhook not receiving messages

1. Check ManyChat webhook URL is correct
2. Verify custom field "AI > User Messages" exists
3. Check Vercel logs for errors

### Issue: Claude API errors

1. Verify `ANTHROPIC_API_KEY` is correct
2. Check API quota in Anthropic dashboard
3. Review retry logic logs

### Issue: Database connection errors

1. Verify Supabase credentials
2. Check if database migration was run
3. Test connection from Supabase dashboard

### Issue: ManyChat not sending responses

1. Verify `MANYCHAT_API_KEY` is correct
2. Check custom fields "AI > Answer 1-6" exist
3. Verify flow ID: `content20251104094228_369757`

## Development

### Run Tests

```bash
npm test
```

### Type Check

```bash
npm run type-check
```

### Build for Production

```bash
npm run build
```

## Next Steps

After deployment:

1. [ ] Replace placeholder system prompt with your complete Romanian prompt
2. [ ] Test end-to-end with ManyChat
3. [ ] Monitor Claude API cache hit rate
4. [ ] Set up error alerts
5. [ ] Track conversation metrics
6. [ ] Add admin dashboard (future enhancement)

## Support

For issues or questions, check:
- Vercel logs for deployment issues
- Supabase logs for database issues
- Anthropic dashboard for API usage
- ManyChat webhook logs for integration issues
