import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const body = await req.text();
    // For now, skip signature verification (add later with STRIPE_WEBHOOK_SECRET)
    const event = JSON.parse(body);

    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const session = event.data.object;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find reservation by stripe_session_id
    const { data: reservation, error: findErr } = await supabase
      .from("nfs_reservations")
      .select("*, nfs_properties!inner(operator_id, name)")
      .eq("stripe_session_id", session.id)
      .single();

    if (findErr || !reservation) {
      console.error("Reservation not found for session:", session.id);
      return new Response(JSON.stringify({ error: "Reservation not found" }), { status: 404 });
    }

    // Check operator's booking_mode
    const { data: operator } = await supabase
      .from("nfs_operators")
      .select("booking_mode, contact_email, brand_name")
      .eq("id", reservation.nfs_properties.operator_id)
      .single();

    const newStatus = operator?.booking_mode === "instant" ? "confirmed" : "pending_approval";

    // Update reservation status
    await supabase
      .from("nfs_reservations")
      .update({ status: newStatus, payment_status: "paid" })
      .eq("id", reservation.id);

    // Fire n8n notification webhook (fire and forget)
    const n8nBase = "https://n8n.srv886554.hstgr.cloud/webhook";

    // Notify operator - differentiate by booking mode
    fetch(`${n8nBase}/nfstay-booking-enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailType: newStatus === "confirmed" ? "booking_confirmed_operator" : "booking_request_operator",
        operatorEmail: operator?.contact_email,
        operatorName: operator?.brand_name,
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        propertyName: reservation.nfs_properties?.name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalAmount: reservation.total_amount,
        status: newStatus,
        reservationId: reservation.id,
      }),
    }).catch(() => {});

    // Notify guest - differentiate by booking mode
    fetch(`${n8nBase}/nfstay-booking-confirmed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailType: newStatus === "confirmed" ? "booking_confirmed" : "booking_request_sent",
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        propertyName: reservation.nfs_properties?.name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalAmount: reservation.total_amount,
        status: newStatus,
        operatorName: operator?.brand_name,
        reservationId: reservation.id,
      }),
    }).catch(() => {});

    // Notify admin (Hugo) of every new booking
    fetch(`${n8nBase}/nfstay-booking-enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailType: "admin_new_booking",
        operatorEmail: "hugo@nfstay.com",
        operatorName: "Admin",
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        propertyName: reservation.nfs_properties?.name,
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
