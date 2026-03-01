'use client'

import { useEffect, useRef, useMemo } from 'react'
import type { Conversation } from '@/types/conversation.types'
import { MessageBubble } from './MessageBubble'

interface ConversationThreadProps {
  conversation: Conversation
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function formatDateSeparator(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function ConversationThread({ conversation }: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sort messages chronologically (backend may return out of order due to async saves)
  const sortedMessages = useMemo(() =>
    [...conversation.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    [conversation.messages]
  )

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sortedMessages])

  if (!conversation || sortedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No messages yet</p>
      </div>
    )
  }

  // Track last date for day separators
  let lastDate: Date | null = null

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1">
      {sortedMessages.map((message) => {
        const msgDate = new Date(message.timestamp)
        let showDateSeparator = false

        if (!lastDate || !isSameDay(lastDate, msgDate)) {
          showDateSeparator = true
        }
        lastDate = msgDate

        return (
          <div key={message.id}>
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {formatDateSeparator(msgDate)}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            )}
            <MessageBubble message={message} />
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
