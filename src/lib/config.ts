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

  // Supabase (support both NEXT_PUBLIC_ prefix for Vercel and plain for Railway)
  SUPABASE_URL: process.env.SUPABASE_URL || getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

  // Railway API URL (for Vercel proxy)
  RAILWAY_API_URL: getEnvVar('RAILWAY_API_URL', false),

  // ManyChat
  MANYCHAT_API_KEY: getEnvVar('MANYCHAT_API_KEY'),
  MANYCHAT_RESPONSE_FLOW_ID: getEnvVar('MANYCHAT_RESPONSE_FLOW_ID'),

  // App
  CALENDAR_LINK: getEnvVar('CALENDAR_LINK'),
  WEBHOOK_SECRET: getEnvVar('WEBHOOK_SECRET', false), // Optional - ManyChat can't generate HMAC signatures

  // OpenAI (for media processing: image vision, voice transcription)
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY', false),

  // Telegram (for escalation notifications)
  TELEGRAM_BOT_TOKEN: getEnvVar('TELEGRAM_BOT_TOKEN', false),
  TELEGRAM_CHAT_ID: getEnvVar('TELEGRAM_CHAT_ID', false),

  // GoHighLevel (for calendar booking)
  GHL_LOCATION_ID: getEnvVar('GHL_LOCATION_ID', false),
  GHL_CALENDAR_ID: getEnvVar('GHL_CALENDAR_ID', false),
};
