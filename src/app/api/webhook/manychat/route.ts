import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { agentService } from '@/services/agent.service';
import { config } from '@/lib/config';
import type { ManyChatWebhookPayload } from '@/types/manychat.types';

// Verify ManyChat webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return false;

    return timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (error) {
    console.error('[WEBHOOK] Signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-manychat-signature');

    // 2. Verify webhook signature (if secret is configured)
    if (config.WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        config.WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error('[WEBHOOK] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 3. Parse payload
    const payload: ManyChatWebhookPayload = JSON.parse(rawBody);

    // 4. Validate payload structure
    if (!payload.id) {
      console.error('[WEBHOOK] Missing subscriber ID');
      return NextResponse.json(
        { status: 'error', message: 'Missing subscriber ID' },
        { status: 200 }
      );
    }

    if (!payload.custom_fields || !payload.custom_fields['AI > User Messages']) {
      console.error('[WEBHOOK] Missing AI > User Messages field');
      return NextResponse.json(
        { status: 'error', message: 'Missing user message' },
        { status: 200 }
      );
    }

    // 5. Extract and validate data
    const manychatUserId = payload.id;
    const userMessage = payload.custom_fields['AI > User Messages'];

    // Basic length validation
    if (userMessage.length > 2000) {
      console.error('[WEBHOOK] Message too long');
      return NextResponse.json(
        { status: 'error', message: 'Message too long' },
        { status: 200 }
      );
    }

    const firstName = payload.first_name || '';
    const lastName = payload.last_name || '';
    const igUsername = payload.ig_username;

    // 6. Log incoming webhook (sanitized - only show first 8 chars of ID)
    console.log(`[WEBHOOK] Received message from subscriber ${manychatUserId.substring(0, 8)}...`);

    // 7. Process with agent service
    await agentService.processMessage({
      manychatUserId,
      firstName,
      lastName,
      igUsername,
      message: userMessage
    });

    // 8. Always return 200
    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error: any) {
    console.error('[WEBHOOK] Error processing webhook:', error);

    // CRITICAL: Return 200 even on error to prevent ManyChat retries
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Internal error'
      },
      { status: 200 }
    );
  }
}

// Reject other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
