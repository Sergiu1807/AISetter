import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to subscribe to real-time updates for leads table
 * Calls onUpdate whenever a lead is created, updated, or deleted
 */
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

/**
 * Hook to subscribe to real-time updates for messages in a specific conversation
 * Calls onUpdate whenever a new message is inserted for the conversation
 */
export function useRealtimeMessages(conversationId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
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

/**
 * Hook to subscribe to real-time updates for activities
 * Calls onUpdate whenever a new activity is created
 */
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

/**
 * Hook to subscribe to real-time updates for conversations
 * Calls onUpdate whenever a conversation is updated (e.g., takeover state change)
 */
export function useRealtimeConversations(onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
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
