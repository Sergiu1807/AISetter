import { ghlClient } from '@/lib/ghl';
import { config } from '@/lib/config';

interface FormattedSlot {
  display: string;    // Romanian format: "Marți, 25 Februarie la ora 14:00"
  iso: string;        // ISO timestamp: "2026-02-25T14:00:00+02:00"
  date: Date;
}

interface BookingResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
}

// In-memory slot cache (TTL 5 minutes)
const slotCache = new Map<string, { slots: FormattedSlot[]; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const ROMANIAN_DAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const ROMANIAN_MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

class CalendarService {
  /**
   * Get formatted available slots for the next 7 days (or 14 if none in 7).
   * Uses in-memory cache with 5-minute TTL.
   */
  async getFormattedSlots(): Promise<FormattedSlot[]> {
    if (!config.GHL_CALENDAR_ID) {
      throw new Error('GHL_CALENDAR_ID not configured');
    }

    const cacheKey = config.GHL_CALENDAR_ID;
    const cached = slotCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.slots;
    }

    // Fetch slots for next 7 days
    let slots = await this.fetchSlots(7);

    // If no slots in 7 days, extend to 14
    if (slots.length === 0) {
      slots = await this.fetchSlots(14);
    }

    slotCache.set(cacheKey, { slots, fetchedAt: Date.now() });
    return slots;
  }

  /**
   * Fetch raw slots from GHL widget endpoint and format them.
   */
  private async fetchSlots(daysAhead: number): Promise<FormattedSlot[]> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + daysAhead);
    end.setHours(23, 59, 59, 999);

    const rawSlots = await ghlClient.getAvailableSlots(
      config.GHL_CALENDAR_ID,
      start.getTime(),
      end.getTime(),
      'Europe/Bucharest'
    );

    const formatted: FormattedSlot[] = [];

    for (const [, dateData] of Object.entries(rawSlots)) {
      // Skip non-date keys like "traceId"
      if (typeof dateData !== 'object' || dateData === null || !('slots' in dateData)) continue;

      for (const slotIso of dateData.slots) {
        const slotDate = new Date(slotIso);

        // Skip slots in the past (with 30 min buffer)
        if (slotDate.getTime() < Date.now() + 30 * 60 * 1000) continue;

        formatted.push({
          display: this.formatSlotRomanian(slotDate),
          iso: slotIso,
          date: slotDate,
        });
      }
    }

    // Sort by date
    formatted.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Return max 20 slots to avoid flooding the prompt
    return formatted.slice(0, 20);
  }

  /**
   * Format a date in Romanian for display: "Marți, 25 Februarie la ora 14:00"
   */
  private formatSlotRomanian(date: Date): string {
    // Format in Romania timezone
    const roDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));

    const dayName = ROMANIAN_DAYS[roDate.getDay()];
    const dayNum = roDate.getDate();
    const month = ROMANIAN_MONTHS[roDate.getMonth()];
    const hours = roDate.getHours().toString().padStart(2, '0');
    const minutes = roDate.getMinutes().toString().padStart(2, '0');

    return `${dayName}, ${dayNum} ${month} la ora ${hours}:${minutes}`;
  }

  /**
   * Filter slots by user preference (first half = morning, second half = afternoon).
   */
  filterByPreference(
    slots: FormattedSlot[],
    preference: 'first_half' | 'second_half' | 'any'
  ): FormattedSlot[] {
    if (preference === 'any') return slots;

    return slots.filter(slot => {
      const roDate = new Date(slot.date.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
      const hour = roDate.getHours();

      if (preference === 'first_half') {
        return hour >= 8 && hour < 13;
      }
      return hour >= 13 && hour < 20;
    });
  }

  /**
   * Format slots as XML block for injection into Claude's dynamic context.
   */
  formatSlotsForPrompt(slots: FormattedSlot[]): string {
    if (slots.length === 0) {
      return '<available_slots>\nNu sunt sloturi disponibile momentan. Folosește link-ul de backup: ' + config.CALENDAR_LINK + '\n</available_slots>';
    }

    const slotLines = slots
      .map(s => `- ${s.display} [${s.iso}]`)
      .join('\n');

    return `<available_slots>\nSloturi disponibile pentru apel (Ora României):\n${slotLines}\n</available_slots>`;
  }

  /**
   * Book an appointment via GHL widget endpoint (no API key needed).
   * The widget endpoint auto-creates the contact from name/email/phone.
   */
  async bookAppointment(data: {
    leadName: string;
    phone: string;
    email: string;
    selectedSlot: string;
  }): Promise<BookingResult> {
    try {
      if (!config.GHL_CALENDAR_ID || !config.GHL_LOCATION_ID) {
        return { success: false, error: 'GHL calendar not configured' };
      }

      // Validate the selected slot exists in available slots
      const availableSlots = await this.getFormattedSlots();
      const matchingSlot = availableSlots.find(s => s.iso === data.selectedSlot);

      if (!matchingSlot) {
        return { success: false, error: 'Selected slot is no longer available' };
      }

      // Parse name into first/last
      const nameParts = data.leadName.split(' ');
      const firstName = nameParts[0] || data.leadName;
      const lastName = nameParts.slice(1).join(' ') || undefined;

      // Book via widget endpoint (creates contact + appointment in one call)
      const result = await ghlClient.createAppointment({
        calendarId: config.GHL_CALENDAR_ID,
        locationId: config.GHL_LOCATION_ID,
        selectedSlot: data.selectedSlot,
        timezone: 'Europe/Bucharest',
        firstName,
        lastName,
        email: data.email,
        phone: data.phone,
      });

      // Invalidate slot cache after booking
      slotCache.delete(config.GHL_CALENDAR_ID);

      return {
        success: true,
        appointmentId: result?.id,
      };
    } catch (error) {
      console.error('[CALENDAR] Booking failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

export const calendarService = new CalendarService();
