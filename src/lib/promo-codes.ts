import { supabase } from "@/lib/supabase";

export interface PromoResult {
  valid: boolean;
  discount: number;
  code?: string;
  message?: string;
}

export async function validatePromoCode(
  code: string
): Promise<PromoResult> {
  const trimmed = code.toUpperCase().trim();
  if (!trimmed) {
    return { valid: false, discount: 0, message: "Please enter a promo code" };
  }

  try {
    const { data, error } = await (supabase.from("nfs_promo_codes") as any)
      .select("*")
      .eq("code", trimmed)
      .eq("active", true)
      .single();

    if (error || !data) {
      return { valid: false, discount: 0, message: "Invalid promo code" };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, discount: 0, message: "This code has expired" };
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      return {
        valid: false,
        discount: 0,
        message: "This code has been fully redeemed",
      };
    }

    return {
      valid: true,
      discount: data.discount_percent,
      code: data.code,
      message: `${data.discount_percent}% discount applied!`,
    };
  } catch {
    return { valid: false, discount: 0, message: "Could not validate code. Try again." };
  }
}
