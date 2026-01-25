'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  List
} from 'lucide-react'

interface Insights {
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
  patterns: {
    common_issues: Array<{
      issue: string
      frequency: number
      examples: string[]
    }>
    successful_responses: Array<{
      pattern: string
      context: string
      example_ids: string[]
    }>
    improvement_areas: Array<{
      phase: string
      issue_count: number
      avg_rating: number
    }>
  }
  performance: {
    by_phase: Array<{ phase: string; good: number; bad: number }>
    by_status: Array<{ status: string; good: number; bad: number }>
    trend: Array<{ date: string; good: number; bad: number }>
  }
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/training/insights')
        if (res.ok) {
          const data = await res.json()
          setInsights(data)
        }
      } catch (error) {
        console.error('Error fetching insights:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
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

  const totalExamples = insights?.summary.total_examples || 0
  const approvedExamples = insights?.summary.approved || 0

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/training">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Training Insights
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Patterns, trends, and performance analysis from training data
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {totalExamples}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {approvedExamples}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Good Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {insights?.summary.by_type.good || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {(insights?.summary.by_type.bad || 0) + (insights?.summary.by_type.correction || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <CardTitle>Common Issues</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!insights?.patterns.common_issues || insights.patterns.common_issues.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No common issues identified yet. Submit more training examples to see patterns.
            </p>
          ) : (
            <div className="space-y-3">
              {insights.patterns.common_issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {issue.issue}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Found in {issue.frequency} example{issue.frequency > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge variant="outline">{issue.frequency}x</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Successful Patterns */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle>Successful Response Patterns</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!insights?.patterns.successful_responses || insights.patterns.successful_responses.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No successful patterns identified yet. Approve more good examples to see patterns.
            </p>
          ) : (
            <div className="space-y-3">
              {insights.patterns.successful_responses.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mb-2">
                        {pattern.context}
                      </Badge>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {pattern.pattern}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance by Phase */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle>Performance by Conversation Phase</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!insights?.performance.by_phase || insights.performance.by_phase.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No phase data available yet
            </p>
          ) : (
            <div className="space-y-4">
              {insights.performance.by_phase.map((phase) => {
                const total = phase.good + phase.bad
                const goodPercentage = total > 0 ? (phase.good / total) * 100 : 0
                const badPercentage = total > 0 ? (phase.bad / total) * 100 : 0

                return (
                  <div key={phase.phase} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Phase {phase.phase}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {phase.good} good, {phase.bad} bad
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden flex">
                      {goodPercentage > 0 && (
                        <div
                          className="bg-green-500 h-full"
                          style={{ width: `${goodPercentage}%` }}
                        />
                      )}
                      {badPercentage > 0 && (
                        <div
                          className="bg-red-500 h-full"
                          style={{ width: `${badPercentage}%` }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Areas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-purple-600" />
            <CardTitle>Areas Needing Improvement</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!insights?.patterns.improvement_areas || insights.patterns.improvement_areas.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No specific improvement areas identified yet
            </p>
          ) : (
            <div className="space-y-3">
              {insights.patterns.improvement_areas
                .sort((a, b) => b.issue_count - a.issue_count)
                .map((area, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Phase {area.phase}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {area.issue_count} issue{area.issue_count > 1 ? 's' : ''} • {area.avg_rating.toFixed(1)}% success rate
                      </p>
                    </div>
                    <Badge variant={area.avg_rating < 50 ? 'destructive' : 'outline'}>
                      {area.avg_rating < 50 ? 'Critical' : 'Needs Work'}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {!insights?.performance.trend || insights.performance.trend.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No trend data available yet
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Good Examples</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Bad Examples</span>
                </div>
              </div>

              <div className="h-48 flex items-end gap-1">
                {insights.performance.trend.slice(-14).map((day, idx) => {
                  const total = day.good + day.bad
                  const maxHeight = 180
                  const goodHeight = total > 0 ? (day.good / Math.max(...insights.performance.trend.map(d => d.good + d.bad), 1)) * maxHeight : 0
                  const badHeight = total > 0 ? (day.bad / Math.max(...insights.performance.trend.map(d => d.good + d.bad), 1)) * maxHeight : 0

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col justify-end items-center gap-1"
                    >
                      {day.bad > 0 && (
                        <div
                          className="w-full bg-red-500 rounded-t"
                          style={{ height: `${badHeight}px` }}
                        />
                      )}
                      {day.good > 0 && (
                        <div
                          className="w-full bg-green-500 rounded-t"
                          style={{ height: `${goodHeight}px` }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Last 14 days
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Links */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/training/prompt">
              <Button variant="outline">
                Update System Prompt
              </Button>
            </Link>
            <Link href="/dashboard/training/review">
              <Button variant="outline">
                Review Pending Examples
              </Button>
            </Link>
            <Link href="/dashboard/training/submit">
              <Button variant="outline">
                Submit New Example
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
