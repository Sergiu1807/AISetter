import { supabase } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';
import type { Lead } from '@/types/database.types';

const DASHBOARD_URL = 'https://aisetter.iterio.ro';

/**
 * Notify about an escalation event (in-app activity + Telegram).
 * Fire-and-forget safe — never throws, only logs errors.
 */
export async function notifyEscalation(
  lead: Lead,
  level: string,
  reason: string
): Promise<void> {
  const levelUpper = level.toUpperCase();
  const leadName = lead.name || 'Unknown';
  const handle = lead.instagram_handle || '';
  const phase = lead.conversation_phase || '?';
  const status = lead.qualification_status || '?';

  console.log(`[ESCALATION] ${levelUpper} for ${leadName} ${handle}: ${reason}`);

  // 1. Insert activity (in-app notification — shows in Alerts page via Supabase Realtime)
  try {
    await supabase.from('activities').insert({
      type: 'escalation',
      lead_id: lead.id,
      title: `Escalation ${levelUpper}: ${leadName}`,
      description: reason,
      metadata: {
        escalation_level: level,
        escalation_reason: reason,
        conversation_phase: phase,
        qualification_status: status,
        instagram_handle: handle,
      },
    });
  } catch (error) {
    console.error('[ESCALATION] Failed to insert activity:', error);
  }

  // 2. Send Telegram notification
  const emoji = level === 'high' ? '\u{1F6A8}' : '\u{26A0}\u{FE0F}';
  const telegramText = [
    `${emoji} <b>ESCALARE ${levelUpper}</b>: ${leadName} (${handle})`,
    `<b>Motiv:</b> ${reason}`,
    `Fază: ${phase} | Status: ${status}`,
    ``,
    `\u{1F449} <a href="${DASHBOARD_URL}/dashboard/leads/${lead.id}">Deschide în Dashboard</a>`,
  ].join('\n');

  await sendTelegramMessage(telegramText);
}
