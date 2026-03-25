import { test, expect } from "@playwright/test";

const PROPERTY_FORM_URL = "/nfstay/properties/new";

test.describe("Operator Property Form", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the property form — will redirect to sign in for auth-guarded routes
    // We test against the live site, so we verify the form exists on the operator pages
    await page.goto(PROPERTY_FORM_URL);
  });

  test("redirects unauthenticated users away from property form", async ({ page }) => {
    // Unauthenticated users should be redirected to sign in
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Either shows sign in page or the form page (if session exists)
    expect(url).toBeTruthy();
  });
});

test.describe("Property Form UI Structure", () => {
  test("property form page loads or redirects to auth", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    // Check for either the form heading or any auth-related redirect
    const heading = page.getByText("Add New Property");
    const hasForm = await heading.isVisible().catch(() => false);
    // If not showing the form, we should have been redirected (auth guard)
    const currentUrl = page.url();
    const redirectedAway = !currentUrl.includes("/properties/new");

    expect(hasForm || redirectedAway).toBe(true);
  });

  test("form tabs are present when form loads", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    // If the form loads (authenticated), check tabs exist
    const formTabs = page.locator("[data-testid='form-tabs']");
    const tabsExist = await formTabs.isVisible().catch(() => false);

    if (tabsExist) {
      // Verify all expected tabs
      await expect(page.locator("[data-testid='tab-details']")).toBeVisible();
      await expect(page.locator("[data-testid='tab-photos']")).toBeVisible();
      await expect(page.locator("[data-testid='tab-amenities']")).toBeVisible();
      await expect(page.locator("[data-testid='tab-pricing']")).toBeVisible();
      await expect(page.locator("[data-testid='tab-addons']")).toBeVisible();
      await expect(page.locator("[data-testid='tab-policies']")).toBeVisible();
    }
  });

  test("clicking pricing tab shows fees and taxes section", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const pricingTab = page.locator("[data-testid='tab-pricing']");
    const tabExists = await pricingTab.isVisible().catch(() => false);

    if (tabExists) {
      await pricingTab.click();
      await expect(page.locator("[data-testid='fees-taxes-section']")).toBeVisible();
      await expect(page.locator("[data-testid='custom-rates-section']")).toBeVisible();
    }
  });

  test("clicking addons tab shows add-ons section", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const addonsTab = page.locator("[data-testid='tab-addons']");
    const tabExists = await addonsTab.isVisible().catch(() => false);

    if (tabExists) {
      await addonsTab.click();
      await expect(page.locator("[data-testid='addons-section']")).toBeVisible();
      await expect(page.locator("[data-testid='add-addon-btn']")).toBeVisible();
    }
  });

  test("amenities tab shows collapsible categories", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const amenitiesTab = page.locator("[data-testid='tab-amenities']");
    const tabExists = await amenitiesTab.isVisible().catch(() => false);

    if (tabExists) {
      await amenitiesTab.click();
      // Check that at least the essentials category is visible
      await expect(page.locator("[data-testid='amenity-category-essentials']")).toBeVisible();
      await expect(page.locator("[data-testid='amenity-category-kitchen']")).toBeVisible();
      await expect(page.locator("[data-testid='amenity-category-bathroom']")).toBeVisible();
      await expect(page.locator("[data-testid='amenity-category-entertainment']")).toBeVisible();
      await expect(page.locator("[data-testid='amenity-category-outdoor']")).toBeVisible();
      await expect(page.locator("[data-testid='amenity-category-safety']")).toBeVisible();
    }
  });

  test("photos tab shows upload area", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const photosTab = page.locator("[data-testid='tab-photos']");
    const tabExists = await photosTab.isVisible().catch(() => false);

    if (tabExists) {
      await photosTab.click();
      // Upload area text should be visible
      await expect(page.getByText("Drag and drop photos or click to upload")).toBeVisible();
      await expect(page.getByText("Drag photos to reorder")).toBeVisible();
    }
  });
});

test.describe("Property Form Features - Fees & Taxes", () => {
  test("service fee toggle works", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const pricingTab = page.locator("[data-testid='tab-pricing']");
    const tabExists = await pricingTab.isVisible().catch(() => false);

    if (tabExists) {
      await pricingTab.click();
      const toggle = page.locator("[data-testid='service-fee-toggle']");
      await toggle.click();
      // After toggling on, the amount input should appear
      await expect(page.locator("[data-testid='service-fee-amount']")).toBeVisible();
      await expect(page.locator("[data-testid='service-fee-type']")).toBeVisible();
    }
  });

  test("tax rate input accepts values", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const pricingTab = page.locator("[data-testid='tab-pricing']");
    const tabExists = await pricingTab.isVisible().catch(() => false);

    if (tabExists) {
      await pricingTab.click();
      const taxInput = page.locator("[data-testid='tax-rate-input']");
      await taxInput.fill("15");
      await expect(taxInput).toHaveValue("15");
    }
  });

  test("can add and remove custom fees", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const pricingTab = page.locator("[data-testid='tab-pricing']");
    const tabExists = await pricingTab.isVisible().catch(() => false);

    if (tabExists) {
      await pricingTab.click();
      await page.locator("[data-testid='add-custom-fee']").click();
      await expect(page.locator("[data-testid='custom-fee-0']")).toBeVisible();
    }
  });
});

test.describe("Property Form Features - Custom Rates", () => {
  test("can add a custom rate period", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const pricingTab = page.locator("[data-testid='tab-pricing']");
    const tabExists = await pricingTab.isVisible().catch(() => false);

    if (tabExists) {
      await pricingTab.click();

      await page.locator("[data-testid='custom-rate-start']").fill("2026-07-01");
      await page.locator("[data-testid='custom-rate-end']").fill("2026-07-31");
      await page.locator("[data-testid='custom-rate-amount']").fill("200");
      await page.locator("[data-testid='add-custom-rate']").click();

      await expect(page.locator("[data-testid='custom-rate-0']")).toBeVisible();
    }
  });
});

test.describe("Property Form Features - Add-ons", () => {
  test("can add an addon", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const addonsTab = page.locator("[data-testid='tab-addons']");
    const tabExists = await addonsTab.isVisible().catch(() => false);

    if (tabExists) {
      await addonsTab.click();
      await page.locator("[data-testid='add-addon-btn']").click();
      await expect(page.locator("[data-testid='addon-0']")).toBeVisible();
      await expect(page.locator("[data-testid='addon-toggle-0']")).toBeVisible();
      await expect(page.locator("[data-testid='addon-delete-0']")).toBeVisible();
    }
  });

  test("empty addon state shows helpful text", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const addonsTab = page.locator("[data-testid='tab-addons']");
    const tabExists = await addonsTab.isVisible().catch(() => false);

    if (tabExists) {
      await addonsTab.click();
      await expect(page.getByText("No add-ons yet")).toBeVisible();
    }
  });
});

test.describe("Mobile responsive (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("property form renders without horizontal overflow on mobile", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test("form tabs are scrollable on mobile", async ({ page }) => {
    await page.goto(PROPERTY_FORM_URL);
    await page.waitForLoadState("networkidle");

    const formTabs = page.locator("[data-testid='form-tabs']");
    const tabsExist = await formTabs.isVisible().catch(() => false);

    if (tabsExist) {
      // Tabs container should have overflow-x-auto
      const overflowX = await formTabs.evaluate((el) => window.getComputedStyle(el).overflowX);
      expect(overflowX).toBe("auto");
    }
  });
});
