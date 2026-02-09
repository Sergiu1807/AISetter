// @ts-nocheck
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';
import { manychatClient } from '@/lib/manychat';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { leadService } from './lead.service';
import { promptService } from './prompt.service';
import { parserService } from './parser.service';
import { splitIntoMessageChunks, generateMessageId, getHoursDiff, detectFirstName, sleep } from '@/utils/format';
import type { ProcessMessageInput, ResponseMeta } from '@/types/agent.types';
import type { Lead, LeadPhase, LeadStatus } from '@/types/lead.types';
import type { ManyChatCustomField } from '@/types/manychat.types';

const FALLBACK_MESSAGE = "Scuză-mă, am avut o problemă tehnică. Poți să-mi scrii din nou? 🙏";

export class AgentService {
  async processMessage(input: ProcessMessageInput): Promise<void> {
    try {
      // STEP 1: Find or create lead
      let lead = await leadService.findByManychatId(input.manychatUserId);

      if (!lead) {
        lead = await leadService.create({
          manychat_user_id: input.manychatUserId,
          name: detectFirstName(input.firstName, input.lastName),
          instagram_handle: input.igUsername ? `@${input.igUsername}` : null,
          lead_source: input.leadSource || 'dm_direct'
        });

        // Create conversation record for the new lead
        await supabase.from('conversations').insert({
          lead_id: lead.id,
          bot_active: true,
        });
      }

      // STEP 2: Check control flags
      if (lead.bot_paused || lead.is_blocked) {
        console.log(`Bot paused/blocked for lead ${lead.id}`);
        return; // Don't process, don't respond
      }

      // STEP 3: Check if returning user (>24h since last message)
      if (lead.last_message_at) {
        const hoursSinceLastMessage = getHoursDiff(lead.last_message_at, new Date());
        if (hoursSinceLastMessage > 24) {
          lead.is_returning = true;
          lead.is_new = false;
        }
      }

      // STEP 4: Add user message to history
      leadService.addMessage(lead, {
        id: generateMessageId(),
        role: 'user',
        content: input.message,
        timestamp: new Date().toISOString()
      });

      // STEP 5: Build prompt with dynamic context
      const { staticPrompt, dynamicContext } = await promptService.buildPrompt(lead);

      // STEP 6: Call Claude API with caching and retry logic
      const rawResponse = await this.callClaudeWithRetry(
        staticPrompt,
        dynamicContext,
        promptService.formatMessagesForClaude(lead.messages)
      );

      // STEP 7: Parse response
      const parsed = parserService.parseAgentResponse(rawResponse);

      // STEP 8: Update lead from parsed meta
      this.updateLeadFromMeta(lead, parsed.meta);

      // STEP 9: Add assistant message to history
      leadService.addMessage(lead, {
        id: generateMessageId(),
        role: 'assistant',
        content: parsed.response,
        timestamp: new Date().toISOString(),
        analysis: parsed.analysis || undefined,
        meta: parsed.meta
      });

      lead.last_ai_analysis = parsed.analysis;

      // STEP 10: Save to database (JSONB)
      await leadService.update(lead.id, lead);

      // STEP 10.5: ALSO save to normalized messages table (for frontend)
      await this.saveMessagesToNormalizedTable(lead.id, input.message, parsed.response, parsed.analysis, parsed.meta);

      // STEP 10.6: Track prompt version performance
      await this.trackPromptPerformance(lead, parsed.meta);

      // STEP 11: Send response to ManyChat
      await this.sendToManyChat(lead.manychat_user_id, parsed.response);

    } catch (error) {
      console.error('Agent service error:', error);

      // Send fallback message to user
      try {
        await this.sendToManyChat(input.manychatUserId, FALLBACK_MESSAGE);
      } catch (fallbackError) {
        console.error('Failed to send fallback message:', fallbackError);
      }
    }
  }

  private async callClaudeWithRetry(
    staticPrompt: string,
    dynamicContext: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt < CLAUDE_CONFIG.max_retries; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: CLAUDE_CONFIG.model,
          max_tokens: CLAUDE_CONFIG.max_tokens,
          temperature: CLAUDE_CONFIG.temperature,
          system: [
            {
              type: 'text',
              text: staticPrompt,
              cache_control: { type: 'ephemeral' }  // CACHED
            },
            {
              type: 'text',
              text: dynamicContext  // NOT CACHED
            }
          ],
          messages: messages
        });

        // Extract text from response
        const textContent = response.content.find(c => c.type === 'text');
        if (textContent && 'text' in textContent) {
          return textContent.text;
        }

        throw new Error('No text content in Claude response');

      } catch (error: unknown) {
        lastError = error;

        // Only retry on specific errors
        if (this.shouldRetry(error)) {
          const delay = CLAUDE_CONFIG.retry_delay_ms * Math.pow(2, attempt);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.log(`Claude API error, retrying in ${delay}ms...`, errorMessage);
          await sleep(delay);
          continue;
        }

        break; // Don't retry on non-retryable errors
      }
    }

    // Return fallback response structure
    console.error('Claude API failed after retries:', lastError);
    return this.getFallbackResponse();
  }

  private shouldRetry(error: unknown): boolean {
    // Retry on rate limits and server errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status
      return status === 429 || (status >= 500 && status < 600)
    }
    return false
  }

  private getFallbackResponse(): string {
    return `<analysis>API error occurred</analysis>
<response>${FALLBACK_MESSAGE}</response>
<meta>
Status Calificare: new
Fază Curentă: P1
</meta>`;
  }

  private updateLeadFromMeta(lead: Lead, meta: ResponseMeta): void {
    // Update conversation phase if provided
    if (meta.conversation_phase) {
      const validPhases = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'DONE'];
      if (validPhases.includes(meta.conversation_phase)) {
        lead.conversation_phase = meta.conversation_phase as LeadPhase;
      }
    }

    // Update qualification status if provided
    if (meta.qualification_status) {
      const validStatuses: LeadStatus[] = ['new', 'exploring', 'likely_qualified', 'qualified', 'not_fit', 'nurture'];
      if (validStatuses.includes(meta.qualification_status as LeadStatus)) {
        lead.qualification_status = meta.qualification_status as LeadStatus;
      }
    }

    // Update collected data
    if (meta.pain_points) {
      leadService.updateCollectedData(lead, { pain_points: meta.pain_points });
    }

    if (meta.objections) {
      leadService.updateCollectedData(lead, { objections: meta.objections });
    }

    // Update steps completed
    if (meta.steps_completed) {
      const steps = meta.steps_completed.split(',').map(s => s.trim()).filter(s => s);
      lead.steps_completed = steps;
    }
  }

  private async saveMessagesToNormalizedTable(
    leadId: string,
    userMessage: string,
    botResponse: string,
    analysis: string | null,
    meta: ResponseMeta
  ): Promise<void> {
    try {
      // Get conversation for this lead
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .single();

      if (convError || !conversation) {
        console.error('No conversation found for lead:', leadId, convError);
        return; // Gracefully skip if conversation doesn't exist
      }

      // Save both messages to normalized table
      const { error: messagesError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversation.id,
            sender_type: 'lead',
            content: userMessage,
            status: 'read',
            metadata: {}
          },
          {
            conversation_id: conversation.id,
            sender_type: 'bot',
            content: botResponse,
            status: 'sent',
            metadata: {
              analysis: analysis || undefined,
              phase: meta.conversation_phase || undefined,
              qualification_status: meta.qualification_status || undefined
            }
          }
        ]);

      if (messagesError) {
        console.error('Error saving messages to normalized table:', messagesError);
        // Don't throw - this is a non-critical operation
      }
    } catch (error) {
      console.error('Error in saveMessagesToNormalizedTable:', error);
      // Don't throw - keep webhook working even if normalized save fails
    }
  }

  private async getActivePromptVersion(): Promise<{ prompt_text: string; system_instructions?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching active prompt version:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getActivePromptVersion:', error);
      return null;
    }
  }

  private async trackPromptPerformance(lead: Lead, meta: ResponseMeta): Promise<void> {
    try {
      const activePrompt = await this.getActivePromptVersion();
      if (!activePrompt) {
        // No active prompt version found, skip tracking
        return;
      }

      // Increment total_conversations
      const newTotal = (activePrompt.total_conversations || 0) + 1;

      // Determine if this conversation was successful
      // Success criteria: qualified, booked, or progressed to next phase
      const isSuccess =
        meta.qualification_status === 'qualified' ||
        meta.qualification_status === 'booked' ||
        (meta.conversation_phase && lead.conversation_phase !== meta.conversation_phase);

      // Calculate new success rate
      let newSuccessRate = activePrompt.success_rate || 0;
      if (isSuccess) {
        // Running average: (old_rate * old_count + new_success) / new_count
        const oldSuccesses = (activePrompt.success_rate / 100) * activePrompt.total_conversations;
        newSuccessRate = ((oldSuccesses + 1) / newTotal) * 100;
      } else {
        // Recalculate without adding a success
        const oldSuccesses = (activePrompt.success_rate / 100) * activePrompt.total_conversations;
        newSuccessRate = (oldSuccesses / newTotal) * 100;
      }

      // Update prompt version performance
      const { error: updateError } = await supabase
        .from('prompt_versions')
        .update({
          total_conversations: newTotal,
          success_rate: newSuccessRate
        })
        .eq('id', activePrompt.id);

      if (updateError) {
        console.error('Error updating prompt version performance:', updateError);
      }
    } catch (error) {
      console.error('Error tracking prompt performance:', error);
      // Don't throw - this is non-critical tracking
    }
  }

  private async sendToManyChat(subscriberId: string, response: string): Promise<void> {
    // Split into chunks
    const chunks = splitIntoMessageChunks(response, 6);

    // Prepare fields (only send non-empty fields to avoid ManyChat validation errors)
    const fields: ManyChatCustomField[] = [];
    for (let i = 1; i <= 6; i++) {
      const chunk = chunks[i - 1];
      if (chunk && chunk.trim()) {  // Only add non-empty chunks
        fields.push({
          field_name: `AI > Answer ${i}`,
          field_value: chunk
        });
      }
    }

    // Set custom fields (only if we have any)
    if (fields.length > 0) {
      await manychatClient.setCustomFields(subscriberId, fields);
    }

    // Trigger response flow
    await manychatClient.sendFlow(subscriberId, config.MANYCHAT_RESPONSE_FLOW_ID);
  }
}

export const agentService = new AgentService();
