import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { agentService } from '@/services/agent.service';

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

    if (!payload.custom_fields || !payload.custom_fields['AI > User Messages']) {
      console.error('[WEBHOOK] Missing AI > User Messages field');
      return res.status(200).json({ status: 'error', message: 'Missing user message' });
    }

    const manychatUserId = payload.id;
    const userMessage = payload.custom_fields['AI > User Messages'];

    if (userMessage.length > 2000) {
      return res.status(200).json({ status: 'error', message: 'Message too long' });
    }

    const firstName = payload.first_name || '';
    const lastName = payload.last_name || '';
    const igUsername = payload.ig_username;

    console.log(`[WEBHOOK] Received from ${manychatUserId.substring(0, 8)}... msg="${userMessage.substring(0, 40)}"`);

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
    }).catch(error => {
      console.error('[WEBHOOK] Background processing error:', error);
    });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return res.status(200).json({ status: 'error', message: 'Internal error' });
  }
});

export default router;
