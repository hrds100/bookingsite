import { test, expect } from "@playwright/test";

/**
 * Verify currency switching works correctly:
 * - All properties show the same currency (user's choice)
 * - USD property and GBP property both convert to the selected currency
 * - Currency selector changes all prices on the page
 *
 * Coast View Stays has:
 *   - NYC property: $289/night (USD)
 *   - Brighton property: £145/night (GBP)
 */

const SUBDOMAIN = "https://coastview-6804.nfstay.app";

test.describe("Currency Switching — Unified Display", () => {
  test.describe.configure({ timeout: 30_000 });

  test("all property cards show the same currency symbol", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${SUBDOMAIN}/search`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Get all price texts from property cards
    const prices = await page.locator("[data-feature='NFSTAY__SEARCH_RESULTS'] .text-sm.font-bold").allTextContents();

    // All should start with the same currency symbol
    expect(prices.length).toBeGreaterThanOrEqual(2);
    const firstSymbol = prices[0].charAt(0);
    for (const price of prices) {
      expect(price.charAt(0)).toBe(firstSymbol);
    }
  });

  test("switching to EUR changes all prices to euro symbol", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${SUBDOMAIN}/search`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Open currency selector and pick EUR
    const currencyBtn = page.locator("nav").locator("button", { hasText: /GBP|USD|EUR|£|\$|€/ }).first();
    if (await currencyBtn.isVisible()) {
      await currencyBtn.click();
      await page.waitForTimeout(300);

      // Click EUR option
      const eurOption = page.locator("text=EUR").first();
      if (await eurOption.isVisible()) {
        await eurOption.click();
        await page.waitForTimeout(1000);

        // All prices should now show €
        const prices = await page.locator("[data-feature='NFSTAY__SEARCH_RESULTS'] .text-sm.font-bold").allTextContents();
        for (const price of prices) {
          expect(price).toContain("€");
        }
      }
    }
  });
});
