// @ts-nocheck
// TEMPORARY DEBUG ENDPOINT - remove after debugging
import { NextRequest, NextResponse } from 'next/server';
import { agentService } from '@/services/agent.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manychatUserId, message } = body;

    if (!manychatUserId || !message) {
      return NextResponse.json({ error: 'Missing manychatUserId or message' }, { status: 400 });
    }

    console.log('[DEBUG] Starting test processMessage...');

    await agentService.processMessage({
      manychatUserId,
      firstName: 'Test',
      lastName: 'User',
      message
    });

    return NextResponse.json({ status: 'ok', message: 'Processed successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[DEBUG] Error:', error);

    return NextResponse.json({
      status: 'error',
      error: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}
