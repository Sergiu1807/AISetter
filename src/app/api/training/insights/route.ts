// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all training examples for analysis
    const { data: examples, error: fetchError } = await supabase
      .from('training_examples')
      .select(`
        id,
        example_type,
        status,
        feedback,
        user_message,
        ai_response,
        metadata,
        created_at,
        conversation:conversations(lead_id, leads(conversation_phase, qualification_status))
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching training examples:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const allExamples = examples || []

    // Calculate summary statistics
    const summary = {
      total_examples: allExamples.length,
      approved: allExamples.filter(e => e.status === 'approved').length,
      pending: allExamples.filter(e => e.status === 'pending').length,
      rejected: allExamples.filter(e => e.status === 'rejected').length,
      by_type: {
        good: allExamples.filter(e => e.example_type === 'good').length,
        bad: allExamples.filter(e => e.example_type === 'bad').length,
        correction: allExamples.filter(e => e.example_type === 'correction').length
      }
    }

    // Analyze feedback for common issues (only from approved examples)
    const approvedExamples = allExamples.filter(e => e.status === 'approved')
    const badExamples = approvedExamples.filter(e => e.example_type === 'bad' || e.example_type === 'correction')

    // Extract common words/phrases from bad example feedback
    const feedbackTexts = badExamples.map(e => e.feedback.toLowerCase())
    const wordCounts: Record<string, { count: number; examples: string[] }> = {}

    // Common issue keywords to look for
    const issueKeywords = [
      'too many questions',
      'not listening',
      'repetitive',
      'pushy',
      'aggressive',
      'unclear',
      'confusing',
      'off-topic',
      'inappropriate',
      'unprofessional',
      'rushed',
      'robotic',
      'generic',
      'didnt address',
      'ignored',
      'missed',
      'wrong tone',
      'too formal',
      'too casual'
    ]

    issueKeywords.forEach(keyword => {
      const matchingExamples = feedbackTexts.filter(text => text.includes(keyword))
      if (matchingExamples.length > 0) {
        wordCounts[keyword] = {
          count: matchingExamples.length,
          examples: badExamples
            .filter(e => e.feedback.toLowerCase().includes(keyword))
            .slice(0, 3)
            .map(e => e.id)
        }
      }
    })

    const common_issues = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([issue, data]) => ({
        issue,
        frequency: data.count,
        examples: data.examples
      }))

    // Identify successful patterns from good examples
    const goodExamples = approvedExamples.filter(e => e.example_type === 'good')
    const successful_responses = goodExamples.slice(0, 5).map(e => ({
      pattern: e.feedback.substring(0, 100) + (e.feedback.length > 100 ? '...' : ''),
      context: e.metadata?.phase || 'General',
      example_ids: [e.id]
    }))

    // Calculate performance by phase
    const examplesWithPhase = allExamples.filter(e => e.conversation?.leads?.conversation_phase)
    const phaseGroups: Record<string, { good: number; bad: number }> = {}

    examplesWithPhase.forEach(e => {
      const phase = e.conversation?.leads?.conversation_phase || 'Unknown'
      if (!phaseGroups[phase]) {
        phaseGroups[phase] = { good: 0, bad: 0 }
      }

      if (e.example_type === 'good') {
        phaseGroups[phase].good++
      } else if (e.example_type === 'bad' || e.example_type === 'correction') {
        phaseGroups[phase].bad++
      }
    })

    const by_phase = Object.entries(phaseGroups)
      .map(([phase, counts]) => ({
        phase,
        good: counts.good,
        bad: counts.bad
      }))
      .sort((a, b) => a.phase.localeCompare(b.phase))

    // Calculate performance by qualification status
    const examplesWithStatus = allExamples.filter(e => e.conversation?.leads?.qualification_status)
    const statusGroups: Record<string, { good: number; bad: number }> = {}

    examplesWithStatus.forEach(e => {
      const status = e.conversation?.leads?.qualification_status || 'Unknown'
      if (!statusGroups[status]) {
        statusGroups[status] = { good: 0, bad: 0 }
      }

      if (e.example_type === 'good') {
        statusGroups[status].good++
      } else if (e.example_type === 'bad' || e.example_type === 'correction') {
        statusGroups[status].bad++
      }
    })

    const by_status = Object.entries(statusGroups)
      .map(([status, counts]) => ({
        status,
        good: counts.good,
        bad: counts.bad
      }))

    // Calculate trend over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentExamples = allExamples.filter(e => new Date(e.created_at) >= thirtyDaysAgo)

    // Group by date
    const dateGroups: Record<string, { good: number; bad: number }> = {}

    recentExamples.forEach(e => {
      const date = new Date(e.created_at).toISOString().split('T')[0]
      if (!dateGroups[date]) {
        dateGroups[date] = { good: 0, bad: 0 }
      }

      if (e.example_type === 'good') {
        dateGroups[date].good++
      } else if (e.example_type === 'bad' || e.example_type === 'correction') {
        dateGroups[date].bad++
      }
    })

    const trend = Object.entries(dateGroups)
      .map(([date, counts]) => ({
        date,
        good: counts.good,
        bad: counts.bad
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Identify improvement areas
    const improvement_areas = by_phase
      .map(phase => {
        const total = phase.good + phase.bad
        return {
          phase: phase.phase,
          issue_count: phase.bad,
          avg_rating: total > 0 ? (phase.good / total) * 100 : 0
        }
      })
      .filter(area => area.issue_count > 0)
      .sort((a, b) => b.issue_count - a.issue_count)

    return NextResponse.json({
      summary,
      patterns: {
        common_issues,
        successful_responses,
        improvement_areas
      },
      performance: {
        by_phase,
        by_status,
        trend
      }
    })
  } catch (error) {
    console.error('Error in training insights API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
