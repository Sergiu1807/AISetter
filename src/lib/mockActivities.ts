import type { Activity } from '@/types/activity.types'

// Helper to create timestamps
const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

// Initial mock activities
export const initialMockActivities: Activity[] = [
  {
    id: 'act_1',
    type: 'call_booked',
    lead_id: '3',
    lead_name: 'Elena Matei',
    lead_handle: '@elena.mat',
    title: 'Call Booked',
    description: 'Elena Matei booked a demo call for tomorrow at 2 PM',
    timestamp: minutesAgo(2),
    metadata: {
      phase: 'P7',
      agent: 'user_sergiu',
      agent_name: 'Sergiu',
      call_time: 'Tomorrow at 2:00 PM',
    },
  },
  {
    id: 'act_2',
    type: 'message_received',
    lead_id: '1',
    lead_name: 'Andrei Popescu',
    lead_handle: '@andrei.pop',
    title: 'Message Received',
    description: 'Andrei Popescu: "Sure, I\'d be interested in learning more!"',
    timestamp: minutesAgo(5),
    metadata: {
      phase: 'P4',
      message: 'Sure, I\'d be interested in learning more!',
    },
  },
  {
    id: 'act_3',
    type: 'message_sent',
    lead_id: '1',
    lead_name: 'Andrei Popescu',
    lead_handle: '@andrei.pop',
    title: 'Message Sent',
    description: 'Bot asked: "Would you be open to a quick 15-minute call?"',
    timestamp: minutesAgo(8),
    metadata: {
      phase: 'P4',
      message: 'Would you be open to a quick 15-minute call?',
    },
  },
  {
    id: 'act_4',
    type: 'phase_change',
    lead_id: '1',
    lead_name: 'Andrei Popescu',
    lead_handle: '@andrei.pop',
    title: 'Phase Change',
    description: 'Andrei Popescu moved from P3 to P4',
    timestamp: minutesAgo(10),
    metadata: {
      phase_from: 'P3',
      phase_to: 'P4',
      reason: 'Showed strong interest in automation solution',
    },
  },
  {
    id: 'act_5',
    type: 'human_takeover',
    lead_id: '2',
    lead_name: 'Maria Ionescu',
    lead_handle: '@maria.ion',
    title: 'Human Takeover',
    description: 'Maria took over conversation with Maria Ionescu',
    timestamp: minutesAgo(15),
    metadata: {
      phase: 'P3',
      agent: 'user_maria',
      agent_name: 'Maria',
      reason: 'Lead requested LinkedIn integration - needs custom solution',
    },
  },
  {
    id: 'act_6',
    type: 'message_received',
    lead_id: '2',
    lead_name: 'Maria Ionescu',
    lead_handle: '@maria.ion',
    title: 'Message Received',
    description:
      'Maria Ionescu: "Can your system integrate with LinkedIn? That\'s crucial for B2B"',
    timestamp: minutesAgo(20),
    metadata: {
      phase: 'P3',
      message: 'Can your system integrate with LinkedIn? That\'s crucial for B2B',
    },
  },
  {
    id: 'act_7',
    type: 'lead_qualified',
    lead_id: '6',
    lead_name: 'Diana Luca',
    lead_handle: '@diana.luca',
    title: 'Lead Qualified',
    description: 'Diana Luca marked as qualified - ready for sales call',
    timestamp: minutesAgo(45),
    metadata: {
      phase: 'P6',
      agent: 'user_maria',
      agent_name: 'Maria',
      reason: 'High intent, good budget, decision maker',
    },
  },
  {
    id: 'act_8',
    type: 'phase_change',
    lead_id: '3',
    lead_name: 'Elena Matei',
    lead_handle: '@elena.mat',
    title: 'Phase Change',
    description: 'Elena Matei moved from P6 to P7',
    timestamp: hoursAgo(1),
    metadata: {
      phase_from: 'P6',
      phase_to: 'P7',
      reason: 'Call booked successfully',
    },
  },
  {
    id: 'act_9',
    type: 'message_received',
    lead_id: '3',
    lead_name: 'Elena Matei',
    lead_handle: '@elena.mat',
    title: 'Message Received',
    description: 'Elena Matei: "Just booked for tomorrow at 2 PM! Looking forward to it."',
    timestamp: hoursAgo(1.5),
    metadata: {
      phase: 'P6',
      message: 'Just booked for tomorrow at 2 PM! Looking forward to it.',
    },
  },
  {
    id: 'act_10',
    type: 'message_sent',
    lead_id: '3',
    lead_name: 'Elena Matei',
    lead_handle: '@elena.mat',
    title: 'Message Sent',
    description: 'Sergiu sent calendar link: calendly.com/sergiu/demo',
    timestamp: hoursAgo(2),
    metadata: {
      phase: 'P6',
      agent: 'user_sergiu',
      agent_name: 'Sergiu',
      message: 'Here\'s my calendar link: calendly.com/sergiu/demo',
    },
  },
  {
    id: 'act_11',
    type: 'human_takeover',
    lead_id: '3',
    lead_name: 'Elena Matei',
    lead_handle: '@elena.mat',
    title: 'Human Takeover',
    description: 'Sergiu took over conversation with Elena Matei',
    timestamp: hoursAgo(2.5),
    metadata: {
      phase: 'P6',
      agent: 'user_sergiu',
      agent_name: 'Sergiu',
      reason: 'Lead ready to book demo call',
    },
  },
  {
    id: 'act_12',
    type: 'new_lead',
    lead_id: '5',
    lead_name: 'Ion Radu',
    lead_handle: '@ion.radu',
    title: 'New Lead',
    description: 'Ion Radu started a conversation',
    timestamp: hoursAgo(3),
    metadata: {
      source: 'Instagram DM',
      phase: 'P1',
    },
  },
  {
    id: 'act_13',
    type: 'error',
    lead_id: '9',
    lead_name: 'Cristian Dumitrescu',
    lead_handle: '@cristi.d',
    title: 'Error',
    description: 'Failed to send message to Cristian Dumitrescu',
    timestamp: hoursAgo(3.5),
    metadata: {
      phase: 'P2',
      error_message: 'ManyChat API rate limit exceeded',
      reason: 'Too many messages sent in short period',
    },
  },
  {
    id: 'act_14',
    type: 'message_received',
    lead_id: '10',
    lead_name: 'Roxana Munteanu',
    lead_handle: '@roxana.m',
    title: 'Message Received',
    description:
      'Roxana Munteanu: "I have a good budget for this. What are the next steps?"',
    timestamp: hoursAgo(4),
    metadata: {
      phase: 'P5',
      message: 'I have a good budget for this. What are the next steps?',
    },
  },
  {
    id: 'act_15',
    type: 'phase_change',
    lead_id: '10',
    lead_name: 'Roxana Munteanu',
    lead_handle: '@roxana.m',
    title: 'Phase Change',
    description: 'Roxana Munteanu moved from P4 to P5',
    timestamp: hoursAgo(4.5),
    metadata: {
      phase_from: 'P4',
      phase_to: 'P5',
      reason: 'Confirmed budget and interest',
    },
  },
  {
    id: 'act_16',
    type: 'lead_disqualified',
    lead_id: '8',
    lead_name: 'Ana Gheorghe',
    lead_handle: '@ana.geo',
    title: 'Lead Disqualified',
    description: 'Ana Gheorghe marked as not fit',
    timestamp: hoursAgo(5),
    metadata: {
      phase: 'P3',
      reason: 'Not interested - no budget for automation',
    },
  },
  {
    id: 'act_17',
    type: 'bot_resumed',
    lead_id: '7',
    lead_name: 'Mihai Stan',
    lead_handle: '@mihai.stan',
    title: 'Bot Resumed',
    description: 'Bot resumed conversation with Mihai Stan',
    timestamp: hoursAgo(6),
    metadata: {
      phase: 'P5',
      agent: 'user_maria',
      agent_name: 'Maria',
      reason: 'Completed manual follow-up',
    },
  },
  {
    id: 'act_18',
    type: 'message_received',
    lead_id: '4',
    lead_name: 'Dan Popa',
    lead_handle: '@dan.popa',
    title: 'Message Received',
    description: 'Dan Popa: "This looks interesting. Tell me more about the pricing."',
    timestamp: hoursAgo(7),
    metadata: {
      phase: 'P4',
      message: 'This looks interesting. Tell me more about the pricing.',
    },
  },
  {
    id: 'act_19',
    type: 'phase_change',
    lead_id: '4',
    lead_name: 'Dan Popa',
    lead_handle: '@dan.popa',
    title: 'Phase Change',
    description: 'Dan Popa moved from P3 to P4',
    timestamp: hoursAgo(8),
    metadata: {
      phase_from: 'P3',
      phase_to: 'P4',
      reason: 'Asked about pricing - showing buying intent',
    },
  },
  {
    id: 'act_20',
    type: 'new_lead',
    lead_id: '1',
    lead_name: 'Andrei Popescu',
    lead_handle: '@andrei.pop',
    title: 'New Lead',
    description: 'Andrei Popescu started a conversation',
    timestamp: hoursAgo(10),
    metadata: {
      source: 'Instagram Story',
      phase: 'P1',
    },
  },
]

// Function to generate a new random activity
export function generateRandomActivity(): Activity {
  const types: Activity['type'][] = [
    'message_received',
    'message_sent',
    'phase_change',
    'new_lead',
  ]
  const randomType = types[Math.floor(Math.random() * types.length)]

  const leads = [
    { id: '1', name: 'Andrei Popescu', handle: '@andrei.pop' },
    { id: '2', name: 'Maria Ionescu', handle: '@maria.ion' },
    { id: '4', name: 'Dan Popa', handle: '@dan.popa' },
    { id: '10', name: 'Roxana Munteanu', handle: '@roxana.m' },
  ]
  const randomLead = leads[Math.floor(Math.random() * leads.length)]

  const messages = [
    'That sounds great!',
    'Can you tell me more?',
    'What\'s the pricing?',
    'I\'m interested!',
    'When can we schedule a call?',
  ]

  let activity: Activity

  switch (randomType) {
    case 'message_received':
      activity = {
        id: `act_${Date.now()}`,
        type: 'message_received',
        lead_id: randomLead.id,
        lead_name: randomLead.name,
        lead_handle: randomLead.handle,
        title: 'Message Received',
        description: `${randomLead.name}: "${messages[Math.floor(Math.random() * messages.length)]}"`,
        timestamp: new Date().toISOString(),
        metadata: {
          phase: `P${Math.floor(Math.random() * 7) + 1}`,
          message: messages[Math.floor(Math.random() * messages.length)],
        },
      }
      break

    case 'message_sent':
      activity = {
        id: `act_${Date.now()}`,
        type: 'message_sent',
        lead_id: randomLead.id,
        lead_name: randomLead.name,
        lead_handle: randomLead.handle,
        title: 'Message Sent',
        description: 'Bot sent a follow-up message',
        timestamp: new Date().toISOString(),
        metadata: {
          phase: `P${Math.floor(Math.random() * 7) + 1}`,
        },
      }
      break

    case 'phase_change':
      const fromPhase = Math.floor(Math.random() * 6) + 1
      activity = {
        id: `act_${Date.now()}`,
        type: 'phase_change',
        lead_id: randomLead.id,
        lead_name: randomLead.name,
        lead_handle: randomLead.handle,
        title: 'Phase Change',
        description: `${randomLead.name} moved from P${fromPhase} to P${fromPhase + 1}`,
        timestamp: new Date().toISOString(),
        metadata: {
          phase_from: `P${fromPhase}`,
          phase_to: `P${fromPhase + 1}`,
          reason: 'Showing increased interest',
        },
      }
      break

    case 'new_lead':
    default:
      activity = {
        id: `act_${Date.now()}`,
        type: 'new_lead',
        lead_id: randomLead.id,
        lead_name: randomLead.name,
        lead_handle: randomLead.handle,
        title: 'New Lead',
        description: `${randomLead.name} started a conversation`,
        timestamp: new Date().toISOString(),
        metadata: {
          source: Math.random() > 0.5 ? 'Instagram DM' : 'Facebook Messenger',
          phase: 'P1',
        },
      }
      break
  }

  return activity
}
