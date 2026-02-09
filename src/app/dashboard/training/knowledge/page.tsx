'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'

const CATEGORIES = [
  { value: 'sales_psychology', label: 'Sales Psychology' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'conversation_flow', label: 'Conversation Flow' },
  { value: 'qualification_skills', label: 'Qualification Skills' },
  { value: 'closing_techniques', label: 'Closing Techniques' },
  { value: 'tone_and_voice', label: 'Tone & Voice' },
  { value: 'industry_knowledge', label: 'Industry Knowledge' },
  { value: 'general', label: 'General' },
]

interface KBEntry {
  id: string
  category: string
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KBEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KBEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KBEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState('general')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory !== 'all') params.set('category', filterCategory)
      const res = await fetch(`/api/knowledge-base?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error)
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const openCreateDialog = () => {
    setEditingEntry(null)
    setFormCategory('general')
    setFormTitle('')
    setFormContent('')
    setDialogOpen(true)
  }

  const openEditDialog = (entry: KBEntry) => {
    setEditingEntry(entry)
    setFormCategory(entry.category)
    setFormTitle(entry.title)
    setFormContent(entry.content)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Title and content are required')
      return
    }

    setSaving(true)
    try {
      if (editingEntry) {
        // Update existing
        const res = await fetch(`/api/knowledge-base/${editingEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formCategory,
            title: formTitle,
            content: formContent
          })
        })

        if (!res.ok) {
          const error = await res.json()
          alert(`Failed to update: ${error.error}`)
          return
        }
      } else {
        // Create new
        const res = await fetch('/api/knowledge-base', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formCategory,
            title: formTitle,
            content: formContent
          })
        })

        if (!res.ok) {
          const error = await res.json()
          alert(`Failed to create: ${error.error}`)
          return
        }
      }

      setDialogOpen(false)
      fetchEntries()
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const res = await fetch(`/api/knowledge-base/${deleteTarget.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        alert(`Failed to delete: ${error.error}`)
        return
      }

      setDeleteTarget(null)
      fetchEntries()
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry')
    }
  }

  const handleToggleActive = async (entry: KBEntry) => {
    try {
      const res = await fetch(`/api/knowledge-base/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !entry.is_active })
      })

      if (res.ok) {
        fetchEntries()
      }
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      sales_psychology: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      objection_handling: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      conversation_flow: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      qualification_skills: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      closing_techniques: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      tone_and_voice: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      industry_knowledge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    }
    return colors[category] || colors.general
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
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Knowledge Base
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage skill knowledge that feeds into the Prompt Engineer Agent
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterCategory('all')}
        >
          All ({entries.length})
        </Button>
        {CATEGORIES.map(cat => {
          const count = entries.filter(e => e.category === cat.value).length
          if (count === 0 && filterCategory !== cat.value) return null
          return (
            <Button
              key={cat.value}
              variant={filterCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(cat.value)}
            >
              {cat.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No knowledge base entries yet
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          entries.map(entry => (
            <Card
              key={entry.id}
              className={`transition-shadow hover:shadow-md ${
                !entry.is_active ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getCategoryColor(entry.category)}>
                        {getCategoryLabel(entry.category)}
                      </Badge>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {entry.title}
                      </h3>
                      {!entry.is_active && (
                        <Badge variant="outline" className="text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                      {entry.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${entry.id}`} className="text-xs text-gray-500">
                        Active
                      </Label>
                      <Switch
                        id={`active-${entry.id}`}
                        checked={entry.is_active}
                        onCheckedChange={() => handleToggleActive(entry)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Entry' : 'Add Knowledge Base Entry'}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? 'Update this knowledge base entry'
                : 'Add a new skill or knowledge entry for the Prompt Engineer Agent'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Entry title..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write the knowledge content here... This will be used by the Prompt Engineer Agent to improve the system prompt."
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingEntry ? (
                  'Update Entry'
                ) : (
                  'Create Entry'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              This will deactivate the knowledge base entry &quot;{deleteTarget?.title}&quot;.
              It can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
