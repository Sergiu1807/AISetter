// Activity and live feed types

export type ActivityType =
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

export interface Activity {
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
    agent_name?: string
    message?: string
    reason?: string
    source?: string
    call_time?: string
    error_message?: string
  }
}

export const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: string
    color: string
    bgColor: string
    borderColor: string
    label: string
  }
> = {
  new_lead: {
    icon: '🆕',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'New Lead',
  },
  message_sent: {
    icon: '📤',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800',
    label: 'Message Sent',
  },
  message_received: {
    icon: '💬',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    label: 'Message Received',
  },
  phase_change: {
    icon: '⬆️',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    label: 'Phase Change',
  },
  call_booked: {
    icon: '🎉',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'Call Booked',
  },
  human_takeover: {
    icon: '🤖',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'Human Takeover',
  },
  bot_resumed: {
    icon: '↩️',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-950',
    borderColor: 'border-teal-200 dark:border-teal-800',
    label: 'Bot Resumed',
  },
  error: {
    icon: '⚠️',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Error',
  },
  lead_qualified: {
    icon: '✅',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    label: 'Lead Qualified',
  },
  lead_disqualified: {
    icon: '❌',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-800',
    label: 'Lead Disqualified',
  },
}
