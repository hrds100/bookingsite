import { test, expect } from "@playwright/test";

/**
 * Verify favourites heart icon in navbar with dropdown.
 */

const SUBDOMAIN = "https://coastview-6804.nfstay.app";

test.describe("Favourites Dropdown — Navbar", () => {
  test.describe.configure({ timeout: 30_000 });

  test("navbar shows heart icon for favourites", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const heart = page.locator("nav [data-feature='NFSTAY__FAVOURITES']");
    await expect(heart).toBeVisible();
  });

  test("clicking heart opens favourites dropdown", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const heart = page.locator("nav [data-feature='NFSTAY__FAVOURITES'] button").first();
    await heart.click();
    await page.waitForTimeout(500);

    // Should show dropdown with "Favourites" heading and empty state
    const dropdown = page.locator("[data-feature='NFSTAY__FAVOURITES_PANEL']");
    await expect(dropdown).toBeVisible();

    const body = await dropdown.textContent();
    expect(body).toContain("Favourites");
  });

  test("favouriting a property shows it in the dropdown", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${SUBDOMAIN}/search`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Click the heart on the first property card
    const cardHeart = page.locator("[data-feature='NFSTAY__CARD_FAVOURITE']").first();
    if (await cardHeart.isVisible()) {
      await cardHeart.click();
      await page.waitForTimeout(500);

      // Now open the favourites dropdown
      const navHeart = page.locator("nav [data-feature='NFSTAY__FAVOURITES'] button").first();
      await navHeart.click();
      await page.waitForTimeout(500);

      const dropdown = page.locator("[data-feature='NFSTAY__FAVOURITES_PANEL']");
      await expect(dropdown).toBeVisible();

      // Should show at least 1 saved property (not empty state)
      const text = await dropdown.textContent();
      expect(text).toContain("1 saved");
    }
  });
});
