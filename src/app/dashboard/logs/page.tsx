'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Search, Download } from 'lucide-react'

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

export default function LogsPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const params = new URLSearchParams()
        params.append('limit', '100')
        if (typeFilter !== 'all') {
          params.append('type', typeFilter)
        }

        const res = await fetch(`/api/activities?${params}`)
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
  }, [typeFilter])

  // Filter by search query
  const filteredActivities = activities.filter(log => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      log.title.toLowerCase().includes(query) ||
      log.description.toLowerCase().includes(query) ||
      log.lead_name?.toLowerCase().includes(query) ||
      log.lead_handle?.toLowerCase().includes(query)
    )
  })

  const getLevelBadge = (type: string) => {
    if (type.includes('error')) {
      return <Badge variant="destructive">ERROR</Badge>
    }
    if (type.includes('human') || type === 'human_takeover') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">WARN</Badge>
    }
    if (type.includes('booked') || type === 'call_booked') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">SUCCESS</Badge>
    }
    return <Badge variant="outline">INFO</Badge>
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Level', 'Service', 'Message', 'Lead'],
      ...filteredActivities.map(log => [
        formatTimestamp(log.timestamp),
        log.type,
        'System',
        log.description,
        log.lead_name || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
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
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              System Logs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Activity history and system events
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="new_lead">New Leads</SelectItem>
                <SelectItem value="message_sent">Messages</SelectItem>
                <SelectItem value="human_takeover">Human Takeover</SelectItem>
                <SelectItem value="call_booked">Calls Booked</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-48">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-48">
                    Lead
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4">{getLevelBadge(log.type)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {log.type}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <div className="font-medium">{log.title}</div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {log.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {log.lead_name ? (
                          <div>
                            <div className="font-medium">{log.lead_name}</div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {log.lead_handle}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {filteredActivities.length} of {activities.length} logs
        </span>
        <span>Last updated: {activities.length > 0 ? formatTimestamp(activities[0].timestamp) : 'Never'}</span>
      </div>
    </div>
  )
}
