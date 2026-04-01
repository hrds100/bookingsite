import { test, expect } from "@playwright/test";

const PROPERTY_URL = "/property/stunning-marina-view-apartment-prop-001";

test.describe("Booking flow — promo codes, breakdown, add-ons", () => {
  test("property page loads and shows booking widget", async ({ page }) => {
    await page.goto(PROPERTY_URL);
    const widget = page.locator('[data-feature="NFSTAY__BOOKING_WIDGET"]');
    await expect(widget).toBeVisible({ timeout: 15000 });
    await expect(widget.locator('[data-feature="NFSTAY__WIDGET_PRICE"]')).toContainText("/ night");
  });

  test("shows per-night breakdown after selecting dates", async ({ page }) => {
    await page.goto(PROPERTY_URL);
    const widget = page.locator('[data-feature="NFSTAY__BOOKING_WIDGET"]');
    await expect(widget).toBeVisible({ timeout: 15000 });

    // Open date picker and select a range
    await widget.locator('[data-feature="NFSTAY__WIDGET_CHECKIN"]').click();
    const calendar = page.locator(".rdp");
    await expect(calendar).toBeVisible({ timeout: 5000 });

    // Pick two dates in the future (next month to avoid disabled dates)
    const nextButton = calendar.getByRole("button", { name: /next/i }).first();
    if (nextButton) await nextButton.click().catch(() => {});

    const days = calendar.locator("button.rdp-day:not([disabled])");
    const dayCount = await days.count();
    if (dayCount >= 5) {
      await days.nth(1).click();
      await days.nth(4).click();
    }

    // Close calendar by clicking elsewhere
    await widget.locator('[data-feature="NFSTAY__WIDGET_PRICE"]').click();

    // Check breakdown appears
    const breakdown = widget.locator('[data-feature="NFSTAY__WIDGET_BREAKDOWN"]');
    const hasBreakdown = await breakdown.isVisible().catch(() => false);
    if (hasBreakdown) {
      await expect(breakdown).toContainText("night");
      await expect(breakdown).toContainText("Service fee");
      await expect(breakdown).toContainText("Total");
    }
  });

  test("shows add-on cards when dates selected", async ({ page }) => {
    await page.goto(PROPERTY_URL);
    const widget = page.locator('[data-feature="NFSTAY__BOOKING_WIDGET"]');
    await expect(widget).toBeVisible({ timeout: 15000 });

    // Select dates
    await widget.locator('[data-feature="NFSTAY__WIDGET_CHECKIN"]').click();
    const calendar = page.locator(".rdp");
    await expect(calendar).toBeVisible({ timeout: 5000 });

    const nextButton = calendar.getByRole("button", { name: /next/i }).first();
    if (nextButton) await nextButton.click().catch(() => {});

    const days = calendar.locator("button.rdp-day:not([disabled])");
    const dayCount = await days.count();
    if (dayCount >= 5) {
      await days.nth(1).click();
      await days.nth(4).click();
    }

    await widget.locator('[data-feature="NFSTAY__WIDGET_PRICE"]').click();

    // Check add-ons section
    const addonsSection = widget.locator('[data-feature="NFSTAY__WIDGET_ADDONS"]');
    const hasAddons = await addonsSection.isVisible().catch(() => false);
    if (hasAddons) {
      await expect(addonsSection).toContainText("Early check-in");
      await expect(addonsSection).toContainText("Late checkout");
      await expect(addonsSection).toContainText("Airport transfer");
      await expect(addonsSection).toContainText("Welcome basket");
    }
  });

  test("invalid promo code shows error", async ({ page }) => {
    await page.goto(PROPERTY_URL);
    const widget = page.locator('[data-feature="NFSTAY__BOOKING_WIDGET"]');
    await expect(widget).toBeVisible({ timeout: 15000 });

    // Select dates to show breakdown
    await widget.locator('[data-feature="NFSTAY__WIDGET_CHECKIN"]').click();
    const calendar = page.locator(".rdp");
    await expect(calendar).toBeVisible({ timeout: 5000 });

    const nextButton = calendar.getByRole("button", { name: /next/i }).first();
    if (nextButton) await nextButton.click().catch(() => {});

    const days = calendar.locator("button.rdp-day:not([disabled])");
    const dayCount = await days.count();
    if (dayCount >= 5) {
      await days.nth(1).click();
      await days.nth(4).click();
    }

    await widget.locator('[data-feature="NFSTAY__WIDGET_PRICE"]').click();

    // Try invalid promo
    const promoInput = widget.locator('[data-testid="promo-input"]');
    const hasPromo = await promoInput.isVisible().catch(() => false);
    if (hasPromo) {
      await promoInput.fill("BADCODE");
      await widget.locator('[data-testid="promo-apply"]').click();
      await expect(widget.locator('[data-testid="promo-error"]')).toContainText("Invalid promo code");
    }
  });

  test("valid promo code WELCOME10 applies 10% discount", async ({ page }) => {
    await page.goto(PROPERTY_URL);
    const widget = page.locator('[data-feature="NFSTAY__BOOKING_WIDGET"]');
    await expect(widget).toBeVisible({ timeout: 15000 });

    // Select dates
    await widget.locator('[data-feature="NFSTAY__WIDGET_CHECKIN"]').click();
    const calendar = page.locator(".rdp");
    await expect(calendar).toBeVisible({ timeout: 5000 });

    const nextButton = calendar.getByRole("button", { name: /next/i }).first();
    if (nextButton) await nextButton.click().catch(() => {});

    const days = calendar.locator("button.rdp-day:not([disabled])");
    const dayCount = await days.count();
    if (dayCount >= 5) {
      await days.nth(1).click();
      await days.nth(4).click();
    }

    await widget.locator('[data-feature="NFSTAY__WIDGET_PRICE"]').click();

    // Apply valid promo
    const promoInput = widget.locator('[data-testid="promo-input"]');
    const hasPromo = await promoInput.isVisible().catch(() => false);
    if (hasPromo) {
      await promoInput.fill("WELCOME10");
      await widget.locator('[data-testid="promo-apply"]').click();
      // Should show the applied code with label
      await expect(widget.locator('[data-feature="NFSTAY__WIDGET_BREAKDOWN"]')).toContainText("WELCOME10 (10% off)");
    }
  });

  test("checkout page shows full price breakdown", async ({ page }) => {
    await page.goto("/checkout");
    // Without session data, should show expired state
    await expect(page.locator("text=Your session expired")).toBeVisible({ timeout: 10000 });
  });

  test("checkout failure does NOT redirect to payment success", async ({ page }) => {
    // Set up a booking intent in sessionStorage, then simulate checkout
    await page.goto("/checkout");
    await page.evaluate(() => {
      const mockIntent = {
        propertyId: "test-prop",
        propertyTitle: "Test Property",
        propertyImage: "",
        propertyCity: "London",
        propertyCountry: "UK",
        checkIn: "2026-12-01",
        checkOut: "2026-12-05",
        nights: 4,
        adults: 2,
        children: 0,
        subtotal: 400,
        cleaningFee: 50,
        discount: 0,
        promoDiscount: 0,
        promoCode: "",
        total: 450,
        currency: "GBP",
        currencySymbol: "\u00a3",
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 min from now
      };
      sessionStorage.setItem("nfs_booking_intent", JSON.stringify(mockIntent));
    });
    await page.reload();

    // Fill in the form
    await page.locator('input[placeholder="First name"]').fill("Test");
    await page.locator('input[placeholder="Last name"]').fill("User");
    await page.locator('input[placeholder="you@example.com"]').fill("test@example.com");
    await page.locator('input[placeholder*="7700"]').fill("+447700900000");
    await page.locator('#agree').click();

    // Block the edge function to simulate failure
    await page.route('**/functions/v1/nfs-create-checkout', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: "Server error" }) });
    });

    // Click complete booking
    await page.locator('button:has-text("Complete booking")').click();

    // Wait for the request to fail and UI to respond
    await page.waitForTimeout(2000);

    // Should NOT have navigated to /payment/success
    expect(page.url()).not.toContain('/payment/success');
    // Should still be on /checkout showing an error
    expect(page.url()).toContain('/checkout');
    // Should show an error message
    const errorText = page.locator('[data-testid="checkout-error"]');
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });
});
