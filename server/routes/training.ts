import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// POST /api/training/submit - Submit a training example
router.post('/api/training/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check user role (operator+ can submit)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedRoles = ['admin', 'manager', 'operator'];
    if (!allowedRoles.includes(userData.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions. Only operators and above can submit training examples.'
      });
    }

    // Parse request body
    const {
      conversation_id,
      user_message: providedUserMessage,
      ai_response: providedAiResponse,
      expected_response,
      feedback,
      example_type,
      context,
      conversation_turns
    } = req.body;

    // Validate example_type
    if (!['good', 'bad', 'correction'].includes(example_type)) {
      return res.status(400).json({
        error: 'Invalid example_type. Must be "good", "bad", or "correction"'
      });
    }

    // For multi-turn manual examples, validate conversation_turns instead of single feedback
    if (conversation_turns && Array.isArray(conversation_turns) && conversation_turns.length > 0) {
      for (let i = 0; i < conversation_turns.length; i++) {
        const turn = conversation_turns[i];
        if (!turn.user_message?.trim() || !turn.ai_response?.trim() || !turn.feedback?.trim()) {
          return res.status(400).json({
            error: `All fields are required for turn ${i + 1}`
          });
        }
      }
    } else if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({
        error: 'Feedback is required'
      });
    }

    let user_message = providedUserMessage;
    let ai_response = providedAiResponse;
    let conversationData: any = null;
    let conversationSnapshot: any = null;

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
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Get ALL messages from conversation for the snapshot
      const { data: allMessages, error: allMsgError } = await supabase
        .from('messages')
        .select('sender_type, content, created_at')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (allMsgError) {
        console.error('Error fetching messages:', allMsgError);
        return res.status(500).json({ error: allMsgError.message });
      }

      // Create conversation snapshot to preserve the full conversation
      conversationSnapshot = {
        lead_name: (conversation as any).leads?.name || 'Unknown',
        lead_handle: (conversation as any).leads?.handle || 'Unknown',
        captured_at: new Date().toISOString(),
        messages: allMessages?.map((m: any) => ({
          sender_type: m.sender_type,
          content: m.content,
          created_at: m.created_at
        })) || []
      };

      // Extract user and bot messages if not provided (use most recent)
      if (!user_message || !ai_response) {
        const reversedMessages = [...(allMessages || [])].reverse();
        const leadMsg = reversedMessages.find((m: any) => m.sender_type === 'lead');
        const botMsg = reversedMessages.find((m: any) => m.sender_type === 'bot');

        if (!leadMsg || !botMsg) {
          return res.status(400).json({
            error: 'Could not find both lead and bot messages in conversation'
          });
        }

        user_message = user_message || leadMsg.content;
        ai_response = ai_response || botMsg.content;
      }

      conversationData = conversation;
    }

    // Mode 2: Manual example - validate required fields
    if (!conversation_id && (!user_message || !ai_response)) {
      return res.status(400).json({
        error: 'user_message and ai_response are required for manual examples'
      });
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
      submitted_by: userId,
      created_by: userId
    };

    // Add context, conversation snapshot, and conversation turns to metadata
    const metadata: Record<string, unknown> = {};
    if (context) {
      Object.assign(metadata, context);
    }
    if (conversationSnapshot) {
      metadata.conversation_snapshot = conversationSnapshot;
    }
    if (conversation_turns && Array.isArray(conversation_turns) && conversation_turns.length > 1) {
      metadata.conversation_turns = conversation_turns;
    }
    if (Object.keys(metadata).length > 0) {
      trainingData.metadata = metadata;
    }

    const { data: example, error: insertError } = await supabase
      .from('training_examples')
      .insert(trainingData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating training example:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Create activity record
    const activityDescription = conversation_id
      ? `Submitted ${example_type} training example from conversation with ${(conversationData as any)?.leads?.name || 'lead'}`
      : `Submitted ${example_type} training example (manual)`;

    await supabase.from('activities').insert({
      type: 'training_example_submitted',
      lead_id: conversationData?.lead_id || null,
      user_id: userId,
      title: 'Training Example Submitted',
      description: activityDescription,
      metadata: {
        example_id: example.id,
        example_type,
        feedback_preview: feedback.substring(0, 100),
        conversation_id: conversation_id || null
      }
    });

    // Notify managers about new submission
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'manager'])
      .eq('is_active', true);

    if (managers && managers.length > 0) {
      const notifications = managers.map((manager: any) => ({
        user_id: manager.id,
        type: 'training_review',
        title: 'New Training Example Pending Review',
        message: `${userData.full_name} submitted a ${example_type} training example for review`,
        link: `/dashboard/training/review?example=${example.id}`,
        metadata: {
          example_id: example.id,
          example_type,
          submitted_by: userId,
          submitted_by_name: userData.full_name
        }
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return res.status(201).json({
      example,
      message: 'Training example submitted successfully and is pending review'
    });
  } catch (error) {
    console.error('Error in training submit API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/training/examples - List training examples with filters
router.get('/api/training/examples', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Get query parameters
    const status = req.query.status as string | undefined;
    const example_type = req.query.example_type as string | undefined;
    const submitted_by = req.query.submitted_by as string | undefined;
    const limit = parseInt((req.query.limit as string) || '20');
    const offset = parseInt((req.query.offset as string) || '0');

    // Build query with related data
    let query = supabase
      .from('training_examples')
      .select(`
        *,
        submitted_by_user:users!training_examples_submitted_by_fkey(full_name, email),
        conversation:conversations(
          id,
          leads(name, handle)
        )
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (example_type && example_type !== 'all') {
      query = query.eq('example_type', example_type);
    }

    if (submitted_by) {
      query = query.eq('submitted_by', submitted_by);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: examples, error, count } = await query;

    if (error) {
      console.error('Error fetching training examples:', error);
      return res.status(500).json({ error: error.message });
    }

    const page = Math.floor(offset / limit) + 1;
    const hasMore = count ? offset + limit < count : false;

    return res.json({
      examples: examples || [],
      total: count || 0,
      page,
      hasMore
    });
  } catch (error) {
    console.error('Error in training examples API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/training/examples - Create a training example (simpler version)
router.post('/api/training/examples', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check user role (operator+ can submit)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allowedRoles = ['admin', 'manager', 'operator'];
    if (!allowedRoles.includes(userData.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    // Parse request body
    const {
      conversation_id,
      user_message,
      ai_response,
      expected_response,
      feedback,
      example_type
    } = req.body;

    // Validate required fields
    if (!user_message || !ai_response || !feedback || !example_type) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate example_type
    if (!['good', 'bad', 'correction'].includes(example_type)) {
      return res.status(400).json({
        error: 'Invalid example_type'
      });
    }

    // Create training example
    const { data: example, error: insertError } = await supabase
      .from('training_examples')
      .insert({
        conversation_id: conversation_id || null,
        user_message,
        ai_response,
        expected_response: expected_response || null,
        feedback,
        example_type,
        status: 'pending',
        submitted_by: userId,
        created_by: userId
      })
      .select(`
        *,
        submitted_by_user:users!training_examples_submitted_by_fkey(id, full_name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating training example:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Create activity record
    await supabase.from('activities').insert({
      type: 'training_example_submitted',
      lead_id: null, // Training examples may not always be linked to a specific lead
      user_id: userId,
      title: 'Training Example Submitted',
      description: `${userData.role} submitted a ${example_type} training example`,
      metadata: {
        example_id: example.id,
        example_type,
        feedback_preview: feedback.substring(0, 100)
      }
    });

    // TODO: Create notification for managers
    // This would query for users with role='manager' and create notification records

    return res.status(201).json({ example });
  } catch (error) {
    console.error('Error in training examples POST:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/training/approve/:id - Approve or reject a training example
router.patch('/api/training/approve/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check user role (only manager+ can approve)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['admin', 'manager'].includes(req.userRole || '')) {
      return res.status(403).json({
        error: 'Insufficient permissions. Only managers and admins can approve training examples.'
      });
    }

    // Parse request body
    const { action, notes } = req.body;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const exampleId = req.params.id;

    // Get the training example
    const { data: example, error: fetchError } = await supabase
      .from('training_examples')
      .select('*')
      .eq('id', exampleId)
      .single();

    if (fetchError || !example) {
      return res.status(404).json({
        error: 'Training example not found'
      });
    }

    // Check if already processed
    if (example.status !== 'pending') {
      return res.status(400).json({
        error: `Training example has already been ${example.status}`
      });
    }

    // Update training example
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateData: {
      status: string;
      approved_by: string;
      approved_at: string;
      metadata?: Record<string, unknown>;
    } = {
      status: newStatus,
      approved_by: userId,
      approved_at: new Date().toISOString()
    };

    // Add notes to metadata if provided
    if (notes) {
      updateData.metadata = {
        ...(example.metadata || {}),
        reviewer_notes: notes
      };
    }

    const { data: updatedExample, error: updateError } = await supabase
      .from('training_examples')
      .update(updateData)
      .eq('id', exampleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating training example:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Create activity record
    const activityType = action === 'approve' ? 'training_example_approved' : 'training_example_rejected';
    const activityTitle = action === 'approve' ? 'Training Example Approved' : 'Training Example Rejected';
    const activityDescription = `${userData.full_name} ${action}ed a ${example.example_type} training example`;

    await supabase.from('activities').insert({
      type: activityType,
      lead_id: null,
      user_id: userId,
      title: activityTitle,
      description: activityDescription,
      metadata: {
        example_id: exampleId,
        example_type: example.example_type,
        action,
        reviewer: userData.full_name,
        reviewer_notes: notes || null,
        submitted_by: example.submitted_by
      }
    });

    // Notify submitter
    if (example.submitted_by && example.submitted_by !== userId) {
      const notificationMessage = action === 'approve'
        ? `Your ${example.example_type} training example has been approved by ${userData.full_name}`
        : `Your ${example.example_type} training example was not approved${notes ? ': ' + notes : ''}`;

      await supabase.from('notifications').insert({
        user_id: example.submitted_by,
        type: action === 'approve' ? 'training_approved' : 'training_rejected',
        title: activityTitle,
        message: notificationMessage,
        link: `/dashboard/training?example=${exampleId}`,
        metadata: {
          example_id: exampleId,
          example_type: example.example_type,
          action,
          reviewer: userId,
          reviewer_name: userData.full_name,
          reviewer_notes: notes || null
        }
      });
    }

    return res.json({
      example: updatedExample,
      message: `Training example ${action}ed successfully`
    });
  } catch (error) {
    console.error('Error in training approve API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/training/export - Export approved training examples
router.post('/api/training/export', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Check user role (admin/manager only)
    if (!['admin', 'manager'].includes(req.userRole || '')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { example_ids } = req.body;

    if (!example_ids || !Array.isArray(example_ids) || example_ids.length === 0) {
      return res.status(400).json({ error: 'example_ids is required and must be a non-empty array' });
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
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching training examples:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!examples || examples.length === 0) {
      return res.status(404).json({ error: 'No approved examples found for the given IDs' });
    }

    // Format into structured export document
    const timestamp = new Date().toISOString();
    const lines: string[] = [
      '=== TRAINING EXPORT ===',
      `Generated: ${timestamp}`,
      `Total Examples: ${examples.length}`,
      ''
    ];

    examples.forEach((example: any, index: number) => {
      const snapshot = example.metadata?.conversation_snapshot;
      const leadHandle = snapshot?.lead_handle || 'unknown';
      const exampleDate = new Date(example.created_at).toISOString().split('T')[0];

      lines.push(`--- EXAMPLE ${index + 1} of ${examples.length} ---`);
      lines.push(`Type: ${example.example_type.toUpperCase()} | Date: ${exampleDate} | Lead: @${leadHandle.replace('@', '')}`);
      lines.push('');

      // Full conversation history from snapshot
      if (snapshot?.messages && snapshot.messages.length > 0) {
        lines.push('FULL CONVERSATION HISTORY:');
        snapshot.messages.forEach((msg: { sender_type: string; content: string }) => {
          const sender = msg.sender_type === 'lead' ? 'Lead' : msg.sender_type === 'bot' ? 'Bot' : 'Human';
          lines.push(`[${sender}]: ${msg.content}`);
        });
        lines.push('');
      }

      // Check for multi-turn conversation
      const turns = example.metadata?.conversation_turns;
      if (turns && Array.isArray(turns) && turns.length > 1) {
        lines.push(`CONVERSATION EXAMPLE (${turns.length} turns):`);
        turns.forEach((turn: { user_message: string; ai_response: string; feedback: string }, turnIdx: number) => {
          lines.push(``);
          lines.push(`  Turn ${turnIdx + 1}:`);
          lines.push(`  [User]: ${turn.user_message}`);
          lines.push(`  [Bot]: ${turn.ai_response}`);
          lines.push(`  [Why]: ${turn.feedback}`);
        });
        lines.push('');
      } else {
        // Single-turn (legacy format)
        lines.push('FLAGGED INTERACTION:');
        lines.push(`User Message: ${example.user_message}`);
        lines.push(`Bot Response: ${example.ai_response}`);
        if (example.expected_response) {
          lines.push(`Expected Response: ${example.expected_response}`);
        }
        lines.push('');

        // Trainer feedback
        lines.push('TRAINER FEEDBACK:');
        lines.push(example.feedback || 'No feedback provided');
      }

      // Reviewer notes
      if (example.metadata?.reviewer_notes) {
        lines.push('');
        lines.push('REVIEWER NOTES:');
        lines.push(example.metadata.reviewer_notes);
      }

      lines.push('');
      lines.push('');
    });

    const export_text = lines.join('\n');

    return res.json({
      export_text,
      example_count: examples.length,
      generated_at: timestamp
    });
  } catch (error) {
    console.error('Error in training export API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/training/insights - Get training insights and analytics
router.get('/api/training/insights', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
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
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching training examples:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    const allExamples: any[] = examples || [];

    // Calculate summary statistics
    const summary = {
      total_examples: allExamples.length,
      approved: allExamples.filter((e: any) => e.status === 'approved').length,
      pending: allExamples.filter((e: any) => e.status === 'pending').length,
      rejected: allExamples.filter((e: any) => e.status === 'rejected').length,
      by_type: {
        good: allExamples.filter((e: any) => e.example_type === 'good').length,
        bad: allExamples.filter((e: any) => e.example_type === 'bad').length,
        correction: allExamples.filter((e: any) => e.example_type === 'correction').length
      }
    };

    // Analyze feedback for common issues (only from approved examples)
    const approvedExamples = allExamples.filter((e: any) => e.status === 'approved');
    const badExamples = approvedExamples.filter((e: any) => e.example_type === 'bad' || e.example_type === 'correction');

    // Extract common words/phrases from bad example feedback
    const feedbackTexts = badExamples.map((e: any) => e.feedback.toLowerCase());
    const wordCounts: Record<string, { count: number; examples: string[] }> = {};

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
    ];

    issueKeywords.forEach(keyword => {
      const matchingExamples = feedbackTexts.filter((text: string) => text.includes(keyword));
      if (matchingExamples.length > 0) {
        wordCounts[keyword] = {
          count: matchingExamples.length,
          examples: badExamples
            .filter((e: any) => e.feedback.toLowerCase().includes(keyword))
            .slice(0, 3)
            .map((e: any) => e.id)
        };
      }
    });

    const common_issues = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([issue, data]) => ({
        issue,
        frequency: data.count,
        examples: data.examples
      }));

    // Identify successful patterns from good examples
    const goodExamples = approvedExamples.filter((e: any) => e.example_type === 'good');
    const successful_responses = goodExamples.slice(0, 5).map((e: any) => ({
      pattern: e.feedback.substring(0, 100) + (e.feedback.length > 100 ? '...' : ''),
      context: e.metadata?.phase || 'General',
      example_ids: [e.id]
    }));

    // Calculate performance by phase
    const examplesWithPhase = allExamples.filter((e: any) => e.conversation?.leads?.conversation_phase);
    const phaseGroups: Record<string, { good: number; bad: number }> = {};

    examplesWithPhase.forEach((e: any) => {
      const phase = e.conversation?.leads?.conversation_phase || 'Unknown';
      if (!phaseGroups[phase]) {
        phaseGroups[phase] = { good: 0, bad: 0 };
      }

      if (e.example_type === 'good') {
        phaseGroups[phase].good++;
      } else if (e.example_type === 'bad' || e.example_type === 'correction') {
        phaseGroups[phase].bad++;
      }
    });

    const by_phase = Object.entries(phaseGroups)
      .map(([phase, counts]) => ({
        phase,
        good: counts.good,
        bad: counts.bad
      }))
      .sort((a, b) => a.phase.localeCompare(b.phase));

    // Calculate performance by qualification status
    const examplesWithStatus = allExamples.filter((e: any) => e.conversation?.leads?.qualification_status);
    const statusGroups: Record<string, { good: number; bad: number }> = {};

    examplesWithStatus.forEach((e: any) => {
      const qStatus = e.conversation?.leads?.qualification_status || 'Unknown';
      if (!statusGroups[qStatus]) {
        statusGroups[qStatus] = { good: 0, bad: 0 };
      }

      if (e.example_type === 'good') {
        statusGroups[qStatus].good++;
      } else if (e.example_type === 'bad' || e.example_type === 'correction') {
        statusGroups[qStatus].bad++;
      }
    });

    const by_status = Object.entries(statusGroups)
      .map(([qStatus, counts]) => ({
        status: qStatus,
        good: counts.good,
        bad: counts.bad
      }));

    // Calculate trend over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExamples = allExamples.filter((e: any) => new Date(e.created_at) >= thirtyDaysAgo);

    // Group by date
    const dateGroups: Record<string, { good: number; bad: number }> = {};

    recentExamples.forEach((e: any) => {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      if (!dateGroups[date]) {
        dateGroups[date] = { good: 0, bad: 0 };
      }

      if (e.example_type === 'good') {
        dateGroups[date].good++;
      } else if (e.example_type === 'bad' || e.example_type === 'correction') {
        dateGroups[date].bad++;
      }
    });

    const trend = Object.entries(dateGroups)
      .map(([date, counts]) => ({
        date,
        good: counts.good,
        bad: counts.bad
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Identify improvement areas
    const improvement_areas = by_phase
      .map(phase => {
        const total = phase.good + phase.bad;
        return {
          phase: phase.phase,
          issue_count: phase.bad,
          avg_rating: total > 0 ? (phase.good / total) * 100 : 0
        };
      })
      .filter(area => area.issue_count > 0)
      .sort((a, b) => b.issue_count - a.issue_count);

    return res.json({
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
    });
  } catch (error) {
    console.error('Error in training insights API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
