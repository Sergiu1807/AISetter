import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { config } from '@/lib/config';

const router = Router();

// GET /api/integrations/status
// Returns real connection status for each integration by checking env vars on the server.
// Never exposes actual keys — only reports connected/disconnected.
router.get('/api/integrations/status', requireAuth, async (_req: AuthRequest, res: Response) => {
  const results: Record<string, { status: 'connected' | 'disconnected'; label: string }> = {};

  // Anthropic
  results.anthropic = {
    status: config.ANTHROPIC_API_KEY ? 'connected' : 'disconnected',
    label: 'Anthropic API',
  };

  // ManyChat
  results.manychat = {
    status: config.MANYCHAT_API_KEY && config.MANYCHAT_RESPONSE_FLOW_ID ? 'connected' : 'disconnected',
    label: 'ManyChat',
  };

  // Supabase — do a lightweight ping
  try {
    const { error } = await supabase.from('leads').select('id').limit(1);
    results.supabase = {
      status: error ? 'disconnected' : 'connected',
      label: 'Supabase',
    };
  } catch {
    results.supabase = { status: 'disconnected', label: 'Supabase' };
  }

  // GHL Calendar
  results.ghl = {
    status: config.GHL_CALENDAR_ID && config.GHL_LOCATION_ID ? 'connected' : 'disconnected',
    label: 'GHL Calendar',
  };

  // Telegram (optional)
  results.telegram = {
    status: config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID ? 'connected' : 'disconnected',
    label: 'Telegram',
  };

  // Media processing
  results.gemini = {
    status: config.GEMINI_API_KEY ? 'connected' : 'disconnected',
    label: 'Gemini (Media)',
  };
  results.openai = {
    status: config.OPENAI_API_KEY ? 'connected' : 'disconnected',
    label: 'OpenAI (Voice)',
  };

  res.json({ integrations: results });
});

export default router;
