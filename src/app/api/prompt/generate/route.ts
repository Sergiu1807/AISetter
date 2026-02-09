// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { waitUntil } from '@vercel/functions'
import Anthropic from '@anthropic-ai/sdk'

// Allow up to 5 minutes for the background work (Vercel Pro limit)
export const maxDuration = 300

const PROMPT_ENGINEER_SYSTEM = `# SYSTEM PROMPT: Expert Prompt Engineer Agent

You are an expert prompt engineer specializing in conversational AI for sales and appointment setting. Your task is to analyze training feedback and improve the system prompt used by an AI appointment setter bot.

## YOUR ROLE

You receive:
1. **Training feedback document** — Real examples of bot conversations that were flagged as good, bad, or needing correction, with detailed feedback from human trainers. Examples may include **multi-turn conversation snapshots** showing the full back-and-forth between the bot and the lead — use these to understand conversational context, flow issues, and how mistakes compound across multiple turns.
2. **Current system prompt** — The full prompt currently used by the bot
3. **Knowledge base entries** — Skill knowledge documents covering sales psychology, objection handling, conversation flow, etc.
4. **Optional user instructions** — Specific guidance from the admin about what to focus on or change

## YOUR ANALYSIS PROCESS

1. **Pattern Recognition**: Read ALL training examples carefully. Identify recurring issues, patterns of failure, and areas of strength
2. **Root Cause Analysis**: For each issue pattern, determine if it's a prompt gap (missing instruction), a prompt conflict (contradicting instructions), or a calibration issue (wrong emphasis/tone)
3. **Knowledge Integration**: Cross-reference issues with the knowledge base entries to find best practices that should be incorporated
4. **Targeted Improvements**: Make surgical changes to the prompt — only modify what needs fixing based on evidence from the training data

## CRITICAL CONSTRAINTS

You MUST follow these rules exactly:

1. **Preserve XML tag structure** — The prompt uses XML tags like <role>, <communication_rules>, etc. Keep this structure intact
2. **Preserve {{VARIABLE}} placeholders** — These are dynamic template variables (e.g., {{CALENDAR_LINK}}, {{LEAD_NAME}}). Do NOT modify, remove, or rename them
3. **Preserve P1-P7 framework** — The conversation phases (P1 through P7) are core architecture. Do not restructure the phase system
4. **Keep Romanian language** — The prompt is in Romanian. All additions and modifications must be in Romanian
5. **Preserve output format** — The bot must continue outputting <analysis>, <response>, and <meta> sections. Do not change this requirement
6. **Only add/modify — don't remove working patterns** — If something isn't mentioned in the training feedback as problematic, leave it alone
7. **Be conservative** — Make the minimum changes needed to address the feedback. Don't over-engineer or add unnecessary complexity
8. **Match existing style** — New text should match the tone, formatting, and level of detail of the surrounding prompt text

## OUTPUT FORMAT

You must output exactly two XML sections:

<improved_prompt>
[The complete, improved system prompt — this replaces the entire current prompt]
</improved_prompt>

<change_notes>
[Detailed changelog describing what was changed and why, referencing specific training examples that motivated each change. Use bullet points. Be specific about which section of the prompt was modified.]
</change_notes>
`

async function runGeneration(
  jobId: string,
  trainingExport: string,
  currentPrompt: string,
  knowledgeBaseEntries: string,
  userInstructions: string,
  createdBy: string,
) {
  const adminClient = createAdminClient()

  try {
    // Update job status to processing
    await adminClient
      .from('prompt_generation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Build system message
    let systemMessage = PROMPT_ENGINEER_SYSTEM
    if (knowledgeBaseEntries) {
      systemMessage = systemMessage.replace('{{KNOWLEDGE_BASE_ENTRIES}}', knowledgeBaseEntries)
    } else {
      systemMessage = systemMessage.replace('{{KNOWLEDGE_BASE_ENTRIES}}', 'No knowledge base entries provided.')
    }

    // Build user message
    let userMessage = `## TRAINING FEEDBACK DOCUMENT\n\nThe following are real conversation examples that were flagged by human trainers. Analyze all of them to identify patterns and issues.\n\n${trainingExport}\n\n---\n\n## CURRENT SYSTEM PROMPT\n\nThis is the full system prompt currently being used by the bot. Your output must be a complete replacement of this prompt.\n\n${currentPrompt}\n\n---\n\n`

    if (userInstructions) {
      userMessage += `## ADMIN INSTRUCTIONS\n\n${userInstructions}\n\n---\n\n`
    }

    userMessage += 'Please analyze the training feedback, identify patterns, and produce an improved version of the system prompt that addresses the issues found. Remember to output the complete prompt in <improved_prompt> tags and your changelog in <change_notes> tags.'

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const modelId = 'claude-opus-4-6'

    // Use streaming — required by Anthropic for long-running Opus operations
    const stream = anthropic.messages.stream({
      model: modelId,
      max_tokens: 32000,
      temperature: 0.3,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    })

    const response = await stream.finalMessage()

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || !('text' in textContent)) {
      throw new Error('No text content in Claude response')
    }

    const fullResponse = textContent.text

    // Parse <improved_prompt> and <change_notes>
    const promptMatch = fullResponse.match(/<improved_prompt>([\s\S]*?)<\/improved_prompt>/)
    const notesMatch = fullResponse.match(/<change_notes>([\s\S]*?)<\/change_notes>/)

    if (!promptMatch) {
      throw new Error('Failed to parse <improved_prompt> from response')
    }

    const generatedPrompt = promptMatch[1].trim()
    const changeNotes = notesMatch ? notesMatch[1].trim() : 'No change notes provided'

    // Get the current max version
    const { data: maxVersionData } = await adminClient
      .from('prompt_versions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (maxVersionData?.version || 0) + 1

    // Create new prompt version (inactive)
    await adminClient
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text: generatedPrompt,
        is_active: false,
        notes: `Generated by Prompt Engineer Agent from training feedback.\n\n${changeNotes}`,
        created_by: createdBy,
      })

    // Update job with results
    await adminClient
      .from('prompt_generation_jobs')
      .update({
        status: 'completed',
        generated_prompt: generatedPrompt,
        generated_notes: changeNotes,
        model_used: modelId,
        input_tokens: response.usage?.input_tokens || null,
        output_tokens: response.usage?.output_tokens || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`Prompt generation completed for job ${jobId}`)
  } catch (error) {
    console.error('Prompt generation error:', error)

    await adminClient
      .from('prompt_generation_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

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

    // Run generation in the background using waitUntil
    // This keeps the serverless function alive after returning the 202 response
    waitUntil(
      runGeneration(
        job.id,
        training_export,
        basePrompt.prompt_text,
        kbSnapshot,
        user_instructions || '',
        user.id,
      )
    )

    return NextResponse.json({ job_id: job.id }, { status: 202 })
  } catch (error) {
    console.error('Error in prompt generate API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
