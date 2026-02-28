// @ts-nocheck
// Supabase client for Middleware
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes check
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/webhook/manychat', '/api/health', '/api/debug']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies to maintain session state
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie
      redirectResponse.cookies.set(name, value, options)
    })
    return redirectResponse
  }

  // If user is logged in and trying to access login page
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies to maintain session state
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie
      redirectResponse.cookies.set(name, value, options)
    })
    return redirectResponse
  }

  // Check user status and role for protected routes (SIMPLIFIED - don't sign out on errors)
  if (user && !isPublicRoute) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('is_active, role')
        .eq('id', user.id)
        .single()

      // Only check if userData exists and is_active is explicitly false
      if (userData && userData.is_active === false) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'Account is disabled')
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
      }

      // Check role-based access for admin routes (only if userData is available)
      if (userData && userData.role) {
        const adminRoutes = ['/dashboard/admin']
        const managerRoutes = ['/dashboard/training/approve']

        if (adminRoutes.some((route) => pathname.startsWith(route))) {
          if (userData.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            url.searchParams.set('error', 'Access denied. Admin privileges required.')
            const redirectResponse = NextResponse.redirect(url)
            supabaseResponse.cookies.getAll().forEach((cookie) => {
              redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
            })
            return redirectResponse
          }
        }

        if (managerRoutes.some((route) => pathname.startsWith(route))) {
          if (!['admin', 'manager'].includes(userData.role)) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            url.searchParams.set('error', 'Access denied. Manager privileges required.')
            const redirectResponse = NextResponse.redirect(url)
            supabaseResponse.cookies.getAll().forEach((cookie) => {
              redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
            })
            return redirectResponse
          }
        }
      }
    } catch (error) {
      // Don't sign out on database errors - just log and continue
      console.error('[Middleware] Error in user check, allowing access:', error)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is to maintain session
  return supabaseResponse
}
