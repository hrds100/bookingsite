// Supabase Edge Function: nfs-create-checkout
// Creates a Stripe Checkout Session for guest bookings
//
// POST /nfs-create-checkout
// Body: { propertyId, checkIn, checkOut, adults, children, guestEmail, guestName, promoCode? }
// Returns: { url } — Stripe Checkout URL to redirect guest to

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { propertyId, checkIn, checkOut, adults, children, guestEmail, guestName, promoCode } = await req.json();

    if (!propertyId || !checkIn || !checkOut || !guestEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch property from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: property, error: propError } = await supabase
      .from("nfs_properties")
      .select("*, nfs_operators!inner(id, brand_name, contact_email)")
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      return new Response(JSON.stringify({ error: "Property not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate pricing
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      return new Response(JSON.stringify({ error: "Invalid dates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseTotal = property.base_rate_amount * nights;
    const cleaningFee = property.cleaning_fee?.enabled ? property.cleaning_fee.amount : 0;
    let discount = 0;

    if (nights >= 28 && property.monthly_discount?.enabled) {
      discount = Math.round(baseTotal * property.monthly_discount.percentage / 100);
    } else if (nights >= 7 && property.weekly_discount?.enabled) {
      discount = Math.round(baseTotal * property.weekly_discount.percentage / 100);
    }

    const totalAmount = baseTotal + cleaningFee - discount;
    const totalInCents = Math.round(totalAmount * 100);

    // Map currency code to Stripe currency
    const currencyMap: Record<string, string> = {
      GBP: "gbp", USD: "usd", EUR: "eur", AED: "aed", SGD: "sgd",
    };
    const stripeCurrency = currencyMap[property.base_rate_currency] || "gbp";

    // Create Stripe Checkout Session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "customer_email": guestEmail,
        "success_url": `${req.headers.get("origin") || "https://nfstay.app"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${req.headers.get("origin") || "https://nfstay.app"}/payment/cancel`,
        "line_items[0][price_data][currency]": stripeCurrency,
        "line_items[0][price_data][unit_amount]": String(totalInCents),
        "line_items[0][price_data][product_data][name]": `${property.public_title} — ${nights} night${nights > 1 ? "s" : ""}`,
        "line_items[0][price_data][product_data][description]": `${checkIn} to ${checkOut} · ${adults} adult${adults > 1 ? "s" : ""}${children ? ` · ${children} child${children > 1 ? "ren" : ""}` : ""}`,
        "line_items[0][quantity]": "1",
        "metadata[property_id]": propertyId,
        "metadata[check_in]": checkIn,
        "metadata[check_out]": checkOut,
        "metadata[adults]": String(adults || 1),
        "metadata[children]": String(children || 0),
        "metadata[guest_name]": guestName || "",
        "metadata[nights]": String(nights),
        "metadata[operator_id]": property.nfs_operators?.id || "",
      }),
    });

    const session = await stripeRes.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create pending reservation in database
    await supabase.from("nfs_reservations").insert({
      property_id: propertyId,
      guest_email: guestEmail,
      guest_first_name: guestName?.split(" ")[0] || "",
      guest_last_name: guestName?.split(" ").slice(1).join(" ") || "",
      check_in: checkIn,
      check_out: checkOut,
      adults: adults || 1,
      children: children || 0,
      infants: 0,
      status: "pending",
      payment_status: "pending",
      total_amount: totalAmount,
      payment_currency: property.base_rate_currency,
      stripe_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
