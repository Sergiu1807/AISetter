import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthData {
  month: number;
  name: string;
  outbound_replies: number;
  inbound_dms: number;
  inbound_comments: number;
  followups: number;
  calls_proposed: number;
  links_pending: number;
  calls_booked: number;
}

// GET /api/analytics/kpi?year=2026
router.get('/api/analytics/kpi', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    // Initialize 12 months
    const months: MonthData[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: MONTH_NAMES[i],
      outbound_replies: 0,
      inbound_dms: 0,
      inbound_comments: 0,
      followups: 0,
      calls_proposed: 0,
      links_pending: 0,
      calls_booked: 0,
    }));

    // 1. Messages per month by sender_type (outbound_replies + inbound_dms)
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, created_at')
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (messages) {
      for (const msg of messages) {
        const monthIdx = new Date(msg.created_at).getMonth();
        if (msg.sender_type === 'bot') {
          months[monthIdx].outbound_replies++;
        } else if (msg.sender_type === 'lead') {
          months[monthIdx].inbound_dms++;
        }
      }
    }

    // 2. Calls booked per month (from activities)
    const { data: bookings } = await supabase
      .from('activities')
      .select('created_at')
      .eq('type', 'call_booked')
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (bookings) {
      for (const booking of bookings) {
        const monthIdx = new Date(booking.created_at).getMonth();
        months[monthIdx].calls_booked++;
      }
    }

    // 3. Leads data for multiple metrics
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, updated_at, last_message_at, lead_source, conversation_phase, qualification_status, is_returning')
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (leads) {
      for (const lead of leads) {
        const createdMonth = new Date(lead.created_at).getMonth();

        // Inbound comments (leads from comment sources)
        if (lead.lead_source && (
          lead.lead_source.includes('comment') ||
          lead.lead_source.includes('story_reply') ||
          lead.lead_source.includes('reel')
        )) {
          months[createdMonth].inbound_comments++;
        }

        // Follow-ups (returning leads)
        if (lead.is_returning && lead.last_message_at) {
          const returnMonth = new Date(lead.last_message_at).getMonth();
          months[returnMonth].followups++;
        }

        // Calls proposed (leads that reached booking phase P4/P5)
        if (['P4', 'P5', 'P6', 'P7', 'DONE'].includes(lead.conversation_phase)) {
          const updateMonth = lead.updated_at
            ? new Date(lead.updated_at).getMonth()
            : createdMonth;
          months[updateMonth].calls_proposed++;
        }

        // Links pending (qualified but not booked)
        if (lead.qualification_status === 'qualified') {
          months[createdMonth].links_pending++;
        }
      }
    }

    res.json({ months, year });
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
