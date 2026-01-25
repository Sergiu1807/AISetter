'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { NeedsAttentionList } from '@/components/dashboard/NeedsAttentionList'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { Users, MessageSquare, Calendar, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Lead } from '@/types/lead.types'

export default function DashboardPage() {
  const { profile, role } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch leads for stats calculation
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/leads')
        if (res.ok) {
          const data = await res.json()
          setLeads(data.leads || [])
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchLeads()
  }, [])

  // Calculate real stats from leads data
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeToday = leads.filter(lead => {
    const lastMessageDate = new Date(lead.last_message_at)
    return lastMessageDate >= today
  }).length

  const callsBooked = leads.filter(lead => lead.status === 'booked').length

  const qualifiedLeads = leads.filter(lead =>
    lead.status === 'qualified' || lead.status === 'likely_qualified'
  ).length

  const conversionRate = leads.length > 0
    ? Math.round((qualifiedLeads / leads.length) * 100)
    : 0

  const stats = [
    {
      title: 'Active Today',
      value: activeToday.toString(),
      change: {
        value: '+12%',
        trend: 'up' as const,
      },
      icon: Users,
      description: 'leads with messages today',
    },
    {
      title: 'Calls Booked',
      value: callsBooked.toString(),
      change: {
        value: `${callsBooked} total`,
        trend: 'up' as const,
      },
      icon: Calendar,
      description: 'booked appointments',
    },
    {
      title: 'Qualification Rate',
      value: `${conversionRate}%`,
      change: {
        value: `${qualifiedLeads}/${leads.length}`,
        trend: 'up' as const,
      },
      icon: TrendingUp,
      description: 'qualified leads',
    },
    {
      title: 'Total Leads',
      value: leads.length.toString(),
      change: {
        value: `${leads.filter(l => l.status === 'new').length} new`,
        trend: 'up' as const,
      },
      icon: MessageSquare,
      description: 'in the system',
    },
  ]

  // Show loading state only for stats (auth is handled by layout)
  if (statsLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        {/* Loading stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatsCard
              key={i}
              title=""
              value=""
              icon={Users}
              loading={true}
            />
          ))}
        </div>
      </div>
    )
  }

  // Get role badge color
  const getRoleBadge = () => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      operator: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return colors[role || 'viewer']
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard Overview
          </h1>
          {role && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge()}`}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          )}
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome back, {profile?.full_name || 'User'}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>

      {/* Needs Attention Section */}
      <NeedsAttentionList />

      {/* Recent Activity and Team Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity />
        <Card>
          <CardHeader>
            <CardTitle>Team Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {profile?.full_name} (You)
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Team Members
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Offline - 2h ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
