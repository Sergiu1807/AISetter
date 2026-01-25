// Conversation and message types

export type MessageSenderType = 'bot' | 'lead' | 'human'
export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface Message {
  id: string
  conversation_id: string
  sender_type: MessageSenderType
  sender_name?: string // For human messages (agent name)
  content: string
  timestamp: string
  status?: MessageStatus
  metadata?: {
    phase?: string
    phase_transition?: {
      from: string
      to: string
    }
    action?: string // e.g., "qualified_lead", "booked_call"
  }
}

export interface Conversation {
  id: string
  lead_id: string
  messages: Message[]
  bot_active: boolean
  human_taken_over: boolean
  taken_over_by?: string // user_id
  taken_over_by_name?: string // user name
  taken_over_at?: string
  created_at: string
  updated_at: string
}

export const SENDER_COLORS = {
  bot: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-200 dark:border-blue-800',
  },
  lead: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
  },
  human: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-900 dark:text-green-100',
    border: 'border-green-200 dark:border-green-800',
  },
}
