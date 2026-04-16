import { supabase } from "@/lib/supabase";

export interface PromoResult {
  valid: boolean;
  discount: number;
  discountType: 'percentage' | 'fixed';
  code?: string;
  message?: string;
}

export async function validatePromoCode(
  code: string
): Promise<PromoResult> {
  const trimmed = code.toUpperCase().trim();
  if (!trimmed) {
    return { valid: false, discount: 0, discountType: 'percentage', message: "Please enter a promo code" };
  }

  try {
    const { data, error } = await (supabase.from("nfs_promo_codes") as any)
      .select("*")
      .eq("code", trimmed)
      .eq("active", true)
      .single();

    if (error || !data) {
      return { valid: false, discount: 0, discountType: 'percentage', message: "Invalid promo code" };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, discount: 0, discountType: 'percentage', message: "This code has expired" };
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      return {
        valid: false,
        discount: 0,
        discountType: 'percentage',
        message: "This code has been fully redeemed",
      };
    }

    const discountType: 'percentage' | 'fixed' = data.discount_type === 'fixed' ? 'fixed' : 'percentage';
    const discount = discountType === 'fixed' ? data.value : (data.value ?? data.discount_percent);
    const label = discountType === 'fixed' ? `£${discount} off` : `${discount}% discount applied!`;

    return {
      valid: true,
      discount,
      discountType,
      code: data.code,
      message: label,
    };
  } catch {
    return { valid: false, discount: 0, discountType: 'percentage', message: "Could not validate code. Try again." };
  }
}
