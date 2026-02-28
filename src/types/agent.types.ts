export interface ParsedResponse {
  analysis: string | null;
  response: string;
  meta: ResponseMeta;
}

export interface ResponseMeta {
  qualification_status?: string;
  conversation_phase?: string;
  pain_points?: string;
  objections?: string;
  steps_completed?: string;
  next_goal?: string;
  risk_factors?: string;
  red_flags?: string;
  // Escalation fields (Human-in-the-Loop)
  escalation?: string;
  escalation_reason?: string;
  // Booking fields (GHL Calendar)
  action?: string;
  selected_slot?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface MediaAttachment {
  type: 'image' | 'voice_transcript' | 'video';
  imageBase64?: string;
  imageMediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  transcript?: string;
  videoTranscript?: string;
}

export interface ProcessMessageInput {
  manychatUserId: string;
  firstName: string;
  lastName: string;
  igUsername?: string;
  message: string;
  leadSource?: string;
  mediaAttachments?: MediaAttachment[];
}
