// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all prompt versions
    const { data: versions, error: fetchError } = await supabase
      .from('prompt_versions')
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .order('version', { ascending: false })

    if (fetchError) {
      console.error('Error fetching prompt versions:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Find active version number
    const activeVersion = versions?.find(v => v.is_active)?.version || null

    return NextResponse.json({
      versions: versions || [],
      active_version: activeVersion
    })
  } catch (error) {
    console.error('Error in prompt versions GET:', error)
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

    // Check user role (only admin can create prompt versions)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can create prompt versions.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { prompt_text, system_instructions, notes } = body

    if (!prompt_text) {
      return NextResponse.json(
        { error: 'prompt_text is required' },
        { status: 400 }
      )
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('prompt_versions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1

    // Create new prompt version (inactive by default)
    const { data: newVersion, error: insertError } = await supabase
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text,
        system_instructions: system_instructions || null,
        is_active: false,
        total_conversations: 0,
        success_rate: 0,
        deployed_at: null,
        notes: notes || null,
        created_by: user.id
      })
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error creating prompt version:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Create activity record
    await supabase.from('activities').insert({
      type: 'prompt_version_created',
      lead_id: null,
      user_id: user.id,
      title: 'Prompt Version Created',
      description: `${userData.full_name} created prompt version ${nextVersion} (draft)`,
      metadata: {
        version: nextVersion,
        prompt_version_id: newVersion.id,
        notes: notes || null
      }
    })

    return NextResponse.json({
      version: newVersion,
      message: `Prompt version ${nextVersion} created successfully (inactive)`
    }, { status: 201 })
  } catch (error) {
    console.error('Error in prompt versions POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
