// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { manychatClient } from '@/lib/manychat'
import { NextRequest, NextResponse } from 'next/server'

const MANYCHAT_DELETE_FLOW_NS = 'content20260126074113_204795'

export const dynamic = 'force-dynamic'

// GET /api/leads/[id] - Get single lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get lead with assigned user details
    const { data: lead, error } = await supabase
      .from('leads')
      .select(
        `
        *,
        assigned_user:users!assigned_to(
          id,
          full_name,
          email
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching lead:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Transform data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadData = lead as any
    const transformedLead = {
      id: leadData.id,
      name: leadData.name,
      handle: leadData.handle,
      manychat_user_id: leadData.manychat_user_id,
      status: leadData.status,
      current_phase: leadData.current_phase,
      message_count: leadData.message_count,
      assigned_to: leadData.assigned_to,
      assigned_to_name: leadData.assigned_user?.full_name || null,
      tags: leadData.tags,
      needs_human: leadData.needs_human,
      bot_paused: leadData.bot_paused,
      has_errors: leadData.has_errors,
      last_message_at: leadData.last_message_at,
      created_at: leadData.created_at,
      updated_at: leadData.updated_at,
    }

    return NextResponse.json({ lead: transformedLead }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/leads/[id] - Update single lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Update lead
    const { data: lead, error } = await supabase
      .from('leads')
      .update(body as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lead }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/[id] - Delete single lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role authorization - only admin and manager can delete leads
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    const { id } = params

    // Fetch lead to get manychat_user_id before deleting
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('manychat_user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching lead for deletion:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 404 })
    }

    // Trigger ManyChat delete-contact flow
    if (lead?.manychat_user_id) {
      try {
        await manychatClient.sendFlow(lead.manychat_user_id, MANYCHAT_DELETE_FLOW_NS)
      } catch (mcError) {
        console.error('ManyChat delete flow failed for subscriber', lead.manychat_user_id, mcError)
        // Continue with local deletion even if ManyChat call fails
      }
    }

    // Delete lead (cascades to conversations and messages)
    const { error } = await supabase.from('leads').delete().eq('id', id)

    if (error) {
      console.error('Error deleting lead:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Lead deleted' }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
