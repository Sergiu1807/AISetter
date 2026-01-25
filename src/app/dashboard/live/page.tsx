'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { Activity, ActivityType } from '@/types/activity.types'
import { ACTIVITY_CONFIG } from '@/types/activity.types'
import { useRealtimeActivities } from '@/hooks/useRealtime'
import { ActivityItem } from '@/components/activity/ActivityItem'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity as ActivityIcon, RefreshCw } from 'lucide-react'

export default function LiveFeedPage() {
  // State
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [leadFilter, setLeadFilter] = useState<string>('all')
  const [isLive, setIsLive] = useState(true)
  const [newActivityCount, setNewActivityCount] = useState(0)

  const feedRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const prevActivityCountRef = useRef(0)

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (leadFilter !== 'all') params.append('lead_id', leadFilter)
      params.append('limit', '50')

      const res = await fetch(`/api/activities?${params}`)
      if (!res.ok) throw new Error('Failed to fetch activities')

      const data = await res.json()
      const newActivities = data.activities || []

      // Check if there are new activities
      if (prevActivityCountRef.current > 0 && newActivities.length > prevActivityCountRef.current) {
        const newCount = newActivities.length - prevActivityCountRef.current
        setNewActivityCount(newCount)

        // Auto-scroll to top if enabled
        if (autoScroll && feedRef.current) {
          feedRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }

      prevActivityCountRef.current = newActivities.length
      setActivities(newActivities)
      setError(null)
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch activities')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, leadFilter, autoScroll])

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Subscribe to real-time updates (only when live mode is on)
  useRealtimeActivities(() => {
    if (isLive) {
      fetchActivities()
    }
  })

  // Activities are already filtered by API
  const filteredActivities = activities

  // Get unique leads for filter
  const uniqueLeads = useMemo(() => {
    const leads = new Map<string, { id: string; name: string }>()
    activities.forEach((a) => {
      if (!leads.has(a.lead_id)) {
        leads.set(a.lead_id, { id: a.lead_id, name: a.lead_name })
      }
    })
    return Array.from(leads.values())
  }, [activities])

  // Clear filters
  const clearFilters = () => {
    setTypeFilter('all')
    setLeadFilter('all')
  }

  // Reset new activity count when user scrolls
  useEffect(() => {
    if (newActivityCount > 0) {
      const timer = setTimeout(() => setNewActivityCount(0), 3000)
      return () => clearTimeout(timer)
    }
  }, [newActivityCount])

  const hasActiveFilters = typeFilter !== 'all' || leadFilter !== 'all'

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Live Activity Feed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time updates from all conversations
            </p>
          </div>
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                LIVE
              </span>
              <Badge variant="secondary" className="text-xs">
                {activities.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Live Updates On
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Live Updates Off
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Filters
              </h3>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Activity Type
              </label>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as ActivityType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Lead
              </label>
              <Select value={leadFilter} onValueChange={setLeadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  {uniqueLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {loading ? (
              'Loading activities...'
            ) : (
              <>
                Showing {filteredActivities.length} activit
                {filteredActivities.length === 1 ? 'y' : 'ies'}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <ActivityIcon className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        </Card>
      )}

      {/* New Activity Banner */}
      {newActivityCount > 0 && autoScroll && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {newActivityCount} new activit{newActivityCount === 1 ? 'y' : 'ies'}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Activity Feed */}
      <div
        ref={feedRef}
        className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2"
      >
        {filteredActivities.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <ActivityIcon className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No activities found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          </Card>
        ) : (
          filteredActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>

      {/* Load More (placeholder for pagination) */}
      {filteredActivities.length >= 20 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => alert('Load more functionality')}>
            Load More Activities
          </Button>
        </div>
      )}

      {/* Settings */}
      <Card className="mt-6">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Auto-scroll to new activities
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically scroll to top when new activities arrive
              </p>
            </div>
            <Button
              variant={autoScroll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
