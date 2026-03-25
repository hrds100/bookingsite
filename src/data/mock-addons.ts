export interface MockAddon {
  id: string;
  label: string;
  description: string;
  price: number;
}

export const mockAddons: MockAddon[] = [
  { id: 'early-checkin', label: 'Early check-in', description: 'Check in from 10 AM', price: 30 },
  { id: 'late-checkout', label: 'Late checkout', description: 'Check out by 3 PM', price: 30 },
  { id: 'airport-transfer', label: 'Airport transfer', description: 'Private car pickup', price: 50 },
  { id: 'welcome-basket', label: 'Welcome basket', description: 'Snacks, water & wine', price: 25 },
];
