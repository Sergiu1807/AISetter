'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  FileText,
  Save,
  Rocket,
  History,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface PromptVersion {
  id: string
  version: number
  prompt_text: string
  system_instructions: string | null
  is_active: boolean
  total_conversations: number
  success_rate: number
  deployed_at: string | null
  notes: string | null
  created_by_user?: {
    full_name: string
  }
}

export default function PromptEditorPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null)
  const [promptText, setPromptText] = useState('')
  const [systemInstructions, setSystemInstructions] = useState('')
  const [versionNotes, setVersionNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [])

  useEffect(() => {
    if (selectedVersion) {
      setPromptText(selectedVersion.prompt_text)
      setSystemInstructions(selectedVersion.system_instructions || '')
      setHasChanges(false)
    }
  }, [selectedVersion])

  useEffect(() => {
    if (selectedVersion) {
      const changed =
        promptText !== selectedVersion.prompt_text ||
        systemInstructions !== (selectedVersion.system_instructions || '')
      setHasChanges(changed)
    }
  }, [promptText, systemInstructions, selectedVersion])

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/prompt/versions')
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions || [])

        // Select active version by default
        const activeVersion = data.versions?.find((v: PromptVersion) => v.is_active)
        if (activeVersion) {
          setSelectedVersion(activeVersion)
        } else if (data.versions && data.versions.length > 0) {
          setSelectedVersion(data.versions[0])
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!promptText.trim()) {
      alert('Prompt text cannot be empty')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/prompt/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: promptText,
          system_instructions: systemInstructions || null,
          notes: versionNotes || null
        })
      })

      if (res.ok) {
        alert('Prompt version saved as draft!')
        setVersionNotes('')
        setHasChanges(false)
        fetchVersions()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to save'}`)
      }
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleDeploy = async () => {
    if (!promptText.trim()) {
      alert('Prompt text cannot be empty')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/prompt/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: promptText,
          system_instructions: systemInstructions || null,
          notes: versionNotes || 'Deployed from prompt editor'
        })
      })

      if (res.ok) {
        alert('New prompt version deployed successfully! The bot is now using this prompt.')
        setVersionNotes('')
        setHasChanges(false)
        setShowDeployDialog(false)
        fetchVersions()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to deploy'}`)
      }
    } catch (error) {
      console.error('Error deploying prompt:', error)
      alert('Failed to deploy prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleActivateExisting = async (versionId: string) => {
    if (!confirm('Are you sure you want to activate this version? This will make it the active prompt for the bot.')) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/prompt/versions/${versionId}/activate`, {
        method: 'PATCH'
      })

      if (res.ok) {
        alert('Prompt version activated successfully!')
        fetchVersions()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to activate'}`)
      }
    } catch (error) {
      console.error('Error activating prompt:', error)
      alert('Failed to activate prompt')
    } finally {
      setSaving(false)
    }
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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/training">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Prompt Editor
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage system prompts and track performance across versions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowDeployDialog(true)}
            disabled={saving || !promptText.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Deploy New Version
          </Button>
        </div>
      </div>

      {/* Warning for Admin Only */}
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-200">
              Admin Access Required
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
              Only administrators can save and deploy prompt versions. Changes made here will affect how the bot responds to all leads.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Version Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Version</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedVersion?.id || ''}
                  onValueChange={(value) => {
                    const version = versions.find(v => v.id === value)
                    if (version) {
                      if (hasChanges && !confirm('You have unsaved changes. Switch version anyway?')) {
                        return
                      }
                      setSelectedVersion(version)
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        Version {version.version} {version.is_active && '(Active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedVersion && !selectedVersion.is_active && (
                  <Button
                    variant="outline"
                    onClick={() => handleActivateExisting(selectedVersion.id)}
                    disabled={saving}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate This Version
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prompt Editor */}
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-text">Main Prompt</Label>
                <Textarea
                  id="prompt-text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Enter the system prompt for the bot..."
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {promptText.length} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system-instructions">Dynamic Context Template (Optional)</Label>
                <Textarea
                  id="system-instructions"
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Variables: {{LEAD_NAME}}, {{CONVERSATION_PHASE}}, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version-notes">Version Notes</Label>
                <Textarea
                  id="version-notes"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe what changed in this version..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Version Info */}
          {selectedVersion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    v{selectedVersion.version}
                    {selectedVersion.is_active && (
                      <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </Badge>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedVersion.total_conversations}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedVersion.success_rate.toFixed(1)}%
                  </p>
                </div>

                {selectedVersion.deployed_at && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Deployed</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(selectedVersion.deployed_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedVersion.notes && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedVersion.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    onClick={() => {
                      if (hasChanges && !confirm('You have unsaved changes. Switch version anyway?')) {
                        return
                      }
                      setSelectedVersion(version)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        Version {version.version}
                      </span>
                      {version.is_active && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {version.total_conversations} conversations • {version.success_rate.toFixed(1)}% success
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deploy Confirmation Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy New Prompt Version?</DialogTitle>
            <DialogDescription>
              This will create and activate a new prompt version. The bot will immediately start using this prompt for all conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <p className="text-sm text-yellow-900 dark:text-yellow-200">
                <strong>Warning:</strong> This will affect all active conversations. Make sure you&apos;ve tested the prompt thoroughly.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deploy-notes">Deployment Notes (Optional)</Label>
              <Textarea
                id="deploy-notes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                rows={3}
                placeholder="Document what changed and why..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeployDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
