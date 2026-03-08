'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { User, Bell, Shield, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { profile, role } = useAuth()
  const [saving, setSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Profile settings
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [email, setEmail] = useState(profile?.email || '')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Notification preferences
  const [browserNotifications, setBrowserNotifications] = useState(
    profile?.preferences?.notifications?.browser ?? true
  )
  const [emailNotifications, setEmailNotifications] = useState(
    profile?.preferences?.notifications?.email ?? false
  )
  const [soundAlerts, setSoundAlerts] = useState(
    profile?.preferences?.notifications?.sound ?? true
  )

  const handleSaveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email: email,
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', profile.id)
      if (error) throw error
      setProfileSuccess('Profil actualizat cu succes!')
    } catch (error) {
      console.error('Error saving profile:', error)
      setProfileError('Eroare la salvare. Încearcă din nou.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!newPassword || !confirmPassword) {
      setPasswordError('Completează toate câmpurile.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Parola nouă trebuie să aibă minim 6 caractere.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Parolele nu coincid.')
      return
    }
    setPasswordSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess('Parola a fost actualizată!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error updating password:', error)
      setPasswordError(error instanceof Error ? error.message : 'Eroare la actualizarea parolei.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!profile?.id) {
      alert('Error: User profile not loaded')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          preferences: {
            ...(profile?.preferences || {}),
            notifications: {
              browser: browserNotifications,
              email: emailNotifications,
              sound: soundAlerts
            }
          },
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', profile.id)

      if (error) throw error
      alert('Notification preferences saved!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          {role === 'admin' && (
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Used for login and notifications
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-medium capitalize">
                    {role}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Contact admin to change your role
                  </p>
                </div>
              </div>

              <Separator />

              {profileError && (
                <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
              )}
              {profileSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">{profileSuccess}</p>
              )}

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>
              )}

              <Button onClick={handleUpdatePassword} disabled={passwordSaving}>
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="browser-notifications">Browser Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive notifications in your browser
                  </p>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={browserNotifications}
                  onCheckedChange={setBrowserNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive email updates for important events
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-alerts">Sound Alerts</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Play sound when new notifications arrive
                  </p>
                </div>
                <Switch
                  id="sound-alerts"
                  checked={soundAlerts}
                  onCheckedChange={setSoundAlerts}
                />
              </div>

              <Separator />

              <Button onClick={handleSaveNotifications} disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the dashboard looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The dashboard uses your system color scheme (light or dark). Theme customization is managed via your OS/browser settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab (Admin only) */}
        {role === 'admin' && (
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage security and access control settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    2FA is managed via Supabase Auth settings. Contact your system administrator to enable it.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Active Sessions</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Session management is handled automatically. Signing out removes all active sessions for this account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
