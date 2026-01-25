'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, UserRole } from '@/types/database.types'
import { hasPermission as checkPermission, type Permission } from '@/lib/permissions'

interface AuthContextType {
  user: SupabaseUser | null
  profile: User | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string, retryCount = 0): Promise<User | null> => {
    const startTime = Date.now()
    try {
      // Add a timeout to the fetch operation (2 seconds - faster for better UX)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Profile fetch timeout after 2 seconds'))
        }, 2000)
      })

      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single<User>()

      let result
      try {
        result = await Promise.race([fetchPromise, timeoutPromise])
        const duration = Date.now() - startTime
        if (duration > 500) {
          // Only log slow queries
          console.log(`[AuthContext] Profile query took ${duration}ms`)
        }
      } catch (timeoutError) {
        if (timeoutError instanceof Error && timeoutError.message.includes('timeout')) {
          // Don't retry on timeout - it usually means user doesn't exist or RLS issue
          // The onAuthStateChange will retry when session is fully ready
          return null
        }
        throw timeoutError
      }

      const { data, error } = result

      if (error) {
        console.error('[AuthContext] Profile fetch error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId
        })
        
        // PGRST116 = "The result contains 0 rows" - user doesn't exist in users table
        if (error.code === 'PGRST116') {
          console.warn('[AuthContext] User profile not found in database. This user may need to be created in the users table.')
          console.warn('[AuthContext] To fix: Run this SQL in Supabase SQL Editor:')
          console.warn(`[AuthContext] INSERT INTO users (id, email, full_name, role, is_active) VALUES ('${userId}', 'your-email@example.com', 'Your Name', 'admin', true)`)
          // Don't retry for "not found" errors - it won't help
          return null
        }
        
        // Retry up to 1 time if it's a network or temporary error
        if (retryCount < 1 && (error.message.includes('fetch') || error.code === 'PGRST301')) {
          console.log(`[AuthContext] Retrying profile fetch (attempt ${retryCount + 1})...`)
          await new Promise(resolve => setTimeout(resolve, 500))
          return fetchProfile(userId, retryCount + 1)
        }
        
        return null
      }

      if (!data) {
        console.error('[AuthContext] No profile data returned for user:', userId)
        return null
      }

      setProfile(data)
      return data
    } catch (error) {
      console.error('[AuthContext] Exception in fetchProfile:', error)
      if (error instanceof Error) {
        console.error('[AuthContext] Error message:', error.message)
      }
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line prefer-const
    let timeoutId: NodeJS.Timeout
    let loadingComplete = false
    let profileFetchInProgress = false

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthContext] Error getting session:', sessionError)
        }

        if (!mounted) return

        setUser(session?.user ?? null)

        // Don't fetch profile here - let onAuthStateChange handle it
        // This prevents duplicate fetches and race conditions
        if (mounted) {
          loadingComplete = true
          clearTimeout(timeoutId)
          setLoading(false)
        }
      } catch (error) {
        console.error('[AuthContext] Error in initializeAuth:', error)
        if (mounted) {
          loadingComplete = true
          clearTimeout(timeoutId)
          setLoading(false)
        }
      }
    }

    // Set a timeout to prevent infinite loading (max 3 seconds)
    timeoutId = setTimeout(() => {
      if (mounted && !loadingComplete) {
        loadingComplete = true
        setLoading(false)
      }
    }, 3000)

    initializeAuth()

    // Listen for auth state changes - this is the primary way to fetch profile
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      setUser(session?.user ?? null)

      if (session?.user) {
        // Only fetch if not already in progress to prevent duplicate fetches
        if (!profileFetchInProgress) {
          profileFetchInProgress = true
          try {
            await fetchProfile(session.user.id)
          } finally {
            profileFetchInProgress = false
            if (mounted) {
              setLoading(false)
            }
          }
        }
      } else {
        setProfile(null)
        if (mounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(profile?.role ?? null, permission)
  }

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    signOut,
    refreshProfile,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Permission helper hooks
export function useHasRole(requiredRole: UserRole | UserRole[]) {
  const { role } = useAuth()
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return role ? roles.includes(role) : false
}

export function useIsAdmin() {
  const { role } = useAuth()
  return role === 'admin'
}

export function useIsManager() {
  const { role } = useAuth()
  return role === 'admin' || role === 'manager'
}

export function useIsOperator() {
  const { role } = useAuth()
  return role === 'admin' || role === 'manager' || role === 'operator'
}

export function usePermission(permission: Permission) {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}
