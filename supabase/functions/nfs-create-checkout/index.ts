// Supabase Edge Function: nfs-create-checkout
// Creates a Stripe Checkout Session for guest bookings
//
// POST /nfs-create-checkout
// Body: { propertyId, checkIn, checkOut, adults, children, guestEmail, guestName, promoCode?, addons? }
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
    const { propertyId, checkIn, checkOut, adults, children, guestEmail, guestName, promoCode, addons } = await req.json();

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
    let lengthDiscount = 0;

    if (nights >= 28 && property.monthly_discount?.enabled) {
      lengthDiscount = Math.round(baseTotal * property.monthly_discount.percentage / 100);
    } else if (nights >= 7 && property.weekly_discount?.enabled) {
      lengthDiscount = Math.round(baseTotal * property.weekly_discount.percentage / 100);
    }

    // Validate promo code if provided
    let promoDiscount = 0;
    let validatedPromoCode: string | null = null;
    let promoDiscountPercent = 0;

    if (promoCode) {
      const { data: promo, error: promoErr } = await supabase
        .from("nfs_promo_codes")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("active", true)
        .single();

      if (!promoErr && promo) {
        const now = new Date();
        const notExpired = !promo.expires_at || new Date(promo.expires_at) > now;
        const underMaxUses = !promo.max_uses || promo.current_uses < promo.max_uses;

        if (notExpired && underMaxUses) {
          promoDiscountPercent = promo.discount_percent || 0;
          validatedPromoCode = promo.code;

          // Increment usage
          await supabase
            .from("nfs_promo_codes")
            .update({ current_uses: (promo.current_uses || 0) + 1 })
            .eq("id", promo.id);
        }
      }
    }

    // Calculate add-on total
    const selectedAddons: Array<{ name: string; price: number }> = [];
    let addonsTotal = 0;

    if (Array.isArray(addons) && Array.isArray(property.addons)) {
      for (const addonId of addons) {
        const propertyAddon = property.addons.find(
          (a: { id?: string; name?: string; price?: number }) => a.id === addonId || a.name === addonId
        );
        if (propertyAddon && typeof propertyAddon.price === "number") {
          selectedAddons.push({ name: propertyAddon.name, price: propertyAddon.price });
          addonsTotal += propertyAddon.price;
        }
      }
    }

    const subtotalBeforePromo = baseTotal + cleaningFee + addonsTotal - lengthDiscount;
    promoDiscount = promoDiscountPercent > 0
      ? Math.round(subtotalBeforePromo * promoDiscountPercent / 100)
      : 0;
    const totalAmount = subtotalBeforePromo - promoDiscount;
    const totalInCents = Math.round(totalAmount * 100);

    // Map currency code to Stripe currency
    const currencyMap: Record<string, string> = {
      GBP: "gbp", USD: "usd", EUR: "eur", AED: "aed", SGD: "sgd",
    };
    const stripeCurrency = currencyMap[property.base_rate_currency] || "gbp";

    // Build Stripe line items
    const lineItemParams: Record<string, string> = {
      "line_items[0][price_data][currency]": stripeCurrency,
      "line_items[0][price_data][unit_amount]": String(Math.round(baseTotal * 100)),
      "line_items[0][price_data][product_data][name]": `${property.public_title} — ${nights} night${nights > 1 ? "s" : ""}`,
      "line_items[0][price_data][product_data][description]": `${checkIn} to ${checkOut} · ${adults} adult${adults > 1 ? "s" : ""}${children ? ` · ${children} child${children > 1 ? "ren" : ""}` : ""}`,
      "line_items[0][quantity]": "1",
    };

    let lineIdx = 1;

    // Add cleaning fee as separate line item
    if (cleaningFee > 0) {
      lineItemParams[`line_items[${lineIdx}][price_data][currency]`] = stripeCurrency;
      lineItemParams[`line_items[${lineIdx}][price_data][unit_amount]`] = String(Math.round(cleaningFee * 100));
      lineItemParams[`line_items[${lineIdx}][price_data][product_data][name]`] = "Cleaning fee";
      lineItemParams[`line_items[${lineIdx}][quantity]`] = "1";
      lineIdx++;
    }

    // Add each add-on as a separate line item
    for (const addon of selectedAddons) {
      lineItemParams[`line_items[${lineIdx}][price_data][currency]`] = stripeCurrency;
      lineItemParams[`line_items[${lineIdx}][price_data][unit_amount]`] = String(Math.round(addon.price * 100));
      lineItemParams[`line_items[${lineIdx}][price_data][product_data][name]`] = addon.name;
      lineItemParams[`line_items[${lineIdx}][quantity]`] = "1";
      lineIdx++;
    }

    // Add length-of-stay discount as negative line item
    if (lengthDiscount > 0) {
      lineItemParams[`line_items[${lineIdx}][price_data][currency]`] = stripeCurrency;
      lineItemParams[`line_items[${lineIdx}][price_data][unit_amount]`] = String(Math.round(lengthDiscount * 100));
      lineItemParams[`line_items[${lineIdx}][price_data][product_data][name]`] = nights >= 28 ? "Monthly discount" : "Weekly discount";
      lineItemParams[`line_items[${lineIdx}][quantity]`] = "1";
      // Stripe doesn't support negative line items, so we'll apply via coupon or just use the total
    }

    // For simplicity, use a single line item with the final total
    // This avoids Stripe's limitation on negative amounts
    const finalLineItems: Record<string, string> = {
      "line_items[0][price_data][currency]": stripeCurrency,
      "line_items[0][price_data][unit_amount]": String(totalInCents),
      "line_items[0][price_data][product_data][name]": `${property.public_title} — ${nights} night${nights > 1 ? "s" : ""}`,
      "line_items[0][price_data][product_data][description]": buildDescription({
        checkIn, checkOut, adults, children, cleaningFee, lengthDiscount, nights,
        selectedAddons, promoDiscount, validatedPromoCode, promoDiscountPercent,
      }),
      "line_items[0][quantity]": "1",
    };

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
        ...finalLineItems,
        "metadata[property_id]": propertyId,
        "metadata[check_in]": checkIn,
        "metadata[check_out]": checkOut,
        "metadata[adults]": String(adults || 1),
        "metadata[children]": String(children || 0),
        "metadata[guest_name]": guestName || "",
        "metadata[nights]": String(nights),
        "metadata[operator_id]": property.nfs_operators?.id || "",
        "metadata[promo_code]": validatedPromoCode || "",
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
    const { error: insertErr } = await supabase.from("nfs_reservations").insert({
      property_id: propertyId,
      operator_id: property.nfs_operators?.id || null,
      guest_email: guestEmail,
      guest_first_name: guestName?.split(" ")[0] || "",
      guest_last_name: guestName?.split(" ").slice(1).join(" ") || "",
      check_in: checkIn,
      check_out: checkOut,
      check_in_time: "",
      check_out_time: "",
      adults: adults || 1,
      children: children || 0,
      infants: 0,
      status: "pending",
      payment_status: "pending",
      total_amount: totalAmount,
      payment_currency: property.base_rate_currency,
      stripe_session_id: session.id,
      selected_addons: selectedAddons,
      discount_amount: promoDiscount,
      promo_code: validatedPromoCode,
    });
    if (insertErr) {
      console.error("Failed to create reservation:", insertErr.message);
    }

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

/** Build a human-readable description for the Stripe line item */
function buildDescription(opts: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  cleaningFee: number;
  lengthDiscount: number;
  nights: number;
  selectedAddons: Array<{ name: string; price: number }>;
  promoDiscount: number;
  validatedPromoCode: string | null;
  promoDiscountPercent: number;
}): string {
  const parts: string[] = [];
  parts.push(`${opts.checkIn} to ${opts.checkOut}`);
  parts.push(`${opts.adults} adult${opts.adults > 1 ? "s" : ""}${opts.children ? ` · ${opts.children} child${opts.children > 1 ? "ren" : ""}` : ""}`);

  if (opts.cleaningFee > 0) {
    parts.push(`Cleaning fee included`);
  }
  if (opts.lengthDiscount > 0) {
    parts.push(`${opts.nights >= 28 ? "Monthly" : "Weekly"} discount applied`);
  }
  if (opts.selectedAddons.length > 0) {
    parts.push(`Add-ons: ${opts.selectedAddons.map(a => a.name).join(", ")}`);
  }
  if (opts.validatedPromoCode && opts.promoDiscount > 0) {
    parts.push(`Promo ${opts.validatedPromoCode} (${opts.promoDiscountPercent}% off)`);
  }

  return parts.join(" · ");
}
