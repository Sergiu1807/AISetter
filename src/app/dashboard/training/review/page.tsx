'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Loader2
} from 'lucide-react'

interface TrainingExample {
  id: string
  user_message: string
  ai_response: string
  expected_response?: string
  feedback: string
  example_type: 'good' | 'bad' | 'correction'
  status: 'pending' | 'approved' | 'rejected'
  submitted_by_user?: {
    full_name: string
    email: string
  }
  created_at: string
  conversation?: {
    leads?: {
      name: string
      handle: string
    }
  }
}

export default function ReviewQueuePage() {
  const [examples, setExamples] = useState<TrainingExample[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedExample, setSelectedExample] = useState<TrainingExample | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const fetchExamples = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/training/examples?status=${filter}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setExamples(data.examples || [])
      }
    } catch (error) {
      console.error('Error fetching examples:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchExamples()
  }, [fetchExamples])

  const handleApprove = async (exampleId: string) => {
    setReviewing(true)
    try {
      const res = await fetch(`/api/training/approve/${exampleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes: reviewNotes
        })
      })

      if (res.ok) {
        alert('Training example approved!')
        setSelectedExample(null)
        setReviewNotes('')
        fetchExamples()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to approve'}`)
      }
    } catch (error) {
      console.error('Error approving example:', error)
      alert('Failed to approve example')
    } finally {
      setReviewing(false)
    }
  }

  const handleReject = async (exampleId: string) => {
    if (!reviewNotes.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setReviewing(true)
    try {
      const res = await fetch(`/api/training/approve/${exampleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes: reviewNotes
        })
      })

      if (res.ok) {
        alert('Training example rejected')
        setSelectedExample(null)
        setReviewNotes('')
        fetchExamples()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to reject'}`)
      }
    } catch (error) {
      console.error('Error rejecting example:', error)
      alert('Failed to reject example')
    } finally {
      setReviewing(false)
    }
  }

  const getExampleTypeBadge = (type: string) => {
    switch (type) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Good</Badge>
      case 'bad':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Bad</Badge>
      case 'correction':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Correction</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const pendingCount = examples.filter(e => e.status === 'pending').length

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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/training">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Review Queue
              </h1>
              {filter === 'pending' && pendingCount > 0 && (
                <Badge variant="default">{pendingCount} pending</Badge>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review and approve training examples from your team
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter:</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Examples List */}
      <div className="space-y-4">
        {examples.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'pending' ? 'No pending examples to review' : 'No examples found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          examples.map((example) => (
            <Card key={example.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      {getExampleTypeBadge(example.example_type)}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{example.submitted_by_user?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(example.created_at)}</span>
                      </div>
                      {example.conversation?.leads && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {example.conversation.leads.name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">User Message</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {example.user_message}
                        </p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bot Response</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {example.ai_response}
                        </p>
                      </div>

                      {example.expected_response && (
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expected Response</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {example.expected_response}
                          </p>
                        </div>
                      )}

                      <div className="border-l-4 border-yellow-500 pl-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Feedback</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {example.feedback}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {example.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedExample(example)
                          setReviewNotes('')
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedExample(example)
                          setReviewNotes('')
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedExample} onOpenChange={() => setSelectedExample(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Training Example</DialogTitle>
            <DialogDescription>
              Add notes about your decision (optional for approval, required for rejection)
            </DialogDescription>
          </DialogHeader>

          {selectedExample && (
            <div className="space-y-4">
              {/* Example Preview */}
              <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  {getExampleTypeBadge(selectedExample.example_type)}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    by {selectedExample.submitted_by_user?.full_name}
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <strong>Feedback:</strong> {selectedExample.feedback}
                </p>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedExample(null)
                    setReviewNotes('')
                  }}
                  disabled={reviewing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedExample.id)}
                  disabled={reviewing}
                >
                  {reviewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedExample.id)}
                  disabled={reviewing}
                >
                  {reviewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
