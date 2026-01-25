// @ts-nocheck
import type { Message } from '@/types/lead.types';

/**
 * Split response into message chunks for ManyChat (max 6 chunks)
 * Strategy: Split by \n\n (paragraphs) first, then by sentences if needed
 */
export function splitIntoMessageChunks(text: string, maxChunks: number = 6): string[] {
  if (!text || text.trim().length === 0) {
    return [''];
  }

  const trimmedText = text.trim();

  // Check for explicit \n\n delimiters (paragraph breaks)
  if (trimmedText.includes('\n\n')) {
    const segments = trimmedText
      .split(/\n\s*\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (segments.length <= maxChunks) {
      return segments;
    }

    // Combine overflow into last chunk
    const result = segments.slice(0, maxChunks - 1);
    result.push(segments.slice(maxChunks - 1).join('\n\n'));
    return result;
  }

  // Short messages - keep as single chunk
  if (trimmedText.length < 200) {
    return [trimmedText];
  }

  // Split by sentences
  const sentences = trimmedText.match(/[^.!?]+[.!?]+/g) || [trimmedText];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > 300 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }

    if (chunks.length >= maxChunks - 1 && sentences.indexOf(sentence) < sentences.length - 1) {
      // Add remaining to last chunk
      const remainingIndex = sentences.indexOf(sentence) + 1;
      currentChunk += sentences.slice(remainingIndex).join('');
      break;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.slice(0, maxChunks);
}

/**
 * Format messages array into transcript string for prompt
 */
export function formatTranscript(messages: Message[]): string {
  if (!messages || messages.length === 0) {
    return 'Conversație nouă - acesta este primul mesaj.';
  }

  // Only include last 20 messages to avoid token overflow
  const recentMessages = messages.slice(-20);

  return recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Vlad'}: ${m.content}`)
    .join('\n');
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate hours difference between two dates
 */
export function getHoursDiff(date1: Date | string, date2: Date | string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
}

/**
 * Detect and format first name from ManyChat data
 */
export function detectFirstName(firstName: string, lastName: string): string {
  if (firstName && firstName.trim()) {
    return firstName.trim();
  }
  if (lastName && lastName.trim()) {
    return lastName.trim();
  }
  return 'prieten';
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
