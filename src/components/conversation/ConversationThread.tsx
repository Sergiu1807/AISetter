'use client'

import { useEffect, useRef } from 'react'
import type { Conversation } from '@/types/conversation.types'
import { MessageBubble } from './MessageBubble'

interface ConversationThreadProps {
  conversation: Conversation
}

export function ConversationThread({ conversation }: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages])

  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No messages yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-1">
      {conversation.messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}
