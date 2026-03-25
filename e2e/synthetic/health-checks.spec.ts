import { test, expect } from "@playwright/test";

/**
 * Synthetic health checks for nfstay.app
 *
 * These tests run on a cron schedule via GitHub Actions against production.
 * They are non-destructive (read-only) and must complete within 2 minutes.
 */

const BASE_URL = "https://nfstay.app";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";

test.describe("Bookingsite Synthetic Health Checks", () => {
  test.describe.configure({ timeout: 30_000 });

  test("Homepage loads successfully", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);

    // Page should have visible content
    await expect(
      page.locator("h1, h2, main, [role='main']").first()
    ).toBeVisible({ timeout: 15_000 });

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("third-party") && !e.includes("favicon")
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(5);
  });

  test("Search page loads", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/search`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);

    // Should show property cards or search interface
    await expect(
      page.locator('[class*="card"], [class*="property"], main, [role="main"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Sign-in page loads", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/signin`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);

    await expect(
      page.locator(
        'form, input[type="email"], input[type="password"], button:has-text("Sign")'
      ).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Supabase is reachable", async ({ request }) => {
    const anonKey = process.env.SUPABASE_ANON_KEY;
    test.skip(!anonKey, "SUPABASE_ANON_KEY not set — skipping Supabase check");

    const response = await request.get(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey!}`,
      },
    });
    expect(response.status()).toBe(200);
  });
});
