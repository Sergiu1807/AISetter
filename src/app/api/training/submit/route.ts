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

    // Check user role (operator+ can submit)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allowedRoles = ['admin', 'manager', 'operator']
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only operators and above can submit training examples.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      conversation_id,
      user_message: providedUserMessage,
      ai_response: providedAiResponse,
      expected_response,
      feedback,
      example_type,
      context
    } = body

    // Validate example_type
    if (!['good', 'bad', 'correction'].includes(example_type)) {
      return NextResponse.json(
        { error: 'Invalid example_type. Must be "good", "bad", or "correction"' },
        { status: 400 }
      )
    }

    if (!feedback || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    let user_message = providedUserMessage
    let ai_response = providedAiResponse
    let conversationData = null

    // Mode 1: From existing conversation
    if (conversation_id) {
      // Fetch conversation and its messages
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          leads!inner(name, handle)
        `)
        .eq('id', conversation_id)
        .single()

      if (convError || !conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      // Get latest messages from conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('sender_type, content, created_at')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: false })
        .limit(2)

      if (msgError) {
        console.error('Error fetching messages:', msgError)
        return NextResponse.json({ error: msgError.message }, { status: 500 })
      }

      // Extract user and bot messages if not provided
      if (!user_message || !ai_response) {
        const leadMsg = messages?.find(m => m.sender_type === 'lead')
        const botMsg = messages?.find(m => m.sender_type === 'bot')

        if (!leadMsg || !botMsg) {
          return NextResponse.json(
            { error: 'Could not find both lead and bot messages in conversation' },
            { status: 400 }
          )
        }

        user_message = user_message || leadMsg.content
        ai_response = ai_response || botMsg.content
      }

      conversationData = conversation
    }

    // Mode 2: Manual example - validate required fields
    if (!conversation_id && (!user_message || !ai_response)) {
      return NextResponse.json(
        { error: 'user_message and ai_response are required for manual examples' },
        { status: 400 }
      )
    }

    // Create training example
    const trainingData: {
      conversation_id: string | null;
      user_message: string;
      ai_response: string;
      expected_response: string | null;
      feedback: string;
      example_type: string;
      status: string;
      submitted_by: string;
      created_by: string;
      metadata?: Record<string, unknown>;
    } = {
      conversation_id: conversation_id || null,
      user_message,
      ai_response,
      expected_response: expected_response || null,
      feedback,
      example_type,
      status: 'pending',
      submitted_by: user.id,
      created_by: user.id
    }

    // Add context to metadata if provided
    if (context) {
      trainingData.metadata = context
    }

    const { data: example, error: insertError } = await supabase
      .from('training_examples')
      .insert(trainingData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating training example:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Create activity record
    const activityDescription = conversation_id
      ? `Submitted ${example_type} training example from conversation with ${conversationData?.leads?.name || 'lead'}`
      : `Submitted ${example_type} training example (manual)`

    await supabase.from('activities').insert({
      type: 'training_example_submitted',
      lead_id: conversationData?.lead_id || null,
      user_id: user.id,
      title: 'Training Example Submitted',
      description: activityDescription,
      metadata: {
        example_id: example.id,
        example_type,
        feedback_preview: feedback.substring(0, 100),
        conversation_id: conversation_id || null
      }
    })

    // Notify managers about new submission
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'manager'])
      .eq('is_active', true)

    if (managers && managers.length > 0) {
      const notifications = managers.map(manager => ({
        user_id: manager.id,
        type: 'training_review',
        title: 'New Training Example Pending Review',
        message: `${userData.full_name} submitted a ${example_type} training example for review`,
        link: `/dashboard/training/review?example=${example.id}`,
        metadata: {
          example_id: example.id,
          example_type,
          submitted_by: user.id,
          submitted_by_name: userData.full_name
        }
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      example,
      message: 'Training example submitted successfully and is pending review'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in training submit API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
