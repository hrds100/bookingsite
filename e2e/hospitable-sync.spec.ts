import { test, expect } from "@playwright/test";

// Uses baseURL from playwright.config.ts (live site or local override)
test.describe("Hospitable OAuth Callback", () => {
  test("success state shows connected message and redirects to settings", async ({
    page,
  }) => {
    await page.goto(
      `/nfstay/oauth-callback?provider=hospitable&status=success&success=connected`,
      { waitUntil: "domcontentloaded" }
    );

    // Should show success UI
    await expect(page.locator("text=Connected successfully")).toBeVisible();
    await expect(
      page.locator("text=Redirecting to settings")
    ).toBeVisible();

    // Should auto-redirect to settings after ~2s
    await page.waitForURL("**/nfstay/settings", { timeout: 5000 });
    expect(page.url()).toContain("/nfstay/settings");
  });

  test("error state shows error message and return button", async ({
    page,
  }) => {
    await page.goto(
      `/nfstay/oauth-callback?provider=hospitable&status=error&error=token_exchange_failed`,
      { waitUntil: "domcontentloaded" }
    );

    // Should show error UI
    await expect(page.locator("text=Connection failed")).toBeVisible();
    await expect(
      page.locator("text=Token exchange failed")
    ).toBeVisible();

    // Should have return to settings button
    const returnBtn = page.locator("button", {
      hasText: "Return to settings",
    });
    await expect(returnBtn).toBeVisible();

    // Click return button and verify it navigates away from callback page
    // (settings page requires auth, so it may redirect to signin)
    await returnBtn.click();
    await page.waitForURL((url) => !url.pathname.includes("oauth-callback"), { timeout: 5000 });
  });

  test("missing params shows clear error state", async ({ page }) => {
    await page.goto(`/nfstay/oauth-callback`, {
      waitUntil: "domcontentloaded",
    });

    // Should show missing params UI
    await expect(
      page.locator("text=Missing callback parameters")
    ).toBeVisible();

    // Should have return button
    const returnBtn = page.locator("button", {
      hasText: "Return to settings",
    });
    await expect(returnBtn).toBeVisible();
  });
});

test.describe("Operator Property Form - Hospitable Sync UI", () => {
  test("sync from Airbnb toggle is visible on property form", async ({
    page,
  }) => {
    // Navigate to operator property form (new property mode)
    await page.goto(`/nfstay/properties/new`, {
      waitUntil: "domcontentloaded",
    });

    // The "Sync from Airbnb" button should be visible
    await expect(
      page.locator("button", { hasText: "Sync from Airbnb" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("clicking Sync from Airbnb shows connect CTA when disconnected", async ({
    page,
  }) => {
    await page.goto(`/nfstay/properties/new`, {
      waitUntil: "domcontentloaded",
    });

    // Click "Sync from Airbnb" toggle
    const syncBtn = page.locator("button", { hasText: "Sync from Airbnb" });
    await syncBtn.click();

    // Should show the connect Airbnb button (since no active connection)
    await expect(
      page.locator("text=Connect your Airbnb account")
    ).toBeVisible({ timeout: 10000 });
  });
});
