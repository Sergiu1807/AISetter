import type { ParsedResponse, ResponseMeta } from '@/types/agent.types';

export class ParserService {
  parseAgentResponse(rawResponse: string): ParsedResponse {
    const result: ParsedResponse = {
      analysis: null,
      response: '',
      meta: {}
    };

    // Extract <analysis>
    const analysisMatch = rawResponse.match(/<analysis>([\s\S]*?)<\/analysis>/);
    if (analysisMatch) {
      result.analysis = analysisMatch[1].trim();
    }

    // Extract <response> - THIS IS CRITICAL
    const responseMatch = rawResponse.match(/<response>([\s\S]*?)<\/response>/);
    if (responseMatch) {
      result.response = responseMatch[1].trim();
    } else {
      // Fallback: if no tags, use the whole response (shouldn't happen)
      console.warn('No <response> tags found in Claude output, using raw response');
      result.response = rawResponse.trim();
    }

    // Extract <meta>
    const metaMatch = rawResponse.match(/<meta>([\s\S]*?)<\/meta>/);
    if (metaMatch) {
      const metaText = metaMatch[1];

      // Parse each field from meta
      const fields: Array<{ key: keyof ResponseMeta; pattern: RegExp }> = [
        { key: 'qualification_status', pattern: /Status Calificare:\s*(.+?)(?:\n|$)/ },
        { key: 'conversation_phase', pattern: /Fază Curentă:\s*(.+?)(?:\n|$)/ },
        { key: 'pain_points', pattern: /Pain Points Identificate:\s*(.+?)(?:\n|$)/ },
        { key: 'objections', pattern: /Obiecții:\s*(.+?)(?:\n|$)/ },
        { key: 'steps_completed', pattern: /Pași Bifați:\s*(.+?)(?:\n|$)/ },
        { key: 'next_goal', pattern: /Următorul Scop:\s*(.+?)(?:\n|$)/ },
        { key: 'risk_factors', pattern: /Factori de Risc:\s*(.+?)(?:\n|$)/ },
        { key: 'red_flags', pattern: /Red Flags Observate:\s*(.+?)(?:\n|$)/ }
      ];

      for (const { key, pattern } of fields) {
        const match = metaText.match(pattern);
        if (match) {
          result.meta[key] = match[1].trim();
        }
      }
    }

    return result;
  }
}

export const parserService = new ParserService();
