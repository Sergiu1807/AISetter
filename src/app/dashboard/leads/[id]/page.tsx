'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRealtimeMessages } from '@/hooks/useRealtime'
import { LeadInfoSidebar } from '@/components/conversation/LeadInfoSidebar'
import { ConversationThread } from '@/components/conversation/ConversationThread'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Lead } from '@/types/lead.types'
import type { Conversation } from '@/types/conversation.types'
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  UserCircle,
  AlertCircle,
  GraduationCap,
} from 'lucide-react'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  // State
  const [lead, setLead] = useState<Lead | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Fetch lead and conversation
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch lead
      const leadRes = await fetch(`/api/leads/${leadId}`)
      if (!leadRes.ok) throw new Error('Failed to fetch lead')
      const leadData = await leadRes.json()
      setLead(leadData.lead)

      // Fetch conversation
      const convRes = await fetch(`/api/conversations/${leadId}`)
      if (!convRes.ok) throw new Error('Failed to fetch conversation')
      const convData = await convRes.json()
      setConversation(convData.conversation)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to real-time messages
  useRealtimeMessages(conversation?.id, fetchData)

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {error ? 'Error Loading Lead' : 'Lead Not Found'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error || "The lead you're looking for doesn't exist or has been removed."}
        </p>
        <Button onClick={() => router.push('/dashboard/leads')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    )
  }

  // Handle no conversation
  if (!conversation) {
    return (
      <div className="flex h-screen">
        <LeadInfoSidebar
          lead={lead}
          onPauseBot={() => alert('Pause bot clicked')}
          onResumeBot={() => alert('Resume bot clicked')}
          onAssign={() => alert('Assign clicked')}
          onAddTags={() => alert('Add tags clicked')}
        />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/dashboard/leads">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Leads
                </Button>
              </Link>
            </div>
          </div>

          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No conversation yet</p>
              <p className="text-sm">
                This lead hasn&apos;t started a conversation with the bot.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Determine if bot is active or human has taken over
  const botActive = conversation.bot_active && !conversation.human_taken_over
  const humanActive = conversation.human_taken_over

  // Handle take over
  const handleTakeOver = async () => {
    try {
      const res = await fetch(`/api/conversations/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_taken_over: true,
          bot_active: false,
          taken_over_at: new Date().toISOString()
        })
      })

      if (!res.ok) throw new Error('Failed to take over conversation')

      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error taking over:', err)
      alert('Failed to take over conversation')
    }
  }

  // Handle return to bot
  const handleReturnToBot = async () => {
    try {
      const res = await fetch(`/api/conversations/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_taken_over: false,
          bot_active: true,
          taken_over_by: null,
          taken_over_at: null
        })
      })

      if (!res.ok) throw new Error('Failed to return to bot')

      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error returning to bot:', err)
      alert('Failed to return to bot')
    }
  }

  // Handle send message
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
          sender_type: 'human'
        })
      })

      if (!res.ok) throw new Error('Failed to send message')

      setMessageInput('')
      // Refresh conversation to show new message
      await fetchData()
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Handle quick actions
  const handlePauseBot = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_paused: true })
      })

      if (!res.ok) throw new Error('Failed to pause bot')
      await fetchData()
    } catch (err) {
      console.error('Error pausing bot:', err)
      alert('Failed to pause bot')
    }
  }

  const handleResumeBot = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_paused: false })
      })

      if (!res.ok) throw new Error('Failed to resume bot')
      await fetchData()
    } catch (err) {
      console.error('Error resuming bot:', err)
      alert('Failed to resume bot')
    }
  }

  const handleAssign = () => {
    // TODO: Implement assign dialog
    alert('Assign to user dialog would open here')
  }

  const handleAddTags = () => {
    // TODO: Implement tags dialog
    alert('Add tags dialog would open here')
  }

  return (
    <div className="flex h-screen">
      {/* Lead Info Sidebar */}
      <LeadInfoSidebar
        lead={lead}
        onPauseBot={handlePauseBot}
        onResumeBot={handleResumeBot}
        onAssign={handleAssign}
        onAddTags={handleAddTags}
      />

      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/leads">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Leads
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Conversation with {lead.name}
              </h1>
            </div>

            {/* Bot Status */}
            <div className="flex items-center gap-3">
              {botActive && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <Bot className="h-3 w-3 mr-1" />
                  Bot Active
                </Badge>
              )}
              {humanActive && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                  <UserCircle className="h-3 w-3 mr-1" />
                  Human Control
                  {conversation.taken_over_by_name &&
                    ` - ${conversation.taken_over_by_name}`}
                </Badge>
              )}

              {/* Training Button */}
              <Link href={`/dashboard/training/submit?leadId=${leadId}`}>
                <Button size="sm" variant="outline">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Submit as Training
                </Button>
              </Link>

              {/* Take Over / Return Button */}
              {botActive ? (
                <Button onClick={handleTakeOver} size="sm" variant="outline">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Take Over
                </Button>
              ) : (
                <Button
                  onClick={handleReturnToBot}
                  size="sm"
                  variant="outline"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Return to Bot
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Conversation Thread */}
        <ConversationThread conversation={conversation} />

        {/* Message Input (only show if human has taken over) */}
        {humanActive && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900">
            <Card className="p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Press Enter to send, Shift + Enter for new line
                  </p>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="h-[72px]"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Bot Active Notice */}
        {botActive && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <Bot className="h-4 w-4" />
              <span>
                Bot is currently handling this conversation. Click &quot;Take Over&quot; to
                send manual messages.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
