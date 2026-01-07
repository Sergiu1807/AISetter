function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

export const config = {
  // Anthropic
  ANTHROPIC_API_KEY: getEnvVar('ANTHROPIC_API_KEY'),

  // Supabase
  SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

  // ManyChat
  MANYCHAT_API_KEY: getEnvVar('MANYCHAT_API_KEY'),
  MANYCHAT_RESPONSE_FLOW_ID: getEnvVar('MANYCHAT_RESPONSE_FLOW_ID'),

  // App
  CALENDAR_LINK: getEnvVar('CALENDAR_LINK'),
  WEBHOOK_SECRET: getEnvVar('WEBHOOK_SECRET', false) // Optional - ManyChat can't generate HMAC signatures
};
