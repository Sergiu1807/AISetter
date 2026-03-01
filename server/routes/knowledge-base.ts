import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/knowledge-base
router.get('/api/knowledge-base', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category, is_active } = req.query;

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category as string);
    }

    if (is_active !== undefined && is_active !== null && is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Error fetching knowledge base:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ entries: entries || [] });
  } catch (error) {
    console.error('Error in knowledge base GET:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/knowledge-base (admin only)
router.post('/api/knowledge-base', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { category, title, content } = req.body;

    if (!category || !title || !content) {
      return res.status(400).json({ error: 'category, title, and content are required' });
    }

    const validCategories = [
      'sales_psychology', 'objection_handling', 'conversation_flow',
      'qualification_skills', 'closing_techniques', 'tone_and_voice',
      'industry_knowledge', 'general'
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const { data: entry, error: insertError } = await supabase
      .from('knowledge_base')
      .insert({
        category,
        title,
        content,
        is_active: true,
        created_by: req.user!.id
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating knowledge base entry:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json({ entry });
  } catch (error) {
    console.error('Error in knowledge base POST:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/knowledge-base/:id (admin only)
router.patch('/api/knowledge-base/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const body = req.body;
    const updateData: Record<string, unknown> = {};

    if (body.category !== undefined) updateData.category = body.category;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: entry, error: updateError } = await supabase
      .from('knowledge_base')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating knowledge base entry:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ entry });
  } catch (error) {
    console.error('Error in knowledge base PATCH:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/knowledge-base/:id (admin only - soft delete)
router.delete('/api/knowledge-base/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Soft delete: set is_active = false
    const { data: entry, error: updateError } = await supabase
      .from('knowledge_base')
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error deleting knowledge base entry:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ entry });
  } catch (error) {
    console.error('Error in knowledge base DELETE:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
