export interface ManyChatWebhookPayload {
  id: string;
  key?: string;
  first_name: string;
  last_name: string;
  ig_username?: string;
  custom_fields: {
    "AI > User Messages"?: string;
    [key: string]: string | undefined;
  };
}

export interface ManyChatCustomField {
  field_name: string;
  field_value: string;
}

export interface ManyChatSetFieldsRequest {
  subscriber_id: string;
  fields: ManyChatCustomField[];
}

export interface ManyChatSendFlowRequest {
  subscriber_id: string;
  flow_ns: string;
}

export interface ManyChatSetFieldsResponse {
  status: string;
  data?: any;
}

export interface ManyChatSendFlowResponse {
  status: string;
  data?: any;
}
