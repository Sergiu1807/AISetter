import type { Lead } from '@/types/lead.types'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/lead.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  User,
  MessageSquare,
  Clock,
  UserPlus,
  Tag,
  AlertCircle,
  Pause,
  Play,
  AlertTriangle,
} from 'lucide-react'

interface LeadInfoSidebarProps {
  lead: Lead
  onPauseBot?: () => void
  onResumeBot?: () => void
  onAssign?: () => void
  onAddTags?: () => void
}

export function LeadInfoSidebar({
  lead,
  onPauseBot,
  onResumeBot,
  onAssign,
  onAddTags,
}: LeadInfoSidebarProps) {
  const statusColors = STATUS_COLORS[lead.status] || STATUS_COLORS['new']

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now()
    const past = new Date(timestamp).getTime()
    const diffMinutes = Math.floor((now - past) / (1000 * 60))

    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
      {/* Lead Avatar & Name */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
          {lead.name}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{lead.handle}</p>
      </div>

      <Separator className="mb-6" />

      {/* Status & Phase */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Current Status
            </span>
            <Badge
              className={`${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
            >
              {STATUS_LABELS[lead.status] || lead.status || 'Unknown'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Phase</span>
            <Badge variant="outline">{lead.current_phase}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">Messages</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {lead.message_count}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Last Activity
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {lead.last_message_at ? formatTimeAgo(lead.last_message_at) : 'N/A'}
              </p>
            </div>
          </div>
          {lead.assigned_to_name && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Assigned To
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {lead.assigned_to_name}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags */}
      {(lead.needs_human || lead.bot_paused || lead.has_errors) && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.needs_human && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>Needs Human Attention</span>
              </div>
            )}
            {lead.bot_paused && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <Pause className="h-4 w-4" />
                <span>Bot Paused</span>
              </div>
            )}
            {lead.has_errors && (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Has Errors</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator className="mb-6" />

      {/* Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Quick Actions
        </h3>

        {lead.bot_paused ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onResumeBot}
          >
            <Play className="h-4 w-4 mr-2" />
            Resume Bot
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onPauseBot}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Bot
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onAssign}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {lead.assigned_to_name ? 'Reassign' : 'Assign to User'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onAddTags}
        >
          <Tag className="h-4 w-4 mr-2" />
          Manage Tags
        </Button>
      </div>

      {/* Metadata */}
      <Separator className="my-6" />
      <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Created:</span>
          <span>{new Date(lead.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>ManyChat ID:</span>
          <span className="font-mono text-[10px]">
            {lead.manychat_user_id}
          </span>
        </div>
      </div>
    </div>
  )
}
