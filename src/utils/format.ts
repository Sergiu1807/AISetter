// @ts-nocheck
import type { Message } from '@/types/lead.types';

/**
 * Split response into message chunks for ManyChat (max 6 chunks)
 * Uses weighted randomization (1-6 chunks, bell-curve) for human-like message variation
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

  // Step 2: Determine target chunk count (randomized 1-6, bell-curve)
  const targetChunks = getRandomChunkTarget();

  // Step 3: Adjust segments to match target (merge down or expand up)
  let finalChunks: string[];
  if (segments.length > targetChunks) {
    finalChunks = mergeToTarget(segments, targetChunks);
  } else if (segments.length < targetChunks) {
    finalChunks = expandToTarget(segments, targetChunks);
  } else {
    finalChunks = segments;
  }

  // Step 4: Cap at ManyChat max
  return finalChunks.slice(0, maxChunks);
}

/**
 * Weighted random chunk target (bell-curve centered on 2-3):
 * 1 chunk: 15%, 2 chunks: 20%, 3 chunks: 25%, 4 chunks: 20%, 5 chunks: 12%, 6 chunks: 8%
 */
function getRandomChunkTarget(): number {
  const rand = Math.random();

  if (rand < 0.15) return 1;
  if (rand < 0.35) return 2;
  if (rand < 0.60) return 3;
  if (rand < 0.80) return 4;
  if (rand < 0.92) return 5;
  return 6;
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
 * Expand segments up to target by splitting the longest multi-sentence segments
 */
function expandToTarget(segments: string[], target: number): string[] {
  const result = [...segments];

  while (result.length < target) {
    // Find the longest segment that contains multiple sentences
    let longestIdx = -1;
    let longestLen = 0;

    for (let i = 0; i < result.length; i++) {
      if (result[i].length > longestLen && hasMultipleSentences(result[i])) {
        longestLen = result[i].length;
        longestIdx = i;
      }
    }

    if (longestIdx === -1) break; // No more splittable segments

    const [part1, part2] = splitAtBestBoundary(result[longestIdx]);
    if (!part1.trim() || !part2.trim()) break; // Safety: avoid empty chunks
    result.splice(longestIdx, 1, part1, part2);
  }

  return result;
}

/**
 * Check if a text contains more than one sentence
 */
function hasMultipleSentences(text: string): boolean {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  return !!sentences && sentences.length >= 2;
}

/**
 * Split a text into two parts at the best sentence boundary (closest to middle)
 */
function splitAtBestBoundary(text: string): [string, string] {
  const sentenceEnds = [...text.matchAll(/[.!?]+\s+/g)];
  if (sentenceEnds.length === 0) return [text, ''];

  const midpoint = text.length / 2;
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < sentenceEnds.length; i++) {
    const pos = (sentenceEnds[i].index ?? 0) + sentenceEnds[i][0].length;
    const dist = Math.abs(pos - midpoint);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  const splitPos = (sentenceEnds[bestIdx].index ?? 0) + sentenceEnds[bestIdx][0].length;
  return [text.slice(0, splitPos).trim(), text.slice(splitPos).trim()];
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
