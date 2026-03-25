import { useMemo } from "react";
import { mockReviews, type MockReview } from "@/data/mock-reviews";

interface UseNfsReviewsResult {
  reviews: MockReview[];
  averageRating: number;
  totalCount: number;
}

/** Returns reviews for a single property (mock data — wire to Supabase later) */
export function useNfsReviews(propertyId: string | undefined): UseNfsReviewsResult {
  return useMemo(() => {
    if (!propertyId) return { reviews: [], averageRating: 0, totalCount: 0 };

    const reviews = mockReviews.filter((r) => r.propertyId === propertyId);
    const totalCount = reviews.length;
    const averageRating =
      totalCount > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
        : 0;

    return { reviews, averageRating, totalCount };
  }, [propertyId]);
}

/** Returns aggregate rating across all properties for a given operator */
export function useNfsOperatorRating(operatorPropertyIds: string[]): { averageRating: number; totalCount: number } {
  return useMemo(() => {
    const reviews = mockReviews.filter((r) => operatorPropertyIds.includes(r.propertyId));
    const totalCount = reviews.length;
    const averageRating =
      totalCount > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
        : 0;

    return { averageRating, totalCount };
  }, [operatorPropertyIds]);
}
