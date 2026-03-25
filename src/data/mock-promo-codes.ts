export interface MockPromoCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  label: string;
}

export const mockPromoCodes: MockPromoCode[] = [
  { code: 'WELCOME10', type: 'percentage', value: 10, label: '10% off' },
  { code: 'NFSTAY25', type: 'fixed', value: 25, label: '$25 off' },
  { code: 'SUMMER20', type: 'percentage', value: 20, label: '20% off' },
];

export function validatePromoCode(code: string): MockPromoCode | null {
  const upper = code.trim().toUpperCase();
  return mockPromoCodes.find(p => p.code === upper) || null;
}

export function calculatePromoDiscount(
  promo: MockPromoCode,
  subtotal: number,
): number {
  if (promo.type === 'percentage') {
    return Math.round(subtotal * promo.value / 100);
  }
  return Math.min(promo.value, subtotal);
}
