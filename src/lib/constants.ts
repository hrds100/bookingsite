export const PROPERTY_TYPES = [
  'Apartment', 'House', 'Villa', 'Cottage', 'Cabin', 'Boat',
  'Treehouse', 'Castle', 'Hotel', 'Hostel', 'Farm Stay', 'Beach House',
  'Mountain Lodge', 'Penthouse', 'Studio', 'Loft', 'Bungalow', 'Chalet',
] as const;

export const RENTAL_TYPES = ['Entire place', 'Private room', 'Shared room'] as const;

export const CANCELLATION_POLICIES = {
  flexible: { label: 'Flexible', description: 'Full refund up to 24 hours before check-in' },
  moderate: { label: 'Moderate', description: 'Full refund up to 5 days before check-in' },
  strict: { label: 'Strict', description: '50% refund up to 7 days before check-in' },
  'non-refundable': { label: 'Non-refundable', description: 'No refund' },
} as const;

export const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
] as const;

export const CURRENCY_RATES: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  AED: 4.67,
  SGD: 1.71,
};

export const CHECK_TIMES = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  'Flexible',
] as const;

export const AMENITY_CATEGORIES = {
  popular: ['WiFi', 'Air conditioning', 'Heating', 'Kitchen', 'Washer', 'Dryer', 'Free parking', 'Pool', 'Hot tub', 'TV'],
  general: ['Iron', 'Hair dryer', 'Workspace', 'Smoke alarm', 'Carbon monoxide alarm', 'First aid kit', 'Fire extinguisher', 'Elevator', 'Doorman'],
  outdoors: ['Garden', 'Balcony', 'Terrace', 'BBQ grill', 'Outdoor dining', 'Patio', 'Beach access', 'Ski-in/ski-out'],
  leisure: ['Gym', 'Sauna', 'Games room', 'Library', 'Cinema room', 'Tennis court', 'Golf course'],
  entertainment: ['Board games', 'Books', 'Sound system', 'Streaming services', 'Video games'],
  children: ['Crib', 'High chair', 'Children\'s books and toys', 'Baby bath', 'Baby monitor', 'Child-safe gates'],
} as const;

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'] as const;
export const PAYMENT_STATUSES = ['pending', 'paid', 'partially_refunded', 'refunded', 'failed'] as const;
