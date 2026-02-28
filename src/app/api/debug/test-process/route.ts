// @ts-nocheck
// TEMPORARY DEBUG ENDPOINT - remove after debugging
import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/services/lead.service';
import { promptService } from '@/services/prompt.service';
import { parserService } from '@/services/parser.service';
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';
import { generateMessageId } from '@/utils/format';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const steps: string[] = [];
  try {
    const body = await request.json();
    const manychatUserId = body.manychatUserId || '1047926636';
    const message = body.message || 'test debug';

    // Step 1: Find lead
    steps.push('Finding lead...');
    const lead = await leadService.findByManychatId(manychatUserId);
    if (!lead) {
      return NextResponse.json({ steps, error: 'Lead not found' });
    }
    steps.push(`Lead found: ${lead.id}, ${lead.messages.length} messages`);

    // Step 2: Add message
    leadService.addMessage(lead, {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    steps.push(`Messages now: ${lead.messages.length}`);

    // Step 3: Build prompt
    steps.push('Building prompt...');
    const { staticPrompt, dynamicContext } = await promptService.buildPrompt(lead);
    steps.push(`Prompt: ${staticPrompt.length} chars static, ${dynamicContext.length} chars dynamic`);

    // Step 4: Format messages
    const claudeMessages = promptService.formatMessagesForClaude(lead.messages);
    steps.push(`Claude messages: ${claudeMessages.length}, roles: ${claudeMessages.map(m => m.role).join(',')}`);

    // Step 5: Call Claude
    steps.push(`Calling Claude (${CLAUDE_CONFIG.model})...`);
    const response = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.max_tokens,
      temperature: CLAUDE_CONFIG.temperature,
      system: [
        { type: 'text', text: staticPrompt, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicContext }
      ],
      messages: claudeMessages
    });
    const textContent = response.content.find(c => c.type === 'text');
    const rawResponse = textContent?.text || '';
    steps.push(`Claude responded: ${rawResponse.length} chars`);

    // Step 6: Parse
    const parsed = parserService.parseAgentResponse(rawResponse);
    steps.push(`Parsed: response=${parsed.response.length} chars, analysis=${parsed.analysis?.length || 0} chars`);

    // Don't save or send to ManyChat
    return NextResponse.json({
      status: 'ok',
      steps,
      response_preview: parsed.response.substring(0, 200),
      meta: parsed.meta
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({
      status: 'error',
      steps,
      error: errorMessage,
      stack: errorStack?.split('\n').slice(0, 5)
    }, { status: 500 });
  }
}
