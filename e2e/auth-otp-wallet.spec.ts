import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

test.describe("Auth OTP + Wallet - Email Sign-Up Flow", () => {
  test("signup email view has WhatsApp field with country code", async ({
    page,
  }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    // Click "Sign up with Email" to show email form
    const emailBtn = page.getByText(/sign up with email/i);
    await expect(emailBtn).toBeVisible({ timeout: 10000 });
    await emailBtn.click();

    // WhatsApp field should be visible
    await expect(
      page.locator('input[type="tel"][placeholder*="7863"]')
    ).toBeVisible({ timeout: 5000 });

    // Country code selector should be visible (shows +44 by default)
    await expect(page.getByText("+44").first()).toBeVisible();
  });

  test("signup email form has all required fields", async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    await page.getByText(/sign up with email/i).click();

    // All fields present
    await expect(
      page.locator('input[placeholder*="full name" i]')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('input[placeholder*="email" i]').first()
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder*="6 characters" i]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder*="Re-enter" i]')
    ).toBeVisible();
    await expect(
      page.locator('input[type="tel"]')
    ).toBeVisible();
  });

  test("verify-otp page loads without crash", async ({ page }) => {
    await page.goto(
      `${BASE}/verify-otp?phone=%2B447863992555&name=Test&email=test@test.com`,
      { waitUntil: "networkidle" }
    );

    // Should show OTP input
    await expect(page.getByText(/verify your whatsapp/i)).toBeVisible({
      timeout: 10000,
    });

    // Timer should be visible
    await expect(page.getByText(/remaining/i)).toBeVisible();
  });

  test("verify-otp shows phone number", async ({ page }) => {
    await page.goto(
      `${BASE}/verify-otp?phone=%2B447863992555&name=Test&email=test@test.com`,
      { waitUntil: "networkidle" }
    );

    await expect(page.getByText("+447863992555")).toBeVisible({
      timeout: 10000,
    });
  });

  test("verify-otp back button goes to signup", async ({ page }) => {
    await page.goto(
      `${BASE}/verify-otp?phone=%2B447863992555&name=Test&email=test@test.com`,
      { waitUntil: "networkidle" }
    );

    const backBtn = page.getByText(/back to signup/i);
    await expect(backBtn).toBeVisible({ timeout: 10000 });
    await backBtn.click();
    await page.waitForURL(/signup/, { timeout: 10000 });
  });

  test("verify-otp without phone param shows fallback", async ({ page }) => {
    await page.goto(`${BASE}/verify-otp`, { waitUntil: "networkidle" });
    await expect(
      page.getByText(/no phone number/i)
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/go to signup/i)
    ).toBeVisible();
  });

  test("verify-otp verify button disabled until 4 digits", async ({
    page,
  }) => {
    await page.goto(
      `${BASE}/verify-otp?phone=%2B447863992555&name=Test&email=test@test.com`,
      { waitUntil: "networkidle" }
    );

    const verifyBtn = page.getByRole("button", { name: /verify whatsapp/i });
    await expect(verifyBtn).toBeVisible({ timeout: 10000 });
    await expect(verifyBtn).toBeDisabled();
  });

  test("country code selector opens and shows countries", async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    await page.getByText(/sign up with email/i).click();

    // Click the country code button
    const ccBtn = page.getByText("+44").first();
    await expect(ccBtn).toBeVisible({ timeout: 5000 });
    await ccBtn.click();

    // Dropdown should show with search
    await expect(
      page.locator('input[placeholder*="Search country"]')
    ).toBeVisible({ timeout: 3000 });

    // Should show countries
    await expect(page.getByText("United Kingdom")).toBeVisible();
    await expect(page.getByText("United States")).toBeVisible();
  });

  test("social login view unchanged - no WhatsApp field", async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });

    // Social view should NOT have phone input
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).not.toBeVisible();

    // Should have social buttons
    await expect(page.getByText(/continue with google/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("app renders without crash (WalletProvisioner mounted)", async ({
    page,
  }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    // No blank page
    expect(body!.length).toBeGreaterThan(100);
  });
});
