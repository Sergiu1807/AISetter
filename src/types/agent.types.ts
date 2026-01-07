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
}

export interface ProcessMessageInput {
  manychatUserId: string;
  firstName: string;
  lastName: string;
  igUsername?: string;
  message: string;
  leadSource?: string;
}
