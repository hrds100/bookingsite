/**
 * Transactional email helper — calls the nfs-send-email Supabase Edge Function,
 * which sends via the Resend API server-side (key never exposed to the browser).
 *
 * n8n.ts is kept intact and can be re-enabled by swapping the imports back.
 * All functions here are fire-and-forget (never throw).
 */

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfs-send-email`;

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
  operatorEmail?: string;
}

async function post(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(EDGE_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[email] notification failed (non-blocking):", err);
  }
}

export function notifyBookingConfirmed(data: BookingNotification): void {
  post({ type: "booking_confirmed", ...data });
}

export function notifyBookingCancelled(data: BookingNotification): void {
  post({ type: "booking_cancelled", ...data });
}

export function notifyGuestSignup(data: {
  guestName: string;
  guestEmail: string;
}): void {
  post({ type: "guest_signup", ...data });
}
