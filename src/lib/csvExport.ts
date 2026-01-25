import type { Lead } from '@/types/lead.types'
import { STATUS_LABELS } from '@/types/lead.types'

export function exportLeadsToCSV(leads: Lead[], filename: string = 'leads-export.csv') {
  if (leads.length === 0) {
    return
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Name',
    'Handle',
    'ManyChat ID',
    'Status',
    'Phase',
    'Messages',
    'Assigned To',
    'Tags',
    'Needs Human',
    'Bot Paused',
    'Has Errors',
    'Last Message',
    'Created At',
  ]

  // Convert leads to CSV rows
  const rows = leads.map((lead) => [
    lead.id,
    lead.name,
    lead.handle,
    lead.manychat_user_id,
    STATUS_LABELS[lead.status],
    lead.current_phase,
    lead.message_count.toString(),
    lead.assigned_to_name || 'Unassigned',
    lead.tags.join('; '),
    lead.needs_human ? 'Yes' : 'No',
    lead.bot_paused ? 'Yes' : 'No',
    lead.has_errors ? 'Yes' : 'No',
    new Date(lead.last_message_at).toLocaleString(),
    new Date(lead.created_at).toLocaleString(),
  ])

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
