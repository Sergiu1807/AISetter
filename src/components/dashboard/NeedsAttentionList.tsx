'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Eye, UserPlus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Lead } from '@/types/lead.types'

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

export function NeedsAttentionList() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/leads?needs_human=true')
        if (res.ok) {
          const data = await res.json()
          // Get first 3 leads that need attention
          setLeads((data.leads || []).slice(0, 3))
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  const getPriority = (lead: Lead): 'high' | 'medium' | 'low' => {
    if (lead.has_errors) return 'high'
    if (lead.needs_human) return 'high'
    return 'medium'
  }

  const getIssueText = (lead: Lead): string => {
    if (lead.needs_human) return 'Needs Human'
    if (lead.has_errors) return 'Has Errors'
    if (lead.bot_paused) return 'Bot Paused'
    return `Phase ${lead.current_phase}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle>Needs Attention</CardTitle>
            <Badge variant="destructive">{leads.length}</Badge>
          </div>
          <Link href="/dashboard/leads?needs_human=true">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Loading...
            </p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No leads need attention right now
            </p>
          ) : (
            leads.map((lead) => {
              const priority = getPriority(lead)
              return (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        priority === 'high'
                          ? 'bg-red-500'
                          : priority === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lead.name}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {lead.handle}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {getIssueText(lead)} • {formatTimeAgo(lead.last_message_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/leads/${lead.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/leads/${lead.id}`}>
                        <UserPlus className="h-3 w-3 mr-1" />
                        Take Over
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
