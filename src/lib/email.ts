/**
 * Transactional email helper — calls the nfs-send-email Supabase Edge Function,
 * which sends via the Resend API server-side (key never exposed to the browser).
 *
 * n8n.ts is kept intact and can be re-enabled by swapping the imports back.
 * All functions here are fire-and-forget (never throw).
 */

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfs-send-email`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

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
  /** Operator custom domain or subdomain — used for guest-facing links in emails */
  operatorDomain?: string;
}

async function post(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(EDGE_FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[email] notification failed (non-blocking):", err);
  }
}

export function notifyBookingConfirmed(data: BookingNotification): void {
  post({ type: "booking_confirmed", ...data });
}

/** Sent when a guest submits a cash / pay-on-arrival booking request */
export function notifyCashBookingRequest(data: BookingNotification): void {
  post({ type: "cash_booking_request", ...data });
}

/** Sent when an operator accepts a cash booking */
export function notifyCashBookingConfirmed(data: BookingNotification): void {
  post({ type: "cash_booking_confirmed", ...data });
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

export function notifyNewOperator(data: {
  operatorName: string;
  operatorEmail: string;
  subdomain: string;
}): void {
  post({ type: "new_operator", ...data });
}

export function notifyNewProperty(data: {
  propertyName: string;
  operatorName: string;
  city: string;
}): void {
  post({ type: "new_property", ...data });
}
