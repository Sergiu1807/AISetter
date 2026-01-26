'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Shield,
  Users,
  Settings,
  Bot,
  Key,
  Database,
  Bell,
  Plus,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  KeyRound,
} from 'lucide-react'

interface ManagedUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'operator' | 'viewer'
  is_active: boolean
  last_login_at: string | null
  created_at: string
  created_by: string | null
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  operator: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
}

export default function AdminPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('users')

  // User management state
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | null>(null)

  // Form state
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<string>('operator')
  const [formPassword, setFormPassword] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch users')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setUsersError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Create user
  const handleCreate = async () => {
    setFormSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          full_name: formName,
          role: formRole,
          password: formPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }
      setCreateOpen(false)
      resetForm()
      await fetchUsers()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setFormSaving(false)
    }
  }

  // Update user
  const handleUpdate = async () => {
    if (!editUser) return
    setFormSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formName,
          role: formRole,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update user')
      }
      setEditUser(null)
      resetForm()
      await fetchUsers()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setFormSaving(false)
    }
  }

  // Delete user
  const handleDelete = async () => {
    if (!deleteUser) return
    setFormSaving(true)
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      setDeleteUser(null)
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setFormSaving(false)
    }
  }

  // Toggle active
  const handleToggleActive = async (u: ManagedUser) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !u.is_active }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update user')
      }
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  // Reset password
  const handleResetPassword = async () => {
    if (!resetPasswordUser) return
    setFormSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset password')
      }
      setResetPasswordUser(null)
      setFormPassword('')
      setFormError(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setFormSaving(false)
    }
  }

  const resetForm = () => {
    setFormEmail('')
    setFormName('')
    setFormRole('operator')
    setFormPassword('')
    setFormError(null)
  }

  const openCreate = () => {
    resetForm()
    setCreateOpen(true)
  }

  const openEdit = (u: ManagedUser) => {
    setFormName(u.full_name)
    setFormRole(u.role)
    setFormError(null)
    setEditUser(u)
  }

  const openResetPassword = (u: ManagedUser) => {
    setFormPassword('')
    setFormError(null)
    setResetPasswordUser(u)
  }

  const systemSettings = {
    botAutoResponse: true,
    humanHandoffEnabled: true,
    workingHours: '9:00 AM - 6:00 PM',
    timezone: 'Europe/Bucharest',
    maxConcurrentConversations: 50,
    responseDelay: 2,
  }

  const integrations = [
    {
      name: 'ManyChat',
      status: process.env.NEXT_PUBLIC_MANYCHAT_API_KEY ? 'connected' : 'disconnected',
      lastSync: '5 minutes ago',
      apiKey: process.env.NEXT_PUBLIC_MANYCHAT_API_KEY ? 'mc_live_••••••••' : null,
      envVar: 'MANYCHAT_API_KEY',
    },
    {
      name: 'Anthropic API',
      status: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ? 'connected' : 'disconnected',
      lastSync: 'just now',
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ? 'sk-ant-••••••••' : null,
      envVar: 'ANTHROPIC_API_KEY',
    },
    {
      name: 'Supabase',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'disconnected',
      lastSync: 'just now',
      apiKey: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://••••••••' : null,
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
    },
    {
      name: 'Calendly',
      status: 'disconnected',
      lastSync: 'never',
      apiKey: null,
      envVar: 'CALENDAR_LINK',
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage users, settings, and integrations
            </p>
          </div>
        </div>
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
          Admin Access
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-2" />
            Bot Config
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Key className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{usersError}</span>
                </div>
              )}

              {usersLoading ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {users.map((u) => {
                        const isSelf = u.id === profile?.id
                        return (
                          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {u.full_name}
                                  {isSelf && (
                                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                                  )}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {u.email}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`border ${ROLE_COLORS[u.role]}`}>
                                {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {u.is_active ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800">
                                  Inactive
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {u.last_login_at
                                ? new Date(u.last_login_at).toLocaleDateString()
                                : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(u)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openResetPassword(u)}>
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  {!isSelf && (
                                    <DropdownMenuItem onClick={() => handleToggleActive(u)}>
                                      {u.is_active ? (
                                        <>
                                          <UserX className="mr-2 h-4 w-4" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="mr-2 h-4 w-4" />
                                          Activate
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  )}
                                  {!isSelf && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => setDeleteUser(u)}
                                        className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete User
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Admin
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>&#10003; Full system access</li>
                    <li>&#10003; User management</li>
                    <li>&#10003; All settings</li>
                    <li>&#10003; All integrations</li>
                  </ul>
                </div>
                <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Manager
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>&#10003; View analytics</li>
                    <li>&#10003; Manage leads</li>
                    <li>&#10003; Take over conversations</li>
                    <li>&#10007; System settings</li>
                  </ul>
                </div>
                <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Operator
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>&#10003; View assigned leads</li>
                    <li>&#10003; Take over conversations</li>
                    <li>&#10007; Analytics</li>
                    <li>&#10007; Settings</li>
                  </ul>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Viewer
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>&#10003; View dashboard</li>
                    <li>&#10003; View leads</li>
                    <li>&#10003; View analytics</li>
                    <li>&#10007; Edit anything</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Bot Auto-Response
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically respond to new messages
                    </p>
                  </div>
                  <Switch defaultChecked={systemSettings.botAutoResponse} disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Human Handoff
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Allow automatic handoff to human agents
                    </p>
                  </div>
                  <Switch defaultChecked={systemSettings.humanHandoffEnabled} disabled />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Working Hours
                  </label>
                  <Input
                    defaultValue={systemSettings.workingHours}
                    placeholder="9:00 AM - 6:00 PM"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Timezone
                  </label>
                  <Select defaultValue={systemSettings.timezone} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Bucharest">
                        Europe/Bucharest
                      </SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="America/New_York">
                        America/New York
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        America/Los Angeles
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Max Concurrent Conversations
                  </label>
                  <Input
                    type="number"
                    defaultValue={systemSettings.maxConcurrentConversations}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Response Delay (seconds)
                  </label>
                  <Input
                    type="number"
                    defaultValue={systemSettings.responseDelay}
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Delay before bot sends response (makes it feel more human)
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  To modify these settings, update the configuration in your codebase (<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">src/lib/config.ts</code>)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Bell className="h-5 w-5 inline mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Slack Notifications</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Send alerts to Slack channel
                  </p>
                </div>
                <Switch disabled />
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notification settings coming in a future update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Config Tab */}
        <TabsContent value="bot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  System Prompt Location
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <code className="text-sm text-gray-900 dark:text-gray-100">
                    src/services/prompt.service.ts
                  </code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    The system prompt is managed in your codebase. Edit the <code>buildPrompt()</code> function to modify bot behavior.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Model Configuration
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <code className="text-sm text-gray-900 dark:text-gray-100">
                    src/lib/anthropic.ts
                  </code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Current model: <strong>claude-sonnet-4-20250514</strong>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Temperature: <strong>0.7</strong>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Max tokens: <strong>4096</strong>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Conversation Phases
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map(phase => (
                    <div key={phase} className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-center">
                      <Badge variant="outline">{phase}</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Phases are defined in your system prompt and guide the conversation flow
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bot configuration is managed in code for better version control and deployment practices.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-gray-500" />
                    <div>
                      <CardTitle>{integration.name}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last sync: {integration.lastSync}
                      </p>
                    </div>
                  </div>
                  {integration.status === 'connected' ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Disconnected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Environment Variable
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                      <code className="text-sm text-gray-900 dark:text-gray-100">
                        {integration.envVar}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Status
                    </label>
                    <Input
                      type="text"
                      value={integration.apiKey || 'Not configured'}
                      disabled
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Configure this integration by setting the <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{integration.envVar}</code> environment variable in your <code>.env.local</code> file
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardContent className="flex items-start gap-3 p-4">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  API Key Management
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  For security, API keys are managed through environment variables. Never commit API keys to your codebase. Update your <code>.env.local</code> file to configure integrations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will be able to log in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={formSaving || !formEmail || !formName || !formPassword}
            >
              {formSaving ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {editUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={formSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={formSaving || !formName}
            >
              {formSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)} disabled={formSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={formSaving || formPassword.length < 6}
            >
              {formSaving ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.full_name}</strong> ({deleteUser?.email})? This will permanently remove their account and authentication credentials. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={formSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formSaving}>
              {formSaving ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
