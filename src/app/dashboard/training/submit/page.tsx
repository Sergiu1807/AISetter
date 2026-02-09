'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  name: string
  handle: string
  last_message_at: string
}

interface ConversationTurn {
  user_message: string
  ai_response: string
  feedback: string
}

function SubmitTrainingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // From Conversation form state
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [exampleType, setExampleType] = useState<'good' | 'bad' | 'correction'>('good')
  const [expectedResponse, setExpectedResponse] = useState('')
  const [feedback, setFeedback] = useState('')

  // Manual form state - multi-turn conversation
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([
    { user_message: '', ai_response: '', feedback: '' }
  ])

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/leads?limit=50')
        if (res.ok) {
          const data = await res.json()
          setLeads(data.leads || [])

          // Auto-select lead from query parameter if provided
          const leadIdParam = searchParams.get('leadId')
          if (leadIdParam) {
            setSelectedLeadId(leadIdParam)
          }
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      }
    }
    fetchLeads()
  }, [searchParams])

  // Fetch conversation when lead is selected
  useEffect(() => {
    if (selectedLeadId) {
      const fetchConversation = async () => {
        try {
          const res = await fetch(`/api/conversations/${selectedLeadId}`)
          if (res.ok) {
            const data = await res.json()
            const convId = data.conversation?.id || ''
            console.log('Fetched conversation for lead:', selectedLeadId, 'Conversation ID:', convId)
            setConversationId(convId)

            if (!convId) {
              console.warn('No conversation found for this lead')
            }
          } else {
            console.error('Failed to fetch conversation:', res.status, res.statusText)
            setConversationId('')
          }
        } catch (error) {
          console.error('Error fetching conversation:', error)
          setConversationId('')
        }
      }
      fetchConversation()
    } else {
      setConversationId('')
    }
  }, [selectedLeadId])

  const filteredLeads = leads.filter(lead =>
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.handle?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmitFromConversation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLeadId) {
      alert('Please select a lead first')
      return
    }

    if (!conversationId) {
      alert('This lead does not have a conversation yet. Please use the "Manual Example" tab instead.')
      return
    }

    if (!feedback.trim()) {
      alert('Please provide feedback about this example')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/training/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          example_type: exampleType,
          feedback,
          expected_response: exampleType === 'correction' ? expectedResponse : undefined
        })
      })

      if (res.ok) {
        alert('Training example submitted successfully!')
        router.push('/dashboard/training')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to submit'}`)
      }
    } catch (error) {
      console.error('Error submitting training example:', error)
      alert('Failed to submit training example')
    } finally {
      setLoading(false)
    }
  }

  const updateTurn = (index: number, field: keyof ConversationTurn, value: string) => {
    setConversationTurns(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addTurn = () => {
    setConversationTurns(prev => [...prev, { user_message: '', ai_response: '', feedback: '' }])
  }

  const removeTurn = (index: number) => {
    if (conversationTurns.length <= 1) return
    setConversationTurns(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all turns have required fields
    for (let i = 0; i < conversationTurns.length; i++) {
      const turn = conversationTurns[i]
      if (!turn.user_message.trim() || !turn.ai_response.trim() || !turn.feedback.trim()) {
        alert(`Please fill in all required fields for Turn ${i + 1}`)
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/training/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: conversationTurns[0].user_message,
          ai_response: conversationTurns[0].ai_response,
          feedback: conversationTurns[0].feedback,
          example_type: 'good',
          conversation_turns: conversationTurns
        })
      })

      if (res.ok) {
        alert('Training example submitted successfully!')
        router.push('/dashboard/training')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to submit'}`)
      }
    } catch (error) {
      console.error('Error submitting training example:', error)
      alert('Failed to submit training example')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Submit Training Example
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Help improve the bot by submitting conversation examples
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conversation" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="conversation">From Conversation</TabsTrigger>
          <TabsTrigger value="manual">Manual Example</TabsTrigger>
        </TabsList>

        {/* From Conversation Tab */}
        <TabsContent value="conversation">
          <Card>
            <CardHeader>
              <CardTitle>Submit from Existing Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFromConversation} className="space-y-6">
                {/* Select Lead */}
                <div className="space-y-2">
                  <Label htmlFor="lead-search">Select Lead</Label>
                  <Input
                    id="lead-search"
                    placeholder="Search by name or handle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg max-h-48 overflow-y-auto">
                    {filteredLeads.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                        No leads found
                      </p>
                    ) : (
                      filteredLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                            selectedLeadId === lead.id ? 'bg-blue-50 dark:bg-blue-950' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {lead.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {lead.handle}
                              </p>
                            </div>
                            {selectedLeadId === lead.id && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Conversation Status Indicator */}
                {selectedLeadId && (
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                    {conversationId ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        Conversation found - ready to submit
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                        No conversation found for this lead. Use &quot;Manual Example&quot; tab instead.
                      </div>
                    )}
                  </div>
                )}

                {/* Example Type */}
                <div className="space-y-2">
                  <Label>Example Type</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={exampleType === 'good' ? 'default' : 'outline'}
                      onClick={() => setExampleType('good')}
                    >
                      Good Example
                    </Button>
                    <Button
                      type="button"
                      variant={exampleType === 'bad' ? 'default' : 'outline'}
                      onClick={() => setExampleType('bad')}
                    >
                      Bad Example
                    </Button>
                    <Button
                      type="button"
                      variant={exampleType === 'correction' ? 'default' : 'outline'}
                      onClick={() => setExampleType('correction')}
                    >
                      Needs Correction
                    </Button>
                  </div>
                </div>

                {/* Expected Response (only for corrections) */}
                {exampleType === 'correction' && (
                  <div className="space-y-2">
                    <Label htmlFor="expected-response">Expected Response</Label>
                    <Textarea
                      id="expected-response"
                      placeholder="What should the bot have said instead?"
                      value={expectedResponse}
                      onChange={(e) => setExpectedResponse(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {/* Feedback */}
                <div className="space-y-2">
                  <Label htmlFor="feedback">
                    Feedback <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="feedback"
                    placeholder="Explain why this is a good/bad example or what needs to be corrected..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Be specific about what worked well or what needs improvement
                  </p>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                  <Link href="/dashboard/training">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading || !selectedLeadId}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Review
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Example Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Create Manual Conversation Example</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Provide a full example of how the bot should handle a conversation. Add as many turns as needed.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitManual} className="space-y-6">
                {/* Conversation Turns */}
                {conversationTurns.map((turn, index) => (
                  <div
                    key={index}
                    className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4"
                  >
                    {/* Turn Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Turn {index + 1}
                        </Badge>
                        {index === 0 && conversationTurns.length > 1 && (
                          <span className="text-xs text-gray-400">Conversation start</span>
                        )}
                      </div>
                      {conversationTurns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => removeTurn(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* User Message */}
                    <div className="space-y-2">
                      <Label htmlFor={`user-message-${index}`}>
                        User Message <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`user-message-${index}`}
                        placeholder="What did the user say?"
                        value={turn.user_message}
                        onChange={(e) => updateTurn(index, 'user_message', e.target.value)}
                        rows={2}
                        required
                      />
                    </div>

                    {/* Bot Response */}
                    <div className="space-y-2">
                      <Label htmlFor={`ai-response-${index}`}>
                        Bot Response <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`ai-response-${index}`}
                        placeholder="How should the bot respond?"
                        value={turn.ai_response}
                        onChange={(e) => updateTurn(index, 'ai_response', e.target.value)}
                        rows={2}
                        required
                      />
                    </div>

                    {/* Feedback */}
                    <div className="space-y-2">
                      <Label htmlFor={`feedback-${index}`}>
                        Why should the bot respond like that? <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`feedback-${index}`}
                        placeholder="Explain the reasoning behind this response..."
                        value={turn.feedback}
                        onChange={(e) => updateTurn(index, 'feedback', e.target.value)}
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                ))}

                {/* Add Turn Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addTurn}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Turn
                </Button>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                  <Link href="/dashboard/training">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Review
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SubmitTrainingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SubmitTrainingPageInner />
    </Suspense>
  )
}
