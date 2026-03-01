# Training Feature Setup Guide

This document provides step-by-step instructions to complete the setup of the training feature.

## Overview

The training feature is now fully implemented with:
- ✅ 6 API routes (examples, submit, approve, insights, prompt versions, active prompt)
- ✅ 5 frontend pages (dashboard, submit, review, insights, prompt editor)
- ✅ Agent service performance tracking
- ✅ Training button on lead detail page
- ✅ Database migration file
- ✅ Seed scripts for initialization

## Setup Steps

### Step 1: Run Database Migration

The training feature requires specific database tables. Run the migration SQL in your Supabase dashboard:

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of `supabase-dashboard-migration.sql`
5. Click **Run** to execute the migration

The migration creates these tables:
- `users` - User accounts with roles (admin, manager, operator, viewer)
- `training_examples` - Training data submissions
- `prompt_versions` - Prompt version history and performance tracking
- `activities` - Activity log
- `notifications` - Notification system
- `audit_logs` - Audit trail

### Step 2: Verify Tables Exist

After running the migration, verify the tables were created successfully:

```bash
npm run db:verify
```

Expected output:
```
✅ training_examples         - 0 rows
✅ prompt_versions           - 0 rows
✅ users                     - X rows
✅ leads                     - X rows
✅ conversations             - X rows
✅ messages                  - X rows
✅ activities                - 0 rows
✅ notifications             - 0 rows
```

If any tables are missing, go back to Step 1 and run the migration again.

### Step 3: Seed Initial Prompt Version

Once tables are verified, seed the initial prompt version:

```bash
npm run db:seed-prompt
```

This will:
1. Load the current static prompt from `src/prompts/appointment-setter.ts`
2. Create version 1 in the database
3. Mark it as active
4. Initialize performance tracking (0 conversations, 0% success rate)

Expected output:
```
✅ Successfully created prompt version!

📊 Details:
   Version: 1
   Active: true
   Deployed at: [timestamp]
   Prompt length: XXXXX characters
   Dynamic template length: XXX characters

🎉 Bot is now using prompt version 1
```

### Step 4: Verify Setup Complete

Run the verification script again to confirm everything is ready:

```bash
npm run db:verify
```

Expected output:
```
✅ All required tables exist!

✨ System is ready!
   Prompt versions: 1
   Active version: 1
   Deployed: [timestamp]
   Conversations: 0

🎉 Training feature is ready to use!
```

---

## Feature Usage

### For Operators (Submit Training Examples)

1. **From Lead Detail Page**:
   - Navigate to any lead conversation
   - Click "Submit as Training" button in the header
   - Select example type (Good/Bad/Correction)
   - Provide feedback
   - Submit for review

2. **From Training Dashboard**:
   - Go to `/dashboard/training`
   - Click "Submit New Example"
   - Choose "From Conversation" or "Manual Example" tab
   - Fill in the form
   - Submit for review

### For Managers (Review & Approve)

1. Go to `/dashboard/training/review`
2. View pending training examples
3. Read user message, bot response, and feedback
4. Click "Approve" or "Reject" with optional notes
5. Submitter gets notified of decision

### For Admins (Manage Prompts)

1. **View Insights**:
   - Go to `/dashboard/training/insights`
   - See common issues, successful patterns
   - Analyze performance by phase
   - Track trends over time

2. **Edit Prompt**:
   - Go to `/dashboard/training/prompt`
   - Select a version from dropdown
   - Edit prompt text and system instructions
   - Save as draft OR deploy immediately
   - View version performance metrics

3. **Deploy New Version**:
   - Edit prompt in prompt editor
   - Add version notes documenting changes
   - Click "Deploy New Version"
   - Confirm deployment
   - Bot immediately uses new prompt for all conversations

---

## Performance Tracking

The system automatically tracks prompt performance:

- **Total Conversations**: Incremented for each message processed
- **Success Rate**: Calculated based on:
  - Lead qualified or booked
  - Conversation progressed to next phase
  - Running average algorithm

View performance metrics:
- `/dashboard/training/prompt` - Compare versions
- `/dashboard/training/insights` - Analyze patterns
- `/dashboard/training` - Overview stats

---

## Troubleshooting

### Tables Don't Exist

**Error**: `Could not find the table 'public.training_examples' in the schema cache`

**Solution**:
1. Run the migration SQL in Supabase SQL Editor
2. Wait 30 seconds for schema cache refresh
3. Run `npm run db:verify` again

### Seed Script Fails

**Error**: Permission denied or authentication failed

**Solution**:
1. Check `.env.local` has correct Supabase credentials
2. Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for seed scripts
3. Verify your Supabase project is accessible

### Can't Submit Examples

**Error**: "You don't have permission to submit training examples"

**Solution**:
1. Check your user role in `users` table
2. Ensure role is `operator`, `manager`, or `admin`
3. Update via Supabase dashboard if needed

### Can't Approve Examples

**Error**: "You don't have permission to approve training examples"

**Solution**:
1. Only `manager` and `admin` roles can approve
2. Update your role in the `users` table
3. Ask an admin to grant you manager permissions

---

## Database Schema Reference

### training_examples

```sql
CREATE TABLE training_examples (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES leads(id),
  submitted_by UUID REFERENCES users(id),

  -- Example data
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  expected_response TEXT,
  feedback TEXT,

  -- Classification
  example_type TEXT CHECK (example_type IN ('good', 'bad', 'correction')),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Approval tracking
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### prompt_versions

```sql
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY,
  version INTEGER NOT NULL,

  -- Prompt content
  prompt_text TEXT NOT NULL,
  system_instructions TEXT,

  -- Status
  is_active BOOLEAN DEFAULT false,
  deployed_at TIMESTAMPTZ,
  notes TEXT,

  -- Performance tracking
  total_conversations INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Next Steps After Setup

1. **Submit Test Example**:
   - Go to a lead conversation
   - Click "Submit as Training"
   - Submit a test example
   - Verify it appears in review queue

2. **Test Approval Workflow**:
   - As manager, go to review queue
   - Approve or reject the test example
   - Verify notifications work

3. **Check Insights**:
   - Go to insights page
   - Verify example appears in stats
   - Check pattern detection

4. **Edit Prompt** (Admin only):
   - Go to prompt editor
   - Make a small test change
   - Save as draft
   - Deploy new version
   - Verify active version updates

5. **Test Performance Tracking**:
   - Send a test message via ManyChat
   - Check that conversation count increases
   - View version performance in prompt editor

---

## Support

If you encounter issues:

1. Check this guide first
2. Run `npm run db:verify` to diagnose
3. Check Supabase logs for errors
4. Review RLS policies in Supabase dashboard
5. Verify your user role permissions

---

## Files Created

### Backend API Routes
- `src/app/api/training/examples/route.ts` - CRUD operations
- `src/app/api/training/submit/route.ts` - Submission workflow
- `src/app/api/training/approve/[id]/route.ts` - Approval workflow
- `src/app/api/training/insights/route.ts` - Analytics
- `src/app/api/prompt/versions/route.ts` - Version management
- `src/app/api/prompt/versions/[id]/activate/route.ts` - Activate version
- `src/app/api/prompt/active/route.ts` - Active prompt management

### Frontend Pages
- `src/app/dashboard/training/page.tsx` - Main dashboard
- `src/app/dashboard/training/submit/page.tsx` - Submit examples
- `src/app/dashboard/training/review/page.tsx` - Review queue
- `src/app/dashboard/training/insights/page.tsx` - Analytics
- `src/app/dashboard/training/prompt/page.tsx` - Prompt editor

### Database & Scripts
- `supabase-dashboard-migration.sql` - Database schema
- `scripts/verify-training-tables.ts` - Verification script
- `scripts/seed-initial-prompt.ts` - Seed script

### Service Updates
- `src/services/agent.service.ts` - Added performance tracking

---

**Training feature is complete and ready to use! 🎉**
