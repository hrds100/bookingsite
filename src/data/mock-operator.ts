export type OnboardingStep =
  | 'account_setup'
  | 'persona'
  | 'usage_intent'
  | 'business'
  | 'landing_page'
  | 'website_customization'
  | 'contact_info'
  | 'payment_methods'
  | 'completed';

export interface OperatorStats {
  totalProperties: number;
  activeListings: number;
  totalReservations: number;
  upcomingReservations: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  occupancyRate: number;
  averageRating: number;
}

export const mockOperatorStats: OperatorStats = {
  totalProperties: 6,
  activeListings: 5,
  totalReservations: 47,
  upcomingReservations: 8,
  totalRevenue: 34520,
  thisMonthRevenue: 4280,
  occupancyRate: 72,
  averageRating: 4.8,
};

export const mockMonthlyRevenue = [
  { month: 'Oct', revenue: 2800 },
  { month: 'Nov', revenue: 3200 },
  { month: 'Dec', revenue: 4100 },
  { month: 'Jan', revenue: 3600 },
  { month: 'Feb', revenue: 3900 },
  { month: 'Mar', revenue: 4280 },
];

export const mockOccupancyData = [
  { month: 'Oct', rate: 65 },
  { month: 'Nov', rate: 70 },
  { month: 'Dec', rate: 85 },
  { month: 'Jan', rate: 60 },
  { month: 'Feb', rate: 68 },
  { month: 'Mar', rate: 72 },
];

export interface OperatorProfile {
  id: string;
  profile_id: string;
  brand_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  logo_url: string;
  logo_alt: string;
  favicon_url: string;
  accent_color: string;
  subdomain: string;
  custom_domain: string;
  custom_domain_verified: boolean;
  primary_domain_type: string;
  legal_name: string;
  listings_count: number;
  landing_page_enabled: boolean;
  hero_photo: string;
  hero_headline: string;
  hero_subheadline: string;
  about_bio: string;
  about_photo: string;
  faqs: Array<{ question: string; answer: string }>;
  contact_whatsapp: string;
  contact_telegram: string;
  google_business_url: string;
  airbnb_url: string;
  social_twitter: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  social_youtube: string;
  google_analytics_id: string;
  meta_pixel_id: string;
  meta_title: string;
  meta_description: string;
  fees_options_enabled: boolean;
  onboarding_step: OnboardingStep;
  onboarding_completed_steps: string[];
  onboarding_skipped_steps: string[];
  onboarding_preference: string;
  usage_intent: string;
  payout_method: string;
  payout_email: string;
  notifications: {
    email_new_booking: boolean;
    email_cancellation: boolean;
    email_review: boolean;
    sms_new_booking: boolean;
  };
}

export const mockOperatorProfile: OperatorProfile = {
  id: 'op-001',
  profile_id: 'profile-001',
  brand_name: 'Sunset Properties Ltd',
  contact_email: 'hello@sunsetproperties.com',
  contact_phone: '+44 20 7946 0958',
  website: 'https://sunsetproperties.com',
  logo_url: '',
  logo_alt: '',
  favicon_url: '',
  accent_color: '#22c55e',
  subdomain: 'sunset',
  custom_domain: '',
  custom_domain_verified: false,
  primary_domain_type: 'subdomain',
  legal_name: 'Sunset Properties Ltd',
  listings_count: 6,
  landing_page_enabled: true,
  hero_photo: '',
  hero_headline: '',
  hero_subheadline: '',
  about_bio: '',
  about_photo: '',
  faqs: [],
  contact_whatsapp: '',
  contact_telegram: '',
  google_business_url: '',
  airbnb_url: '',
  social_twitter: '',
  social_instagram: '',
  social_facebook: '',
  social_tiktok: '',
  social_youtube: '',
  google_analytics_id: '',
  meta_pixel_id: '',
  meta_title: '',
  meta_description: '',
  fees_options_enabled: false,
  onboarding_step: 'completed',
  onboarding_completed_steps: ['account_setup', 'persona', 'usage_intent', 'business', 'landing_page', 'website_customization', 'contact_info', 'payment_methods'],
  onboarding_skipped_steps: [],
  onboarding_preference: '',
  usage_intent: '',
  payout_method: 'stripe',
  payout_email: 'finance@sunsetproperties.com',
  notifications: {
    email_new_booking: true,
    email_cancellation: true,
    email_review: false,
    sms_new_booking: true,
  },
};
