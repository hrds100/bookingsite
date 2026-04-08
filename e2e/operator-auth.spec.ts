import { test, expect } from "@playwright/test";

/**
 * Operator standalone auth tests.
 * Run against local dev server: npm run dev (port 5173 default)
 * Usage: npx playwright test e2e/operator-auth.spec.ts --config=e2e/playwright.config.ts
 *
 * These tests verify:
 * 1. /signin loads with a single email/password form (no Guest/Operator toggle)
 * 2. /signup route is not accessible (shows 404)
 * 3. No "Sign up" internal links on the sign-in page
 * 4. A note pointing to hub.nfstay.com for sign-up is visible
 */

const BASE = process.env.BASE_URL || "https://nfstay.app";

test.describe("Operator Standalone Auth", () => {
  test("/signin page loads with email/password form — no Guest/Operator toggle", async ({
    page,
  }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });

    // Form fields exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Sign In button exists
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();

    // No Guest/Operator toggle buttons
    await expect(page.getByRole("button", { name: /^guest$/i })).toHaveCount(
      0
    );
    await expect(
      page.getByRole("button", { name: /^operator$/i })
    ).toHaveCount(0);
  });

  test("/signup route is not accessible (shows 404)", async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });

    // Should show 404 / Not Found content (not the sign-up form)
    const signUpForm = page.locator('form >> input[name="name"]');
    await expect(signUpForm).toHaveCount(0);

    // The page should NOT have a "Create account" or "Sign up" heading
    const signUpHeading = page.getByRole("heading", {
      name: /create.*account|sign up/i,
    });
    await expect(signUpHeading).toHaveCount(0);
  });

  test('no internal "Sign up" links on the sign-in page', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });

    // No link pointing to /signup (internal route)
    const internalSignUpLinks = page.locator('a[href="/signup"]');
    await expect(internalSignUpLinks).toHaveCount(0);
  });

  test("hub.nfstay.com sign-up note is visible on sign-in page", async ({
    page,
  }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });

    // Text pointing users to hub.nfstay.com
    await expect(page.getByText(/hub\.nfstay\.com/i)).toBeVisible();

    // The link to hub.nfstay.com exists
    const hubLink = page.locator('a[href="https://hub.nfstay.com"]');
    await expect(hubLink).toBeVisible();
  });

  test("Forgot password link is still present", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });
});
