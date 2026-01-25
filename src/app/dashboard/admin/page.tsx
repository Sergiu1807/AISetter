'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Shield,
  Users,
  Settings,
  Bot,
  Key,
  Database,
  Bell,
  Plus,
  AlertCircle,
} from 'lucide-react'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')

  const systemSettings = {
    botAutoResponse: true,
    humanHandoffEnabled: true,
    workingHours: '9:00 AM - 6:00 PM',
    timezone: 'Europe/Bucharest',
    maxConcurrentConversations: 50,
    responseDelay: 2,
  }

  // Check environment variables for integration status
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

      {/* Warning Banner */}
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
              Admin Panel - Configuration Only
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              This admin panel is for viewing system status. To modify settings, update your environment variables and system prompt in your codebase.
            </p>
          </div>
        </CardContent>
      </Card>

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
                <Button size="sm" onClick={() => alert('User management coming soon! For now, manage users directly in Supabase Authentication.')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  User management interface coming soon
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  For now, manage users in your Supabase dashboard under Authentication
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Admin
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>✓ Full system access</li>
                    <li>✓ User management</li>
                    <li>✓ All settings</li>
                    <li>✓ All integrations</li>
                  </ul>
                </div>
                <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Manager
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>✓ View analytics</li>
                    <li>✓ Manage leads</li>
                    <li>✓ Take over conversations</li>
                    <li>✗ System settings</li>
                  </ul>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Operator
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>✓ View assigned leads</li>
                    <li>✓ Take over conversations</li>
                    <li>✗ Analytics</li>
                    <li>✗ Settings</li>
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
    </div>
  )
}
