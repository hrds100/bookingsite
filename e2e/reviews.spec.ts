import { test, expect } from "@playwright/test";

const BASE = "http://localhost:4174";

// Helper to navigate to a property page and wait for content to load
async function goToProperty(page: import("@playwright/test").Page, slug: string) {
  await page.goto(`${BASE}/property/${slug}`, { waitUntil: "networkidle", timeout: 30000 });
  // Wait for the property title to confirm page loaded
  await page.waitForSelector('[data-feature="NFSTAY__PROPERTY_TITLE"]', { timeout: 15000 });
}

test.describe("Reviews System", () => {
  test.describe("Property Cards — star ratings", () => {
    test("search page cards show star ratings or 'New' badge", async ({ page }) => {
      await page.goto(`${BASE}/search`, { waitUntil: "networkidle", timeout: 30000 });

      // Property cards should exist with star icons
      const starIcons = page.locator("svg.fill-primary.text-primary");
      const count = await starIcons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("Property Detail — reviews section", () => {
    test("reviews section is visible on property with reviews", async ({ page }) => {
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      // Scroll down to find the reviews section
      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();
      await expect(reviewsSection).toBeVisible({ timeout: 10000 });
    });

    test("shows average rating and review count in header", async ({ page }) => {
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();
      const headerText = await reviewsSection.locator("h2").textContent({ timeout: 10000 });
      // Should show something like "4.6 · 5 reviews"
      expect(headerText).toMatch(/\d+(\.\d)?.*\d+ review/);
    });

    test("displays individual review cards", async ({ page }) => {
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();

      const reviewCards = page.locator('[data-testid="review-card"]');
      // prop-001 has 5 reviews, should show 3 initially
      const visibleCount = await reviewCards.count();
      expect(visibleCount).toBe(3);

      // First review should have guest name
      await expect(reviewCards.first()).toContainText("Sarah Johnson");
    });

    test("'Show all reviews' button expands reviews", async ({ page }) => {
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();

      const showAllBtn = page.locator("button", { hasText: /Show all \d+ reviews/ });
      await expect(showAllBtn).toBeVisible({ timeout: 10000 });
      await showAllBtn.click();

      // All 5 review cards should now be visible
      const reviewCards = page.locator('[data-testid="review-card"]');
      await expect(reviewCards).toHaveCount(5, { timeout: 5000 });

      // Button text should change
      await expect(page.locator("button", { hasText: /Show fewer reviews/ })).toBeVisible();
    });

    test("operator responses are shown under reviews", async ({ page }) => {
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();

      // prop-001 reviews include host responses
      const hostResponses = page.locator("text=Host response");
      const responseCount = await hostResponses.count();
      expect(responseCount).toBeGreaterThan(0);
    });

    test("property with no reviews shows 'No reviews yet'", async ({ page }) => {
      await goToProperty(page, "alfama-heritage-apartment-prop-004");

      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();
      await expect(reviewsSection).toContainText("No reviews yet", { timeout: 10000 });
    });

    test("star rating shown in property info area", async ({ page }) => {
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      // The property info area should contain rating text
      const infoArea = page.locator('[data-feature="NFSTAY__PROPERTY"]');
      const text = await infoArea.textContent({ timeout: 10000 });
      expect(text).toMatch(/\d\.\d.*review/);
    });
  });

  test.describe("Mobile responsiveness (375px)", () => {
    test("reviews section renders on mobile without overflow", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goToProperty(page, "stunning-marina-view-apartment-prop-001");

      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      await reviewsSection.scrollIntoViewIfNeeded();
      await expect(reviewsSection).toBeVisible({ timeout: 10000 });

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375);
    });
  });

  test.describe("Operator Dashboard — avg rating", () => {
    test("dashboard page loads without crash", async ({ page }) => {
      const resp = await page.goto(`${BASE}/nfstay/dashboard`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      // Will redirect to signin but should not crash
      expect(resp?.status()).toBeLessThan(400);
    });
  });
});
