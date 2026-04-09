import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAIL = "hugo@nfstay.com";
const FROM = "NFStay <bookings@nfstay.app>";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY secret not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fmt(amount: number, currency: string): string {
  const s: Record<string, string> = {
    GBP: "£", USD: "$", EUR: "€", AED: "AED ", SGD: "S$",
  };
  return `${s[currency] ?? currency}${amount}`;
}

function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:#f5f5f0;margin:0;padding:24px}.w{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}.hd{background:linear-gradient(270deg,#27dea0 0%,#1E9A80 100%);padding:28px 32px}.hd h1{color:#fff;margin:0;font-size:20px;font-weight:700}.bd{padding:28px 32px}.lbl{font-size:11px;font-weight:600;color:#737373;text-transform:uppercase;letter-spacing:.5px;margin:0 0 3px}.val{font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 14px}hr{border:none;border-top:1px solid #e8e8e3;margin:18px 0}.big{font-size:22px;font-weight:700;color:#1E9A80}.ft{padding:16px 32px;background:#f5f5f0;font-size:12px;color:#999;text-align:center}a{color:#1E9A80}</style></head><body><div class="w">${content}<div class="ft">NFStay &middot; <a href="https://nfstay.app">nfstay.app</a></div></div></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const { type } = body;

    /* ── booking_confirmed ──────────────────────────────── */
    if (type === "booking_confirmed") {
      const {
        guestName, guestEmail, propertyTitle, propertyCity, propertyCountry,
        checkIn, checkOut, nights, adults, children, total, currency, reservationId,
        operatorEmail,
      } = body;

      const guestHtml = wrap(`
        <div class="hd"><h1>Booking Confirmed 🎉</h1></div>
        <div class="bd">
          <p style="color:#444;margin:0 0 20px">Hi ${guestName}, your reservation is confirmed!</p>
          <p class="lbl">Property</p><p class="val">${propertyTitle}</p>
          <p class="lbl">Location</p><p class="val">${propertyCity}, ${propertyCountry}</p>
          <p class="lbl">Check-in</p><p class="val">${checkIn}</p>
          <p class="lbl">Check-out</p><p class="val">${checkOut}</p>
          <p class="lbl">Duration</p><p class="val">${nights} night${nights !== 1 ? "s" : ""}</p>
          <p class="lbl">Guests</p><p class="val">${adults} adult${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} children` : ""}</p>
          <hr>
          <p class="lbl">Total paid</p><p class="big">${fmt(total, currency)}</p>
          ${reservationId ? `<p style="color:#999;font-size:12px;margin-top:12px">Reservation: ${String(reservationId).slice(0, 8).toUpperCase()}</p>` : ""}
          <hr>
          <p style="color:#444;font-size:14px">View your booking at <a href="https://nfstay.app/booking?email=${encodeURIComponent(guestEmail)}">nfstay.app/booking</a> · Need help? Reply to this email.</p>
        </div>`);

      const operatorHtml = wrap(`
        <div class="hd"><h1>New Booking 🏠</h1></div>
        <div class="bd">
          <p style="color:#444;margin:0 0 20px">You have a new confirmed booking!</p>
          <p class="lbl">Guest</p><p class="val">${guestName} &lt;${guestEmail}&gt;</p>
          <p class="lbl">Property</p><p class="val">${propertyTitle}</p>
          <p class="lbl">Check-in</p><p class="val">${checkIn}</p>
          <p class="lbl">Check-out</p><p class="val">${checkOut}</p>
          <p class="lbl">Duration</p><p class="val">${nights} night${nights !== 1 ? "s" : ""}</p>
          <p class="lbl">Guests</p><p class="val">${adults} adult${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} children` : ""}</p>
          <hr>
          <p class="lbl">Revenue</p><p class="big">${fmt(total, currency)}</p>
          ${reservationId ? `<p style="color:#999;font-size:12px;margin-top:12px">Reservation: ${String(reservationId).slice(0, 8).toUpperCase()}</p>` : ""}
          <hr>
          <p style="color:#444;font-size:14px">Manage this booking at <a href="https://nfstay.app/nfstay/reservations">nfstay.app/nfstay/reservations</a></p>
        </div>`);

      const adminHtml = wrap(`
        <div class="hd"><h1>New Booking 🏠</h1></div>
        <div class="bd">
          <p class="lbl">Guest</p><p class="val">${guestName} &lt;${guestEmail}&gt;</p>
          <p class="lbl">Property</p><p class="val">${propertyTitle} — ${propertyCity}, ${propertyCountry}</p>
          <p class="lbl">Check-in</p><p class="val">${checkIn}</p>
          <p class="lbl">Check-out</p><p class="val">${checkOut}</p>
          <p class="lbl">Nights / Guests</p><p class="val">${nights}n · ${adults} adults${children > 0 ? `, ${children} children` : ""}</p>
          <hr>
          <p class="lbl">Revenue</p><p class="big">${fmt(total, currency)}</p>
        </div>`);

      const sends = [
        sendEmail(guestEmail, `Booking Confirmed — ${propertyTitle}`, guestHtml),
        sendEmail(ADMIN_EMAIL, `New Booking: ${propertyTitle} (${guestName})`, adminHtml),
      ];
      if (operatorEmail && operatorEmail !== ADMIN_EMAIL) {
        sends.push(sendEmail(operatorEmail, `New Booking: ${propertyTitle} — ${guestName}`, operatorHtml));
      }
      await Promise.all(sends);
    }

    /* ── booking_cancelled ──────────────────────────────── */
    if (type === "booking_cancelled") {
      const {
        guestName, guestEmail, propertyTitle, propertyCity, propertyCountry,
        checkIn, checkOut, total, currency, operatorEmail,
      } = body;

      const guestHtml = wrap(`
        <div class="hd" style="background:#ef4444"><h1>Booking Cancelled</h1></div>
        <div class="bd">
          <p style="color:#444;margin:0 0 20px">Hi ${guestName}, your reservation has been cancelled.</p>
          <p class="lbl">Property</p><p class="val">${propertyTitle}</p>
          <p class="lbl">Location</p><p class="val">${propertyCity}, ${propertyCountry}</p>
          <p class="lbl">Dates</p><p class="val">${checkIn} → ${checkOut}</p>
          <hr>
          <p class="lbl">Amount</p><p class="val">${fmt(total, currency)}</p>
          <hr>
          <p style="color:#444;font-size:14px">Allow 5–10 business days for any refund. Questions? Contact <a href="mailto:support@nfstay.app">support@nfstay.app</a></p>
        </div>`);

      const operatorHtml = wrap(`
        <div class="hd" style="background:#ef4444"><h1>Booking Cancelled</h1></div>
        <div class="bd">
          <p style="color:#444;margin:0 0 20px">A guest has cancelled their reservation.</p>
          <p class="lbl">Guest</p><p class="val">${guestName} &lt;${guestEmail}&gt;</p>
          <p class="lbl">Property</p><p class="val">${propertyTitle}</p>
          <p class="lbl">Dates</p><p class="val">${checkIn} → ${checkOut}</p>
          <hr>
          <p class="lbl">Amount</p><p class="val">${fmt(total, currency)}</p>
          <hr>
          <p style="color:#444;font-size:14px">View all reservations at <a href="https://nfstay.app/nfstay/reservations">nfstay.app/nfstay/reservations</a></p>
        </div>`);

      const sends = [
        sendEmail(guestEmail, `Booking Cancelled — ${propertyTitle}`, guestHtml),
        sendEmail(ADMIN_EMAIL, `Cancelled: ${propertyTitle} (${guestName})`, guestHtml),
      ];
      if (operatorEmail && operatorEmail !== ADMIN_EMAIL) {
        sends.push(sendEmail(operatorEmail, `Booking Cancelled: ${propertyTitle} — ${guestName}`, operatorHtml));
      }
      await Promise.all(sends);
    }

    /* ── guest_signup ───────────────────────────────────── */
    if (type === "guest_signup") {
      const { guestName, guestEmail } = body;

      const html = wrap(`
        <div class="hd"><h1>Welcome to NFStay 👋</h1></div>
        <div class="bd">
          <p style="color:#444;margin:0 0 16px">Hi ${guestName}, great to have you on board.</p>
          <p style="color:#444;font-size:14px;margin:0 0 24px">Browse curated properties and book your next stay directly — no platform fees, no middleman.</p>
          <div style="text-align:center;margin:0 0 24px">
            <a href="https://nfstay.app/search" style="display:inline-block;background:linear-gradient(270deg,#27dea0 0%,#1E9A80 100%);color:#fff;font-weight:600;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:15px">Browse Properties</a>
          </div>
          <p style="color:#999;font-size:13px;text-align:center">Questions? Just reply to this email.</p>
        </div>`);

      await sendEmail(guestEmail, "Welcome to NFStay", html);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[nfs-send-email]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
