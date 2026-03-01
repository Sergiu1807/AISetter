import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/conversations/:leadId
router.get('/api/conversations/:leadId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`*, taken_over_user:users!taken_over_by(id, full_name)`)
      .eq('lead_id', leadId)
      .single();

    if (convError) {
      // Auto-create conversation if it doesn't exist
      const { data: leadExists } = await supabase
        .from('leads').select('id').eq('id', leadId).single();

      if (!leadExists) return res.status(404).json({ error: 'Lead not found' });

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({ lead_id: leadId, bot_active: true })
        .select(`*, taken_over_user:users!taken_over_by(id, full_name)`)
        .single();

      if (createError || !newConv) return res.status(500).json({ error: 'Failed to create conversation' });

      const nc = newConv as any;
      return res.json({
        conversation: {
          id: nc.id, lead_id: nc.lead_id, bot_active: nc.bot_active,
          human_taken_over: nc.human_taken_over, taken_over_by: nc.taken_over_by,
          taken_over_by_name: nc.taken_over_user?.full_name || null,
          taken_over_at: nc.taken_over_at,
          created_at: nc.created_at, updated_at: nc.updated_at, messages: [],
        },
      });
    }

    const conversationId = (conversation as any).id;
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`*, sender_user:users!sender_id(id, full_name)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) return res.status(500).json({ error: msgError.message });

    const conv = conversation as any;
    res.json({
      conversation: {
        id: conv.id, lead_id: conv.lead_id, bot_active: conv.bot_active,
        human_taken_over: conv.human_taken_over, taken_over_by: conv.taken_over_by,
        taken_over_by_name: conv.taken_over_user?.full_name || null,
        taken_over_at: conv.taken_over_at,
        created_at: conv.created_at, updated_at: conv.updated_at,
        messages: (messages || []).map((msg: any) => ({
          id: msg.id, conversation_id: msg.conversation_id,
          sender_type: msg.sender_type,
          sender_name: msg.sender_user?.full_name || null,
          content: msg.content, timestamp: msg.created_at,
          status: msg.status, metadata: msg.metadata,
        })),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/conversations/:leadId
router.patch('/api/conversations/:leadId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const body = req.body;

    const { data: conversation, error: convError } = await supabase
      .from('conversations').select('id').eq('lead_id', leadId).single();

    if (convError) return res.status(404).json({ error: 'Conversation not found' });

    const convId = (conversation as any).id;
    const { data, error } = await supabase
      .from('conversations').update(body as never).eq('id', convId).select().single();

    if (error) return res.status(500).json({ error: error.message });

    // Human takeover activity
    if (body.human_taken_over === true && body.taken_over_by) {
      const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
      const { data: userData } = await supabase.from('users').select('full_name').eq('id', body.taken_over_by).single();

      if (lead && userData) {
        await supabase.from('activities').insert({
          type: 'human_takeover', lead_id: leadId, user_id: body.taken_over_by,
          title: 'Human Takeover',
          description: `${(userData as any).full_name} took over conversation with ${(lead as any).name}`,
          metadata: body.metadata || {},
        } as never);
      }
      await supabase.from('leads').update({ needs_human: false, bot_paused: true } as never).eq('id', leadId);
    }

    // Return to bot activity
    if (body.bot_active === true && body.human_taken_over === false) {
      const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
      if (lead) {
        await supabase.from('activities').insert({
          type: 'bot_resumed', lead_id: leadId, user_id: req.user!.id,
          title: 'Bot Resumed',
          description: `Bot resumed conversation with ${(lead as any).name}`,
        } as never);
      }
      await supabase.from('leads').update({ bot_paused: false } as never).eq('id', leadId);
    }

    res.json({ conversation: data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
