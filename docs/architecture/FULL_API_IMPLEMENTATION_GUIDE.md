# Full API Implementation Guide

**Complete guide to implement the full version with real database and APIs**

---

## 🎯 What Was Created

### 1. Database Schema ✅
**File:** `supabase-full-schema.sql`

**Tables Created:**
- ✅ `leads` - Store all lead information
- ✅ `conversations` - One per lead, tracks bot/human state
- ✅ `messages` - All conversation messages
- ✅ `activities` - Activity feed events
- ✅ `training_examples` - Bot training data
- ✅ `system_settings` - Global settings
- ✅ `knowledge_base` - Bot knowledge
- ✅ `response_templates` - Predefined responses

**Features:**
- Row Level Security (RLS) policies for all tables
- Indexes for performance
- Auto-update triggers for `updated_at` fields
- Automatic activity creation on lead/message changes
- Real-time enabled for leads, conversations, messages, activities

### 2. API Routes ✅
**Created API Endpoints:**

#### Leads API
- `GET /api/leads` - Get all leads with filters
- `POST /api/leads` - Create new lead
- `PATCH /api/leads` - Bulk update leads
- `GET /api/leads/[id]` - Get single lead
- `PATCH /api/leads/[id]` - Update single lead
- `DELETE /api/leads/[id]` - Delete lead

#### Conversations API
- `GET /api/conversations/[leadId]` - Get conversation with messages
- `PATCH /api/conversations/[leadId]` - Update conversation (takeover/return)

#### Messages API
- `POST /api/messages` - Send new message

#### Activities API
- `GET /api/activities` - Get all activities with filters
- `POST /api/activities` - Create activity

---

## 📋 Step-by-Step Implementation

### Step 1: Run Database Schema ✅ **DO THIS FIRST**

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy entire content of `supabase-full-schema.sql`
4. Paste and run the SQL

**What this does:**
- Creates all 8 tables
- Sets up RLS policies
- Creates indexes
- Adds triggers
- Seeds initial data (settings, knowledge base, templates)
- Enables real-time

**Verification:**
```sql
-- Run this to verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- activities
- conversations
- knowledge_base
- leads
- messages
- response_templates
- system_settings
- training_examples
- users (already exists)

---

### Step 2: Test API Endpoints

Once the schema is running, test the APIs:

#### Test Leads API
```bash
# Get all leads
curl http://localhost:3000/api/leads

# Create a lead
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "handle": "@testlead",
    "manychat_user_id": "test_123"
  }'
```

#### Test Conversations API
```bash
# Get conversation for a lead (replace {leadId} with actual ID)
curl http://localhost:3000/api/conversations/{leadId}
```

#### Test Activities API
```bash
# Get all activities
curl http://localhost:3000/api/activities
```

---

### Step 3: Connect Frontend to APIs

Now we need to update the frontend pages to use real APIs instead of mock data.

#### 3.1 Update Leads Page

**File:** `src/app/dashboard/leads/page.tsx`

Replace the mock data import with API calls:

```typescript
// BEFORE (using mock data):
import { mockLeads } from '@/lib/mockLeads'
const [leads, setLeads] = useState(mockLeads)

// AFTER (using API):
const [leads, setLeads] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (phaseFilter !== 'all') params.append('phase', phaseFilter)
      if (assignedFilter !== 'all') params.append('assigned_to', assignedFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  fetchLeads()
}, [statusFilter, phaseFilter, assignedFilter, searchQuery])
```

#### 3.2 Update Lead Detail Page

**File:** `src/app/dashboard/leads/[id]/page.tsx`

Replace mock conversation with API:

```typescript
// BEFORE:
import { getConversationByLeadId } from '@/lib/mockConversations'
const conversation = getConversationByLeadId(leadId)

// AFTER:
const [conversation, setConversation] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchConversation = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/conversations/${leadId}`)
      const data = await res.json()
      setConversation(data.conversation)
    } catch (error) {
      console.error('Error fetching conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  fetchConversation()
}, [leadId])

// Update send message function:
const handleSendMessage = async () => {
  if (!messageInput.trim() || !conversation) return

  setIsSending(true)
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversation.id,
        content: messageInput,
        sender_type: 'human',
      }),
    })

    if (res.ok) {
      setMessageInput('')
      // Refresh conversation to get new message
      const convRes = await fetch(`/api/conversations/${leadId}`)
      const convData = await convRes.json()
      setConversation(convData.conversation)
    }
  } catch (error) {
    console.error('Error sending message:', error)
  } finally {
    setIsSending(false)
  }
}
```

#### 3.3 Update Live Feed Page

**File:** `src/app/dashboard/live/page.tsx`

Replace mock activities with API:

```typescript
// BEFORE:
import { initialMockActivities } from '@/lib/mockActivities'
const [activities, setActivities] = useState(initialMockActivities)

// AFTER:
const [activities, setActivities] = useState([])

useEffect(() => {
  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (leadFilter !== 'all') params.append('lead_id', leadFilter)

      const res = await fetch(`/api/activities?${params}`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  fetchActivities()

  // Poll for new activities every 5 seconds if live
  const interval = isLive ? setInterval(fetchActivities, 5000) : null

  return () => {
    if (interval) clearInterval(interval)
  }
}, [typeFilter, leadFilter, isLive])
```

---

### Step 4: Enable Real-time Updates

Add Supabase real-time subscriptions for live updates.

**File:** Create `src/hooks/useRealtime.ts`

```typescript
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeLeads(onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onUpdate])
}

export function useRealtimeMessages(conversationId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, onUpdate])
}

export function useRealtimeActivities(onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onUpdate])
}
```

**Usage in components:**

```typescript
// In leads page:
import { useRealtimeLeads } from '@/hooks/useRealtime'

useRealtimeLeads(() => {
  fetchLeads() // Refresh leads when change detected
})

// In conversation page:
import { useRealtimeMessages } from '@/hooks/useRealtime'

useRealtimeMessages(conversation?.id, () => {
  fetchConversation() // Refresh when new message
})

// In live feed:
import { useRealtimeActivities } from '@/hooks/useRealtime'

useRealtimeActivities(() => {
  fetchActivities() // Refresh when new activity
})
```

---

### Step 5: Add ManyChat Webhook Integration

**File:** Create `src/app/api/webhooks/manychat/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verify ManyChat signature (TODO: Add security)
    const supabase = createClient()

    const { user_id, full_name, text } = body

    // Get or create lead
    let lead
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('manychat_user_id', user_id)
      .single()

    if (existingLead) {
      lead = existingLead
    } else {
      // Create new lead
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          name: full_name || 'Unknown',
          handle: `@user_${user_id}`,
          manychat_user_id: user_id,
        })
        .select()
        .single()

      lead = newLead

      // Create conversation
      await supabase.from('conversations').insert({
        lead_id: lead.id,
        bot_active: true,
      })
    }

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', lead.id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'No conversation' }, { status: 404 })
    }

    // Save incoming message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_type: 'lead',
      content: text,
      status: 'read',
    })

    // Check if bot should respond
    if (conversation.bot_active && !conversation.human_taken_over) {
      // TODO: Generate bot response with Anthropic
      const botResponse = await generateBotResponse(lead, text)

      // Save bot message
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_type: 'bot',
        content: botResponse,
      })

      // TODO: Send to ManyChat
      // await sendToManyChat(user_id, botResponse)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function generateBotResponse(lead: any, message: string) {
  // TODO: Implement with Anthropic API
  return "Thanks for your message! I'll get back to you shortly."
}
```

---

### Step 6: Implement Bot Logic with Anthropic

**File:** Create `src/lib/bot/engine.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateBotResponse(params: {
  leadName: string
  leadPhase: string
  conversationHistory: Array<{ role: string; content: string }>
  knowledgeBase: string
}) {
  const { leadName, leadPhase, conversationHistory, knowledgeBase } = params

  const systemPrompt = `You are an AI appointment setter for a digital agency.

Your goal: Qualify leads and book demo calls.

Current lead: ${leadName}
Current phase: ${leadPhase}

Knowledge base:
${knowledgeBase}

Be friendly, professional, and helpful. Ask qualifying questions to understand their business and needs.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory,
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

---

## 🧪 Testing Checklist

### Database
- [ ] Run schema SQL in Supabase
- [ ] Verify all tables created
- [ ] Test RLS policies (try accessing as different users)
- [ ] Verify triggers work (update a lead, check activities)

### API Endpoints
- [ ] Test GET /api/leads
- [ ] Test POST /api/leads
- [ ] Test GET /api/leads/[id]
- [ ] Test PATCH /api/leads/[id]
- [ ] Test GET /api/conversations/[leadId]
- [ ] Test POST /api/messages
- [ ] Test GET /api/activities

### Frontend
- [ ] Leads page loads from API
- [ ] Filters work
- [ ] Search works
- [ ] CSV export works
- [ ] Lead detail page loads conversation
- [ ] Send message works
- [ ] Takeover works
- [ ] Live feed shows real activities
- [ ] Real-time updates work

---

## 🚀 Deployment Checklist

1. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ANTHROPIC_API_KEY=your_key
   MANYCHAT_API_KEY=your_key
   ```

2. **Database**
   - [x] Schema deployed
   - [ ] Seed data added
   - [ ] RLS policies tested

3. **APIs**
   - [ ] All routes working
   - [ ] Error handling added
   - [ ] Rate limiting (optional)

4. **Integrations**
   - [ ] ManyChat webhook configured
   - [ ] Anthropic API working
   - [ ] Real-time subscriptions active

---

## 📈 Next Steps

1. **Immediate (Today):**
   - Run database schema
   - Test API endpoints
   - Update leads page to use API

2. **Short Term (This Week):**
   - Connect all pages to APIs
   - Add real-time subscriptions
   - Test full flow

3. **Medium Term (Next Week):**
   - ManyChat integration
   - Bot logic with Anthropic
   - Production deployment

4. **Long Term:**
   - Analytics with real data
   - Advanced bot training
   - Performance optimization

---

## 🛠️ Troubleshooting

### Issue: RLS Policies Blocking Access
**Solution:** Make sure `get_user_role()` function exists and returns correct role.

### Issue: API Returns 401
**Solution:** Check that Supabase auth is working and user is logged in.

### Issue: Messages Not Appearing
**Solution:** Check that conversation_id is correct and RLS policies allow access.

### Issue: Real-time Not Working
**Solution:** Verify Realtime is enabled in Supabase dashboard under Database > Replication.

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs (Dashboard > Logs)
2. Check browser console for errors
3. Check Network tab for failed API calls
4. Verify environment variables are set

---

**You now have everything needed to complete the full API integration!** 🚀

Start with Step 1 (Run Database Schema) and work through each step systematically.
