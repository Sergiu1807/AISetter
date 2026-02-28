// @ts-nocheck
import { anthropic, CLAUDE_CONFIG } from '@/lib/anthropic';
import { manychatClient } from '@/lib/manychat';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { leadService } from './lead.service';
import { promptService } from './prompt.service';
import { parserService } from './parser.service';
import { calendarService } from './calendar.service';
import { splitIntoMessageChunks, generateMessageId, getHoursDiff, detectFirstName, sleep } from '@/utils/format';
import type { ProcessMessageInput, ResponseMeta } from '@/types/agent.types';
import type { Lead, LeadPhase, LeadStatus } from '@/types/lead.types';
import type { ManyChatCustomField } from '@/types/manychat.types';

const FALLBACK_MESSAGE = "Scuză-mă, am avut o problemă tehnică. Poți să-mi scrii din nou? 🙏";

export class AgentService {
  async processMessage(input: ProcessMessageInput): Promise<void> {
    const startTime = Date.now();
    console.log(`[AGENT] Processing message from ${input.manychatUserId.substring(0, 8)}...`);

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

      // STEP 5: Fetch calendar slots if lead is in booking phase (P4/P5)
      let availableSlots = '';
      const isBookingPhase = ['P4', 'P5'].includes(lead.conversation_phase || '');
      if (isBookingPhase && config.GHL_CALENDAR_ID) {
        try {
          const slots = await calendarService.getFormattedSlots();
          availableSlots = calendarService.formatSlotsForPrompt(slots);
          console.log(`[AGENT] Fetched ${slots.length} calendar slots for booking phase`);
        } catch (calendarError) {
          console.error('[AGENT] Calendar fetch failed, using fallback:', calendarError);
          // Graceful fallback — bot will use CALENDAR_LINK instead
        }
      }

      // STEP 5.5: Build prompt with dynamic context
      console.log(`[AGENT] Building prompt for lead ${lead.id.substring(0, 8)}...`);
      const { staticPrompt, dynamicContext } = await promptService.buildPrompt(lead, { availableSlots });
      console.log(`[AGENT] Prompt built (${staticPrompt.length} chars static, ${dynamicContext.length} chars dynamic)`);

      // STEP 6: Call Claude API with caching and retry logic
      console.log(`[AGENT] Calling Claude API...`);
      const rawResponse = await this.callClaudeWithRetry(
        staticPrompt,
        dynamicContext,
        promptService.formatMessagesForClaude(lead.messages)
      );

      console.log(`[AGENT] Claude responded (${rawResponse.length} chars) in ${Date.now() - startTime}ms`);

      // STEP 7: Parse response
      const parsed = parserService.parseAgentResponse(rawResponse);

      // STEP 8: Update lead from parsed meta
      this.updateLeadFromMeta(lead, parsed.meta);

      // STEP 8.5: Handle booking action (fire-and-forget, non-blocking)
      if (parsed.meta.action === 'book_appointment' && parsed.meta.selected_slot) {
        this.handleBooking(lead, parsed.meta).catch(bookingError => {
          console.error('[AGENT] Booking failed (non-blocking):', bookingError);
        });
      }

      // STEP 8.6: Rescue booking if Claude didn't output Action but phase went to DONE
      // Claude sometimes skips <meta> tags during short booking exchanges.
      // This fallback detects phone+email in recent messages and attempts booking.
      const newPhase = parsed.meta.conversation_phase;
      const bookingNotTriggered = !parsed.meta.action || parsed.meta.action !== 'book_appointment';
      if (bookingNotTriggered && newPhase === 'DONE' && config.GHL_CALENDAR_ID) {
        this.rescueBookingIfNeeded(lead).catch(rescueError => {
          console.error('[AGENT] Rescue booking failed (non-blocking):', rescueError);
        });
      }

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

      // STEP 10.5: ALSO save to normalized messages table (fire-and-forget, non-critical)
      this.saveMessagesToNormalizedTable(lead.id, input.message, parsed.response, parsed.analysis, parsed.meta).catch(() => {});

      // STEP 10.6: Track prompt version performance (fire-and-forget)
      this.trackPromptPerformance(lead, parsed.meta).catch(() => {});

      // STEP 11: Safety check - never send internal tags to user
      const safeResponse = parsed.response && !/<(thinking|analysis|meta)>/i.test(parsed.response)
        ? parsed.response
        : FALLBACK_MESSAGE;

      // STEP 12: Send response to ManyChat
      console.log(`[AGENT] Sending to ManyChat (${safeResponse.length} chars)...`);
      await this.sendToManyChat(lead.manychat_user_id, safeResponse);

      console.log(`[AGENT] Complete in ${Date.now() - startTime}ms`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[AGENT] Error:', errorMsg, error instanceof Error ? error.stack : '');

      // Save error to DB for debugging (non-blocking)
      supabase
        .from('leads')
        .update({
          has_errors: true,
          notes: `[${new Date().toISOString()}] Error: ${errorMsg}`
        })
        .eq('manychat_user_id', input.manychatUserId)
        .then(() => {})
        .catch(() => {});

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
      // Normalize Romanian → English (Claude sometimes outputs Romanian values)
      const statusMap: Record<string, string> = {
        'calificat': 'qualified',
        'probabil calificat': 'likely_qualified',
        'necalificat': 'not_fit',
        'nou': 'new',
        'explorare': 'exploring',
        'nurture': 'nurture',
        'booked': 'booked',
      };
      const normalized = statusMap[meta.qualification_status.toLowerCase()] || meta.qualification_status;
      const validStatuses: LeadStatus[] = ['new', 'exploring', 'likely_qualified', 'qualified', 'not_fit', 'nurture', 'booked'];
      if (validStatuses.includes(normalized as LeadStatus)) {
        lead.qualification_status = normalized as LeadStatus;
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

  /**
   * Rescue booking when Claude didn't output Action: book_appointment in meta.
   * Scans recent user messages for phone + email, matches against available slots.
   */
  private async rescueBookingIfNeeded(lead: Lead): Promise<void> {
    // Already booked?
    if (lead.qualification_status === 'booked') return;

    const recentUserMessages = (lead.messages || [])
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join(' ');

    // Extract phone (Romanian format: 07XX XXX XXX or +40...)
    const phoneMatch = recentUserMessages.match(/(?:\+?40|0)7\d{8}/);
    // Extract email
    const emailMatch = recentUserMessages.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    if (!phoneMatch || !emailMatch) {
      console.log('[RESCUE] No phone/email found in recent messages, skipping');
      return;
    }

    const phone = phoneMatch[0];
    const email = emailMatch[0];

    // Get available slots and find the one most recently discussed
    const slots = await calendarService.getFormattedSlots();
    if (slots.length === 0) {
      console.log('[RESCUE] No available slots, skipping');
      return;
    }

    // Look at recent bot messages for confirmed times
    const recentBotMessages = (lead.messages || [])
      .filter(m => m.role === 'assistant')
      .slice(-5)
      .map(m => m.content)
      .join(' ');

    // Try to match a slot mentioned in bot messages
    let matchedSlot = null;
    for (const slot of slots) {
      // Check if the bot mentioned this slot's date/time in Romanian format
      // Extract key parts: day number, hour
      const slotDate = new Date(slot.iso);
      const roDate = new Date(slotDate.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
      const hour = roDate.getHours();
      const dayNum = roDate.getDate();

      // Look for patterns like "la 13:00" or "la 13" combined with the day number
      const hourPattern = new RegExp(`\\b${hour}(?::00)?\\b`);
      const dayPattern = new RegExp(`\\b${dayNum}\\b`);

      if (hourPattern.test(recentBotMessages) && dayPattern.test(recentBotMessages)) {
        matchedSlot = slot;
        break;
      }
    }

    if (!matchedSlot) {
      // Fallback: use the first available slot if bot confirmed a booking generally
      const bookingConfirmWords = /notat|calendar|sun.*la|programat|confirm/i;
      if (bookingConfirmWords.test(recentBotMessages)) {
        console.log('[RESCUE] Bot confirmed booking but no exact slot match — skipping auto-book to avoid wrong slot');
      } else {
        console.log('[RESCUE] No slot match found in conversation');
      }
      return;
    }

    console.log(`[RESCUE] Found booking data: phone=${phone}, email=${email}, slot=${matchedSlot.display}`);

    const result = await calendarService.bookAppointment({
      leadName: lead.name || 'Unknown',
      phone,
      email,
      selectedSlot: matchedSlot.iso,
    });

    if (result.success) {
      console.log(`[RESCUE] Booking rescued! Appointment ID: ${result.appointmentId}`);
      lead.qualification_status = 'booked' as LeadStatus;
      await leadService.update(lead.id, lead);

      supabase.from('activities').insert({
        type: 'call_booked',
        lead_id: lead.id,
        title: `Call booked (rescued): ${lead.name}`,
        description: `Slot: ${matchedSlot.display}, Phone: ${phone}, Email: ${email}`,
        metadata: { appointment_id: result.appointmentId, rescued: true }
      }).then(() => {}).catch(() => {});
    } else {
      console.error(`[RESCUE] Booking failed: ${result.error}`);
    }
  }

  private async handleBooking(lead: Lead, meta: ResponseMeta): Promise<void> {
    const { selected_slot, contact_phone, contact_email } = meta;

    if (!selected_slot || !contact_phone || !contact_email) {
      console.warn('[BOOKING] Missing data for booking:', {
        has_slot: !!selected_slot,
        has_phone: !!contact_phone,
        has_email: !!contact_email
      });
      return;
    }

    console.log(`[BOOKING] Attempting to book slot ${selected_slot} for lead ${lead.id.substring(0, 8)}...`);

    const result = await calendarService.bookAppointment({
      leadName: lead.name || 'Unknown',
      phone: contact_phone,
      email: contact_email,
      selectedSlot: selected_slot,
    });

    if (result.success) {
      console.log(`[BOOKING] Success! Appointment ID: ${result.appointmentId}`);

      // Update lead status to booked
      lead.qualification_status = 'booked' as LeadStatus;
      lead.conversation_phase = 'DONE' as LeadPhase;
      await leadService.update(lead.id, lead);

      // Log booking activity (fire-and-forget)
      supabase.from('activities').insert({
        type: 'call_booked',
        lead_id: lead.id,
        title: `Call booked: ${lead.name}`,
        description: `Slot: ${selected_slot}, Phone: ${contact_phone}, Email: ${contact_email}`,
        metadata: {
          appointment_id: result.appointmentId,
          selected_slot,
          contact_phone,
          contact_email
        }
      }).then(() => {}).catch(() => {});
    } else {
      console.error(`[BOOKING] Failed: ${result.error}`);

      // Log failed booking attempt
      supabase.from('activities').insert({
        type: 'booking_failed',
        lead_id: lead.id,
        title: `Booking failed: ${lead.name}`,
        description: `Error: ${result.error}`,
        metadata: { selected_slot, error: result.error }
      }).then(() => {}).catch(() => {});
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
    // Split into chunks (randomized 1-4 messages for human-like variation)
    const chunks = splitIntoMessageChunks(response, 6);

    // Only send non-empty fields — ManyChat rejects empty/whitespace values with 422.
    // Stale fields are NOT an issue because ManyChat Automation 2 clears all Answer 1-6
    // fields BEFORE calling the webhook. So only the new values exist when the response
    // flow reads them.
    const fields: ManyChatCustomField[] = [];
    for (let i = 1; i <= 6; i++) {
      const chunk = chunks[i - 1];
      if (chunk && chunk.trim()) {
        fields.push({
          field_name: `AI > Answer ${i}`,
          field_value: chunk
        });
      }
    }

    console.log(`[MANYCHAT] Setting ${fields.length} chunks for subscriber ${subscriberId.substring(0, 8)}...`);

    // Set custom fields (only if we have any)
    if (fields.length > 0) {
      await manychatClient.setCustomFields(subscriberId, fields);
    }

    // Trigger response flow to deliver AI answers to the subscriber
    await manychatClient.sendFlow(subscriberId, config.MANYCHAT_RESPONSE_FLOW_ID);

    console.log(`[MANYCHAT] Flow triggered successfully`);
  }
}

export const agentService = new AgentService();
