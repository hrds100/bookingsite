import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = (
  Deno.env.get("STRIPE_SECRET_KEY") ||
  Deno.env.get("NFS_STRIPE_SECRET_KEY") ||
  ""
).trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const body = await req.text();
    let event: { type: string; data: { object: { id: string } } };

    try {
      event = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    // Only process checkout completions
    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const sessionId = event.data.object.id;
    console.log("Processing checkout.session.completed:", sessionId);

    // Verify the session is actually paid by fetching from Stripe directly
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { "Authorization": `Bearer ${STRIPE_SECRET_KEY}` },
    });

    if (!stripeRes.ok) {
      console.error("Failed to fetch session from Stripe:", stripeRes.status);
      return new Response(JSON.stringify({ error: "Could not verify session" }), { status: 400 });
    }

    const session = await stripeRes.json();

    if (session.payment_status !== "paid") {
      console.log("Session not paid, status:", session.payment_status);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find reservation by stripe_session_id
    const { data: reservation, error: findErr } = await supabase
      .from("nfs_reservations")
      .select("*, nfs_properties!inner(operator_id, public_title)")
      .eq("stripe_session_id", sessionId)
      .single();

    if (findErr || !reservation) {
      console.error("Reservation not found for session:", sessionId, findErr?.message);
      return new Response(JSON.stringify({ error: "Reservation not found" }), { status: 404 });
    }

    // Check operator's booking_mode
    const { data: operator } = await supabase
      .from("nfs_operators")
      .select("booking_mode, contact_email, brand_name")
      .eq("id", reservation.nfs_properties.operator_id)
      .single();

    const newStatus = operator?.booking_mode === "instant" ? "confirmed" : "pending_approval";
    console.log("Setting reservation status to:", newStatus, "booking_mode:", operator?.booking_mode);

    const { error: updateErr } = await supabase
      .from("nfs_reservations")
      .update({ status: newStatus, payment_status: "paid" })
      .eq("id", reservation.id);

    if (updateErr) {
      console.error("Failed to update reservation:", updateErr.message);
    } else {
      console.log("Reservation updated:", reservation.id, "->", newStatus);
    }

    // Fire notification webhooks (fire and forget)
    const n8nBase = "https://n8n.srv886554.hstgr.cloud/webhook";

    fetch(`${n8nBase}/nfstay-booking-enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailType: newStatus === "confirmed" ? "booking_confirmed_operator" : "booking_request_operator",
        operatorEmail: operator?.contact_email,
        operatorName: operator?.brand_name,
        guestName: `${reservation.guest_first_name || ""} ${reservation.guest_last_name || ""}`.trim(),
        guestEmail: reservation.guest_email,
        propertyName: reservation.nfs_properties?.public_title,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalAmount: reservation.total_amount,
        status: newStatus,
        reservationId: reservation.id,
      }),
    }).catch(() => {});

    fetch(`${n8nBase}/nfstay-booking-confirmed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailType: newStatus === "confirmed" ? "booking_confirmed" : "booking_request_sent",
        guestName: `${reservation.guest_first_name || ""} ${reservation.guest_last_name || ""}`.trim(),
        guestEmail: reservation.guest_email,
        propertyName: reservation.nfs_properties?.public_title,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalAmount: reservation.total_amount,
        status: newStatus,
        operatorName: operator?.brand_name,
        reservationId: reservation.id,
      }),
    }).catch(() => {});

    fetch(`${n8nBase}/nfstay-booking-enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailType: "admin_new_booking",
        operatorEmail: "hugo@nfstay.com",
        operatorName: "Admin",
        guestName: `${reservation.guest_first_name || ""} ${reservation.guest_last_name || ""}`.trim(),
        guestEmail: reservation.guest_email,
        propertyName: reservation.nfs_properties?.public_title,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalAmount: reservation.total_amount,
        status: newStatus,
        reservationId: reservation.id,
        operatorBrand: operator?.brand_name,
      }),
    }).catch(() => {});

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500 });
  }
});
