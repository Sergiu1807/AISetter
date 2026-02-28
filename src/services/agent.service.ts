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

      // STEP 8.5: Handle booking action (AWAITED — fire-and-forget gets killed by Vercel)
      let bookingHandled = false;
      if (parsed.meta.action === 'book_appointment' && parsed.meta.selected_slot) {
        try {
          await this.handleBooking(lead, parsed.meta);
          bookingHandled = true;
        } catch (bookingError) {
          console.error('[AGENT] Booking failed:', bookingError);
        }
      }

      // STEP 8.6: Rescue booking if Claude didn't output Action in meta
      // Claude almost never emits Action: book_appointment, so this is the PRIMARY booking path.
      // Triggers when: P5 or DONE phase, phone+email collected, slot confirmed.
      // MUST be awaited — fire-and-forget promises get killed when Vercel terminates the function.
      if (!bookingHandled && config.GHL_CALENDAR_ID && lead.qualification_status !== 'booked') {
        const currentPhase = parsed.meta.conversation_phase || lead.conversation_phase || '';
        const isBookingRelevant = currentPhase === 'P5' || currentPhase === 'DONE' || currentPhase.includes('DONE');
        if (isBookingRelevant) {
          try {
            await this.rescueBookingIfNeeded(lead);
          } catch (rescueError) {
            console.error('[AGENT] Rescue booking failed:', rescueError);
          }
        }
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
   * This is the PRIMARY booking path since Claude almost never emits the action.
   *
   * Strategy: Find the LAST bot message that confirmed a specific time+date,
   * then match that against available GHL slots. This avoids false matches
   * from slots mentioned for different days earlier in the conversation.
   */
  private async rescueBookingIfNeeded(lead: Lead): Promise<void> {
    if (lead.qualification_status === 'booked') return;

    // Scan ALL user messages for phone and email
    const allUserText = (lead.messages || [])
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const phoneMatch = allUserText.match(/(?:\+?40|0)7\d{8}/);
    const emailMatch = allUserText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    if (!phoneMatch || !emailMatch) {
      console.log('[RESCUE] No phone/email found in messages, skipping');
      return;
    }

    const phone = phoneMatch[0];
    const email = emailMatch[0];
    console.log(`[RESCUE] Found contact: phone=${phone}, email=${email}`);

    // Get available GHL slots
    const slots = await calendarService.getFormattedSlots();
    if (slots.length === 0) {
      console.log('[RESCUE] No available slots from GHL, skipping');
      return;
    }
    console.log(`[RESCUE] ${slots.length} GHL slots available`);

    // Find the LAST bot message that confirmed a booking (contains time confirmation keywords)
    const botMessages = (lead.messages || []).filter(m => m.role === 'assistant');
    const confirmKeywords = /notat|programat|confirm|sun.*la|apelul|te astept/i;

    let confirmationMessage = '';
    for (let i = botMessages.length - 1; i >= 0; i--) {
      if (confirmKeywords.test(botMessages[i].content)) {
        confirmationMessage = botMessages[i].content;
        break;
      }
    }

    // Also check the last 3 bot messages as fallback
    if (!confirmationMessage) {
      confirmationMessage = botMessages.slice(-3).map(m => m.content).join(' ');
    }

    console.log(`[RESCUE] Confirmation message: "${confirmationMessage.substring(0, 150)}..."`);

    // Match slot against the confirmation message specifically (not entire conversation)
    let matchedSlot = null;

    for (const slot of slots) {
      const slotDate = new Date(slot.iso);
      const roDate = new Date(slotDate.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
      const hour = roDate.getHours();
      const hourStr = hour.toString().padStart(2, '0');

      // Check if this specific hour appears in the confirmation message
      const hourPattern = new RegExp(`(?:\\b${hour}:00\\b|\\b${hourStr}:00\\b|\\bla\\s+${hour}\\b|\\bora\\s+${hour}\\b)`);

      if (hourPattern.test(confirmationMessage)) {
        // Additionally verify the day name or date number appears in the same message
        const dayNum = roDate.getDate();
        const dayNames = ['duminic', 'luni', 'mar[tț]i', 'miercuri', 'joi', 'vineri', 's[aâ]mb[aă]t'];
        const dayOfWeek = roDate.getDay();
        const dayNamePattern = new RegExp(dayNames[dayOfWeek], 'i');
        const dayNumPattern = new RegExp(`\\b${dayNum}\\b`);

        if (dayNamePattern.test(confirmationMessage) || dayNumPattern.test(confirmationMessage)) {
          matchedSlot = slot;
          console.log(`[RESCUE] Matched slot from confirmation: ${slot.display} [${slot.iso}]`);
          break; // Take the FIRST match from the confirmation message (most specific)
        }
      }
    }

    // Fallback: check user's LAST message with a time pattern (e.g., "14:00 merge")
    if (!matchedSlot) {
      const recentUserMessages = (lead.messages || [])
        .filter(m => m.role === 'user')
        .slice(-5);

      for (let i = recentUserMessages.length - 1; i >= 0; i--) {
        const timeMatch = recentUserMessages[i].content.match(/(\d{1,2}):00/);
        if (timeMatch) {
          const confirmedHour = parseInt(timeMatch[1]);
          matchedSlot = slots.find(slot => {
            const roDate = new Date(new Date(slot.iso).toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
            return roDate.getHours() === confirmedHour;
          }) || null;
          if (matchedSlot) {
            console.log(`[RESCUE] Matched slot by user hour ${confirmedHour}:00: ${matchedSlot.display}`);
            break;
          }
        }
      }
    }

    if (!matchedSlot) {
      console.log('[RESCUE] No slot match found in conversation');
      return;
    }

    console.log(`[RESCUE] BOOKING: phone=${phone}, email=${email}, slot=${matchedSlot.display} [${matchedSlot.iso}]`);

    const result = await calendarService.bookAppointment({
      leadName: lead.name || 'Unknown',
      phone,
      email,
      selectedSlot: matchedSlot.iso,
    });

    if (result.success) {
      console.log(`[RESCUE] SUCCESS! Appointment ID: ${result.appointmentId}`);
      lead.qualification_status = 'booked' as LeadStatus;

      await supabase.from('activities').insert({
        type: 'call_booked',
        lead_id: lead.id,
        title: `Call booked: ${lead.name}`,
        description: `Slot: ${matchedSlot.display}, Phone: ${phone}, Email: ${email}`,
        metadata: { appointment_id: result.appointmentId, rescued: true }
      });
    } else {
      console.error(`[RESCUE] FAILED: ${result.error}`);

      await supabase.from('activities').insert({
        type: 'booking_failed',
        lead_id: lead.id,
        title: `Booking failed: ${lead.name}`,
        description: `Error: ${result.error}, Slot: ${matchedSlot.iso}`,
        metadata: { error: result.error, slot: matchedSlot.iso, phone, email }
      });
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
