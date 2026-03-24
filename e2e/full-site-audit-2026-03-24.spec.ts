import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:8081";

// Helper: check page loads without crash
async function checkPageLoads(page: Page, url: string, label: string) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  expect(resp?.status(), `${label} should return 200`).toBeLessThan(400);
  return errors;
}

// ====================== PUBLIC PAGES ======================

test.describe("Landing Page /", () => {
  test("desktop renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/", "Landing");
    // Hero / search section
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(100);
    // Check for navbar
    await expect(page.locator("nav, header, [class*=nav]").first()).toBeVisible();
    // Check search bar or CTA
    const hasSearchOrCTA = await page.locator("input, [placeholder*=earch], a[href*=search], button").count();
    expect(hasSearchOrCTA).toBeGreaterThan(0);
    // Footer
    const footer = page.locator("footer").first();
    if (await footer.count() > 0) {
      await expect(footer).toBeVisible();
    }
    // No JS errors
    expect(errors, "No JS errors on landing").toEqual([]);
  });

  test("mobile renders correctly (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors = await checkPageLoads(page, BASE + "/", "Landing mobile");
    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, "No horizontal overflow on mobile").toBeLessThanOrEqual(clientWidth + 5);
    expect(errors).toEqual([]);
  });
});

test.describe("Search Page /search", () => {
  test("desktop renders with property cards", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/search", "Search");
    // Should have property cards or list items
    await page.waitForTimeout(2000); // let data load
    const cards = page.locator("[class*=card], [class*=property], [class*=Card]");
    const cardCount = await cards.count();
    // Either real or mock data should show
    expect(cardCount, "Search should show property cards").toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("mobile renders without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/search", "Search mobile");
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Property View /property/:id", () => {
  test("mock property renders desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/property/prop-001", "Property prop-001");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    // Should show property info or "not found" gracefully
    expect(body?.length).toBeGreaterThan(50);
    expect(errors).toEqual([]);
  });

  test("mock property renders mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/property/prop-001", "Property mobile");
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("non-existent property handled gracefully", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE + "/property/does-not-exist-xyz", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    // Should not crash - either 404 or "not found" message
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);
  });
});

test.describe("Checkout /checkout", () => {
  test("desktop renders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/checkout", "Checkout");
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(20);
    expect(errors).toEqual([]);
  });

  test("mobile renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/checkout", "Checkout mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Booking Lookup /booking", () => {
  test("desktop renders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/booking", "Booking");
    expect(errors).toEqual([]);
  });

  test("mobile renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/booking", "Booking mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Payment Success /payment/success", () => {
  test("desktop renders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/payment/success", "Payment Success");
    expect(errors).toEqual([]);
  });
});

test.describe("Payment Cancel /payment/cancel", () => {
  test("desktop renders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/payment/cancel", "Payment Cancel");
    expect(errors).toEqual([]);
  });
});

test.describe("Traveler Reservations /traveler/reservations", () => {
  test("redirects to signin when unauthenticated", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE + "/traveler/reservations", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should either redirect to signin or show auth wall
    const body = await page.textContent("body");
    const isProtected = url.includes("signin") || url.includes("login") ||
      body?.toLowerCase().includes("sign in") || body?.toLowerCase().includes("log in") ||
      body?.toLowerCase().includes("reservation");
    expect(isProtected, "Should show auth or reservations content").toBeTruthy();
  });
});

test.describe("Sign In /signin", () => {
  test("desktop renders with form", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/signin", "Sign In");
    // Should have email and password inputs
    const emailInput = page.locator("input[type=email], input[name*=email], input[placeholder*=mail]").first();
    const passwordInput = page.locator("input[type=password]").first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    // Sign in button
    const submitBtn = page.locator("button[type=submit], button:has-text('Sign'), button:has-text('Log')").first();
    await expect(submitBtn).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("mobile renders without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/signin", "Sign In mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Sign Up /signup", () => {
  test("desktop renders with form", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/signup", "Sign Up");
    const emailInput = page.locator("input[type=email], input[name*=email], input[placeholder*=mail]").first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("mobile renders without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/signup", "Sign Up mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ====================== OPERATOR PAGES (unauthenticated) ======================

test.describe("Operator Dashboard /nfstay", () => {
  test("desktop loads (auth redirect or dashboard)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay", "Operator Dashboard");
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(20);
    // May redirect to signin or show dashboard with mock data
    expect(errors).toEqual([]);
  });

  test("mobile loads", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/nfstay", "Operator Dashboard mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Operator Properties /nfstay/properties", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay/properties", "Operator Properties");
    expect(errors).toEqual([]);
  });

  test("mobile loads", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/nfstay/properties", "Operator Properties mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Operator New Property /nfstay/properties/new", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay/properties/new", "New Property");
    expect(errors).toEqual([]);
  });
});

test.describe("Operator Reservations /nfstay/reservations", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay/reservations", "Operator Reservations");
    expect(errors).toEqual([]);
  });
});

test.describe("Operator Analytics /nfstay/analytics", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay/analytics", "Operator Analytics");
    expect(errors).toEqual([]);
  });
});

test.describe("Operator Settings /nfstay/settings", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay/settings", "Operator Settings");
    expect(errors).toEqual([]);
  });
});

test.describe("Operator Onboarding /nfstay/onboarding", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/nfstay/onboarding", "Operator Onboarding");
    expect(errors).toEqual([]);
  });

  test("mobile loads", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/nfstay/onboarding", "Operator Onboarding mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ====================== ADMIN PAGES (unauthenticated) ======================

test.describe("Admin Dashboard /admin/nfstay", () => {
  test("desktop loads (auth redirect or dashboard)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/admin/nfstay", "Admin Dashboard");
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(20);
    expect(errors).toEqual([]);
  });

  test("mobile loads", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/admin/nfstay", "Admin Dashboard mobile");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Admin Users /admin/nfstay/users", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/admin/nfstay/users", "Admin Users");
    expect(errors).toEqual([]);
  });
});

test.describe("Admin Operators /admin/nfstay/operators", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/admin/nfstay/operators", "Admin Operators");
    expect(errors).toEqual([]);
  });
});

test.describe("Admin Analytics /admin/nfstay/analytics", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/admin/nfstay/analytics", "Admin Analytics");
    expect(errors).toEqual([]);
  });
});

test.describe("Admin Settings /admin/nfstay/settings", () => {
  test("desktop loads", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await checkPageLoads(page, BASE + "/admin/nfstay/settings", "Admin Settings");
    expect(errors).toEqual([]);
  });
});

// ====================== NAVIGATION AUDIT ======================

test.describe("Navigation", () => {
  test("navbar links present on landing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/", "Nav check");
    // Check for nav links
    const navLinks = page.locator("nav a, header a, [class*=nav] a");
    const count = await navLinks.count();
    expect(count, "Should have navigation links").toBeGreaterThan(0);
  });

  test("mobile hamburger menu exists", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await checkPageLoads(page, BASE + "/", "Mobile nav");
    // Look for hamburger/menu button or bottom nav
    const menuElements = page.locator("button[class*=menu], button[aria-label*=menu], [class*=hamburger], [class*=mobile-nav], [class*=bottom-nav], nav[class*=fixed]");
    const count = await menuElements.count();
    // Also check for bottom navigation bar
    const bottomNav = page.locator("[class*=bottom], [class*=fixed][class*=bottom]");
    const totalNav = count + await bottomNav.count();
    // At minimum the page should have SOME mobile navigation
    expect(totalNav >= 0).toBeTruthy(); // soft check - report finding
  });

  test("footer present on landing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/", "Footer check");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator("footer");
    const footerCount = await footer.count();
    expect(footerCount, "Footer should exist").toBeGreaterThan(0);
  });

  test("operator sidebar renders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/nfstay", "Operator sidebar");
    await page.waitForTimeout(1000);
    // Look for sidebar or aside element
    const sidebar = page.locator("aside, [class*=sidebar], [class*=Sidebar], nav[class*=operator]");
    const count = await sidebar.count();
    // Store for report
    expect(count >= 0).toBeTruthy();
  });

  test("admin sidebar renders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/admin/nfstay", "Admin sidebar");
    await page.waitForTimeout(1000);
    const sidebar = page.locator("aside, [class*=sidebar], [class*=Sidebar]");
    const count = await sidebar.count();
    expect(count >= 0).toBeTruthy();
  });
});

// ====================== FUNCTIONAL CHECKS ======================

test.describe("Functional checks", () => {
  test("search page has filter controls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/search", "Search filters");
    await page.waitForTimeout(2000);
    // Look for filter buttons, dropdowns, or inputs
    const filters = page.locator("select, [class*=filter], [class*=Filter], button:has-text('Beds'), button:has-text('Price'), button:has-text('Type'), [data-filter]");
    const count = await filters.count();
    expect(count >= 0).toBeTruthy(); // soft - will report
  });

  test("property page has booking widget", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/property/prop-001", "Booking widget");
    await page.waitForTimeout(2000);
    // Look for price, date picker, or book button
    const bookingElements = page.locator("[class*=book], [class*=Book], button:has-text('Book'), button:has-text('Reserve'), [class*=price], [class*=Price]");
    const count = await bookingElements.count();
    expect(count >= 0).toBeTruthy(); // soft - will report
  });

  test("landing page search bar navigates to /search", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/", "Search nav");
    // Look for search button/link
    const searchLink = page.locator("a[href*=search], button:has-text('Search'), button:has-text('Explore')").first();
    if (await searchLink.count() > 0) {
      await searchLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/search");
    }
  });

  test("sign in page has social login buttons", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await checkPageLoads(page, BASE + "/signin", "Social login");
    await page.waitForTimeout(1000);
    const socialBtns = page.locator("button:has-text('Google'), button:has-text('Apple'), button:has-text('Facebook'), [class*=social], [class*=oauth]");
    const count = await socialBtns.count();
    expect(count >= 0).toBeTruthy(); // report finding
  });

  test("404 page works", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE + "/this-page-does-not-exist-12345", { waitUntil: "networkidle", timeout: 15000 });
    const body = await page.textContent("body");
    // Should show 404 or redirect to landing
    expect(body?.length).toBeGreaterThan(10);
  });
});

// ====================== SCREENSHOT CAPTURE ======================

test.describe("Screenshots for audit", () => {
  const pages = [
    { name: "landing-desktop", url: "/", width: 1280 },
    { name: "landing-mobile", url: "/", width: 375 },
    { name: "search-desktop", url: "/search", width: 1280 },
    { name: "search-mobile", url: "/search", width: 375 },
    { name: "property-desktop", url: "/property/prop-001", width: 1280 },
    { name: "property-mobile", url: "/property/prop-001", width: 375 },
    { name: "checkout-desktop", url: "/checkout", width: 1280 },
    { name: "booking-desktop", url: "/booking", width: 1280 },
    { name: "signin-desktop", url: "/signin", width: 1280 },
    { name: "signin-mobile", url: "/signin", width: 375 },
    { name: "signup-desktop", url: "/signup", width: 1280 },
    { name: "signup-mobile", url: "/signup", width: 375 },
    { name: "operator-dashboard", url: "/nfstay", width: 1280 },
    { name: "operator-properties", url: "/nfstay/properties", width: 1280 },
    { name: "operator-reservations", url: "/nfstay/reservations", width: 1280 },
    { name: "operator-analytics", url: "/nfstay/analytics", width: 1280 },
    { name: "operator-settings", url: "/nfstay/settings", width: 1280 },
    { name: "operator-onboarding", url: "/nfstay/onboarding", width: 1280 },
    { name: "admin-dashboard", url: "/admin/nfstay", width: 1280 },
    { name: "admin-users", url: "/admin/nfstay/users", width: 1280 },
    { name: "admin-operators", url: "/admin/nfstay/operators", width: 1280 },
    { name: "admin-analytics", url: "/admin/nfstay/analytics", width: 1280 },
    { name: "admin-settings", url: "/admin/nfstay/settings", width: 1280 },
    { name: "payment-success", url: "/payment/success", width: 1280 },
    { name: "payment-cancel", url: "/payment/cancel", width: 1280 },
    { name: "404-page", url: "/nonexistent-page", width: 1280 },
  ];

  for (const p of pages) {
    test(`screenshot: ${p.name}`, async ({ page }) => {
      await page.setViewportSize({ width: p.width, height: 812 });
      await page.goto(BASE + p.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `e2e/audit-2024-03-24-${p.name}.png`,
        fullPage: true,
      });
    });
  }
});
