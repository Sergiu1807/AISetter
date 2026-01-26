// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH /api/users/[id] - Update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body = await request.json()

    // Only allow specific fields to be updated
    const allowedFields = ['full_name', 'role', 'is_active']
    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    if (body.role && !['admin', 'manager', 'operator', 'viewer'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Prevent admin from demoting themselves
    if (id === user.id && body.role && body.role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    // Prevent admin from deactivating themselves
    if (id === user.id && body.is_active === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const adminClient = createAdminClient()
    const { data: updatedUser, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, full_name, role, is_active, last_login_at, created_at, created_by')
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If password is provided, update auth password
    if (body.password && body.password.length >= 6) {
      const { error: pwError } = await adminClient.auth.admin.updateUserById(id, {
        password: body.password,
      })
      if (pwError) {
        console.error('Error updating user password:', pwError)
        return NextResponse.json({ error: pwError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Delete from users table first
    const { error: dbError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('Error deleting user record:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Delete auth user
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted' }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
