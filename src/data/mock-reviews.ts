export interface MockReview {
  id: string;
  propertyId: string;
  guestName: string;
  guestAvatar: string;
  rating: number;
  comment: string;
  date: string;
  response?: string;
}

/** Get average rating and count for a property */
export function getPropertyRating(propertyId: string): { averageRating: number; totalCount: number } {
  const reviews = mockReviews.filter((r) => r.propertyId === propertyId);
  const totalCount = reviews.length;
  const averageRating =
    totalCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
      : 0;
  return { averageRating, totalCount };
}

export const mockReviews: MockReview[] = [
  // prop-001 — Dubai Marina (5 reviews)
  {
    id: "rev-001",
    propertyId: "prop-001",
    guestName: "Sarah Johnson",
    guestAvatar: "SJ",
    rating: 5,
    comment: "Absolutely stunning apartment with incredible marina views. The host was responsive and the check-in was seamless. Would definitely book again!",
    date: "2026-02-15",
    response: "Thank you so much, Sarah! We loved having you and hope to welcome you back soon.",
  },
  {
    id: "rev-002",
    propertyId: "prop-001",
    guestName: "Ahmed Al-Rashid",
    guestAvatar: "AA",
    rating: 5,
    comment: "Perfect location right on the Marina Walk. The apartment was spotlessly clean and had everything we needed. The pool area is gorgeous.",
    date: "2026-01-28",
  },
  {
    id: "rev-003",
    propertyId: "prop-001",
    guestName: "Laura Bennett",
    guestAvatar: "LB",
    rating: 4,
    comment: "Great apartment and fantastic views. Only minor issue was the Wi-Fi being a bit slow in the evenings. Everything else was perfect.",
    date: "2025-12-10",
    response: "Thanks for the feedback, Laura. We've since upgraded our internet connection!",
  },
  {
    id: "rev-004",
    propertyId: "prop-001",
    guestName: "Carlos Mendez",
    guestAvatar: "CM",
    rating: 5,
    comment: "We stayed for a week and didn't want to leave. The kitchen is well equipped, the beds are comfortable, and the views are unbeatable. Highly recommend.",
    date: "2025-11-20",
  },
  {
    id: "rev-005",
    propertyId: "prop-001",
    guestName: "Priya Sharma",
    guestAvatar: "PS",
    rating: 4,
    comment: "Lovely apartment in a great location. The gym and pool were excellent. Would have given 5 stars but the parking situation was a bit confusing.",
    date: "2025-10-05",
  },

  // prop-002 — Bali Villa (4 reviews)
  {
    id: "rev-006",
    propertyId: "prop-002",
    guestName: "James Williams",
    guestAvatar: "JW",
    rating: 5,
    comment: "The villa exceeded all expectations. Private pool, beautiful gardens, and the most peaceful stay we've ever had. The kids absolutely loved it.",
    date: "2026-02-20",
    response: "What a wonderful family you have, James! We're so glad the kids enjoyed the pool. See you next time!",
  },
  {
    id: "rev-007",
    propertyId: "prop-002",
    guestName: "Yuki Tanaka",
    guestAvatar: "YT",
    rating: 5,
    comment: "A true paradise. Waking up to the sound of birds and the view of rice terraces was magical. The daily breakfast was a lovely touch.",
    date: "2026-01-15",
  },
  {
    id: "rev-008",
    propertyId: "prop-002",
    guestName: "Sophie Laurent",
    guestAvatar: "SL",
    rating: 4,
    comment: "Beautiful villa with amazing staff. The only reason I'm not giving 5 stars is the road to the villa is quite narrow and tricky at night. But worth it!",
    date: "2025-12-22",
  },
  {
    id: "rev-009",
    propertyId: "prop-002",
    guestName: "David Chen",
    guestAvatar: "DC",
    rating: 5,
    comment: "We celebrated our anniversary here and it was the perfect choice. Romantic, private, and beautifully maintained. The Monkey Forest is just a short walk away.",
    date: "2025-11-08",
  },

  // prop-003 — Camden Loft (3 reviews)
  {
    id: "rev-010",
    propertyId: "prop-003",
    guestName: "Maria Garcia",
    guestAvatar: "MG",
    rating: 4,
    comment: "Perfect location in Camden with great transport links. The loft was exactly as pictured — stylish and comfortable. Great value for London.",
    date: "2026-03-01",
  },
  {
    id: "rev-011",
    propertyId: "prop-003",
    guestName: "Oliver Schmidt",
    guestAvatar: "OS",
    rating: 5,
    comment: "Loved the exposed brick and industrial feel. Camden Market is literally on your doorstep. The workspace area was perfect for getting some work done.",
    date: "2026-01-05",
    response: "Glad the workspace worked out for you, Oliver! We designed it with remote workers in mind.",
  },
  {
    id: "rev-012",
    propertyId: "prop-003",
    guestName: "Hannah Brooks",
    guestAvatar: "HB",
    rating: 4,
    comment: "Stylish loft in a brilliant location. A bit noisy at weekends due to Camden nightlife, but the flat itself is lovely and well equipped.",
    date: "2025-10-18",
  },

  // prop-005 — Barcelona Penthouse (4 reviews)
  {
    id: "rev-013",
    propertyId: "prop-005",
    guestName: "Elena Rossi",
    guestAvatar: "ER",
    rating: 5,
    comment: "The rooftop terrace alone is worth the stay. 360-degree views of Barcelona and we watched the sunset every evening. The apartment is beautifully designed.",
    date: "2026-02-10",
  },
  {
    id: "rev-014",
    propertyId: "prop-005",
    guestName: "Ryan O'Brien",
    guestAvatar: "RO",
    rating: 4,
    comment: "Incredible penthouse in the Gothic Quarter. Walking distance to everything. The only downside was the stairs — no lift to the top floor, which is tough with luggage.",
    date: "2026-01-22",
    response: "Thanks for the heads-up, Ryan. We now offer a luggage carry-up service for arriving guests!",
  },
  {
    id: "rev-015",
    propertyId: "prop-005",
    guestName: "Fatima Al-Hassan",
    guestAvatar: "FA",
    rating: 5,
    comment: "One of the best places we've ever stayed. The kitchen was well stocked, the beds were heavenly, and the terrace is a dream come true.",
    date: "2025-12-01",
  },
  {
    id: "rev-016",
    propertyId: "prop-005",
    guestName: "Marcus Johansson",
    guestAvatar: "MJ",
    rating: 5,
    comment: "We hosted a small birthday dinner on the terrace and it was magical. The host was incredibly accommodating. Would recommend to anyone visiting Barcelona.",
    date: "2025-11-15",
  },

  // prop-007 — Paris Studio (3 reviews)
  {
    id: "rev-017",
    propertyId: "prop-007",
    guestName: "Emma Davis",
    guestAvatar: "ED",
    rating: 5,
    comment: "Such a charming studio in Montmartre! Waking up to views of Sacre-Coeur was magical. The neighbourhood is full of character.",
    date: "2026-01-20",
  },
  {
    id: "rev-018",
    propertyId: "prop-007",
    guestName: "Liam Murphy",
    guestAvatar: "LM",
    rating: 4,
    comment: "Romantic and beautifully decorated. The skylight is a wonderful touch. Compact but has everything you need. The local bakery around the corner is incredible.",
    date: "2025-12-15",
  },
  {
    id: "rev-019",
    propertyId: "prop-007",
    guestName: "Isabella Martinez",
    guestAvatar: "IM",
    rating: 5,
    comment: "Paris at its most authentic. The studio captures the Montmartre spirit perfectly. We walked everywhere and loved every minute.",
    date: "2025-09-25",
    response: "Merci, Isabella! So happy you loved our little corner of Montmartre.",
  },

  // prop-009 — Algarve Villa (3 reviews)
  {
    id: "rev-020",
    propertyId: "prop-009",
    guestName: "Tom Brown",
    guestAvatar: "TB",
    rating: 5,
    comment: "The Algarve villa was a dream. Infinity pool overlooking the ocean, spacious bedrooms, and a fully equipped kitchen. Already planning our return trip.",
    date: "2026-02-28",
    response: "Can't wait to have you back, Tom! The garden will be in full bloom next time.",
  },
  {
    id: "rev-021",
    propertyId: "prop-009",
    guestName: "Natalie Fischer",
    guestAvatar: "NF",
    rating: 5,
    comment: "Perfect family villa. The kids loved the pool, we loved the hot tub under the stars. The BBQ area is great for evening meals. Lagos is a short drive away.",
    date: "2026-01-10",
  },
  {
    id: "rev-022",
    propertyId: "prop-009",
    guestName: "George Papadopoulos",
    guestAvatar: "GP",
    rating: 4,
    comment: "Stunning property with incredible ocean views. The only reason for 4 stars is the nearest beach requires a bit of a drive. But the villa itself is outstanding.",
    date: "2025-11-30",
  },

  // prop-012 — Norway Cabin (3 reviews)
  {
    id: "rev-023",
    propertyId: "prop-012",
    guestName: "Alex Wilson",
    guestAvatar: "AW",
    rating: 5,
    comment: "The fjord cabin was the highlight of our Norway trip. Sauna with a view, cozy interiors, and absolute silence. Pure heaven.",
    date: "2026-03-05",
  },
  {
    id: "rev-024",
    propertyId: "prop-012",
    guestName: "Ingrid Larsson",
    guestAvatar: "IL",
    rating: 5,
    comment: "We saw the Northern Lights from the hot tub! Unforgettable experience. The cabin is warm, well equipped, and the views are breathtaking.",
    date: "2026-01-25",
    response: "Northern Lights from the hot tub — doesn't get better than that! Glad you caught them, Ingrid.",
  },
  {
    id: "rev-025",
    propertyId: "prop-012",
    guestName: "Michael Torres",
    guestAvatar: "MT",
    rating: 4,
    comment: "Remote and peaceful — exactly what we needed. The Flam Railway is a must-do. Only note: mobile signal is weak, which is either a pro or con depending on your perspective!",
    date: "2025-12-20",
  },
];
