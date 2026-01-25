import Link from 'next/link'
import type { Activity } from '@/types/activity.types'
import { ACTIVITY_CONFIG } from '@/types/activity.types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ActivityItemProps {
  activity: Activity
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = ACTIVITY_CONFIG[activity.type]

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now()
    const past = new Date(timestamp).getTime()
    const diffSeconds = Math.floor((now - past) / 1000)

    if (diffSeconds < 10) return 'just now'
    if (diffSeconds < 60) return `${diffSeconds}s ago`

    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <Card
      className={`${config.bgColor} ${config.borderColor} border-l-4 hover:shadow-md transition-shadow`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
              <Link
                href={`/dashboard/leads/${activity.lead_id}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {activity.lead_name} {activity.lead_handle}
              </Link>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimeAgo(activity.timestamp)}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {activity.description}
        </p>

        {/* Metadata */}
        {activity.metadata && (
          <div className="flex flex-wrap gap-2 text-xs">
            {activity.metadata.phase && (
              <Badge variant="outline" className="text-xs">
                Phase {activity.metadata.phase}
              </Badge>
            )}
            {activity.metadata.phase_from && activity.metadata.phase_to && (
              <Badge variant="outline" className="text-xs">
                {activity.metadata.phase_from} → {activity.metadata.phase_to}
              </Badge>
            )}
            {activity.metadata.agent_name && (
              <Badge variant="secondary" className="text-xs">
                Agent: {activity.metadata.agent_name}
              </Badge>
            )}
            {activity.metadata.source && (
              <Badge variant="secondary" className="text-xs">
                {activity.metadata.source}
              </Badge>
            )}
          </div>
        )}

        {/* Additional info */}
        {activity.metadata?.reason && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
            {activity.metadata.reason}
          </p>
        )}
        {activity.metadata?.error_message && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
            {activity.metadata.error_message}
          </p>
        )}
      </div>
    </Card>
  )
}
