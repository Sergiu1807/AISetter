import { GoogleGenAI } from '@google/genai';
import { config } from './config';

export const geminiClient = config.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY })
  : null;
