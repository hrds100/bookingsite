import { test, expect } from "@playwright/test";

/**
 * Verify operator contact info appears on:
 * 1. Property detail page — "Contact Host" section with WhatsApp + email
 * 2. Navbar — Contact dropdown with WhatsApp + email options
 *
 * Coast View Stays has:
 *   contact_whatsapp: +447700900123
 *   contact_email: operator-e2e-1774466803@nexivoproperties.co.uk
 *   contact_phone: +442071234567
 */

const PROPERTY_URL =
  "https://coastview-6804.nfstay.app/property/midtown-manhattan-loft-with-skyline-views";
const SUBDOMAIN = "https://coastview-6804.nfstay.app";

test.describe("Operator Contacts — Property Page", () => {
  test.describe.configure({ timeout: 30_000 });

  test("property page shows Contact Host section", async ({ page }) => {
    await page.goto(PROPERTY_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const body = await page.textContent("body");
    // Should have a contact host section
    const hasContactHost =
      body?.includes("Contact Host") ||
      body?.includes("Contact host") ||
      body?.includes("Contact the host") ||
      false;
    expect(hasContactHost).toBe(true);
  });

  test("property page has WhatsApp link with wa.me URL", async ({ page }) => {
    await page.goto(PROPERTY_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Find a link containing wa.me
    const waLink = page.locator('a[href*="wa.me"]');
    const count = await waLink.count();
    expect(count).toBeGreaterThan(0);

    // The href should contain the operator's WhatsApp number
    const href = await waLink.first().getAttribute("href");
    expect(href).toContain("447700900123");
  });

  test("property page has email link", async ({ page }) => {
    await page.goto(PROPERTY_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Find a mailto link
    const emailLink = page.locator('a[href*="mailto:"]');
    const count = await emailLink.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Operator Contacts — Navbar Dropdown", () => {
  test.describe.configure({ timeout: 30_000 });

  test("navbar Contact button opens dropdown with WhatsApp and Email", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Find the Contact button in the navbar
    const contactBtn = page.locator("nav").locator("text=Contact").first();
    await expect(contactBtn).toBeVisible();

    // Click it to open dropdown
    await contactBtn.click();
    await page.waitForTimeout(500);

    // Dropdown should show WhatsApp and Email options
    const body = await page.textContent("body");
    const hasWhatsApp = body?.includes("WhatsApp") || false;
    const hasEmail = body?.includes("Email") || body?.includes("email") || false;

    expect(hasWhatsApp).toBe(true);
    expect(hasEmail).toBe(true);
  });
});
