# Plan: Add Claude Opus Support via External Worker

## Context

Claude Sonnet 4.5 works within Vercel's 300s serverless limit (completes in 1-3 min), but Claude Opus takes 15-30 minutes on the 76KB+ prompt engineering input. No Vercel plan can handle this — Pro caps at 300s, Enterprise at 900s. Supabase Edge Functions hit WORKER_LIMIT (memory/CPU). We need a separate compute path for Opus.

**Solution**: Deploy a lightweight worker on Railway ($5/month) that handles Opus jobs. Sonnet keeps the existing Vercel `waitUntil()` path. User chooses the model in the UI.

---

## 1. Database: Add model column

**Migration via Supabase MCP**

```sql
ALTER TABLE prompt_generation_jobs
ADD COLUMN model_preference TEXT DEFAULT 'sonnet-4-5'
CHECK (model_preference IN ('sonnet-4-5', 'opus-4-6'));
```

---

## 2. Extract shared prompt constant

**New file**: `src/prompts/prompt-engineer.ts`

Move the `PROMPT_ENGINEER_SYSTEM` template string out of `route.ts` into its own file so both Vercel and the Railway worker can import/reference the same prompt.

---

## 3. UI: Add model selector

**File**: `src/app/dashboard/training/generate/page.tsx`

- Add a `Select` dropdown between Step 2 (Configuration) and Step 3 (Generate) with options:
  - "Claude Sonnet 4.5 — Fast (1-3 min)" (default, recommended)
  - "Claude Opus 4.6 — Highest quality (15-30 min)"
- Pass `model_preference` in the POST body to `/api/prompt/generate`
- Adjust polling interval: 3s for Sonnet, 10s for Opus
- Adjust timeout warnings: Opus shows "This may take 15-30 minutes" messaging, warn at 30 min instead of 5 min
- For Opus, add a note: "You can close this page and check back later"

---

## 4. API route: Branch by model

**File**: `src/app/api/prompt/generate/route.ts`

- Accept `model_preference` from request body, save it to the job record
- **Sonnet path** (unchanged): `waitUntil(runGeneration(...))` with 270s timeout
- **Opus path** (new): HTTP POST to `RAILWAY_WORKER_URL/generate` with `{ job_id, auth }`, fire-and-forget with `.then()` error check (same pattern as original edge function call, but now the worker can handle it)

---

## 5. Railway worker

**New directory**: `worker/` at project root

A minimal Node.js HTTP server (~100 lines) that:
1. Exposes `POST /generate` — accepts `{ job_id }` + Bearer auth
2. Exposes `GET /health` — for Railway health checks
3. On receiving a job:
   - Reads job details + training data + base prompt from Supabase
   - Updates job to `processing`
   - Calls Claude Opus with streaming (`messages.stream()` + `finalMessage()`)
   - Parses `<improved_prompt>` and `<change_notes>`
   - Creates new prompt version in Supabase
   - Updates job to `completed` (or `failed` on error)
4. Has a 45-minute timeout safety net
5. Returns 202 immediately (runs generation async)

**Files**:
- `worker/package.json` — deps: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `express` (or just `http`)
- `worker/index.ts` — the entire worker (single file)
- `worker/Dockerfile` (optional — Railway can auto-build from package.json)

**Environment variables** (set in Railway dashboard):
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_SECRET` (shared with Vercel for auth)

---

## 6. Environment variables

**Add to Vercel**:
- `RAILWAY_WORKER_URL` — e.g. `https://your-app.railway.app`
- `WORKER_SECRET` — random secret for authenticating calls to the worker

---

## Verification

1. Deploy Railway worker, verify `GET /health` returns 200
2. Deploy Vercel changes
3. Test Sonnet path: select Sonnet → generate → should complete in 1-3 min (existing behavior)
4. Test Opus path: select Opus → generate → job goes to `processing`, worker picks it up, completes in 15-30 min
5. Test failure: stop Railway worker → Opus job should fail with error message from the fire-and-forget `.then()` check
6. Verify new prompt version appears in prompt editor after completion
