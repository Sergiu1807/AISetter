/**
 * GHL Widget API Client
 *
 * Uses the public widget endpoints (no API key required).
 * - Free slots: GET https://services.leadconnectorhq.com/calendars/{widgetId}/free-slots
 * - Booking: POST https://backend.leadconnectorhq.com/appengine/appointment
 *
 * The widget ID (GHL_CALENDAR_ID) and location ID (GHL_LOCATION_ID) are
 * extracted from the public booking widget URL.
 */

const SLOTS_BASE_URL = 'https://services.leadconnectorhq.com';
const BOOKING_BASE_URL = 'https://backend.leadconnectorhq.com/appengine';

interface GHLFreeSlots {
  [key: string]: {
    slots: string[]; // ISO timestamps
  } | string; // traceId field
}

interface GHLAppointmentResult {
  id?: string;
  [key: string]: unknown;
}

export const ghlClient = {
  /**
   * Get available/free slots from a GHL calendar (public widget endpoint, no auth).
   * Dates are Unix timestamps in milliseconds.
   */
  async getAvailableSlots(
    calendarId: string,
    startDate: number,
    endDate: number,
    timezone: string
  ): Promise<GHLFreeSlots> {
    const params = new URLSearchParams({
      startDate: startDate.toString(),
      endDate: endDate.toString(),
      timezone,
    });

    const response = await fetch(
      `${SLOTS_BASE_URL}/calendars/${calendarId}/free-slots?${params.toString()}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => 'No body');
      throw new Error(`GHL free-slots error ${response.status}: ${body}`);
    }

    return response.json();
  },

  /**
   * Create an appointment via the public widget booking endpoint (no auth).
   * This is the same endpoint the GHL booking widget uses.
   */
  async createAppointment(data: {
    calendarId: string;
    locationId: string;
    selectedSlot: string;
    timezone: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
  }): Promise<GHLAppointmentResult> {
    const response = await fetch(`${BOOKING_BASE_URL}/appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        calendar_id: data.calendarId,
        location_id: data.locationId,
        selectedSlot: data.selectedSlot,
        selectedTimezone: data.timezone,
        first_name: data.firstName,
        last_name: data.lastName || '',
        email: data.email,
        phone: data.phone,
        source: 'booking_widget',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'No body');
      throw new Error(`GHL booking error ${response.status}: ${body}`);
    }

    return response.json();
  },
};
