// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
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

    const adminClient = createAdminClient()

    const { data: job, error: jobError } = await adminClient
      .from('prompt_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      generated_prompt: job.generated_prompt,
      generated_notes: job.generated_notes,
      model_used: job.model_used,
      input_tokens: job.input_tokens,
      output_tokens: job.output_tokens,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at,
    })
  } catch (error) {
    console.error('Error in prompt generate status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
