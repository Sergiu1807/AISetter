// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/conversations/[leadId] - Get conversation with messages for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
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

    const { leadId } = params

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(
        `
        *,
        taken_over_user:users!taken_over_by(
          id,
          full_name
        )
      `
      )
      .eq('lead_id', leadId)
      .single()

    if (convError) {
      console.error('Error fetching conversation:', convError)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get messages for this conversation
    const conversationId = (conversation as { id: string }).id
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender_user:users!sender_id(
          id,
          full_name
        )
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Transform conversation data
    const conv = conversation as {
      id: string;
      lead_id: string;
      bot_active: boolean;
      human_taken_over: boolean;
      taken_over_by?: string | null;
      taken_over_user?: { full_name?: string } | null;
      taken_over_at?: string | null;
      created_at: string;
      updated_at: string;
    }
    const transformedConversation = {
      id: conv.id,
      lead_id: conv.lead_id,
      bot_active: conv.bot_active,
      human_taken_over: conv.human_taken_over,
      taken_over_by: conv.taken_over_by,
      taken_over_by_name: conv.taken_over_user?.full_name || null,
      taken_over_at: conv.taken_over_at,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      messages: (messages as Array<{
        id: string;
        conversation_id: string;
        sender_type: string;
        sender_user?: { full_name?: string } | null;
        content: string;
        created_at: string;
        status: string;
        metadata?: Record<string, unknown>;
      }>).map((msg) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_type: msg.sender_type,
        sender_name: msg.sender_user?.full_name || null,
        content: msg.content,
        timestamp: msg.created_at,
        status: msg.status,
        metadata: msg.metadata,
      })),
    }

    return NextResponse.json(
      { conversation: transformedConversation },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/[leadId] - Update conversation (e.g., takeover)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
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

    const { leadId } = params
    const body = await request.json()

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .single()

    if (convError) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Update conversation
    const conversationPatchId = (conversation as { id: string }).id
    const { data, error } = await supabase
      .from('conversations')
      .update(body as never)
      .eq('id', conversationPatchId)
      .select()
      .single()

    if (error) {
      console.error('Error updating conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If human takeover, create activity
    if (body.human_taken_over === true && body.taken_over_by) {
      // Get lead info
      const { data: lead } = await supabase
        .from('leads')
        .select('name')
        .eq('id', leadId)
        .single()

      // Get user info
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', body.taken_over_by)
        .single()

      const typedLead = lead as { name: string } | null
      const typedUserData = userData as { full_name: string } | null
      if (typedLead && typedUserData) {
        await supabase.from('activities').insert({
          type: 'human_takeover',
          lead_id: leadId,
          user_id: body.taken_over_by,
          title: 'Human Takeover',
          description: `${typedUserData.full_name} took over conversation with ${typedLead.name}`,
          metadata: body.metadata || {},
        } as never)
      }

      // Update lead to needs_human = false since taken over
      await supabase
        .from('leads')
        .update({ needs_human: false, bot_paused: true } as never)
        .eq('id', leadId)
    }

    // If returning to bot, create activity
    if (body.bot_active === true && body.human_taken_over === false) {
      const { data: lead } = await supabase
        .from('leads')
        .select('name')
        .eq('id', leadId)
        .single()

      const typedBotLead = lead as { name: string } | null
      if (typedBotLead) {
        await supabase.from('activities').insert({
          type: 'bot_resumed',
          lead_id: leadId,
          user_id: user.id,
          title: 'Bot Resumed',
          description: `Bot resumed conversation with ${typedBotLead.name}`,
        } as never)
      }

      // Update lead
      await supabase
        .from('leads')
        .update({ bot_paused: false } as never)
        .eq('id', leadId)
    }

    return NextResponse.json({ conversation: data }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
