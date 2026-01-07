export interface Lead {
  id: string;
  manychat_user_id: string;
  instagram_handle: string | null;
  name: string | null;

  created_at: string;
  updated_at: string;
  last_message_at: string | null;

  lead_source: string;
  initial_engagement: string | null;
  known_details: string | null;

  conversation_phase: ConversationPhase;
  qualification_status: QualificationStatus;

  collected_data: CollectedData;
  steps_completed: string[];

  is_new: boolean;
  is_returning: boolean;
  bot_paused: boolean;
  needs_human: boolean;
  is_blocked: boolean;

  call_booked: boolean;
  call_date: string | null;
  final_status: string;

  messages: Message[];
  message_count: number;

  last_ai_analysis: string | null;
  error_count: number;
  notes: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  analysis?: string;
  meta?: Record<string, string>;
}

export interface CollectedData {
  situatie_actuala?: string;
  schimbare_dorita?: string;
  suma_tinta?: string;
  obstacol_principal?: string;
  motivatie?: string;
  pain_points?: string;
  objections?: string;
  [key: string]: string | undefined;
}

export type QualificationStatus =
  | 'new'
  | 'exploring'
  | 'likely_qualified'
  | 'qualified'
  | 'not_fit'
  | 'nurture';

export type ConversationPhase = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'DONE';

export interface CreateLeadInput {
  manychat_user_id: string;
  name?: string | null;
  instagram_handle?: string | null;
  lead_source?: string;
  initial_engagement?: string | null;
  known_details?: string | null;
}
