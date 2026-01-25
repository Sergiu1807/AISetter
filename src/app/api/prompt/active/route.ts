// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user (optional for GET)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch active prompt version
    const { data: activePrompt, error: fetchError } = await supabase
      .from('prompt_versions')
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .eq('is_active', true)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No active prompt version found
        return NextResponse.json(
          { error: 'No active prompt version found' },
          { status: 404 }
        )
      }
      console.error('Error fetching active prompt:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({
      version: activePrompt.version,
      prompt_text: activePrompt.prompt_text,
      system_instructions: activePrompt.system_instructions,
      deployed_at: activePrompt.deployed_at,
      total_conversations: activePrompt.total_conversations,
      success_rate: activePrompt.success_rate,
      notes: activePrompt.notes,
      created_by: activePrompt.created_by_user
    })
  } catch (error) {
    console.error('Error in active prompt GET:', error)
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

    // Check user role (only admin can deploy prompts)
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
        { error: 'Insufficient permissions. Only admins can deploy prompts.' },
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

    // Deactivate all existing versions
    await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

    // Create and activate new prompt version
    const { data: newVersion, error: insertError } = await supabase
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text,
        system_instructions: system_instructions || null,
        is_active: true,
        total_conversations: 0,
        success_rate: 0,
        deployed_at: new Date().toISOString(),
        notes: notes || null,
        created_by: user.id
      })
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error creating active prompt version:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Create activity record
    await supabase.from('activities').insert({
      type: 'prompt_version_deployed',
      lead_id: null,
      user_id: user.id,
      title: 'Prompt Version Deployed',
      description: `${userData.full_name} deployed prompt version ${nextVersion}`,
      metadata: {
        version: nextVersion,
        prompt_version_id: newVersion.id,
        notes: notes || null
      }
    })

    // Notify all users about the new prompt version
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map(u => ({
        user_id: u.id,
        type: 'prompt_deployed',
        title: 'New Prompt Version Deployed',
        message: `${userData.full_name} deployed prompt version ${nextVersion}. The bot is now using the updated prompt.`,
        link: '/dashboard/training/prompt',
        metadata: {
          version: nextVersion,
          prompt_version_id: newVersion.id,
          deployed_by: user.id,
          deployed_by_name: userData.full_name
        }
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      version: newVersion,
      message: `Prompt version ${nextVersion} created and activated successfully`
    }, { status: 201 })
  } catch (error) {
    console.error('Error in active prompt POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
