'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'

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

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activities?limit=5')
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

  const getStatusColor = (type: string) => {
    if (type.includes('booked') || type === 'call_booked') {
      return 'text-green-600 dark:text-green-400'
    }
    if (type.includes('error') || type === 'error') {
      return 'text-red-600 dark:text-red-400'
    }
    if (type.includes('human') || type === 'human_takeover') {
      return 'text-yellow-600 dark:text-yellow-400'
    }
    return 'text-blue-600 dark:text-blue-400'
  }

  const getIcon = (type: string) => {
    if (type.includes('booked') || type === 'call_booked') {
      return <CheckCircle2 className="h-4 w-4" />
    }
    if (type.includes('error') || type === 'error') {
      return <AlertCircle className="h-4 w-4" />
    }
    if (type.includes('new') || type === 'new_lead') {
      return <UserPlus className="h-4 w-4" />
    }
    return <CheckCircle2 className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <Link href="/dashboard/live">
            <Button variant="ghost" size="sm">
              View Live Feed
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Loading...
            </p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 text-sm border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-1 hover:border-primary dark:hover:border-primary transition-colors"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-12">
                  {formatTime(activity.timestamp)}
                </span>
                <div className={getStatusColor(activity.type)}>
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {activity.lead_handle || activity.lead_name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {activity.title}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
