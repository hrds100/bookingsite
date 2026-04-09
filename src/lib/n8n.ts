/**
 * n8n compatibility shim — all calls now route to Supabase Edge Functions.
 * Function signatures are unchanged so no call-sites need updating.
 * n8n is no longer required or used by bookingsite.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/nfs-send-email`;
const SEND_OTP_URL = `${SUPABASE_URL}/functions/v1/send-otp`;
const VERIFY_OTP_URL = `${SUPABASE_URL}/functions/v1/verify-otp`;

const AUTH_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${ANON_KEY}`,
  "apikey": ANON_KEY,
};

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

/** Strip spaces, dashes, parens from phone numbers: "+44 7863 992555" -> "+447863992555" */
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

/** Fire-and-forget POST to nfs-send-email edge function */
async function postEmail(payload: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL) {
    console.warn("[email] VITE_SUPABASE_URL not set, skipping notification");
    return;
  }
  try {
    await fetch(SEND_EMAIL_URL, {
      method: "POST",
      headers: AUTH_HEADERS,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[email] notification failed (non-blocking):", err);
  }
}

/** POST to send-otp edge function → { phone } → { success, message_id } */
export async function sendOtp(
  phone: string
): Promise<{ success: boolean; message_id?: string }> {
  if (!SUPABASE_URL) throw new Error("VITE_SUPABASE_URL not configured");

  const clean = cleanPhone(phone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(SEND_OTP_URL, {
      method: "POST",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ phone: clean }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const data = await res.json();
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST to verify-otp edge function → { phone, code, name, email? } → { success, error? }
 * Treats empty 200 as success (edge fn may not respond with body).
 */
export async function verifyOtp(params: {
  phone: string;
  code: string;
  name: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!SUPABASE_URL) throw new Error("VITE_SUPABASE_URL not configured");

  const clean = cleanPhone(params.phone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(VERIFY_OTP_URL, {
      method: "POST",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ ...params, phone: clean }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const text = await res.text();
    if (!text.trim()) {
      // Edge function ran but has no response body — treat as success
      return { success: true };
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

/** Notify that a booking was confirmed — triggers confirmation emails */
export function notifyBookingConfirmed(data: BookingNotification): void {
  postEmail({ type: "booking_confirmed", ...data });
}

/** Notify that a new enquiry was submitted (no payment yet) */
export function notifyBookingEnquiry(data: Omit<BookingNotification, "reservationId">): void {
  // No email type for enquiries yet — log only
  console.info("[email] booking enquiry (no email template):", data);
}

/** Notify that an operator rejected a booking */
export function notifyBookingRejected(data: BookingNotification & { reason?: string }): void {
  postEmail({ type: "booking_cancelled", ...data });
}

/** Notify admin that a new operator signed up */
export function notifyNewOperator(data: {
  operatorName: string;
  operatorEmail: string;
  subdomain: string;
}): void {
  postEmail({ type: "new_operator", ...data });
}

/** Notify admin that an operator listed a new property */
export function notifyNewProperty(data: {
  propertyName: string;
  operatorName: string;
  city: string;
}): void {
  postEmail({ type: "new_property", ...data });
}

/** Notify that a guest signed up — triggers welcome email */
export function notifyGuestSignup(data: {
  guestName: string;
  guestEmail: string;
}): void {
  postEmail({ type: "guest_signup", ...data });
}

/** Notify operator that a guest cancelled a booking */
export function notifyBookingCancelled(data: BookingNotification): void {
  postEmail({ type: "booking_cancelled", ...data });
}
