import type { ParsedResponse, ResponseMeta } from '@/types/agent.types';

export class ParserService {
  parseAgentResponse(rawResponse: string): ParsedResponse {
    const result: ParsedResponse = {
      analysis: null,
      response: '',
      meta: {}
    };

    // Strip <thinking> blocks first - Sonnet 4.6 may emit these
    const cleaned = rawResponse.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

    // Extract <analysis>
    const analysisMatch = cleaned.match(/<analysis>([\s\S]*?)<\/analysis>/);
    if (analysisMatch) {
      result.analysis = analysisMatch[1].trim();
    }

    // Extract <response> - THIS IS CRITICAL
    const responseMatch = cleaned.match(/<response>([\s\S]*?)<\/response>/);
    if (responseMatch) {
      result.response = responseMatch[1].trim();
    } else {
      // Fallback: strip all known tags, never return raw tagged content
      console.warn('No <response> tags found in Claude output, using cleaned fallback');
      result.response = cleaned
        .replace(/<analysis>[\s\S]*?<\/analysis>/g, '')
        .replace(/<meta>[\s\S]*?<\/meta>/g, '')
        .replace(/<\/?[a-z_]+>/g, '')
        .trim();
    }

    // Extract <meta>
    const metaMatch = cleaned.match(/<meta>([\s\S]*?)<\/meta>/);
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
        { key: 'red_flags', pattern: /Red Flags Observate:\s*(.+?)(?:\n|$)/ },
        // Escalation fields (Human-in-the-Loop)
        { key: 'escalation', pattern: /Escalation:\s*(.+?)(?:\n|$)/ },
        { key: 'escalation_reason', pattern: /Escalation Reason:\s*(.+?)(?:\n|$)/ },
        // Booking fields (GHL Calendar)
        { key: 'action', pattern: /Action:\s*(.+?)(?:\n|$)/ },
        { key: 'selected_slot', pattern: /Selected Slot:\s*(.+?)(?:\n|$)/ },
        { key: 'contact_phone', pattern: /Contact Phone:\s*(.+?)(?:\n|$)/ },
        { key: 'contact_email', pattern: /Contact Email:\s*(.+?)(?:\n|$)/ }
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
