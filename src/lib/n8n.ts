/**
 * n8n webhook integration for nfstay booking site.
 *
 * All notifications (booking confirmation emails, admin alerts, etc.)
 * are sent via n8n webhooks. If the webhook fails, the app continues
 * normally — notifications are fire-and-forget.
 */

const N8N_BASE = import.meta.env.VITE_N8N_WEBHOOK_URL || "";

interface BookingNotification {
  reservationId: string;
  guestName: string;
  guestEmail: string;
  propertyTitle: string;
  propertyCity: string;
  propertyCountry: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  total: number;
  currency: string;
}

/**
 * Fire-and-forget POST to an n8n webhook.
 * Never throws — logs errors silently.
 */
async function postWebhook(path: string, payload: Record<string, unknown>): Promise<void> {
  if (!N8N_BASE) {
    console.warn("[n8n] VITE_N8N_WEBHOOK_URL not set, skipping notification");
    return;
  }

  const url = `${N8N_BASE}/${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    console.warn(`[n8n] Webhook ${path} failed (non-blocking):`, err);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Notify n8n that a booking was confirmed.
 * Triggers: guest confirmation email + admin alert.
 */
export function notifyBookingConfirmed(data: BookingNotification): void {
  postWebhook("nfstay-booking-confirmed", {
    type: "booking_confirmed",
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Notify n8n that a new enquiry was submitted (no payment yet).
 */
export function notifyBookingEnquiry(data: Omit<BookingNotification, "reservationId">): void {
  postWebhook("nfstay-booking-enquiry", {
    type: "booking_enquiry",
    timestamp: new Date().toISOString(),
    ...data,
  });
}
