import { test, expect } from "@playwright/test";

const BASE = "https://nfstay.app";

test.describe("Checkout back button + Invoice download", () => {
  test("checkout page renders back button when booking intent is present", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

    const intent = {
      propertyId: "test-prop-1",
      propertyTitle: "Test Property",
      propertyImage: "",
      propertyCity: "London",
      propertyCountry: "UK",
      checkIn: "2026-06-01",
      checkOut: "2026-06-05",
      nights: 4,
      adults: 2,
      children: 0,
      baseRate: 100,
      subtotal: 400,
      cleaningFee: 0,
      discount: 0,
      promoDiscount: 0,
      promoCode: "",
      total: 400,
      currency: "GBP",
      currencySymbol: "£",
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    await page.evaluate((data) => {
      sessionStorage.setItem("nfs_booking_intent", JSON.stringify(data));
    }, intent);

    await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });

    const backBtn = page.locator('[data-testid="checkout-back"]');
    await expect(backBtn).toBeVisible({ timeout: 10000 });
    await expect(backBtn).toContainText(/back/i);
  });

  test("checkout back button navigates away from /checkout", async ({ page }) => {
    await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" });

    const intent = {
      propertyId: "test-prop-1",
      propertyTitle: "Test Property",
      propertyImage: "",
      propertyCity: "London",
      propertyCountry: "UK",
      checkIn: "2026-06-01",
      checkOut: "2026-06-05",
      nights: 4,
      adults: 2,
      children: 0,
      subtotal: 400,
      cleaningFee: 0,
      discount: 0,
      promoDiscount: 0,
      promoCode: "",
      total: 400,
      currency: "GBP",
      currencySymbol: "£",
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    await page.evaluate((data) => {
      sessionStorage.setItem("nfs_booking_intent", JSON.stringify(data));
    }, intent);

    await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="checkout-back"]').click();
    await page.waitForURL((url) => !url.pathname.startsWith("/checkout"), { timeout: 10000 });
    expect(page.url()).not.toContain("/checkout");
  });

  test("cash booking confirmed page shows invoice + download button", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

    const data = {
      ref: "NFS-TEST-001",
      propertyTitle: "Test Villa",
      propertyCity: "Dubai",
      propertyCountry: "UAE",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      guests: 2,
      adults: 2,
      children: 0,
      nights: 4,
      total: 800,
      currency: "AED",
      currencySymbol: "AED ",
      error: null,
    };
    await page.evaluate((d) => {
      sessionStorage.setItem("nfs_cash_booking", JSON.stringify(d));
    }, data);

    await page.goto(`${BASE}/cash-booking-confirmed`, { waitUntil: "domcontentloaded" });

    const downloadBtn = page.locator('[data-testid="invoice-download"]');
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
    await expect(downloadBtn).toContainText(/download pdf/i);

    const invoice = page.locator("[data-print-invoice]");
    await expect(invoice).toBeVisible();
    await expect(invoice).toContainText("NFS-TEST-001");
    await expect(invoice).toContainText("Test Villa");
    await expect(invoice).toContainText("Jane Doe");
  });
});
