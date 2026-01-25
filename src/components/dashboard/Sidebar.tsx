'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Radio,
  BarChart3,
  GraduationCap,
  Settings,
  Shield,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Feed', href: '/dashboard/live', icon: Radio },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Training', href: '/dashboard/training', icon: GraduationCap },
  { name: 'Alerts', href: '/dashboard/alerts', icon: AlertCircle },
  { name: 'Logs', href: '/dashboard/logs', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Admin', href: '/dashboard/admin', icon: Shield, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg">🤖</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Setter
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // Hide admin-only items for non-admins
          if (item.adminOnly && role !== 'admin') {
            return null
          }

          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
              {item.adminOnly && (
                <span className="ml-auto text-xs text-gray-500">Admin</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>v1.0.0</p>
          <p className="mt-1">© 2026 Vlad Gogoanta</p>
        </div>
      </div>
    </div>
  )
}
