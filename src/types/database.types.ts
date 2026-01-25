// Database type definitions for the AI Appointment Setter Dashboard
// Auto-generated types based on Supabase schema

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer'

export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent'

export type TrainingExampleType = 'good' | 'bad' | 'correction'

export type TrainingExampleStatus = 'pending' | 'approved' | 'rejected'

export type NotificationType = 'needs_human' | 'lead_assigned' | 'system_alert' | 'info'

// User preferences structure
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    browser: boolean
    email: boolean
    sound: boolean
  }
  dashboard: {
    default_page: string
    items_per_page: number
  }
}

// Users table
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  preferences: UserPreferences
  created_at: string
  updated_at: string
  created_by: string | null
}

// Audit logs table
export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Training examples table
export interface TrainingExample {
  id: string
  conversation_id: string | null
  submitted_by: string | null
  example_type: TrainingExampleType
  status: TrainingExampleStatus
  user_message: string
  ai_response: string
  expected_response: string | null
  feedback: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

// Prompt versions table
export interface PromptVersion {
  id: string
  version: number
  prompt_text: string
  system_instructions: string | null
  created_by: string | null
  is_active: boolean
  deployed_at: string | null
  notes: string | null
  total_conversations: number
  success_rate: number | null
  created_at: string
  updated_at: string
}

// Notifications table
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  is_read: boolean
  read_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Updated Lead interface with dashboard fields
export interface Lead {
  // Identification
  id: string
  manychat_user_id: string
  instagram_handle: string | null
  name: string | null

  // Timestamps
  created_at: string
  updated_at: string
  last_message_at: string | null

  // Lead Source
  lead_source: string
  initial_engagement: string | null
  known_details: string | null

  // Conversation State
  conversation_phase: string
  qualification_status: string

  // Collected Data
  collected_data: Record<string, unknown>
  steps_completed: string[]

  // Control Flags
  is_new: boolean
  is_returning: boolean
  bot_paused: boolean
  needs_human: boolean
  is_blocked: boolean

  // Outcome
  call_booked: boolean
  call_date: string | null
  final_status: string

  // Conversation History
  messages: Message[]
  message_count: number

  // Debug & Analytics
  last_ai_analysis: string | null
  error_count: number
  notes: string | null

  // Dashboard fields
  assigned_to: string | null
  tags: string[]
  priority: LeadPriority
  rating: number | null
  feedback: string | null
  last_human_message_at: string | null
}

// Message structure (stored in lead.messages JSONB array)
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  analysis?: string
  meta?: MessageMeta
  sent_by?: string  // user_id if sent by human
  is_human?: boolean  // true if sent by team member, not bot
}

export interface MessageMeta {
  qualification_status?: string
  conversation_phase?: string
  pain_points?: string
  objections?: string
  steps_completed?: string
  next_goal?: string
  risk_factors?: string
  red_flags?: string
}

// Database table names for type safety
export const TABLE_NAMES = {
  USERS: 'users',
  LEADS: 'leads',
  AUDIT_LOGS: 'audit_logs',
  TRAINING_EXAMPLES: 'training_examples',
  PROMPT_VERSIONS: 'prompt_versions',
  NOTIFICATIONS: 'notifications',
} as const

// Helper type for database inserts (omits auto-generated fields)
export type InsertUser = Omit<User, 'id' | 'created_at' | 'updated_at'>
export type InsertLead = Omit<Lead, 'id' | 'created_at' | 'updated_at'>
export type InsertAuditLog = Omit<AuditLog, 'id' | 'created_at'>
export type InsertTrainingExample = Omit<TrainingExample, 'id' | 'created_at' | 'updated_at'>
export type InsertPromptVersion = Omit<PromptVersion, 'id' | 'created_at' | 'updated_at'>
export type InsertNotification = Omit<Notification, 'id' | 'created_at'>

// Helper type for database updates (all fields optional except id)
export type UpdateUser = Partial<Omit<User, 'id' | 'created_at'>> & { id: string }
export type UpdateLead = Partial<Omit<Lead, 'id' | 'created_at'>> & { id: string }
export type UpdateTrainingExample = Partial<Omit<TrainingExample, 'id' | 'created_at'>> & { id: string }
export type UpdatePromptVersion = Partial<Omit<PromptVersion, 'id' | 'created_at'>> & { id: string }
export type UpdateNotification = Partial<Omit<Notification, 'id' | 'created_at'>> & { id: string }
