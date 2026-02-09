'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import {
  ArrowLeft,
  Wand2,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Clock,
} from 'lucide-react'

interface KBEntry {
  id: string
  category: string
  title: string
  content: string
  is_active: boolean
}

interface PromptVersion {
  id: string
  version: number
  is_active: boolean
  notes: string | null
  prompt_text: string | null
  created_at: string
}

interface GenerationJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  generated_prompt: string | null
  generated_notes: string | null
  model_used: string | null
  input_tokens: number | null
  output_tokens: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  sales_psychology: 'Sales Psychology',
  objection_handling: 'Objection Handling',
  conversation_flow: 'Conversation Flow',
  qualification_skills: 'Qualification Skills',
  closing_techniques: 'Closing Techniques',
  tone_and_voice: 'Tone & Voice',
  industry_knowledge: 'Industry Knowledge',
  general: 'General',
}

export default function GeneratePromptPage() {
  // Step 1: Training data
  const [trainingExport, setTrainingExport] = useState('')
  const [exampleCount, setExampleCount] = useState(0)

  // Step 2: Configuration
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([])
  const [selectedKbIds, setSelectedKbIds] = useState<Set<string>>(new Set())
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([])
  const [baseVersionId, setBaseVersionId] = useState<string>('')
  const [userInstructions, setUserInstructions] = useState('')
  const [modelPreference, setModelPreference] = useState<string>('sonnet-4-5')

  // Step 3: Generation
  const [generating, setGenerating] = useState(false)
  const [job, setJob] = useState<GenerationJob | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Base prompt preview
  const [showBasePrompt, setShowBasePrompt] = useState(false)

  // Elapsed time counter
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [loading, setLoading] = useState(true)

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check for training export in localStorage
        const stored = localStorage.getItem('training_export')
        if (stored) {
          const parsed = JSON.parse(stored)
          setTrainingExport(parsed.export_text || '')
          setExampleCount(parsed.example_count || 0)
          localStorage.removeItem('training_export')
        }

        // Fetch KB entries
        const kbRes = await fetch('/api/knowledge-base?is_active=true')
        if (kbRes.ok) {
          const kbData = await kbRes.json()
          const entries = kbData.entries || []
          setKbEntries(entries)
          // Default: all active entries selected
          setSelectedKbIds(new Set(entries.map((e: KBEntry) => e.id)))
        }

        // Fetch prompt versions
        const pvRes = await fetch('/api/prompt/versions')
        if (pvRes.ok) {
          const pvData = await pvRes.json()
          const versions = pvData.versions || []
          setPromptVersions(versions)
          // Default to active version
          const active = versions.find((v: PromptVersion) => v.is_active)
          if (active) setBaseVersionId(active.id)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Polling for job status
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/prompt/generate/${id}`)
      if (!res.ok) return

      const data: GenerationJob = await res.json()
      setJob(data)

      if (data.status === 'completed' || data.status === 'failed') {
        setGenerating(false)
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    } catch (error) {
      console.error('Error polling job:', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleGenerate = async () => {
    if (!trainingExport.trim()) {
      alert('Training data is required')
      return
    }

    setGenerating(true)
    setJob(null)
    setElapsedTime(0)
    timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000)

    try {
      const res = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_export: trainingExport,
          knowledge_base_ids: Array.from(selectedKbIds),
          base_prompt_version_id: baseVersionId || undefined,
          user_instructions: userInstructions || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(`Failed to start generation: ${error.error}`)
        setGenerating(false)
        return
      }

      const data = await res.json()
      // Start polling
      pollRef.current = setInterval(() => pollJobStatus(data.job_id), 3000)
      // Also poll immediately after a short delay
      setTimeout(() => pollJobStatus(data.job_id), 1000)
    } catch (error) {
      console.error('Error starting generation:', error)
      alert('Failed to start prompt generation')
      setGenerating(false)
    }
  }

  const toggleKbEntry = (id: string) => {
    setSelectedKbIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAllKb = () => {
    if (selectedKbIds.size === kbEntries.length) {
      setSelectedKbIds(new Set())
    } else {
      setSelectedKbIds(new Set(kbEntries.map(e => e.id)))
    }
  }

  const selectedBaseVersion = promptVersions.find(v => v.id === baseVersionId)

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Group KB entries by category
  const kbByCategory = kbEntries.reduce<Record<string, KBEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = []
    acc[entry.category].push(entry)
    return acc
  }, {})

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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/training">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <Wand2 className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Prompt Engineer Agent
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate an improved system prompt using AI analysis of training feedback
          </p>
        </div>
      </div>

      {/* Step 1: Training Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Step 1: Training Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exampleCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default">{exampleCount} examples</Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                imported from review page
              </span>
            </div>
          )}
          <Textarea
            placeholder="Paste your training export text here, or use 'Export & Generate Prompt' from the Review Queue page..."
            value={trainingExport}
            onChange={e => {
              setTrainingExport(e.target.value)
              // Try to count examples
              const matches = e.target.value.match(/--- EXAMPLE \d+ of \d+ ---/g)
              setExampleCount(matches ? matches.length : 0)
            }}
            rows={8}
            className="font-mono text-xs"
          />
          <p className="text-xs text-gray-500">
            {trainingExport.length > 0
              ? `${trainingExport.length.toLocaleString()} characters`
              : 'No training data loaded'}
          </p>
        </CardContent>
      </Card>

      {/* Step 2: Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Step 2: Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Knowledge Base Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Knowledge Base Entries</Label>
              <Button variant="ghost" size="sm" onClick={toggleAllKb}>
                {selectedKbIds.size === kbEntries.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {kbEntries.length === 0 ? (
              <p className="text-sm text-gray-500">
                No knowledge base entries found.{' '}
                <Link href="/dashboard/training/knowledge" className="text-blue-600 hover:underline">
                  Add some
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(kbByCategory).map(([category, entries]) => (
                  <div key={category}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {CATEGORY_LABELS[category] || category}
                    </p>
                    <div className="space-y-2 pl-2">
                      {entries.map(entry => (
                        <label
                          key={entry.id}
                          className="flex items-start gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedKbIds.has(entry.id)}
                            onCheckedChange={() => toggleKbEntry(entry.id)}
                            className="mt-0.5"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {entry.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Base Prompt Version */}
          <div className="space-y-2">
            <Label>Base Prompt Version</Label>
            <Select value={baseVersionId} onValueChange={setBaseVersionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select base version..." />
              </SelectTrigger>
              <SelectContent>
                {promptVersions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} {v.is_active ? '(Active)' : ''} — {new Date(v.created_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Base Prompt Preview */}
          {selectedBaseVersion?.prompt_text && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowBasePrompt(!showBasePrompt)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {showBasePrompt ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Show Base Prompt ({selectedBaseVersion.prompt_text.length.toLocaleString()} chars)
              </button>
              {showBasePrompt && (
                <Textarea
                  value={selectedBaseVersion.prompt_text}
                  readOnly
                  rows={20}
                  className="font-mono text-xs bg-gray-50 dark:bg-gray-900"
                />
              )}
            </div>
          )}

          {/* User Instructions */}
          <div className="space-y-2">
            <Label>Instructions (Optional)</Label>
            <Textarea
              placeholder="Add specific guidance for the Prompt Engineer Agent... e.g., 'Focus on improving objection handling', 'Don't change the tone section', etc."
              value={userInstructions}
              onChange={e => setUserInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select value={modelPreference} onValueChange={setModelPreference}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sonnet-4-5">
                  Claude Sonnet 4.5 — Fast (1-3 min)
                </SelectItem>
                <SelectItem value="opus-4-6" disabled>
                  Claude Opus 4.6 — Highest quality (coming soon)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Sonnet 4.5 is fast and produces high-quality prompt improvements.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Step 3: Generate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!job && !generating && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The Prompt Engineer Agent will analyze your training feedback and generate an improved
                system prompt. This typically takes 1-3 minutes.
              </p>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!trainingExport.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Wand2 className="h-5 w-5 mr-2" />
                Generate Improved Prompt
              </Button>
            </div>
          )}

          {/* Loading State */}
          {generating && (!job || job.status === 'pending' || job.status === 'processing') && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {job?.status === 'processing'
                    ? 'Generating with Claude Sonnet 4.5...'
                    : 'Starting generation...'}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatElapsed(elapsedTime)} elapsed</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Status: {job?.status || 'submitting'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  This may take 1-2 minutes. Please don&apos;t close this page.
                </p>
                {/* Timeout warnings */}
                {(!job || job.status === 'pending') && elapsedTime > 30 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    The edge function may have failed to start. If this persists, check the job status or try again.
                  </p>
                )}
                {job?.status === 'processing' && elapsedTime > 300 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    Generation is taking longer than expected. The AI is processing a large prompt — please wait.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {job?.status === 'completed' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Prompt generated successfully
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {job.model_used} | {job.input_tokens?.toLocaleString()} input tokens |{' '}
                    {job.output_tokens?.toLocaleString()} output tokens
                  </p>
                </div>
              </div>

              {/* Change Notes */}
              {job.generated_notes && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">Change Notes</Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {job.generated_notes}
                    </div>
                  </div>
                </div>
              )}

              {/* Generated Prompt Preview */}
              {job.generated_prompt && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">
                    Generated Prompt ({job.generated_prompt.length.toLocaleString()} chars)
                  </Label>
                  <Textarea
                    value={job.generated_prompt}
                    readOnly
                    rows={16}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Link href="/dashboard/training/prompt">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    View in Prompt Editor
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setJob(null)
                    setGenerating(false)
                  }}
                >
                  Generate Another
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {job?.status === 'failed' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200">
                    Generation failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {job.error_message || 'Unknown error occurred'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setJob(null)
                  setGenerating(false)
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
