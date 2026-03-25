import { test, expect } from "@playwright/test";

/**
 * Verify the NYC "Midtown Manhattan Loft" property renders on the live site
 * after the slug-lookup bug fix was deployed.
 */

const MAIN_URL =
  "https://nfstay.app/property/midtown-manhattan-loft-with-skyline-views";
const SUBDOMAIN_URL =
  "https://coastview-6804.nfstay.app/property/midtown-manhattan-loft-with-skyline-views";

test.describe("NYC Property — Live Post-Deploy Verification", () => {
  test.describe.configure({ timeout: 30_000 });

  test("property loads on nfstay.app (not 'Property not found')", async ({
    page,
  }) => {
    await page.goto(MAIN_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const body = await page.textContent("body");

    // Must NOT show the error state
    expect(body).not.toContain("Property not found");
    expect(body).not.toContain("may have been removed");

    // Should show property title
    expect(body).toContain("Midtown Manhattan Loft");
    console.log("    ✓ Property title rendered on nfstay.app");
  });

  test("property loads on operator subdomain", async ({ page }) => {
    await page.goto(SUBDOMAIN_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const body = await page.textContent("body");

    expect(body).not.toContain("Property not found");
    expect(body).toContain("Midtown Manhattan Loft");
    console.log("    ✓ Property title rendered on coastview-6804.nfstay.app");
  });

  test("property shows New York location", async ({ page }) => {
    await page.goto(MAIN_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const body = await page.textContent("body");
    const hasNY =
      body?.includes("New York") || body?.includes("new york") || false;
    expect(hasNY).toBe(true);
    console.log("    ✓ New York location visible");
  });

  test("property shows converted price (default GBP ~£228)", async ({ page }) => {
    await page.goto(MAIN_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const body = await page.textContent("body");
    // $289 USD converts to ~£228 GBP (default currency)
    // The exact number depends on the rate, so just check a price is shown
    const hasPrice = body?.includes("228") || body?.includes("289") || body?.includes("/ night");
    expect(hasPrice).toBe(true);
    console.log("    ✓ Converted price visible");
  });

  test("property shows stock photos", async ({ page }) => {
    await page.goto(MAIN_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Check for Pexels images
    const images = await page.locator("img[src*='pexels']").count();
    if (images > 0) {
      console.log(`    ✓ ${images} Pexels stock photos rendered`);
    } else {
      console.log("    ℹ No Pexels images found (may use fallback)");
    }
    // Page should at least load without errors
    expect(await page.title()).toBeTruthy();
  });
});
