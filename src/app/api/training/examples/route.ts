// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const example_type = searchParams.get('example_type')
    const submitted_by = searchParams.get('submitted_by')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query with related data
    let query = supabase
      .from('training_examples')
      .select(`
        *,
        submitted_by_user:users!training_examples_submitted_by_fkey(full_name, email),
        conversation:conversations(
          id,
          leads(name, handle)
        )
      `, { count: 'exact' })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (example_type && example_type !== 'all') {
      query = query.eq('example_type', example_type)
    }

    if (submitted_by) {
      query = query.eq('submitted_by', submitted_by)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: examples, error, count } = await query

    if (error) {
      console.error('Error fetching training examples:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const page = Math.floor(offset / limit) + 1
    const hasMore = count ? offset + limit < count : false

    return NextResponse.json({
      examples: examples || [],
      total: count || 0,
      page,
      hasMore
    })
  } catch (error) {
    console.error('Error in training examples API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (operator+ can submit)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allowedRoles = ['admin', 'manager', 'operator']
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      conversation_id,
      user_message,
      ai_response,
      expected_response,
      feedback,
      example_type
    } = body

    // Validate required fields
    if (!user_message || !ai_response || !feedback || !example_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate example_type
    if (!['good', 'bad', 'correction'].includes(example_type)) {
      return NextResponse.json(
        { error: 'Invalid example_type' },
        { status: 400 }
      )
    }

    // Create training example
    const { data: example, error: insertError } = await supabase
      .from('training_examples')
      .insert({
        conversation_id: conversation_id || null,
        user_message,
        ai_response,
        expected_response: expected_response || null,
        feedback,
        example_type,
        status: 'pending',
        submitted_by: user.id,
        created_by: user.id
      })
      .select(`
        *,
        submitted_by_user:users!training_examples_submitted_by_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error creating training example:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Create activity record
    await supabase.from('activities').insert({
      type: 'training_example_submitted',
      lead_id: null, // Training examples may not always be linked to a specific lead
      user_id: user.id,
      title: 'Training Example Submitted',
      description: `${userData.role} submitted a ${example_type} training example`,
      metadata: {
        example_id: example.id,
        example_type,
        feedback_preview: feedback.substring(0, 100)
      }
    })

    // TODO: Create notification for managers
    // This would query for users with role='manager' and create notification records

    return NextResponse.json({ example }, { status: 201 })
  } catch (error) {
    console.error('Error in training examples POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
