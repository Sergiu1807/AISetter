import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpIcon, ArrowDownIcon, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon: LucideIcon
  description?: string
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  loading = false,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardTitle>
          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {change && (
          <div className="flex items-center mt-1">
            {change.trend === 'up' && (
              <ArrowUpIcon className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
            )}
            {change.trend === 'down' && (
              <ArrowDownIcon className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
            )}
            <p
              className={cn(
                'text-xs font-medium',
                change.trend === 'up' && 'text-green-600 dark:text-green-400',
                change.trend === 'down' && 'text-red-600 dark:text-red-400',
                change.trend === 'neutral' && 'text-gray-600 dark:text-gray-400'
              )}
            >
              {change.value}
            </p>
            {description && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {description}
              </span>
            )}
          </div>
        )}
        {!change && description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
