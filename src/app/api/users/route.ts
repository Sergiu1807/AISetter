// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin only
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, last_login_at, created_at, created_by')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin only
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, role, password } = body

    if (!email || !full_name || !role || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, role, password' },
        { status: 400 }
      )
    }

    if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, manager, operator, or viewer' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create auth user via admin client (bypasses email confirmation)
    const adminClient = createAdminClient()
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Insert into users table
    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: true,
        created_by: user.id,
      })
      .select('id, email, full_name, role, is_active, created_at, created_by')
      .single()

    if (insertError) {
      console.error('Error inserting user record:', insertError)
      // Attempt to clean up the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
