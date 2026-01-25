'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  GraduationCap,
  Plus,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react'

interface TrainingStats {
  summary: {
    total_examples: number
    approved: number
    pending: number
    rejected: number
    by_type: {
      good: number
      bad: number
      correction: number
    }
  }
  performance: {
    trend: Array<{ date: string; good: number; bad: number }>
  }
}

interface Activity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export default function TrainingPage() {
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch insights
        const insightsRes = await fetch('/api/training/insights')
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json()
          setStats(insightsData)
        }

        // Fetch recent training activities
        const activitiesRes = await fetch('/api/activities?limit=10')
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json()
          const trainingActivities = (activitiesData.activities || []).filter((a: Activity) =>
            a.type.includes('training') || a.type.includes('prompt')
          )
          setActivities(trainingActivities.slice(0, 10))
        }
      } catch (error) {
        console.error('Error fetching training data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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

  const totalExamples = stats?.summary.total_examples || 0
  const pendingCount = stats?.summary.pending || 0
  const approvedCount = stats?.summary.approved || 0
  const rejectedCount = stats?.summary.rejected || 0

  const approvalRate =
    totalExamples > 0
      ? ((approvedCount / (approvedCount + rejectedCount || 1)) * 100).toFixed(1)
      : '0'

  // Calculate trend (last 7 days vs previous 7 days)
  const recentTrend = stats?.performance.trend || []
  const last7Days = recentTrend.slice(-7)
  const prev7Days = recentTrend.slice(-14, -7)

  const recentTotal = last7Days.reduce((sum, day) => sum + day.good + day.bad, 0)
  const prevTotal = prev7Days.reduce((sum, day) => sum + day.good + day.bad, 0)
  const trendPercentage =
    prevTotal > 0 ? (((recentTotal - prevTotal) / prevTotal) * 100).toFixed(0) : '0'
  const trendUp = parseFloat(trendPercentage) >= 0

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Bot Training
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Improve bot responses through example collection and feedback
            </p>
          </div>
        </div>
        <Link href="/dashboard/training/submit">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Example
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Examples */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {totalExamples}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {trendUp ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs ${
                      trendUp ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {Math.abs(parseFloat(trendPercentage))}% from last week
                  </span>
                </div>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Review */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingCount}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Awaiting approval
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {approvalRate}%
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {approvedCount} approved, {rejectedCount} rejected
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {recentTotal}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Examples submitted
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/training/submit" className="block">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-2">
                <Plus className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Submit Example</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Add new training data
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/dashboard/training/review" className="block">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-2">
                <Clock className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold flex items-center gap-2">
                    Review Queue
                    {pendingCount > 0 && (
                      <Badge variant="default">{pendingCount}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Approve pending examples
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/dashboard/training/insights" className="block">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">View Insights</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Patterns and analytics
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Example Types */}
        <Card>
          <CardHeader>
            <CardTitle>Examples by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Good Examples
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {stats?.summary.by_type.good || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Bad Examples
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {stats?.summary.by_type.bad || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Corrections
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {stats?.summary.by_type.correction || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                No training activities yet
              </p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
                  >
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-gray-100 font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs truncate">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Links to Other Pages */}
      <Card>
        <CardHeader>
          <CardTitle>More Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/training/prompt">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Prompt Editor
              </Button>
            </Link>
            <Link href="/dashboard/training/insights">
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Full Insights
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
