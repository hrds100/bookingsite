import { test, expect } from "@playwright/test";

/**
 * White-label theming: operator's accent color must apply to ALL
 * green elements — gradient buttons, accent, ring, hover states.
 *
 * Coast View Stays operator has accent_color #2563eb (blue).
 * On their subdomain, nothing should be NFStay green/teal.
 */

const SUBDOMAIN = "https://coastview-6804.nfstay.app";

// NFStay default teal in HSL = "167 67% 36%" — this should NOT appear on operator subdomain
const DEFAULT_TEAL_HSL = "167 67% 36%";
// NFStay gradient green rgb(39, 222, 160) and rgb(30, 154, 128) — should NOT appear
const GRADIENT_GREEN_START = "39, 222, 160";
const GRADIENT_GREEN_END = "30, 154, 128";

test.describe("White-Label Theming — Full Color Override", () => {
  test.describe.configure({ timeout: 30_000 });

  test("--primary CSS variable is set to operator blue", async ({ page }) => {
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim()
    );

    expect(primary).not.toContain("167");
    expect(primary).toContain("221"); // blue hue
  });

  test("--accent CSS variable is set to operator blue (not default teal)", async ({
    page,
  }) => {
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim()
    );

    // Must NOT be the default teal
    expect(accent).not.toBe(DEFAULT_TEAL_HSL);
  });

  test("--ring CSS variable is set to operator blue", async ({ page }) => {
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const ring = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--ring")
        .trim()
    );

    expect(ring).not.toBe(DEFAULT_TEAL_HSL);
  });

  test("gradient buttons use operator color (not hardcoded green)", async ({
    page,
  }) => {
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Find all elements with bg-primary-gradient
    const gradientBackgrounds = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="primary-gradient"]');
      return Array.from(els).map((el) => ({
        text: el.textContent?.trim().substring(0, 30) || "",
        bg: getComputedStyle(el).background,
      }));
    });

    for (const el of gradientBackgrounds) {
      // None should contain the hardcoded green gradient colors
      expect(el.bg).not.toContain(GRADIENT_GREEN_START);
      expect(el.bg).not.toContain(GRADIENT_GREEN_END);
    }

    expect(gradientBackgrounds.length).toBeGreaterThan(0);
  });

  test("no elements render NFStay green on operator subdomain", async ({
    page,
  }) => {
    await page.goto(SUBDOMAIN, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Check computed background-color and color for the teal green
    const greenCount = await page.evaluate(() => {
      const all = document.querySelectorAll("a, button, span, div, input");
      let count = 0;
      all.forEach((el) => {
        const s = getComputedStyle(el);
        const bg = s.backgroundColor;
        const color = s.color;
        // NFStay teal = rgb(30, 154, 128) or close variants
        if (
          bg.includes("30, 154, 128") ||
          bg.includes("39, 222, 160") ||
          color.includes("30, 154, 128")
        ) {
          count++;
        }
      });
      return count;
    });

    expect(greenCount).toBe(0);
  });
});
