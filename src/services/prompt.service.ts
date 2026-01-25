// @ts-nocheck
import { STATIC_SYSTEM_PROMPT, DYNAMIC_CONTEXT_TEMPLATE } from '@/prompts/appointment-setter';
import { config } from '@/lib/config';
import type { Lead, Message } from '@/types/lead.types';

export class PromptService {
  buildPrompt(lead: Lead): { staticPrompt: string; dynamicContext: string } {
    const staticPrompt = STATIC_SYSTEM_PROMPT;
    const dynamicContext = this.injectVariables(DYNAMIC_CONTEXT_TEMPLATE, {
      CALENDAR_LINK: config.CALENDAR_LINK,
      LEAD_NAME: lead.name || 'prieten',
      LEAD_HANDLE: lead.instagram_handle || '',
      LEAD_SOURCE: lead.lead_source || 'dm_direct',
      INITIAL_ENGAGEMENT: lead.initial_engagement || 'DM direct',
      KNOWN_DETAILS: lead.known_details || 'Necunoscute',
      CONVERSATION_TRANSCRIPT: this.formatTranscript(lead.messages),
      CONVERSATION_PHASE: lead.conversation_phase || 'P1',
      QUALIFICATION_STATUS: lead.qualification_status || 'Necalificat',
      IDENTIFIED_PAIN_POINTS: lead.collected_data?.pain_points || 'Neidentificate',
      OBJECTIONS: lead.collected_data?.objections || 'Niciuna',
      STEPS_COMPLETED: (lead.steps_completed || []).join(', ') || 'Niciunul'
    });

    return { staticPrompt, dynamicContext };
  }

  private formatTranscript(messages: Message[]): string {
    if (!messages || messages.length === 0) {
      return 'Conversație nouă - acesta este primul mesaj.';
    }

    // Only include last 20 messages to avoid token overflow
    const recentMessages = messages.slice(-20);

    return recentMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Vlad'}: ${m.content}`)
      .join('\n');
  }

  private injectVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  formatMessagesForClaude(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
}

export const promptService = new PromptService();
