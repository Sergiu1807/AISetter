// @ts-nocheck
import { supabase } from '@/lib/supabase';
import type { Lead, CreateLeadInput, Message } from '@/types/lead.types';

export class LeadService {
  async findByManychatId(manychatUserId: string): Promise<Lead | null> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('manychat_user_id', manychatUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error finding lead:', error);
      throw error;
    }

    return data as Lead;
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    const leadData = {
      manychat_user_id: input.manychat_user_id,
      name: input.name || null,
      instagram_handle: input.instagram_handle || null,
      lead_source: input.lead_source || 'dm_direct',
      initial_engagement: input.initial_engagement || null,
      known_details: input.known_details || null,
      conversation_phase: 'P1',
      qualification_status: 'new',
      collected_data: {},
      steps_completed: [],
      is_new: true,
      is_returning: false,
      bot_paused: false,
      needs_human: false,
      is_blocked: false,
      call_booked: false,
      final_status: 'in_progress',
      messages: [],
      message_count: 0,
      error_count: 0
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      throw error;
    }

    return data as Lead;
  }

  async update(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      throw error;
    }

    return data as Lead;
  }

  async updateCollectedData(lead: Lead, newData: Record<string, unknown>): Promise<void> {
    lead.collected_data = {
      ...lead.collected_data,
      ...newData
    };
  }

  addMessage(lead: Lead, message: Message): void {
    lead.messages.push(message);
    lead.message_count = lead.messages.length;
    lead.last_message_at = new Date().toISOString();
  }
}

export const leadService = new LeadService();
