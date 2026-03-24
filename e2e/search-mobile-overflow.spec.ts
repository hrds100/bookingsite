import { test, expect } from "@playwright/test";

const BASE = "https://nfstay.app";

test.describe("Search page mobile overflow (375px)", () => {
  test("no horizontal scrollbar at 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });

  test("search input and Search button are visible at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });

    const searchBar = page.locator('[data-feature="NFSTAY__NAVBAR_SEARCH"]');
    await expect(searchBar).toBeVisible();

    const searchInput = searchBar.locator('input[placeholder="Where to?"]');
    await expect(searchInput).toBeVisible();
  });

  test("date and guest buttons are hidden at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });

    const datesBtn = page.locator('[data-feature="NFSTAY__NAVBAR_SEARCH"]').locator("text=Any dates...");
    const guestBtn = page.locator('[data-feature="NFSTAY__NAVBAR_SEARCH"]').locator("text=1 guest");

    await expect(datesBtn).toBeHidden();
    await expect(guestBtn).toBeHidden();
  });

  test("date and guest buttons visible at desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });

    const datesBtn = page.locator('[data-feature="NFSTAY__NAVBAR_SEARCH"]').locator("text=Any dates...");
    const guestBtn = page.locator('[data-feature="NFSTAY__NAVBAR_SEARCH"]').locator("text=1 guest");

    await expect(datesBtn).toBeVisible();
    await expect(guestBtn).toBeVisible();
  });
});
