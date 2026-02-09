// @ts-nocheck
import { STATIC_SYSTEM_PROMPT, DYNAMIC_CONTEXT_TEMPLATE } from '@/prompts/appointment-setter';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Lead, Message } from '@/types/lead.types';

// In-memory cache for the active prompt version
let cachedPrompt: { text: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export class PromptService {
  async buildPrompt(lead: Lead): Promise<{ staticPrompt: string; dynamicContext: string }> {
    const staticPrompt = await this.getActivePrompt();
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

  /**
   * Fetch the active prompt version from DB, with in-memory cache and fallback.
   */
  private async getActivePrompt(): Promise<string> {
    // Check cache
    if (cachedPrompt && (Date.now() - cachedPrompt.fetchedAt) < CACHE_TTL_MS) {
      return cachedPrompt.text;
    }

    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('prompt_text')
        .eq('is_active', true)
        .single();

      if (error || !data?.prompt_text) {
        console.warn('No active prompt version found in DB, using hardcoded fallback');
        return STATIC_SYSTEM_PROMPT;
      }

      // Update cache
      cachedPrompt = { text: data.prompt_text, fetchedAt: Date.now() };
      return data.prompt_text;
    } catch (error) {
      console.error('Error fetching active prompt from DB:', error);
      return STATIC_SYSTEM_PROMPT;
    }
  }

  /**
   * Invalidate the cached prompt (call after deploying a new version).
   */
  invalidateCache(): void {
    cachedPrompt = null;
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
