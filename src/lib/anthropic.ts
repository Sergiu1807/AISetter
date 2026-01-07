import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';

export const anthropic = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY
});

export const CLAUDE_CONFIG = {
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  temperature: 0.7,
  max_retries: 3,
  retry_delay_ms: 1000
};
