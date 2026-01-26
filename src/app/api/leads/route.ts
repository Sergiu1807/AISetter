// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { manychatClient } from '@/lib/manychat'
import { NextRequest, NextResponse } from 'next/server'

const MANYCHAT_DELETE_FLOW_NS = 'content20260126074113_204795'

export const dynamic = 'force-dynamic'

// GET /api/leads - Get all leads with filters
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const phase = searchParams.get('phase')
    const assigned_to = searchParams.get('assigned_to')
    const search = searchParams.get('search')
    const needs_human = searchParams.get('needs_human')
    const bot_paused = searchParams.get('bot_paused')
    const has_errors = searchParams.get('has_errors')

    // Start query
    let query = supabase
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
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (phase && phase !== 'all') {
      query = query.eq('current_phase', phase)
    }

    if (assigned_to && assigned_to !== 'all') {
      if (assigned_to === 'unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', assigned_to)
      }
    }

    if (needs_human === 'true') {
      query = query.eq('needs_human', true)
    }

    if (bot_paused === 'true') {
      query = query.eq('bot_paused', true)
    }

    if (has_errors === 'true') {
      query = query.eq('has_errors', true)
    }

    // Execute query
    const { data: leads, error } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Client-side search if provided (for simplicity)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filteredLeads: any[] = leads || []
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filteredLeads = filteredLeads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchLower) ||
          lead.handle.toLowerCase().includes(searchLower) ||
          lead.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      )
    }

    // Transform data to match frontend types
    const transformedLeads = filteredLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      handle: lead.handle,
      manychat_user_id: lead.manychat_user_id,
      status: lead.status,
      current_phase: lead.current_phase,
      message_count: lead.message_count,
      assigned_to: lead.assigned_to,
      assigned_to_name: lead.assigned_user?.full_name || null,
      tags: lead.tags,
      needs_human: lead.needs_human,
      bot_paused: lead.bot_paused,
      has_errors: lead.has_errors,
      last_message_at: lead.last_message_at,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    }))

    return NextResponse.json({ leads: transformedLeads }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()

    const { name, handle, manychat_user_id, email, phone } = body

    if (!name || !handle || !manychat_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, handle, manychat_user_id' },
        { status: 400 }
      )
    }

    // Insert lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name,
        handle,
        manychat_user_id,
        email,
        phone,
        status: 'new',
        current_phase: 'P1',
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create conversation for the lead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadId = (lead as any).id
    const { error: convError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        bot_active: true,
      } as never)

    if (convError) {
      console.error('Error creating conversation:', convError)
    }

    // Create activity
    await supabase.from('activities').insert({
      type: 'new_lead',
      lead_id: leadId,
      title: 'New Lead',
      description: `${name} started a conversation`,
      metadata: { source: 'ManyChat' },
    } as never)

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads - Bulk delete leads
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { lead_ids } = body

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'lead_ids array is required' },
        { status: 400 }
      )
    }

    // Fetch leads to get manychat_user_ids before deleting
    const { data: leadsToDelete } = await supabase
      .from('leads')
      .select('manychat_user_id')
      .in('id', lead_ids)

    // Trigger ManyChat delete-contact flow for each lead
    if (leadsToDelete && leadsToDelete.length > 0) {
      await Promise.allSettled(
        leadsToDelete
          .filter((l) => l.manychat_user_id)
          .map((l) =>
            manychatClient.sendFlow(l.manychat_user_id, MANYCHAT_DELETE_FLOW_NS).catch((err) => {
              console.error('ManyChat delete flow failed for subscriber', l.manychat_user_id, err)
            })
          )
      )
    }

    // Delete leads (CASCADE handles related data)
    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', lead_ids)

    if (error) {
      console.error('Error deleting leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: `${lead_ids.length} lead(s) deleted` }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/leads - Bulk update leads
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { lead_ids, updates } = body

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'lead_ids array is required' },
        { status: 400 }
      )
    }

    // Update leads
    const { data, error } = await supabase
      .from('leads')
      .update(updates as never)
      .in('id', lead_ids)
      .select()

    if (error) {
      console.error('Error updating leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ updated: data }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
