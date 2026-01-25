import { config } from './config';
import type {
  ManyChatCustomField,
  ManyChatSetFieldsResponse,
  ManyChatSendFlowResponse
} from '@/types/manychat.types';

const MANYCHAT_BASE_URL = 'https://api.manychat.com/fb';

async function manychatRequest(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${MANYCHAT_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.MANYCHAT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ManyChat API error: ${response.status} - ${errorText}`);
    throw new Error(`ManyChat API error: ${response.status}`);
  }

  return response.json();
}

export const manychatClient = {
  async setCustomFields(
    subscriberId: string,
    fields: ManyChatCustomField[]
  ): Promise<ManyChatSetFieldsResponse> {
    return manychatRequest('/subscriber/setCustomFields', {
      subscriber_id: subscriberId,
      fields
    }) as unknown as Promise<ManyChatSetFieldsResponse>;
  },

  async sendFlow(subscriberId: string, flowNs: string): Promise<ManyChatSendFlowResponse> {
    return manychatRequest('/sending/sendFlow', {
      subscriber_id: subscriberId,
      flow_ns: flowNs
    }) as unknown as Promise<ManyChatSendFlowResponse>;
  }
};
