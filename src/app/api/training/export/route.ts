// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (admin/manager only)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { example_ids } = body

    if (!example_ids || !Array.isArray(example_ids) || example_ids.length === 0) {
      return NextResponse.json({ error: 'example_ids is required and must be a non-empty array' }, { status: 400 })
    }

    // Fetch selected approved training examples
    const { data: examples, error: fetchError } = await supabase
      .from('training_examples')
      .select(`
        *,
        submitted_by_user:users!training_examples_submitted_by_fkey(full_name, email)
      `)
      .in('id', example_ids)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching training examples:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!examples || examples.length === 0) {
      return NextResponse.json({ error: 'No approved examples found for the given IDs' }, { status: 404 })
    }

    // Format into structured export document
    const timestamp = new Date().toISOString()
    const lines: string[] = [
      '=== TRAINING EXPORT ===',
      `Generated: ${timestamp}`,
      `Total Examples: ${examples.length}`,
      ''
    ]

    examples.forEach((example, index) => {
      const snapshot = example.metadata?.conversation_snapshot
      const leadHandle = snapshot?.lead_handle || 'unknown'
      const exampleDate = new Date(example.created_at).toISOString().split('T')[0]

      lines.push(`--- EXAMPLE ${index + 1} of ${examples.length} ---`)
      lines.push(`Type: ${example.example_type.toUpperCase()} | Date: ${exampleDate} | Lead: @${leadHandle.replace('@', '')}`)
      lines.push('')

      // Full conversation history from snapshot
      if (snapshot?.messages && snapshot.messages.length > 0) {
        lines.push('FULL CONVERSATION HISTORY:')
        snapshot.messages.forEach((msg: { sender_type: string; content: string }) => {
          const sender = msg.sender_type === 'lead' ? 'Lead' : msg.sender_type === 'bot' ? 'Bot' : 'Human'
          lines.push(`[${sender}]: ${msg.content}`)
        })
        lines.push('')
      }

      // Check for multi-turn conversation
      const turns = example.metadata?.conversation_turns
      if (turns && Array.isArray(turns) && turns.length > 1) {
        lines.push(`CONVERSATION EXAMPLE (${turns.length} turns):`)
        turns.forEach((turn: { user_message: string; ai_response: string; feedback: string }, turnIdx: number) => {
          lines.push(``)
          lines.push(`  Turn ${turnIdx + 1}:`)
          lines.push(`  [User]: ${turn.user_message}`)
          lines.push(`  [Bot]: ${turn.ai_response}`)
          lines.push(`  [Why]: ${turn.feedback}`)
        })
        lines.push('')
      } else {
        // Single-turn (legacy format)
        lines.push('FLAGGED INTERACTION:')
        lines.push(`User Message: ${example.user_message}`)
        lines.push(`Bot Response: ${example.ai_response}`)
        if (example.expected_response) {
          lines.push(`Expected Response: ${example.expected_response}`)
        }
        lines.push('')

        // Trainer feedback
        lines.push('TRAINER FEEDBACK:')
        lines.push(example.feedback || 'No feedback provided')
      }

      // Reviewer notes
      if (example.metadata?.reviewer_notes) {
        lines.push('')
        lines.push('REVIEWER NOTES:')
        lines.push(example.metadata.reviewer_notes)
      }

      lines.push('')
      lines.push('')
    })

    const export_text = lines.join('\n')

    return NextResponse.json({
      export_text,
      example_count: examples.length,
      generated_at: timestamp
    })
  } catch (error) {
    console.error('Error in training export API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
