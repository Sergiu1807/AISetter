import { geminiClient } from '@/lib/gemini';
import { config } from '@/lib/config';

const MEDIA_TIMEOUT_MS = 15_000; // 15 seconds max for download + processing
const MAX_MEDIA_SIZE = 20 * 1024 * 1024; // 20MB
const GEMINI_MODEL = 'gemini-2.5-flash'; // For images and video
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

type MediaType = 'image' | 'voice' | 'video';

/**
 * Detect media type from URL (extension or known patterns)
 */
export function detectMediaType(url: string): MediaType | null {
  const lower = url.toLowerCase();

  // Image extensions
  if (/\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/.test(lower)) return 'image';

  // Audio/voice extensions
  if (/\.(m4a|ogg|opus|wav|mp3|flac|aac)(\?|$)/.test(lower)) return 'voice';

  // Video extensions — but also check for Instagram voice notes which come as .mp4
  if (/\.(mp4|mov|avi|webm|mkv)(\?|$)/.test(lower)) {
    // Instagram voice notes are short .mp4 files — we treat them as voice
    // ManyChat might label them differently, but we detect via content-type at download time
    return 'video'; // Will be reclassified to 'voice' if audio-only
  }

  // Instagram/Facebook CDN patterns (URLs without file extensions)
  if (lower.includes('cdninstagram') || lower.includes('fbcdn') ||
      lower.includes('fbsbx.com') || lower.includes('ig_messaging_cdn')) {
    if (lower.includes('audio') || lower.includes('voice')) return 'voice';
    if (lower.includes('video')) return 'video';
    return 'image'; // Default for Instagram CDN URLs
  }

  return null;
}

/**
 * Extract media URLs from webhook payload custom fields
 */
export function extractMediaFromPayload(payload: Record<string, unknown>): { url: string; type: MediaType } | null {
  const customFields = (payload.custom_fields || {}) as Record<string, string>;

  // Check dedicated media custom fields
  const mediaFieldNames = [
    'AI > User Media',
    'AI > User Image',
    'AI > User Voice',
    'AI > User Video',
    'AI > Media URL',
  ];

  for (const fieldName of mediaFieldNames) {
    const value = customFields[fieldName];
    if (value && isUrl(value)) {
      const type = detectMediaType(value) || guessTypeFromFieldName(fieldName);
      if (type) return { url: value, type };
    }
  }

  // Check ManyChat system fields in payload root
  const systemFields = [
    { key: 'last_input_image', type: 'image' as MediaType },
    { key: 'last_input_audio', type: 'voice' as MediaType },
    { key: 'last_input_video', type: 'video' as MediaType },
  ];

  for (const { key, type } of systemFields) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === 'string' && isUrl(value)) {
      return { url: value, type };
    }
  }

  // Check if the user message itself is just a URL (media-only message)
  const userMessage = customFields['AI > User Messages'] || '';
  if (isUrl(userMessage.trim())) {
    const type = detectMediaType(userMessage.trim());
    if (type) return { url: userMessage.trim(), type };
  }

  return null;
}

function isUrl(str: string): boolean {
  return /^https?:\/\/.+/i.test(str.trim());
}

function guessTypeFromFieldName(name: string): MediaType {
  const lower = name.toLowerCase();
  if (lower.includes('image') || lower.includes('photo')) return 'image';
  if (lower.includes('voice') || lower.includes('audio')) return 'voice';
  if (lower.includes('video')) return 'video';
  return 'image';
}

/**
 * Process media URL: download → send to Gemini → return text description
 * Returns null if processing fails (caller should proceed with text-only)
 */
export async function processMedia(url: string, type: MediaType): Promise<string | null> {
  if (!geminiClient) {
    console.warn('[MEDIA] Gemini API key not configured — skipping media processing');
    return null;
  }

  try {
    console.log(`[MEDIA] Processing ${type} from URL: ${url.substring(0, 80)}...`);

    // Download with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MEDIA_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(`[MEDIA] Download failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    if (contentLength > MAX_MEDIA_SIZE) {
      console.warn(`[MEDIA] File too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB — skipping`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Reclassify based on actual content-type + file size (URL detection is unreliable for CDN URLs)
    const effectiveType = resolveMediaType(type, contentType, buffer.length);
    console.log(`[MEDIA] Content-Type: ${contentType}, size: ${(buffer.length / 1024).toFixed(0)}KB → effectiveType: ${effectiveType}`);

    if (buffer.length > MAX_MEDIA_SIZE) {
      console.warn(`[MEDIA] File too large after download: ${(buffer.length / 1024 / 1024).toFixed(1)}MB — skipping`);
      return null;
    }

    const mimeType = contentType.split(';')[0].trim() || getMimeFromType(effectiveType);

    let result: string | null;
    switch (effectiveType) {
      case 'image':
        result = await processImage(buffer, mimeType);
        break;
      case 'voice':
        result = await processVoice(buffer, mimeType);
        break;
      case 'video':
        result = await processVideo(buffer, mimeType);
        break;
      default:
        result = null;
    }

    if (result) {
      console.log(`[MEDIA] ${effectiveType} processed successfully (${result.length} chars)`);
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[MEDIA] Download timeout — skipping');
    } else {
      console.error('[MEDIA] Processing error:', error);
    }
    return null;
  }
}

async function processImage(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!geminiClient) return null;

  const base64 = buffer.toString('base64');

  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: 'Descrie această imagine în 1-3 propoziții scurte, în limba română. Concentrează-te pe ce e relevant într-o conversație pe Instagram DM (produse, screenshots, rezultate, etc.). Nu descrie elemente decorative sau de fundal. Fii concis.',
          },
        ],
      },
    ],
  });

  const text = response.text?.trim();
  return text ? `[Imagine trimisă: ${text}]` : null;
}

async function processVoice(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!config.OPENAI_API_KEY) {
    console.warn('[MEDIA] OpenAI API key not configured — skipping voice transcription');
    return null;
  }

  // Use OpenAI Whisper API for reliable voice transcription
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'mp4';
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'video/mp4' });
  const file = new File([blob], `voice.${ext}`, { type: mimeType || 'video/mp4' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MEDIA] Whisper API error: ${response.status} - ${errorText}`);
    return null;
  }

  const result = await response.json() as { text?: string };
  const text = result.text?.trim();
  return text ? `[Mesaj vocal: ${text}]` : null;
}

async function processVideo(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!geminiClient) return null;

  const base64 = buffer.toString('base64');

  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'video/mp4',
              data: base64,
            },
          },
          {
            text: 'Analizează acest video scurt. Descrie ce se vede și transcrie ce se aude (dacă are audio). Rezumat concis în 2-4 propoziții, în limba română. Concentrează-te pe conținut relevant pentru o conversație de business/coaching.',
          },
        ],
      },
    ],
  });

  const text = response.text?.trim();
  return text ? `[Video trimis: ${text}]` : null;
}

function getMimeFromType(type: MediaType): string {
  switch (type) {
    case 'image': return 'image/jpeg';
    case 'voice': return 'audio/mp4';
    case 'video': return 'video/mp4';
  }
}

/**
 * Resolve the actual media type using HTTP content-type header.
 * URL-based detection is unreliable for CDN URLs (ig_messaging_cdn has no extension).
 */
function resolveMediaType(urlType: MediaType, contentType: string, fileSize: number): MediaType {
  const ct = contentType.toLowerCase();

  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'voice';

  // Instagram voice notes come as video/mp4 but are audio-only
  // Heuristic: video/mp4 files under 5MB from DMs are almost always voice notes
  if (ct.startsWith('video/') && fileSize < 5 * 1024 * 1024) return 'voice';
  if (ct.startsWith('video/')) return 'video';

  // application/octet-stream or missing content-type: fall back to URL detection
  return urlType;
}
