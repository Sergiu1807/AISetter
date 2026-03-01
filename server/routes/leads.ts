import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { manychatClient } from '@/lib/manychat';

const router = Router();
const MANYCHAT_DELETE_FLOW_NS = 'content20260126074113_204795';

// GET /api/leads
router.get('/api/leads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, phase, assigned_to, search, needs_human, bot_paused, has_errors } = req.query;

    let query = supabase
      .from('leads')
      .select(`*, assigned_user:users!assigned_to(id, full_name, email)`)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status as string);
    if (phase && phase !== 'all') query = query.eq('current_phase', phase as string);
    if (assigned_to && assigned_to !== 'all') {
      if (assigned_to === 'unassigned') query = query.is('assigned_to', null);
      else query = query.eq('assigned_to', assigned_to as string);
    }
    if (needs_human === 'true') query = query.eq('needs_human', true);
    if (bot_paused === 'true') query = query.eq('bot_paused', true);
    if (has_errors === 'true') query = query.eq('has_errors', true);

    const { data: leads, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    let filteredLeads: any[] = leads || [];
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredLeads = filteredLeads.filter(
        (lead: any) =>
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.handle?.toLowerCase().includes(searchLower) ||
          lead.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }

    const transformedLeads = filteredLeads.map((lead: any) => ({
      id: lead.id, name: lead.name, handle: lead.handle,
      manychat_user_id: lead.manychat_user_id, status: lead.status,
      current_phase: lead.current_phase, message_count: lead.message_count,
      assigned_to: lead.assigned_to,
      assigned_to_name: lead.assigned_user?.full_name || null,
      tags: lead.tags, needs_human: lead.needs_human,
      bot_paused: lead.bot_paused, has_errors: lead.has_errors,
      last_message_at: lead.last_message_at,
      created_at: lead.created_at, updated_at: lead.updated_at,
    }));

    res.json({ leads: transformedLeads });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads
router.post('/api/leads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, handle, manychat_user_id, email, phone } = req.body;
    if (!name || !handle || !manychat_user_id) {
      return res.status(400).json({ error: 'Missing required fields: name, handle, manychat_user_id' });
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({ name, handle, manychat_user_id, email, phone, status: 'new', current_phase: 'P1' } as never)
      .select().single();

    if (error) return res.status(500).json({ error: error.message });

    const leadId = (lead as any).id;
    await supabase.from('conversations').insert({ lead_id: leadId, bot_active: true } as never);
    await supabase.from('activities').insert({
      type: 'new_lead', lead_id: leadId, title: 'New Lead',
      description: `${name} started a conversation`, metadata: { source: 'ManyChat' },
    } as never);

    res.status(201).json({ lead });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/leads (bulk)
router.delete('/api/leads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!['admin', 'manager'].includes(req.userRole || '')) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    const { lead_ids } = req.body;
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array is required' });
    }

    const { data: leadsToDelete } = await supabase
      .from('leads').select('manychat_user_id').in('id', lead_ids);

    if (leadsToDelete && leadsToDelete.length > 0) {
      await Promise.allSettled(
        leadsToDelete
          .filter((l: any) => l.manychat_user_id)
          .map((l: any) => manychatClient.sendFlow(l.manychat_user_id, MANYCHAT_DELETE_FLOW_NS).catch(() => {}))
      );
    }

    const { error } = await supabase.from('leads').delete().in('id', lead_ids);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: `${lead_ids.length} lead(s) deleted` });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/leads (bulk)
router.patch('/api/leads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { lead_ids, updates } = req.body;
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array is required' });
    }

    const { data, error } = await supabase
      .from('leads').update(updates as never).in('id', lead_ids).select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ updated: data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads/:id
router.get('/api/leads/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`*, assigned_user:users!assigned_to(id, full_name, email)`)
      .eq('id', req.params.id).single();

    if (error) return res.status(404).json({ error: error.message });

    const l = lead as any;
    res.json({
      lead: {
        id: l.id, name: l.name, handle: l.handle,
        manychat_user_id: l.manychat_user_id, status: l.status,
        current_phase: l.current_phase, message_count: l.message_count,
        assigned_to: l.assigned_to,
        assigned_to_name: l.assigned_user?.full_name || null,
        tags: l.tags, needs_human: l.needs_human,
        bot_paused: l.bot_paused, has_errors: l.has_errors,
        last_message_at: l.last_message_at,
        created_at: l.created_at, updated_at: l.updated_at,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/leads/:id
router.patch('/api/leads/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads').update(req.body as never).eq('id', req.params.id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ lead });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/leads/:id
router.delete('/api/leads/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!['admin', 'manager'].includes(req.userRole || '')) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    const { data: lead } = await supabase
      .from('leads').select('manychat_user_id').eq('id', req.params.id).single();

    if (lead?.manychat_user_id) {
      await manychatClient.sendFlow(lead.manychat_user_id, MANYCHAT_DELETE_FLOW_NS).catch(() => {});
    }

    const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Lead deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
