// Lead types for the application

export type LeadStatus =
  | 'new'
  | 'exploring'
  | 'likely_qualified'
  | 'qualified'
  | 'not_fit'
  | 'nurture'
  | 'booked'

export type LeadPhase = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7'

export interface Lead {
  id: string
  name: string
  handle: string
  manychat_user_id: string
  status: LeadStatus
  current_phase: LeadPhase
  message_count: number
  assigned_to?: string
  assigned_to_name?: string
  tags: string[]
  needs_human: boolean
  bot_paused: boolean
  is_blocked: boolean
  is_new: boolean
  is_returning: boolean
  has_errors: boolean
  last_message_at: string
  created_at: string
  updated_at: string
}

export interface LeadFilters {
  search?: string
  status?: LeadStatus | 'all'
  phase?: LeadPhase | 'all'
  assigned_to?: string | 'all' | 'unassigned'
  tags?: string[]
  needs_human?: boolean
  bot_paused?: boolean
  booked?: boolean
  has_errors?: boolean
  date_range?: 'today' | 'week' | 'month' | 'all'
}

export interface SavedFilter {
  id: string
  name: string
  filters: LeadFilters
  created_by: string
  created_at: string
}

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-800' },
  exploring: { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-800 dark:text-cyan-200', border: 'border-cyan-200 dark:border-cyan-800' },
  likely_qualified: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-200 dark:border-yellow-800' },
  qualified: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', border: 'border-green-200 dark:border-green-800' },
  not_fit: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200', border: 'border-gray-200 dark:border-gray-800' },
  nurture: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-800' },
  booked: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-200 dark:border-purple-800' },
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  exploring: 'Exploring',
  likely_qualified: 'Likely Qualified',
  qualified: 'Qualified',
  not_fit: 'Not Fit',
  nurture: 'Nurture',
  booked: 'Booked',
}
