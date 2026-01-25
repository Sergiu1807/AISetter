// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/activities - Get all activities with filters
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
    const type = searchParams.get('type')
    const lead_id = searchParams.get('lead_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Start query
    let query = supabase
      .from('activities')
      .select(
        `
        *,
        lead:leads(
          id,
          name,
          handle
        ),
        user:users!user_id(
          id,
          full_name
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    if (lead_id && lead_id !== 'all') {
      query = query.eq('lead_id', lead_id)
    }

    // Execute query
    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
    const transformedActivities = (activities || []).map((activity: {
      id: string;
      type: string;
      lead_id: string;
      lead?: { name?: string; handle?: string } | null;
      title: string;
      description: string;
      created_at: string;
      metadata?: Record<string, unknown>;
      user?: { full_name?: string } | null;
    }) => ({
      id: activity.id,
      type: activity.type,
      lead_id: activity.lead_id,
      lead_name: activity.lead?.name || 'Unknown',
      lead_handle: activity.lead?.handle || '',
      title: activity.title,
      description: activity.description,
      timestamp: activity.created_at,
      metadata: {
        ...activity.metadata,
        agent_name: activity.user?.full_name,
      },
    }))

    return NextResponse.json({ activities: transformedActivities }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/activities - Create a new activity
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

    const body = await request.json()
    const { type, lead_id, title, description, metadata }: {
      type: string;
      lead_id?: string;
      title: string;
      description: string;
      metadata?: Record<string, unknown>;
    } = body

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description' },
        { status: 400 }
      )
    }

    // Insert activity
    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        type,
        lead_id: lead_id || null,
        user_id: user.id,
        title,
        description,
        metadata: metadata || {},
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
