import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// POST /api/messages
router.post('/api/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversation_id, content, sender_type, metadata } = req.body;

    if (!conversation_id || !content || !sender_type) {
      return res.status(400).json({ error: 'Missing required fields: conversation_id, content, sender_type' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id, sender_type,
        sender_id: sender_type === 'human' ? req.user!.id : null,
        content, status: 'sent', metadata: metadata || {},
      })
      .select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
