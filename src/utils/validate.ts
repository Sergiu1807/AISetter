import type { ManyChatWebhookPayload } from '@/types/manychat.types';

/**
 * Validate ManyChat webhook payload structure
 */
export function validateManyChatPayload(payload: any): payload is ManyChatWebhookPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (!payload.id || typeof payload.id !== 'string') {
    return false;
  }

  if (!payload.first_name || typeof payload.first_name !== 'string') {
    return false;
  }

  if (!payload.custom_fields || typeof payload.custom_fields !== 'object') {
    return false;
  }

  return true;
}

/**
 * Sanitize user message to prevent prompt injection and remove unwanted content
 */
export function sanitizeMessage(message: string): string {
  if (!message) return '';

  // Remove potential prompt injection attempts
  // Remove XML-like tags that could interfere with our parsing
  const sanitized = message
    .replace(/<\/?(?:analysis|response|meta|system|assistant|user)[^>]*>/gi, '')
    .trim()
    .slice(0, 2000); // Max 2000 chars

  return sanitized;
}

/**
 * Validate and sanitize Instagram username
 */
export function sanitizeInstagramHandle(handle?: string): string | null {
  if (!handle) return null;

  const cleaned = handle.trim().replace(/^@+/, '');

  // Basic validation: alphanumeric, underscores, dots
  if (!/^[a-zA-Z0-9_.]+$/.test(cleaned)) {
    return null;
  }

  return `@${cleaned}`;
}
