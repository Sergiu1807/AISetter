import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/activities
router.get('/api/activities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, lead_id, limit: limitStr } = req.query;
    const limit = parseInt(limitStr as string || '50');

    let query = supabase
      .from('activities')
      .select(`*, lead:leads(id, name, handle), user:users!user_id(id, full_name)`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type && type !== 'all') query = query.eq('type', type as string);
    if (lead_id && lead_id !== 'all') query = query.eq('lead_id', lead_id as string);

    const { data: activities, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const transformed = (activities || []).map((a: any) => ({
      id: a.id, type: a.type, lead_id: a.lead_id,
      lead_name: a.lead?.name || 'Unknown',
      lead_handle: a.lead?.handle || '',
      title: a.title, description: a.description,
      timestamp: a.created_at,
      metadata: { ...a.metadata, agent_name: a.user?.full_name },
    }));

    res.json({ activities: transformed });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/activities
router.post('/api/activities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, lead_id, title, description, metadata } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields: type, title, description' });
    }

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        type, lead_id: lead_id || null, user_id: req.user!.id,
        title, description, metadata: metadata || {},
      } as never)
      .select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ activity });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
