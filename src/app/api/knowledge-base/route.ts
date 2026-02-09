// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const is_active = searchParams.get('is_active')

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (is_active !== null && is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching knowledge base:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entries: entries || [] })
  } catch (error) {
    console.error('Error in knowledge base GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { category, title, content } = body

    if (!category || !title || !content) {
      return NextResponse.json({ error: 'category, title, and content are required' }, { status: 400 })
    }

    const validCategories = [
      'sales_psychology', 'objection_handling', 'conversation_flow',
      'qualification_skills', 'closing_techniques', 'tone_and_voice',
      'industry_knowledge', 'general'
    ]

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 })
    }

    const { data: entry, error: insertError } = await supabase
      .from('knowledge_base')
      .insert({
        category,
        title,
        content,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating knowledge base entry:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Error in knowledge base POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
