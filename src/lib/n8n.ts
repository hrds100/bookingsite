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

/** Strip spaces, dashes, parens from phone numbers: "+44 7863 992555" -> "+447863992555" */
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

/** POST /webhook/send-otp -> { phone } -> { success, message_id } */
export async function sendOtp(
  phone: string
): Promise<{ success: boolean; message_id?: string }> {
  if (!N8N_BASE) throw new Error("N8N_BASE not configured");

  const clean = cleanPhone(phone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${N8N_BASE}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
 * POST /webhook/verify-otp -> { phone, code, name, email? } -> { success, error? }
 * NOTE: n8n verify-otp may return empty body (no Respond to Webhook node).
 * We treat empty 200 as success.
 */
export async function verifyOtp(params: {
  phone: string;
  code: string;
  name: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!N8N_BASE) throw new Error("N8N_BASE not configured");

  const clean = cleanPhone(params.phone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${N8N_BASE}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, phone: clean }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const text = await res.text();
    if (!text.trim()) {
      // n8n workflow ran but has no Respond to Webhook node - treat as success
      return { success: true };
    }
    return JSON.parse(text);
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

/**
 * Notify n8n that an operator rejected a booking.
 * Triggers: guest rejection email with reason.
 */
export function notifyBookingRejected(data: BookingNotification & { reason?: string }): void {
  postWebhook("nfstay-booking-confirmed", {
    type: "booking_rejected",
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Notify admin (Hugo) that a new operator signed up.
 */
export function notifyNewOperator(data: {
  operatorName: string;
  operatorEmail: string;
  subdomain: string;
}): void {
  postWebhook("nfstay-new-operator", {
    type: "new_operator",
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Notify admin (Hugo) that an operator listed a new property.
 */
export function notifyNewProperty(data: {
  propertyName: string;
  operatorName: string;
  city: string;
}): void {
  postWebhook("nfstay-new-property", {
    type: "new_property",
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Notify n8n that a guest signed up - triggers welcome email.
 */
export function notifyGuestSignup(data: {
  guestName: string;
  guestEmail: string;
}): void {
  postWebhook("nfstay-guest-signup", {
    type: "guest_signup",
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Notify operator that a guest cancelled a booking.
 */
export function notifyBookingCancelled(data: BookingNotification): void {
  postWebhook("nfstay-booking-confirmed", {
    type: "booking_cancelled",
    timestamp: new Date().toISOString(),
    ...data,
  });
}
