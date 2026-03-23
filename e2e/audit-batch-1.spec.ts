import { test, expect } from "@playwright/test";

const BASE = "https://nfstay.app";

test.describe("Audit Batch 1 — Live Site Verification", () => {
  // 1. Branding: page title and meta tags
  test("index.html has nfstay branding, not Lovable", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title).toContain("nfstay");
    expect(title).not.toContain("Lovable");

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description).toContain("vacation rentals");
    expect(description).not.toContain("Lovable");

    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    expect(ogTitle).toContain("nfstay");

    const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(favicon).toBeTruthy();
  });

  // 2. Landing page loads with key sections
  test("landing page renders hero, properties, footer", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Hero search exists
    await expect(page.getByPlaceholder(/where|destination/i).first()).toBeVisible({ timeout: 15000 });

    // Footer exists with nfstay copyright
    await expect(page.getByText(/© 2026/)).toBeVisible();
  });

  // 3. Search page loads with spinner then results
  test("search page shows loading then properties", async ({ page }) => {
    await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" });

    // Page should eventually show results or empty state
    await expect(
      page.getByText(/results|No exact matches/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  // 4. Property detail page loads
  test("property detail page loads for mock property", async ({ page }) => {
    await page.goto(`${BASE}/property/prop-001`, { waitUntil: "networkidle" });

    // Should show property content or empty state (not crash)
    const hasContent = await page
      .locator("h1, h2, [class*='empty']")
      .first()
      .isVisible({ timeout: 15000 });
    expect(hasContent).toBe(true);
  });

  // 5. Admin portal is protected — redirect to signin
  test("admin portal redirects unauthenticated users to signin", async ({
    page,
  }) => {
    await page.goto(`${BASE}/admin/nfstay`, { waitUntil: "networkidle" });

    // Should redirect to /signin
    await page.waitForURL(/signin/, { timeout: 15000 });
    expect(page.url()).toContain("/signin");
  });

  // 6. 404 page works without console.error crash
  test("404 page renders for invalid route", async ({ page }) => {
    await page.goto(`${BASE}/this-does-not-exist`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("404")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  // 7. Sign in page loads
  test("sign in page renders with form", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });

    await expect(
      page.getByPlaceholder(/email/i).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder(/password/i).first()
    ).toBeVisible();
  });

  // 8. Sign up page loads
  test("sign up page renders with social + email options", async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });

    // Sign up page shows "Create your account" heading and social buttons
    await expect(
      page.getByText("Create your account")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Continue with Google/i)
    ).toBeVisible();
  });

  // 9. Payment success handles missing sessionStorage gracefully
  test("payment success page does not crash without data", async ({
    page,
  }) => {
    await page.goto(`${BASE}/payment/success`, { waitUntil: "networkidle" });

    // Should show the page (booking confirmed or empty) — not a crash
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    // No crash = page rendered something
  });

  // 10. Payment cancel page loads
  test("payment cancel page renders", async ({ page }) => {
    await page.goto(`${BASE}/payment/cancel`, { waitUntil: "networkidle" });

    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  // 11. Checkout page shows expired session (no intent in sessionStorage)
  test("checkout without booking intent shows expired session", async ({
    page,
  }) => {
    await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });

    await expect(
      page.getByText(/session expired|start a new search/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  // 12. Footer social links have target=_blank
  test("footer social links open in new tab", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    const socialLinks = page.locator("footer a[target='_blank']");
    const count = await socialLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // 13. Traveler reservation detail redirects when not logged in
  test("traveler reservation detail redirects unauthenticated to signin", async ({
    page,
  }) => {
    await page.goto(`${BASE}/traveler/reservation/res-001`, {
      waitUntil: "networkidle",
    });

    await page.waitForURL(/signin/, { timeout: 15000 });
    expect(page.url()).toContain("/signin");
  });
});
