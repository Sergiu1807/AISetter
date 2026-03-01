# Week 5 - Real-time Updates & Live Feed

**Phase 3: Real-time Features (Part 1)**

## 🎯 Goal
Build a live activity feed that shows everything happening in real-time:
- New leads arriving
- Messages being sent/received
- Phase transitions
- Calls being booked
- Errors and alerts
- Bot actions

---

## 📋 What We'll Build

### Live Feed Page
- Activity timeline showing all events
- Real-time updates (new items appear at top)
- Different activity types with icons and colors
- Timestamps (just now, 2m ago, 1h ago)
- Filter by activity type
- Filter by lead
- Pagination/infinite scroll

### Activity Types
1. **New Lead** - Someone started conversation
2. **Message Sent** - Bot or human sent message
3. **Message Received** - Lead replied
4. **Phase Change** - Lead moved to new phase
5. **Call Booked** - Appointment scheduled
6. **Human Takeover** - Agent took control
7. **Bot Resumed** - Bot resumed after human
8. **Error** - Something went wrong
9. **Lead Qualified** - Lead marked as qualified
10. **Lead Disqualified** - Lead marked as not fit

### Components
- `ActivityFeed` - Main feed container
- `ActivityItem` - Individual activity card
- `ActivityFilters` - Filter controls
- `RealtimeIndicator` - Shows "Live" status
- `ActivityIcon` - Icons for each activity type

---

## 🚀 Simplified Version

For now, we'll implement:
- ✅ Live feed page with mock activities
- ✅ 10 activity types with styling
- ✅ Simulated real-time (new items every 10-30 seconds)
- ✅ Filters (activity type, lead)
- ✅ Timestamps with smart formatting
- ✅ "Live" indicator
- ✅ Auto-scroll to new items
- ✅ Activity details on click

**Estimated:** ~500-600 lines
**Time:** 30-40 minutes

---

## 🎨 UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ Live Feed                                      🔴 LIVE (234) │
├─────────────────────────────────────────────────────────────┤
│ Filters: [All Types ▼] [All Leads ▼] [Clear]               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🎉 Call Booked                              just now   │ │
│ │ Elena Matei booked a demo call for tomorrow at 2 PM    │ │
│ │ Phase: P7 • Agent: Sergiu                              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 💬 Message Received                         2m ago     │ │
│ │ Andrei Popescu: "That sounds exactly what I need!"     │ │
│ │ Phase: P4                                              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⬆️ Phase Change                             5m ago     │ │
│ │ Maria Ionescu moved from P2 to P3                      │ │
│ │ Reason: Asked about custom integration                 │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🤖 Human Takeover                          12m ago     │ │
│ │ Maria took over conversation with Maria Ionescu        │ │
│ │ Reason: Needs custom LinkedIn integration              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🆕 New Lead                                1h ago      │ │
│ │ Ion Radu started a conversation                        │ │
│ │ Source: Instagram DM                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│                    [Load More Activities]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Structure

### Activity Interface
```typescript
{
  id: string
  type: ActivityType
  lead_id: string
  lead_name: string
  lead_handle: string
  title: string
  description: string
  timestamp: string
  metadata?: {
    phase?: string
    phase_from?: string
    phase_to?: string
    agent?: string
    message?: string
    reason?: string
    source?: string
  }
}
```

### Activity Types
```typescript
type ActivityType =
  | 'new_lead'
  | 'message_sent'
  | 'message_received'
  | 'phase_change'
  | 'call_booked'
  | 'human_takeover'
  | 'bot_resumed'
  | 'error'
  | 'lead_qualified'
  | 'lead_disqualified'
```

---

## ✅ Deliverable

By end of Week 5, users can:
- See all activities happening in real-time
- Filter activities by type and lead
- Click activity to see related lead
- Watch new activities appear automatically
- Understand what's happening across all conversations

---

Let's build it! 🚀
