import { test, expect } from "@playwright/test";

// ── Public tests (no auth required) ──────────────────────────────
// These test the OAuth callback page which is publicly accessible.

test.describe("Hospitable OAuth Callback (public)", () => {
  test("success state shows connected message and redirects to settings", async ({
    page,
  }) => {
    await page.goto(
      `/nfstay/oauth-callback?provider=hospitable&status=success&success=connected`,
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.locator("text=Connected successfully")).toBeVisible();
    await expect(
      page.locator("text=Redirecting to settings")
    ).toBeVisible();

    // Auto-redirect fires after ~2s (may land on signin if not authenticated)
    await page.waitForURL(
      (url) => !url.pathname.includes("oauth-callback"),
      { timeout: 5000 }
    );
  });

  test("error state shows error message and return button", async ({
    page,
  }) => {
    await page.goto(
      `/nfstay/oauth-callback?provider=hospitable&status=error&error=token_exchange_failed`,
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.locator("text=Connection failed")).toBeVisible();
    await expect(
      page.locator("text=Token exchange failed")
    ).toBeVisible();

    const returnBtn = page.locator("button", {
      hasText: "Return to settings",
    });
    await expect(returnBtn).toBeVisible();

    // Click navigates away from callback page (may redirect to signin)
    await returnBtn.click();
    await page.waitForURL(
      (url) => !url.pathname.includes("oauth-callback"),
      { timeout: 5000 }
    );
  });

  test("missing params shows clear error state", async ({ page }) => {
    await page.goto(`/nfstay/oauth-callback`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator("text=Missing callback parameters")
    ).toBeVisible();

    const returnBtn = page.locator("button", {
      hasText: "Return to settings",
    });
    await expect(returnBtn).toBeVisible();
  });
});

// ── Operator-authenticated tests (require login) ─────────────────
// These test the operator property form which requires an authenticated
// operator session. They are skipped until an operator test account
// exists and Playwright auth setup is configured.
//
// Blocker: nfs_operators table is empty - no operator accounts exist yet.
// Once an operator is onboarded, add storageState-based auth setup here.

test.describe("Operator Property Form - Hospitable Sync UI (requires auth)", () => {
  test.skip(true, "Requires authenticated operator session - no test operator account exists yet");

  test("sync from Airbnb toggle is visible on property form", async ({
    page,
  }) => {
    await page.goto(`/nfstay/properties/new`, {
      waitUntil: "domcontentloaded",
    });

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

    const syncBtn = page.locator("button", { hasText: "Sync from Airbnb" });
    await syncBtn.click();

    await expect(
      page.locator("text=Connect your Airbnb account")
    ).toBeVisible({ timeout: 10000 });
  });
});
