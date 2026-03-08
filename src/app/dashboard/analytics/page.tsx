'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  Clock,
  Bot,
  Award,
} from 'lucide-react'
import type { Lead, LeadStatus, LeadPhase } from '@/types/lead.types'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/lead.types'
import { KPIDashboard } from '@/components/dashboard/KPIDashboard'

interface OverviewMetrics {
  botVsHuman: { bot: number; human: number }
  leadsThisMonth: number
  leadsLastMonth: number
  leadsChange: number
  bookedThisMonth: number
  bookedLastMonth: number
  bookedChange: number
}

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')
  const [activeView, setActiveView] = useState<'overview' | 'kpi'>('overview')
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const [leadsRes, overviewRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/analytics/overview'),
        ])
        if (leadsRes.ok) {
          const data = await leadsRes.json()
          setLeads(data.leads || [])
        }
        if (overviewRes.ok) {
          const data = await overviewRes.json()
          setOverviewMetrics(data)
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  // Calculate metrics from real data
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeToday = leads.filter(lead => {
    const lastMessageDate = new Date(lead.last_message_at)
    return lastMessageDate >= today
  }).length

  const callsBooked = leads.filter(lead => lead.status === 'booked').length

  const conversionRate = leads.length > 0
    ? ((callsBooked / leads.length) * 100).toFixed(1)
    : '0'

  const metrics = {
    totalLeads: leads.length,
    totalLeadsChange: overviewMetrics?.leadsChange ?? null,
    activeConversations: activeToday,
    callsBooked: callsBooked,
    callsBookedChange: overviewMetrics?.bookedChange ?? null,
    conversionRate: parseFloat(conversionRate),
    botVsHuman: overviewMetrics?.botVsHuman ?? { bot: 0, human: 0 },
  }

  // Calculate phase funnel from real data
  const phaseLabels: Record<LeadPhase, string> = {
    P1: 'Initial Contact',
    P2: 'Discovery',
    P3: 'Qualification',
    P4: 'Interest',
    P5: 'Intent',
    P6: 'Ready',
    P7: 'Booked',
  }

  const phaseCounts = (Object.keys(phaseLabels) as LeadPhase[]).map(phase => ({
    phase,
    label: phaseLabels[phase],
    count: leads.filter(lead => lead.current_phase === phase).length,
  }))

  const maxPhaseCount = Math.max(...phaseCounts.map(p => p.count), 1)
  const phaseFunnel = phaseCounts.map(p => ({
    ...p,
    percentage: Math.round((p.count / maxPhaseCount) * 100),
  }))

  // Calculate status distribution from real data
  const statusDistribution = (Object.keys(STATUS_LABELS) as LeadStatus[]).map(status => ({
    status: STATUS_LABELS[status],
    count: leads.filter(lead => lead.status === status).length,
    color: STATUS_COLORS[status].bg.replace(/dark:bg-\S+/, '').replace('bg-', 'bg-').split(' ')[0].replace('-100', '-500').replace('-900', '-500'),
  })).filter(s => s.count > 0)

  // Agent performance (bot only for now)
  const botConversations = leads.filter(lead => !lead.assigned_to).length
  const botBooked = leads.filter(lead => !lead.assigned_to && lead.status === 'booked').length
  const botConversionRate = botConversations > 0
    ? Math.round((botBooked / botConversations) * 100)
    : 0

  const agentPerformance = [
    {
      name: 'Bot',
      conversations: botConversations,
      booked: botBooked,
      conversionRate: botConversionRate,
      avgResponseTime: 0.5,
    },
  ]

  // Calculate max for charts
  const maxStatus = Math.max(...statusDistribution.map((s) => s.count), 1)

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytics & Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Performance metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Button
              variant={activeView === 'overview' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setActiveView('overview')}
            >
              Overview
            </Button>
            <Button
              variant={activeView === 'kpi' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setActiveView('kpi')}
            >
              KPI Dashboard
            </Button>
          </div>
          {activeView === 'overview' && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* KPI Dashboard View */}
      {activeView === 'kpi' && <KPIDashboard />}

      {/* Overview View */}
      {activeView === 'overview' && <>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            {metrics.totalLeadsChange !== null && (
              <p className={`text-xs mt-1 ${metrics.totalLeadsChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {metrics.totalLeadsChange >= 0 ? '+' : ''}{metrics.totalLeadsChange}% vs luna trecută
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.activeConversations}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Activi azi
            </p>
          </CardContent>
        </Card>

        {/* Calls Booked */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Booked</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.callsBooked}</div>
            {metrics.callsBookedChange !== null && (
              <p className={`text-xs mt-1 ${metrics.callsBookedChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {metrics.callsBookedChange >= 0 ? '+' : ''}{metrics.callsBookedChange}% vs luna trecută
              </p>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.conversionRate}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Din total lead-uri
            </p>
          </CardContent>
        </Card>

        {/* Bot vs Human */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Bot vs Human Messages
            </CardTitle>
            <Bot className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.botVsHuman.bot + metrics.botVsHuman.human > 0
                ? ((metrics.botVsHuman.bot / (metrics.botVsHuman.bot + metrics.botVsHuman.human)) * 100).toFixed(0)
                : '0'}
              % Bot
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {metrics.botVsHuman.bot.toLocaleString()} bot / {metrics.botVsHuman.human.toLocaleString()} lead
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {phaseFunnel.map((phase, index) => (
              <div key={phase.phase}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{phase.phase}</Badge>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {phase.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {phase.count}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {phase.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${phase.percentage}%` }}
                  />
                </div>
                {index < phaseFunnel.length - 1 && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1 ml-2">
                    Drop: {phaseFunnel[index].count - phaseFunnel[index + 1].count} (
                    {(
                      ((phaseFunnel[index].count - phaseFunnel[index + 1].count) /
                        phaseFunnel[index].count) *
                      100
                    ).toFixed(0)}
                    %)
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusDistribution.map((status) => (
              <div key={status.status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {status.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {status.count}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className={`${status.color} h-2 rounded-full transition-all`}
                    style={{
                      width: `${(status.count / maxStatus) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Agent Performance</CardTitle>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Conversations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Calls Booked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Conversion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Avg Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                {agentPerformance.map((agent, index) => (
                  <tr
                    key={agent.name}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {agent.name === 'Bot' ? (
                          <Bot className="h-4 w-4 text-blue-500" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                            {agent.name[0]}
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {agent.conversations}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {agent.booked}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {agent.conversionRate}%
                        </span>
                        <div className="w-20 bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${agent.conversionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {agent.avgResponseTime}m
                    </td>
                    <td className="px-6 py-4">
                      {index === 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          🥇 Top Performer
                        </Badge>
                      )}
                      {index === 1 && (
                        <Badge variant="secondary">🥈 2nd Place</Badge>
                      )}
                      {index === 2 && (
                        <Badge variant="outline">🥉 3rd Place</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Conversion rate insight */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${parseFloat(conversionRate) > 0 ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
            <TrendingUp className={`h-5 w-5 flex-shrink-0 mt-0.5 ${parseFloat(conversionRate) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-semibold ${parseFloat(conversionRate) > 0 ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                Rata de conversie: {conversionRate}%
              </p>
              <p className={`text-xs mt-1 ${parseFloat(conversionRate) > 0 ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                {callsBooked} call-uri rezervate din {leads.length} lead-uri totale.
              </p>
            </div>
          </div>

          {/* Funnel drop-off insight */}
          {phaseFunnel.length > 1 && (() => {
            const maxDrop = phaseFunnel.reduce((best, curr, i) => {
              if (i === 0 || phaseFunnel[i - 1].count === 0) return best;
              const dropPct = Math.round(((phaseFunnel[i - 1].count - curr.count) / phaseFunnel[i - 1].count) * 100);
              return dropPct > best.pct ? { pct: dropPct, from: phaseFunnel[i - 1].phase, to: curr.phase } : best;
            }, { pct: 0, from: '', to: '' });
            if (maxDrop.pct === 0) return null;
            return (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    Drop-off principal: {maxDrop.from} → {maxDrop.to}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {maxDrop.pct}% dintre lead-uri nu trec de {maxDrop.from}. Optimizează mesajele din această fază.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Bot automation insight */}
          {metrics.botVsHuman.bot + metrics.botVsHuman.human > 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Automatizare: {((metrics.botVsHuman.bot / (metrics.botVsHuman.bot + metrics.botVsHuman.human)) * 100).toFixed(0)}% din mesaje
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {metrics.botVsHuman.bot.toLocaleString()} mesaje trimise de bot, {metrics.botVsHuman.human.toLocaleString()} primite de la lead-uri.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      </>}
    </div>
  )
}
