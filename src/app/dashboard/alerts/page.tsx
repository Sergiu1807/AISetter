'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Eye,
} from 'lucide-react'

interface Activity {
  id: string
  type: string
  lead_id: string
  lead_name: string
  lead_handle: string
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export default function AlertsPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activities?limit=50')
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || [])
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [])

  // Count unread (activities from last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const unreadCount = activities.filter(
    a => new Date(a.timestamp) > oneDayAgo
  ).length

  // Get icon and colors for activity type
  const getAlertConfig = (
    type: string
  ): { icon: React.ElementType; color: string; bgColor: string; borderColor: string } => {
    if (type.includes('error')) {
      return {
        icon: AlertCircle,
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
      }
    }
    if (type.includes('human') || type === 'human_takeover') {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-700 dark:text-yellow-300',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
      }
    }
    if (type.includes('booked') || type === 'call_booked') {
      return {
        icon: CheckCircle,
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800',
      }
    }
    return {
      icon: Info,
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const isRecent = (timestamp: string) => {
    return new Date(timestamp) > oneDayAgo
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-8 w-8 text-blue-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Alerts & Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              System events and important updates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{unreadCount} new</Badge>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No alerts yet</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => {
            const config = getAlertConfig(activity.type)
            const Icon = config.icon
            const recent = isRecent(activity.timestamp)

            return (
              <Card
                key={activity.id}
                className={`${config.bgColor} border ${config.borderColor} ${
                  recent ? 'border-l-4' : 'opacity-75'
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`${config.color} flex-shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${config.color}`}>
                          {activity.title}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {activity.description}
                        </p>
                        {activity.lead_name && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            Lead: {activity.lead_name} ({activity.lead_handle})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        {activity.lead_id && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/leads/${activity.lead_id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
