// @ts-nocheck
import type { Message } from '@/types/lead.types';

/**
 * Split response into message chunks for ManyChat (max 6 chunks)
 * Uses weighted randomization (1-4 chunks) for human-like message variation
 */
export function splitIntoMessageChunks(text: string, maxChunks: number = 6): string[] {
  if (!text || text.trim().length === 0) {
    return [''];
  }

  const trimmedText = text.trim();

  // Step 1: Split by paragraph breaks (Claude's intended message boundaries)
  let segments: string[];
  if (trimmedText.includes('\n\n')) {
    segments = trimmedText
      .split(/\n\s*\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  } else if (trimmedText.length < 200) {
    return [trimmedText]; // Short messages stay as one
  } else {
    // No paragraph breaks in a longer message: split by sentences
    segments = splitBySentences(trimmedText);
  }

  // Step 2: Determine target chunk count (randomized, weighted toward 1-3)
  const targetChunks = getRandomChunkTarget(segments.length);

  // Step 3: Merge segments to match target
  const finalChunks = mergeToTarget(segments, targetChunks);

  // Step 4: Cap at ManyChat max
  return finalChunks.slice(0, maxChunks);
}

/**
 * Weighted random chunk target:
 * 1 chunk: 25%, 2 chunks: 35%, 3 chunks: 25%, 4 chunks: 15%
 */
function getRandomChunkTarget(availableSegments: number): number {
  const rand = Math.random();
  let target: number;

  if (rand < 0.25) target = 1;
  else if (rand < 0.60) target = 2;
  else if (rand < 0.85) target = 3;
  else target = 4;

  // Can't have more chunks than segments
  return Math.min(target, availableSegments);
}

/**
 * Merge segments down to the target count by combining shortest adjacent pairs
 */
function mergeToTarget(segments: string[], target: number): string[] {
  if (segments.length <= target) {
    return segments;
  }

  const result = [...segments];

  while (result.length > target) {
    // Find the pair of adjacent segments with the smallest combined length
    let minCombinedLength = Infinity;
    let mergeIndex = 0;

    for (let i = 0; i < result.length - 1; i++) {
      const combinedLength = result[i].length + result[i + 1].length;
      if (combinedLength < minCombinedLength) {
        minCombinedLength = combinedLength;
        mergeIndex = i;
      }
    }

    // Merge the pair
    result[mergeIndex] = result[mergeIndex] + '\n' + result[mergeIndex + 1];
    result.splice(mergeIndex + 1, 1);
  }

  return result;
}

/**
 * Split a single long text block into sentence-based segments
 */
function splitBySentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const segments: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > 300 && current.length > 0) {
      segments.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
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
