import { config } from './config';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const TELEGRAM_TIMEOUT_MS = 10_000;

/**
 * Send a message via Telegram Bot API.
 * Returns true if sent successfully, false otherwise.
 * Silently skips if TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID are not configured.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) {
    console.log('[TELEGRAM] Bot token or chat ID not configured — skipping');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

    const response = await fetch(`${TELEGRAM_API_BASE}${config.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[TELEGRAM] API error ${response.status}: ${errorBody}`);
      return false;
    }

    console.log('[TELEGRAM] Message sent successfully');
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[TELEGRAM] Request timeout');
    } else {
      console.error('[TELEGRAM] Send error:', error);
    }
    return false;
  }
}
