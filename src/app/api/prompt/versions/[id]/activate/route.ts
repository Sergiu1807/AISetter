// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (only admin can activate prompt versions)
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
        { error: 'Insufficient permissions. Only admins can activate prompt versions.' },
        { status: 403 }
      )
    }

    const versionId = params.id

    // Get the prompt version to activate
    const { data: version, error: fetchError } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (fetchError || !version) {
      return NextResponse.json(
        { error: 'Prompt version not found' },
        { status: 404 }
      )
    }

    if (version.is_active) {
      return NextResponse.json(
        { error: 'This prompt version is already active' },
        { status: 400 }
      )
    }

    // Deactivate all versions first
    const { error: deactivateError } = await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

    if (deactivateError) {
      console.error('Error deactivating prompt versions:', deactivateError)
      return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }

    // Activate the specified version
    const { data: activatedVersion, error: activateError } = await supabase
      .from('prompt_versions')
      .update({
        is_active: true,
        deployed_at: new Date().toISOString()
      })
      .eq('id', versionId)
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .single()

    if (activateError) {
      console.error('Error activating prompt version:', activateError)
      return NextResponse.json({ error: activateError.message }, { status: 500 })
    }

    // Create activity record
    await supabase.from('activities').insert({
      type: 'prompt_version_deployed',
      lead_id: null,
      user_id: user.id,
      title: 'Prompt Version Deployed',
      description: `${userData.full_name} deployed prompt version ${version.version}`,
      metadata: {
        version: version.version,
        prompt_version_id: versionId,
        previous_active: null // Could track previous version if needed
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
        message: `${userData.full_name} deployed prompt version ${version.version}. The bot is now using the updated prompt.`,
        link: '/dashboard/training/prompt',
        metadata: {
          version: version.version,
          prompt_version_id: versionId,
          deployed_by: user.id,
          deployed_by_name: userData.full_name
        }
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      version: activatedVersion,
      message: `Prompt version ${version.version} activated successfully`
    })
  } catch (error) {
    console.error('Error in prompt activate API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
