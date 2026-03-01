import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { agentService } from '@/services/agent.service';
import { extractMediaFromPayload } from '@/services/media.service';

const router = Router();

function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    if (signature.length !== expectedSignature.length) return false;
    return timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'));
  } catch {
    return false;
  }
}

// POST /api/webhook/manychat
router.post('/api/webhook/manychat', async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-manychat-signature'] as string | undefined;

    // Verify webhook signature
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature || null, webhookSecret);
      if (!isValid) {
        console.error('[WEBHOOK] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const payload = req.body;

    if (!payload.id) {
      console.error('[WEBHOOK] Missing subscriber ID');
      return res.status(200).json({ status: 'error', message: 'Missing subscriber ID' });
    }

    const manychatUserId = payload.id;
    const userMessage = payload.custom_fields?.['AI > User Messages'] || '';

    // Detect media in the payload (images, voice notes, video)
    const media = extractMediaFromPayload(payload);

    // Must have either text or media
    if (!userMessage && !media) {
      console.error('[WEBHOOK] No text message or media found');
      // Log payload keys to help debug what ManyChat sends
      console.log('[WEBHOOK] Payload keys:', Object.keys(payload));
      if (payload.custom_fields) {
        console.log('[WEBHOOK] Custom fields:', Object.keys(payload.custom_fields));
      }
      return res.status(200).json({ status: 'error', message: 'No message or media' });
    }

    if (userMessage.length > 2000) {
      return res.status(200).json({ status: 'error', message: 'Message too long' });
    }

    const firstName = payload.first_name || '';
    const lastName = payload.last_name || '';
    const igUsername = payload.ig_username;

    const mediaInfo = media ? ` + ${media.type} media` : '';
    console.log(`[WEBHOOK] Received from ${manychatUserId.substring(0, 8)}... msg="${userMessage.substring(0, 40)}"${mediaInfo}`);

    // Return 200 immediately — process in background
    // On Railway (persistent server), we can just fire-and-forget safely
    res.status(200).json({ status: 'ok' });

    // Process message AFTER sending response (Railway keeps the process alive)
    agentService.processMessage({
      manychatUserId,
      firstName,
      lastName,
      igUsername,
      message: userMessage,
      mediaUrl: media?.url,
      mediaType: media?.type,
    }).catch(error => {
      console.error('[WEBHOOK] Background processing error:', error);
    });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return res.status(200).json({ status: 'error', message: 'Internal error' });
  }
});

export default router;
