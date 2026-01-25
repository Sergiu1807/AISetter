import { Message, SENDER_COLORS } from '@/types/conversation.types'
import { Bot, User, UserCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isBot = message.sender_type === 'bot'
  const isLead = message.sender_type === 'lead'
  const isHuman = message.sender_type === 'human'

  const colors = SENDER_COLORS[message.sender_type]

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Check if this is a phase transition message
  const isPhaseTransition = message.metadata?.phase_transition

  // Render phase transition marker
  if (isPhaseTransition) {
    return (
      <div className="flex items-center justify-center my-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900 border border-purple-200 dark:border-purple-800">
          <Badge variant="outline" className="text-xs">
            {message.metadata?.phase_transition?.from}
          </Badge>
          <ArrowRight className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          <Badge variant="outline" className="text-xs">
            {message.metadata?.phase_transition?.to}
          </Badge>
          <span className="text-xs text-purple-700 dark:text-purple-300 ml-2">
            Phase Transition
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start gap-3 mb-4 ${
        isLead ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border`}
      >
        {isBot && <Bot className={`h-4 w-4 ${colors.text}`} />}
        {isLead && <User className={`h-4 w-4 ${colors.text}`} />}
        {isHuman && <UserCircle className={`h-4 w-4 ${colors.text}`} />}
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col ${isLead ? 'items-end' : 'items-start'} max-w-[70%]`}
      >
        {/* Sender name for human messages */}
        {isHuman && message.sender_name && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              {message.sender_name}
            </span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              Human
            </Badge>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${colors.bg} ${colors.border} border ${
            isLead ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}
        >
          <p className={`text-sm ${colors.text} whitespace-pre-wrap`}>
            {message.content}
          </p>
        </div>

        {/* Timestamp and status */}
        <div
          className={`flex items-center gap-2 mt-1 px-1 ${
            isLead ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.timestamp)}
          </span>
          {message.status && (
            <span className="text-xs text-gray-400">
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && (
                <span className="text-blue-500">✓✓</span>
              )}
            </span>
          )}
        </div>

        {/* Phase badge if present */}
        {message.metadata?.phase && !isPhaseTransition && (
          <Badge variant="outline" className="text-xs mt-1">
            Phase {message.metadata.phase}
          </Badge>
        )}
      </div>
    </div>
  )
}
