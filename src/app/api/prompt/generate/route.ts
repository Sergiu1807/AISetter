// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth: admin only
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      training_export,
      knowledge_base_ids,
      base_prompt_version_id,
      user_instructions
    } = body

    if (!training_export || typeof training_export !== 'string') {
      return NextResponse.json({ error: 'training_export is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch base prompt version
    let basePromptQuery = adminClient
      .from('prompt_versions')
      .select('id, version, prompt_text')

    if (base_prompt_version_id) {
      basePromptQuery = basePromptQuery.eq('id', base_prompt_version_id)
    } else {
      basePromptQuery = basePromptQuery.eq('is_active', true)
    }

    const { data: basePrompt, error: promptError } = await basePromptQuery.single()

    if (promptError || !basePrompt) {
      return NextResponse.json({ error: 'No base prompt version found' }, { status: 404 })
    }

    // Fetch knowledge base entries
    let kbQuery = adminClient
      .from('knowledge_base')
      .select('id, category, title, content')
      .eq('is_active', true)
      .order('category')

    if (knowledge_base_ids && Array.isArray(knowledge_base_ids) && knowledge_base_ids.length > 0) {
      kbQuery = kbQuery.in('id', knowledge_base_ids)
    }

    const { data: kbEntries } = await kbQuery

    // Format KB snapshot
    const kbSnapshot = (kbEntries || [])
      .map(e => `### [${e.category}] ${e.title}\n${e.content}`)
      .join('\n\n---\n\n')

    // Create job record
    const { data: job, error: jobError } = await adminClient
      .from('prompt_generation_jobs')
      .insert({
        status: 'pending',
        created_by: user.id,
        training_export,
        knowledge_base_snapshot: kbSnapshot || null,
        base_prompt_version_id: basePrompt.id,
        user_instructions: user_instructions || null,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('Error creating generation job:', jobError)
      return NextResponse.json({ error: 'Failed to create generation job' }, { status: 500 })
    }

    // Invoke Supabase Edge Function (fire-and-forget)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-prompt`

    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        job_id: job.id,
        training_export,
        current_prompt: basePrompt.prompt_text,
        knowledge_base_entries: kbSnapshot,
        user_instructions: user_instructions || null,
      }),
    }).catch(err => {
      console.error('Error invoking edge function:', err)
      // Update job as failed if we can't even invoke the function
      adminClient
        .from('prompt_generation_jobs')
        .update({ status: 'failed', error_message: `Failed to invoke edge function: ${err.message}` })
        .eq('id', job.id)
        .then()
    })

    return NextResponse.json({ job_id: job.id }, { status: 202 })
  } catch (error) {
    console.error('Error in prompt generate API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
