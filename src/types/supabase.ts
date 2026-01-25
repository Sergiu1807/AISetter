// Supabase Database type definition
// This provides type safety for Supabase client operations

import type {
  User,
  Lead,
  AuditLog,
  TrainingExample,
  PromptVersion,
  Notification,
} from './database.types'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>
      }
      training_examples: {
        Row: TrainingExample
        Insert: Omit<TrainingExample, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TrainingExample, 'id' | 'created_at'>>
      }
      prompt_versions: {
        Row: PromptVersion
        Insert: Omit<PromptVersion, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PromptVersion, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_audit_event: {
        Args: {
          p_action: string
          p_resource_type: string
          p_resource_id: string
          p_details?: Record<string, unknown>
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message: string
          p_link?: string
          p_metadata?: Record<string, unknown>
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
