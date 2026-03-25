import { test, expect } from "@playwright/test";

const BASE = "https://nfstay.app";

test.describe("Operator Reservations — filters and calendar view", () => {
  test("reservations page loads with filter bar and view toggle", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/reservations`, { waitUntil: "networkidle" });

    // Page heading
    await expect(page.locator("h1")).toContainText("Reservations");

    // Filter elements present
    await expect(page.locator('[data-testid="reservation-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-from"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-to"]')).toBeVisible();

    // View toggle buttons
    await expect(page.locator('[data-testid="view-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-calendar"]')).toBeVisible();
  });

  test("search filter narrows reservation list", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/reservations`, { waitUntil: "networkidle" });
    const searchInput = page.locator('[data-testid="reservation-search"]');
    await searchInput.fill("zzzzzznonexistent");

    // Should show "No reservations found" in the table
    await expect(page.locator("text=No reservations found")).toBeVisible();
  });

  test("calendar view toggle renders monthly calendar", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/reservations`, { waitUntil: "networkidle" });

    // Switch to calendar
    await page.locator('[data-testid="view-calendar"]').click();
    await expect(page.locator('[data-feature="NFSTAY__OP_RESERVATIONS_CALENDAR"]')).toBeVisible();

    // Month navigation buttons exist
    const calendarSection = page.locator('[data-feature="NFSTAY__OP_RESERVATIONS_CALENDAR"]');
    await expect(calendarSection.locator("text=Mon")).toBeVisible();
    await expect(calendarSection.locator("text=Sun")).toBeVisible();
  });

  test("switching back to list view shows table", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/reservations`, { waitUntil: "networkidle" });

    // Go to calendar then back to list
    await page.locator('[data-testid="view-calendar"]').click();
    await expect(page.locator('[data-feature="NFSTAY__OP_RESERVATIONS_CALENDAR"]')).toBeVisible();

    await page.locator('[data-testid="view-list"]').click();
    await expect(page.locator('[data-feature="NFSTAY__OP_RESERVATIONS_FILTER"]')).toBeVisible();
  });

  test("reservations page is responsive at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/nfstay/reservations`, { waitUntil: "networkidle" });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);

    await expect(page.locator("h1")).toContainText("Reservations");
  });
});

test.describe("Operator Reservation Detail — confirm/cancel actions", () => {
  test("detail page for pending reservation shows action buttons", async ({ page }) => {
    // res-003 is a pending reservation in mock data
    await page.goto(`${BASE}/nfstay/reservations/res-003`, { waitUntil: "networkidle" });

    // Should show reservation detail
    await expect(page.locator('[data-feature="NFSTAY__OP_RESERVATION_DETAIL"]')).toBeVisible();

    // Action buttons visible for pending reservation
    await expect(page.locator('[data-testid="confirm-reservation-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-reservation-btn"]')).toBeVisible();
  });

  test("confirmed reservation does NOT show action buttons", async ({ page }) => {
    // res-001 is a confirmed reservation
    await page.goto(`${BASE}/nfstay/reservations/res-001`, { waitUntil: "networkidle" });

    await expect(page.locator('[data-feature="NFSTAY__OP_RESERVATION_DETAIL"]')).toBeVisible();

    // Action buttons should NOT be visible
    await expect(page.locator('[data-testid="confirm-reservation-btn"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="cancel-reservation-btn"]')).toHaveCount(0);
  });

  test("clicking confirm updates status to confirmed", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/reservations/res-003`, { waitUntil: "networkidle" });

    await page.locator('[data-testid="confirm-reservation-btn"]').click();

    // After confirming, the buttons should disappear (no longer pending)
    await expect(page.locator('[data-testid="confirm-reservation-btn"]')).toHaveCount(0, { timeout: 5000 });
  });

  test("cancel button shows confirmation dialog", async ({ page }) => {
    await page.goto(`${BASE}/nfstay/reservations/res-003`, { waitUntil: "networkidle" });

    await page.locator('[data-testid="cancel-reservation-btn"]').click();

    // Confirmation dialog appears
    await expect(page.locator("text=Cancel this reservation?")).toBeVisible();
    await expect(page.locator("text=Keep reservation")).toBeVisible();
    await expect(page.locator('[data-testid="confirm-cancel-btn"]')).toBeVisible();
  });

  test("detail page is responsive at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/nfstay/reservations/res-003`, { waitUntil: "networkidle" });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);

    await expect(page.locator('[data-feature="NFSTAY__OP_RESERVATION_DETAIL"]')).toBeVisible();
  });
});
