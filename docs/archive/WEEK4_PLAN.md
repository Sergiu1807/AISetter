# Week 4 - Conversation View

**Phase 2: Lead Management (Part 2)**

## 🎯 Goal
Build a detailed conversation view where users can:
- View full conversation history with a lead
- See lead details and metadata
- Take over from the bot (human intervention)
- Send manual messages
- Pause/resume bot
- View conversation context and phase progression

---

## 📋 What We'll Build

### Day 1-2: Lead Detail Page Structure
- Lead info sidebar (left side)
  - Name, handle, status, phase
  - Assigned user
  - Tags
  - Key metrics (messages, last active)
  - Quick actions (assign, pause, tag)
- Conversation area (center/right)
  - Message thread
  - Message input box
  - Control buttons

### Day 3: Message Components
- Message bubble component
  - Bot messages (left, blue/purple)
  - Lead messages (right, gray)
  - Human messages (left, green with agent name)
  - Timestamps
  - Status indicators (sent, delivered, read)
- Conversation thread
  - Auto-scroll to bottom
  - Grouped by time
  - Phase transitions markers

### Day 4: Human Takeover
- Take over button
- Message input (appears when taken over)
- Send message functionality
- Bot pause/resume
- Return control to bot

### Day 5: Context & Actions
- Conversation context panel
  - Current phase explanation
  - Next steps
  - Notes/reminders
- Quick actions
  - Book appointment
  - Mark as qualified/not fit
  - Add tags
  - Transfer to another agent

---

## 🚀 Simplified Version (Option A)

For now, we'll implement:
- ✅ Lead detail page with sidebar
- ✅ Message thread with mock conversations
- ✅ Message bubbles (bot, lead, human)
- ✅ Basic controls (pause, take over UI)
- ✅ Message input (UI only)
- ✅ Phase indicators
- ✅ Timestamps and grouping

**Estimated:** ~600-800 lines
**Time:** 30-45 minutes

---

## 📊 Data Structure

### Message Interface
```typescript
{
  id: string
  conversation_id: string
  sender_type: 'bot' | 'lead' | 'human'
  sender_name?: string
  content: string
  timestamp: string
  status?: 'sent' | 'delivered' | 'read'
  metadata?: {
    phase?: string
    action?: string
  }
}
```

### Conversation Interface
```typescript
{
  lead_id: string
  messages: Message[]
  bot_active: boolean
  human_taken_over: boolean
  taken_over_by?: string
  taken_over_at?: string
}
```

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Leads]                              [Controls ▼] │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  LEAD INFO  │          CONVERSATION THREAD                  │
│             │                                               │
│  Photo      │  [Bot] Hi! I'm here to help...              │
│  Name       │        9:00 AM                               │
│  @handle    │                                               │
│             │                    [Lead] Hi, I'm interested │
│  Status: 🟢 │                           9:02 AM             │
│  Phase: P4  │                                               │
│             │  [Bot] Great! Let me ask you...             │
│  Messages   │        9:02 AM                               │
│    12       │                                               │
│             │                    [Lead] I run an ecommerce │
│  Assigned   │                           9:05 AM             │
│    Maria    │                                               │
│             │  [Phase Transition: P3 → P4]                │
│  Tags       │                                               │
│  [hot]      │  [Bot] Perfect! Based on...                 │
│  [ecom]     │        9:10 AM                               │
│             │                                               │
│  [Actions]  │                    [Lead] Sounds good!       │
│  • Pause    │                           9:12 AM             │
│  • Take     │                                               │
│  • Tag      │  [Human: Maria] I can help you schedule     │
│  • Assign   │        9:15 AM                               │
│             │                                               │
│             ├───────────────────────────────────────────────┤
│             │ [📎] Type a message...              [Send] │
│             └───────────────────────────────────────────────┘
└─────────────┴───────────────────────────────────────────────┘
```

---

## ✅ Deliverable

By end of Week 4, users can:
- Click a lead from the list
- View full conversation history
- See lead details and status
- See who said what and when
- Understand conversation flow and phase progression
- (UI ready for) Taking over and sending messages

---

Let's build it! 🚀
