// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/messages - Send a new message
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
    const { conversation_id, content, sender_type, metadata } = body

    if (!conversation_id || !content || !sender_type) {
      return NextResponse.json(
        { error: 'Missing required fields: conversation_id, content, sender_type' },
        { status: 400 }
      )
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_type,
        sender_id: sender_type === 'human' ? user.id : null,
        content,
        status: 'sent',
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // TODO: Send message to ManyChat if sender_type is 'human' or 'bot'

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
