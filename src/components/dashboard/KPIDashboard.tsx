'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface MonthData {
  month: number
  name: string
  outbound_replies: number
  inbound_dms: number
  inbound_comments: number
  followups: number
  calls_proposed: number
  links_pending: number
  calls_booked: number
}

const COLUMNS = [
  { key: 'outbound_replies', label: 'Outbound Replies' },
  { key: 'inbound_dms', label: 'Inbound DMs' },
  { key: 'inbound_comments', label: 'Inbound Comments' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'calls_proposed', label: 'Calls Proposed' },
  { key: 'links_pending', label: 'Links Pending' },
  { key: 'calls_booked', label: 'Calls Booked' },
] as const

type ColumnKey = typeof COLUMNS[number]['key']

function sumMonths(months: MonthData[], indices: number[]): Record<ColumnKey, number> {
  const result: Record<string, number> = {}
  for (const col of COLUMNS) {
    result[col.key] = indices.reduce((sum, i) => sum + (months[i]?.[col.key] || 0), 0)
  }
  return result as Record<ColumnKey, number>
}

export function KPIDashboard() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear().toString())

  const fetchKPI = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/kpi?year=${year}`)
      if (res.ok) {
        const data = await res.json()
        setMonths(data.months || [])
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchKPI()
  }, [fetchKPI])

  // Quarterly aggregation
  const quarters = useMemo(() => [
    { label: '1', data: sumMonths(months, [0, 1, 2]) },
    { label: '2', data: sumMonths(months, [3, 4, 5]) },
    { label: '3', data: sumMonths(months, [6, 7, 8]) },
    { label: '4', data: sumMonths(months, [9, 10, 11]) },
  ], [months])

  // Yearly aggregation
  const yearTotal = useMemo(() =>
    sumMonths(months, Array.from({ length: 12 }, (_, i) => i)),
    [months]
  )

  // Max calls booked for chart scaling
  const maxMonthlyBooked = Math.max(...months.map(m => m.calls_booked), 1)
  const maxQuarterlyBooked = Math.max(...quarters.map(q => q.data.calls_booked), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Booked - Monthly */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calls Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {months.map((m) => {
                const height = maxMonthlyBooked > 0 ? (m.calls_booked / maxMonthlyBooked) * 100 : 0
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{m.calls_booked}</span>
                    <div className="w-full flex items-end" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-amber-700 dark:bg-amber-600 rounded-t"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 -rotate-45 origin-top-left translate-y-2 whitespace-nowrap">
                      {m.name.substring(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Calls Booked - Quarterly */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calls Booked vs. Quarter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-40 px-8">
              {quarters.map((q) => {
                const height = maxQuarterlyBooked > 0 ? (q.data.calls_booked / maxQuarterlyBooked) * 100 : 0
                return (
                  <div key={q.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">{q.data.calls_booked}</span>
                    <div className="w-full flex items-end" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-amber-700 dark:bg-amber-600 rounded-t"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Q{q.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            <span className="text-amber-800 dark:text-amber-400">Month</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-100 dark:bg-amber-900/40">
                  <th className="px-3 py-2 text-left font-semibold text-amber-900 dark:text-amber-200 whitespace-nowrap">Month</th>
                  {COLUMNS.map(col => (
                    <th key={col.key} className="px-3 py-2 text-center font-semibold text-amber-900 dark:text-amber-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {months.map((m) => (
                  <tr key={m.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{m.name}</td>
                    {COLUMNS.map(col => (
                      <td key={col.key} className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">
                        {m[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quarterly Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            <span className="text-amber-700 dark:text-amber-500">Quarter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-200/60 dark:bg-amber-800/40">
                  <th className="px-3 py-2 text-left font-semibold text-amber-900 dark:text-amber-200 whitespace-nowrap">Quarter</th>
                  {COLUMNS.map(col => (
                    <th key={col.key} className="px-3 py-2 text-center font-semibold text-amber-900 dark:text-amber-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {quarters.map((q) => (
                  <tr key={q.label} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100">{q.label}</td>
                    {COLUMNS.map(col => (
                      <td key={col.key} className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">
                        {q.data[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            <span className="text-green-700 dark:text-green-400">Year</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-100 dark:bg-green-900/40">
                  <th className="px-3 py-2 text-left font-semibold text-green-900 dark:text-green-200 whitespace-nowrap">Year</th>
                  {COLUMNS.map(col => (
                    <th key={col.key} className="px-3 py-2 text-center font-semibold text-green-900 dark:text-green-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-1.5 font-bold text-gray-900 dark:text-gray-100">{year}</td>
                  {COLUMNS.map(col => (
                    <td key={col.key} className="px-3 py-1.5 text-center font-bold text-gray-900 dark:text-gray-100">
                      {yearTotal[col.key]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
