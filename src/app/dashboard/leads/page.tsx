'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { exportLeadsToCSV } from '@/lib/csvExport'
import type { Lead, LeadStatus, LeadPhase } from '@/types/lead.types'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/lead.types'
import { useRealtimeLeads } from '@/hooks/useRealtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Pause,
  Play,
  Tag,
  UserPlus,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function LeadsPage() {
  // State
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [phaseFilter, setPhaseFilter] = useState<LeadPhase | 'all'>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<keyof Lead | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (phaseFilter !== 'all') params.append('phase', phaseFilter)
      if (assignedFilter !== 'all') params.append('assigned_to', assignedFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leads')

      const data = await res.json()
      setLeads(data.leads || [])
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, phaseFilter, assignedFilter, searchQuery])

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Subscribe to real-time updates
  useRealtimeLeads(fetchLeads)

  // Local sorting (filtering is done by API)
  const filteredLeads = useMemo(() => {
    const filtered = [...leads]

    // Sort (filtering is handled by API)
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (aValue === undefined || aValue === null) return 1
        if (bValue === undefined || bValue === null) return -1

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }

        return 0
      })
    }

    return filtered
  }, [leads, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, phaseFilter, assignedFilter])

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(paginatedLeads.map((lead) => lead.id)))
    } else {
      setSelectedLeads(new Set())
    }
  }

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads)
    if (checked) {
      newSelected.add(leadId)
    } else {
      newSelected.delete(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const isAllSelected =
    paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedLeads.has(lead.id))

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedLeads.size === 0) return

    try {
      const leadIds = Array.from(selectedLeads)
      const updates: Partial<Lead> = {}

      switch (action) {
        case 'pause':
          updates.bot_paused = true
          break
        case 'resume':
          updates.bot_paused = false
          break
        // TODO: Handle assign and tag actions with user input
        default:
          console.log(`Action "${action}" not implemented yet`)
          return
      }

      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds, updates }),
      })

      if (!res.ok) throw new Error('Failed to update leads')

      // Refresh leads after bulk update
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (phaseFilter !== 'all') params.append('phase', phaseFilter)
      if (assignedFilter !== 'all') params.append('assigned_to', assignedFilter)
      if (searchQuery) params.append('search', searchQuery)

      const refreshRes = await fetch(`/api/leads?${params}`)
      const refreshData = await refreshRes.json()
      setLeads(refreshData.leads || [])

      setSelectedLeads(new Set())
      alert(`Bulk action "${action}" applied to ${leadIds.length} lead(s)`)
    } catch (err) {
      console.error('Error applying bulk action:', err)
      alert('Failed to apply bulk action')
    }
  }

  // Export CSV
  const handleExport = () => {
    const leadsToExport = selectedLeads.size > 0
      ? filteredLeads.filter((lead) => selectedLeads.has(lead.id))
      : filteredLeads

    const timestamp = new Date().toISOString().split('T')[0]
    exportLeadsToCSV(leadsToExport, `leads-${timestamp}.csv`)
  }

  // Sort handler
  const handleSort = (column: keyof Lead) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Get unique values for filters
  const uniqueAssignedUsers = useMemo(() => {
    const users = new Set<string>()
    leads.forEach((lead) => {
      if (lead.assigned_to && lead.assigned_to_name) {
        users.add(`${lead.assigned_to}:${lead.assigned_to_name}`)
      }
    })
    return Array.from(users).map((u) => {
      const [id, name] = u.split(':')
      return { id, name }
    })
  }, [leads])

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPhaseFilter('all')
    setAssignedFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || phaseFilter !== 'all' || assignedFilter !== 'all'

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Leads</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all your leads in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedLeads.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedLeads.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction('assign')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign to User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('tag')}>
                  <Tag className="mr-2 h-4 w-4" />
                  Add Tags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('pause')}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Bot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('resume')}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume Bot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, handle, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="exploring">Exploring</SelectItem>
                  <SelectItem value="likely_qualified">Likely Qualified</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="not_fit">Not Fit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phase Filter */}
            <div>
              <Select value={phaseFilter} onValueChange={(value) => setPhaseFilter(value as LeadPhase | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="All Phases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  <SelectItem value="P1">Phase 1</SelectItem>
                  <SelectItem value="P2">Phase 2</SelectItem>
                  <SelectItem value="P3">Phase 3</SelectItem>
                  <SelectItem value="P4">Phase 4</SelectItem>
                  <SelectItem value="P5">Phase 5</SelectItem>
                  <SelectItem value="P6">Phase 6</SelectItem>
                  <SelectItem value="P7">Phase 7</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Assigned Filter */}
            <div>
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {uniqueAssignedUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="lg:col-span-3 flex items-center text-sm text-gray-600 dark:text-gray-400">
              {loading ? (
                'Loading leads...'
              ) : (
                <>
                  Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Lead
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('current_phase')}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Phase
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('message_count')}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Messages
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Flags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('last_message_at')}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Last Activity
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <Search className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No leads found</p>
                      <p className="text-sm">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {lead.name}
                        </Link>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {lead.handle}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${STATUS_COLORS[lead.status || 'new'].bg} ${STATUS_COLORS[lead.status || 'new'].text} border ${STATUS_COLORS[lead.status || 'new'].border}`}
                      >
                        {STATUS_LABELS[lead.status || 'new'] || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{lead.current_phase}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {lead.message_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {lead.assigned_to_name || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.length > 0 ? (
                          lead.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                        {lead.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{lead.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {lead.needs_human && (
                          <AlertCircle className="h-4 w-4 text-red-500" aria-label="Needs Human" />
                        )}
                        {lead.bot_paused && (
                          <Pause className="h-4 w-4 text-yellow-500" aria-label="Bot Paused" />
                        )}
                        {lead.has_errors && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" aria-label="Has Errors" />
                        )}
                        {!lead.needs_human && !lead.bot_paused && !lead.has_errors && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {(() => {
                        const now = Date.now()
                        const lastMessage = new Date(lead.last_message_at).getTime()
                        const diffMinutes = Math.floor((now - lastMessage) / (1000 * 60))

                        if (diffMinutes < 60) {
                          return `${diffMinutes}m ago`
                        }
                        const diffHours = Math.floor(diffMinutes / 60)
                        if (diffHours < 24) {
                          return `${diffHours}h ago`
                        }
                        const diffDays = Math.floor(diffHours / 24)
                        return `${diffDays}d ago`
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/leads/${lead.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Assign to User</DropdownMenuItem>
                          <DropdownMenuItem>Add Tags</DropdownMenuItem>
                          <DropdownMenuItem>
                            {lead.bot_paused ? 'Resume Bot' : 'Pause Bot'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
