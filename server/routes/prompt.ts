import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: PROMPT_ENGINEER_SYSTEM (used by POST /api/prompt/generate)
// ---------------------------------------------------------------------------
const PROMPT_ENGINEER_SYSTEM = `# SYSTEM PROMPT: Expert Prompt Engineer Agent

You are an expert prompt engineer specializing in conversational AI for sales and appointment setting. Your task is to analyze training feedback and improve the system prompt used by an AI appointment setter bot.

## YOUR ROLE

You receive:
1. **Training feedback document** — Real examples of bot conversations that were flagged as good, bad, or needing correction, with detailed feedback from human trainers. Examples may include **multi-turn conversation snapshots** showing the full back-and-forth between the bot and the lead — use these to understand conversational context, flow issues, and how mistakes compound across multiple turns.
2. **Current system prompt** — The full prompt currently used by the bot
3. **Knowledge base topics** — A summary of available knowledge areas (sales psychology, objection handling, etc.) already embedded in the current prompt
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
`;

// ---------------------------------------------------------------------------
// Background generation runner (fire-and-forget on Express/Railway)
// ---------------------------------------------------------------------------
async function runGeneration(
  jobId: string,
  trainingExport: string,
  currentPrompt: string,
  knowledgeBaseEntries: string,
  userInstructions: string,
  createdBy: string,
) {
  try {
    // Update job status to processing
    await supabase
      .from('prompt_generation_jobs')
      .update({ status: 'processing' } as any)
      .eq('id', jobId);

    // Build user message — KB is sent as titles-only summary to reduce input size
    let userMessage = `## TRAINING FEEDBACK DOCUMENT\n\nThe following are real conversation examples that were flagged by human trainers. Analyze all of them to identify patterns and issues.\n\n${trainingExport}\n\n---\n\n## CURRENT SYSTEM PROMPT\n\nThis is the full system prompt currently being used by the bot. Your output must be a complete replacement of this prompt.\n\n${currentPrompt}\n\n---\n\n`;

    if (knowledgeBaseEntries) {
      userMessage += `## KNOWLEDGE BASE TOPICS (for reference)\n\nThe following knowledge areas are available. The current prompt already incorporates these — use them as context for what the bot should know:\n\n${knowledgeBaseEntries}\n\n---\n\n`;
    }

    if (userInstructions) {
      userMessage += `## ADMIN INSTRUCTIONS\n\n${userInstructions}\n\n---\n\n`;
    }

    userMessage += 'Please analyze the training feedback, identify patterns, and produce an improved version of the system prompt that addresses the issues found. Remember to output the complete prompt in <improved_prompt> tags and your changelog in <change_notes> tags.';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Sonnet 4.5 — fast enough; Opus is too slow for large prompts
    const modelId = 'claude-sonnet-4-5-20250929';

    // On Railway the process is persistent, so no hard serverless timeout.
    // We still set a generous 10-minute safety net.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Generation timed out after 600s')), 600_000)
    );

    const stream = anthropic.messages.stream({
      model: modelId,
      max_tokens: 16384,
      temperature: 0.3,
      system: PROMPT_ENGINEER_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    const response = await Promise.race([stream.finalMessage(), timeoutPromise]);

    const textContent = (response as any).content.find((c: any) => c.type === 'text');
    if (!textContent || !('text' in textContent)) {
      throw new Error('No text content in Claude response');
    }

    const fullResponse = textContent.text;

    // Parse <improved_prompt> and <change_notes>
    const promptMatch = fullResponse.match(/<improved_prompt>([\s\S]*?)<\/improved_prompt>/);
    const notesMatch = fullResponse.match(/<change_notes>([\s\S]*?)<\/change_notes>/);

    if (!promptMatch) {
      throw new Error('Failed to parse <improved_prompt> from response');
    }

    const generatedPrompt = promptMatch[1].trim();
    const changeNotes = notesMatch ? notesMatch[1].trim() : 'No change notes provided';

    // Get the current max version
    const { data: maxVersionData } = await supabase
      .from('prompt_versions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = ((maxVersionData as any)?.version || 0) + 1;

    // Create new prompt version (inactive)
    await supabase
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text: generatedPrompt,
        is_active: false,
        notes: `Generated by Prompt Engineer Agent from training feedback.\n\n${changeNotes}`,
        created_by: createdBy,
      } as any);

    // Update job with results
    await supabase
      .from('prompt_generation_jobs')
      .update({
        status: 'completed',
        generated_prompt: generatedPrompt,
        generated_notes: changeNotes,
        model_used: modelId,
        input_tokens: (response as any).usage?.input_tokens || null,
        output_tokens: (response as any).usage?.output_tokens || null,
        completed_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId);

    console.log(`Prompt generation completed for job ${jobId}`);
  } catch (error) {
    console.error('Prompt generation error:', error);

    await supabase
      .from('prompt_generation_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId);
  }
}

// ===========================================================================
// 1. GET /api/prompt/active — get active prompt
// ===========================================================================
router.get('/api/prompt/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Fetch active prompt version
    const { data: activePrompt, error: fetchError } = await supabase
      .from('prompt_versions')
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No active prompt version found
        return res.status(404).json({ error: 'No active prompt version found' });
      }
      console.error('Error fetching active prompt:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    const ap = activePrompt as any;
    return res.json({
      version: ap.version,
      prompt_text: ap.prompt_text,
      system_instructions: ap.system_instructions,
      deployed_at: ap.deployed_at,
      total_conversations: ap.total_conversations,
      success_rate: ap.success_rate,
      notes: ap.notes,
      created_by: ap.created_by_user,
    });
  } catch (error) {
    console.error('Error in active prompt GET:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// 2. POST /api/prompt/active — deploy new prompt version (admin only)
// ===========================================================================
router.post('/api/prompt/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions. Only admins can deploy prompts.' });
    }

    // Fetch user info for activity/notification text
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', req.user!.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { prompt_text, system_instructions, notes } = req.body;

    if (!prompt_text) {
      return res.status(400).json({ error: 'prompt_text is required' });
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('prompt_versions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = latestVersion ? (latestVersion as any).version + 1 : 1;

    // Deactivate all existing versions
    await supabase
      .from('prompt_versions')
      .update({ is_active: false } as any)
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Create and activate new prompt version
    const { data: newVersion, error: insertError } = await supabase
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text,
        system_instructions: system_instructions || null,
        is_active: true,
        total_conversations: 0,
        success_rate: 0,
        deployed_at: new Date().toISOString(),
        notes: notes || null,
        created_by: req.user!.id,
      } as any)
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating active prompt version:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    const nv = newVersion as any;

    // Create activity record
    await supabase.from('activities').insert({
      type: 'prompt_version_deployed',
      lead_id: null,
      user_id: req.user!.id,
      title: 'Prompt Version Deployed',
      description: `${(userData as any).full_name} deployed prompt version ${nextVersion}`,
      metadata: {
        version: nextVersion,
        prompt_version_id: nv.id,
        notes: notes || null,
      },
    } as any);

    // Notify all users about the new prompt version
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true);

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map((u: any) => ({
        user_id: u.id,
        type: 'prompt_deployed',
        title: 'New Prompt Version Deployed',
        message: `${(userData as any).full_name} deployed prompt version ${nextVersion}. The bot is now using the updated prompt.`,
        link: '/dashboard/training/prompt',
        metadata: {
          version: nextVersion,
          prompt_version_id: nv.id,
          deployed_by: req.user!.id,
          deployed_by_name: (userData as any).full_name,
        },
      }));

      await supabase.from('notifications').insert(notifications as any);
    }

    return res.status(201).json({
      version: newVersion,
      message: `Prompt version ${nextVersion} created and activated successfully`,
    });
  } catch (error) {
    console.error('Error in active prompt POST:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// 3. GET /api/prompt/versions — list all versions
// ===========================================================================
router.get('/api/prompt/versions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Fetch all prompt versions
    const { data: versions, error: fetchError } = await supabase
      .from('prompt_versions')
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .order('version', { ascending: false });

    if (fetchError) {
      console.error('Error fetching prompt versions:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Find active version number
    const activeVersion = (versions as any[])?.find((v: any) => v.is_active)?.version || null;

    return res.json({
      versions: versions || [],
      active_version: activeVersion,
    });
  } catch (error) {
    console.error('Error in prompt versions GET:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// 4. POST /api/prompt/versions — create draft version (admin only)
// ===========================================================================
router.post('/api/prompt/versions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions. Only admins can create prompt versions.' });
    }

    // Fetch user info for activity text
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', req.user!.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { prompt_text, system_instructions, notes } = req.body;

    if (!prompt_text) {
      return res.status(400).json({ error: 'prompt_text is required' });
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('prompt_versions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = latestVersion ? (latestVersion as any).version + 1 : 1;

    // Create new prompt version (inactive by default)
    const { data: newVersion, error: insertError } = await supabase
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text,
        system_instructions: system_instructions || null,
        is_active: false,
        total_conversations: 0,
        success_rate: 0,
        deployed_at: null,
        notes: notes || null,
        created_by: req.user!.id,
      } as any)
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating prompt version:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    const nv = newVersion as any;

    // Create activity record
    await supabase.from('activities').insert({
      type: 'prompt_version_created',
      lead_id: null,
      user_id: req.user!.id,
      title: 'Prompt Version Created',
      description: `${(userData as any).full_name} created prompt version ${nextVersion} (draft)`,
      metadata: {
        version: nextVersion,
        prompt_version_id: nv.id,
        notes: notes || null,
      },
    } as any);

    return res.status(201).json({
      version: newVersion,
      message: `Prompt version ${nextVersion} created successfully (inactive)`,
    });
  } catch (error) {
    console.error('Error in prompt versions POST:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// 5. PATCH /api/prompt/versions/:id/activate — activate a version (admin only)
// ===========================================================================
router.patch('/api/prompt/versions/:id/activate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions. Only admins can activate prompt versions.' });
    }

    // Fetch user info for activity/notification text
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', req.user!.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const versionId = req.params.id;

    // Get the prompt version to activate
    const { data: version, error: fetchError } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (fetchError || !version) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }

    const v = version as any;

    if (v.is_active) {
      return res.status(400).json({ error: 'This prompt version is already active' });
    }

    // Deactivate all versions first
    const { error: deactivateError } = await supabase
      .from('prompt_versions')
      .update({ is_active: false } as any)
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (deactivateError) {
      console.error('Error deactivating prompt versions:', deactivateError);
      return res.status(500).json({ error: deactivateError.message });
    }

    // Activate the specified version
    const { data: activatedVersion, error: activateError } = await supabase
      .from('prompt_versions')
      .update({
        is_active: true,
        deployed_at: new Date().toISOString(),
      } as any)
      .eq('id', versionId)
      .select(`
        *,
        created_by_user:users(id, full_name, email, avatar_url)
      `)
      .single();

    if (activateError) {
      console.error('Error activating prompt version:', activateError);
      return res.status(500).json({ error: activateError.message });
    }

    // Create activity record
    await supabase.from('activities').insert({
      type: 'prompt_version_deployed',
      lead_id: null,
      user_id: req.user!.id,
      title: 'Prompt Version Deployed',
      description: `${(userData as any).full_name} deployed prompt version ${v.version}`,
      metadata: {
        version: v.version,
        prompt_version_id: versionId,
        previous_active: null, // Could track previous version if needed
      },
    } as any);

    // Notify all users about the new prompt version
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true);

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map((u: any) => ({
        user_id: u.id,
        type: 'prompt_deployed',
        title: 'New Prompt Version Deployed',
        message: `${(userData as any).full_name} deployed prompt version ${v.version}. The bot is now using the updated prompt.`,
        link: '/dashboard/training/prompt',
        metadata: {
          version: v.version,
          prompt_version_id: versionId,
          deployed_by: req.user!.id,
          deployed_by_name: (userData as any).full_name,
        },
      }));

      await supabase.from('notifications').insert(notifications as any);
    }

    return res.json({
      version: activatedVersion,
      message: `Prompt version ${v.version} activated successfully`,
    });
  } catch (error) {
    console.error('Error in prompt activate API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// 6. POST /api/prompt/generate — start prompt generation job (long-running!)
// ===========================================================================
router.post('/api/prompt/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      training_export,
      knowledge_base_ids,
      base_prompt_version_id,
      user_instructions,
    } = req.body;

    if (!training_export || typeof training_export !== 'string') {
      return res.status(400).json({ error: 'training_export is required' });
    }

    // Fetch base prompt version
    let basePromptQuery = supabase
      .from('prompt_versions')
      .select('id, version, prompt_text');

    if (base_prompt_version_id) {
      basePromptQuery = basePromptQuery.eq('id', base_prompt_version_id);
    } else {
      basePromptQuery = basePromptQuery.eq('is_active', true);
    }

    const { data: basePrompt, error: promptError } = await basePromptQuery.single();

    if (promptError || !basePrompt) {
      return res.status(404).json({ error: 'No base prompt version found' });
    }

    const bp = basePrompt as any;

    // Fetch knowledge base entries
    let kbQuery = supabase
      .from('knowledge_base')
      .select('id, category, title, content')
      .eq('is_active', true)
      .order('category');

    if (knowledge_base_ids && Array.isArray(knowledge_base_ids) && knowledge_base_ids.length > 0) {
      kbQuery = kbQuery.in('id', knowledge_base_ids);
    }

    const { data: kbEntries } = await kbQuery;

    // Format KB snapshot
    const kbSnapshot = (kbEntries || [])
      .map((e: any) => `### [${e.category}] ${e.title}\n${e.content}`)
      .join('\n\n---\n\n');

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('prompt_generation_jobs')
      .insert({
        status: 'pending',
        created_by: req.user!.id,
        training_export,
        knowledge_base_snapshot: kbSnapshot || null,
        base_prompt_version_id: bp.id,
        user_instructions: user_instructions || null,
      } as any)
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('Error creating generation job:', jobError);
      return res.status(500).json({ error: 'Failed to create generation job' });
    }

    // Build a lightweight KB summary for Claude (titles only, not full content)
    // Full KB is already embodied in the current prompt — titles give context without 57KB overhead
    const kbSummary = (kbEntries || [])
      .map((e: any) => `- [${e.category}] ${e.title}`)
      .join('\n');

    // Fire-and-forget: on Express/Railway the process is persistent,
    // so we just kick off the generation and return 202 immediately.
    runGeneration(
      (job as any).id,
      training_export,
      bp.prompt_text,
      kbSummary,
      user_instructions || '',
      req.user!.id,
    ).catch((err) => {
      console.error('Unhandled error in runGeneration:', err);
    });

    return res.status(202).json({ job_id: (job as any).id });
  } catch (error) {
    console.error('Error in prompt generate API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================================
// 7. GET /api/prompt/generate/:jobId — poll generation status
// ===========================================================================
router.get('/api/prompt/generate/:jobId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { jobId } = req.params;

    const { data: job, error: jobError } = await supabase
      .from('prompt_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const j = job as any;
    return res.json({
      id: j.id,
      status: j.status,
      generated_prompt: j.generated_prompt,
      generated_notes: j.generated_notes,
      model_used: j.model_used,
      input_tokens: j.input_tokens,
      output_tokens: j.output_tokens,
      error_message: j.error_message,
      created_at: j.created_at,
      completed_at: j.completed_at,
    });
  } catch (error) {
    console.error('Error in prompt generate status API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
