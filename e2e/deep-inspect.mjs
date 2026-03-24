import { chromium } from 'playwright';
const BASE = 'https://nfstay.app';
const SS = '/Users/hugo/Downloads/AI Folder/openclaw/bookingsite/e2e';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ─── 1. og:title meta tag ───
  console.log('\n=== 1. og:title META TAG ===');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => null);
  console.log('og:title content:', ogTitle || '(NOT FOUND)');
  if (ogTitle) {
    console.log('Contains "nfstay"?', ogTitle.toLowerCase().includes('nfstay'));
  }

  // ─── 2. Landing page search placeholder ───
  console.log('\n=== 2. SEARCH INPUT PLACEHOLDER ===');
  const searchInputs = await page.$$('input');
  for (const inp of searchInputs) {
    const ph = await inp.getAttribute('placeholder');
    const type = await inp.getAttribute('type');
    if (ph) console.log(`  input[type=${type}] placeholder: "${ph}"`);
  }

  // ─── 3. FAQ section + all headings ───
  console.log('\n=== 3. FAQ SECTION & PAGE HEADINGS ===');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  const faqExists = await page.$('text=FAQ').catch(() => null) ||
                    await page.$('text=Frequently Asked').catch(() => null) ||
                    await page.$('[id*="faq" i]').catch(() => null);
  console.log('FAQ section found?', !!faqExists);
  const headings = await page.$$eval('h1, h2, h3, h4', els =>
    els.map(el => `<${el.tagName}> ${el.textContent.trim().substring(0, 100)}`)
  );
  console.log('All headings on page:');
  headings.forEach(h => console.log('  ', h));
  await page.screenshot({ path: `${SS}/deep-inspect-faq-bottom.png`, fullPage: false });

  // ─── 4. Sign in error feedback ───
  console.log('\n=== 4. SIGN IN ERROR FEEDBACK ===');
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${SS}/deep-inspect-signin-before.png` });

  // Look for email/password fields
  const emailField = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  const passField = await page.$('input[type="password"], input[name="password"]');

  if (emailField && passField) {
    await emailField.fill('fake@test.com');
    await passField.fill('wrongpassword123');
    console.log('Filled email and password fields');

    // Click sign in button
    const signInBtn = await page.$('button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("Log in"), button[type="submit"]');
    if (signInBtn) {
      await signInBtn.click();
      console.log('Clicked sign in button');
    } else {
      console.log('No sign in button found');
    }

    // Wait 10 seconds for error
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `${SS}/deep-inspect-signin-error.png` });

    // Check for error messages
    const errorTexts = await page.$$eval(
      '[role="alert"], .error, .toast, [class*="error" i], [class*="toast" i], [class*="alert" i], [data-sonner-toast], [class*="Toastify"], p:has-text("Invalid"), p:has-text("error"), span:has-text("Invalid"), span:has-text("error"), div:has-text("Invalid credentials")',
      els => els.map(el => `[${el.tagName}.${el.className}] ${el.textContent.trim().substring(0, 200)}`)
    );
    console.log('Error elements found:', errorTexts.length);
    errorTexts.forEach(e => console.log('  ', e));

    // Also check for any new DOM elements that appeared
    const bodyText = await page.textContent('body');
    const errorKeywords = ['invalid', 'incorrect', 'wrong', 'error', 'failed', 'try again'];
    for (const kw of errorKeywords) {
      if (bodyText.toLowerCase().includes(kw)) {
        console.log(`  Body contains "${kw}"`);
      }
    }
  } else {
    console.log('Email field found?', !!emailField);
    console.log('Password field found?', !!passField);
    // Maybe it's social-only login
    const allBtns = await page.$$eval('button, a[role="button"]', els =>
      els.map(el => el.textContent.trim().substring(0, 80))
    );
    console.log('Buttons on signin page:', allBtns);
    await page.screenshot({ path: `${SS}/deep-inspect-signin-error.png` });
  }

  // ─── 5. Booking lookup validation ───
  console.log('\n=== 5. BOOKING LOOKUP VALIDATION ===');
  await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${SS}/deep-inspect-booking.png` });

  const findBtn = await page.$('button:has-text("Find"), button:has-text("Look"), button:has-text("Search"), button[type="submit"]');
  if (findBtn) {
    const isDisabled = await findBtn.isDisabled();
    console.log('Find bookings button disabled by default?', isDisabled);

    // Type an email
    const bookingEmail = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    if (bookingEmail) {
      await bookingEmail.fill('test@example.com');
      await page.waitForTimeout(500);
      const isDisabledAfter = await findBtn.isDisabled();
      console.log('Button disabled after typing email?', isDisabledAfter);
    }
  } else {
    console.log('No Find/Lookup button found');
    const allBtns = await page.$$eval('button', els => els.map(el => el.textContent.trim().substring(0, 80)));
    console.log('Buttons on /booking:', allBtns);
  }

  // ─── 6. Search page property cards ───
  console.log('\n=== 6. SEARCH PAGE PROPERTY CARDS ===');
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SS}/deep-inspect-search.png` });

  // Try various card selectors
  const cardSelectors = [
    '[class*="card" i]', '[class*="property" i]', '[class*="listing" i]',
    'article', '[data-testid*="card"]', '[class*="Card"]'
  ];
  for (const sel of cardSelectors) {
    const count = await page.$$eval(sel, els => els.length).catch(() => 0);
    if (count > 0) console.log(`  ${sel}: ${count} elements`);
  }

  // Check for property cards with images
  const cards = await page.$$('a[href*="/property"]');
  console.log('Links to /property/*:', cards.length);

  // Check images in the main content
  const images = await page.$$eval('img', els => els.map(el => ({
    src: el.src?.substring(0, 100),
    alt: el.alt,
    width: el.naturalWidth,
    broken: el.naturalWidth === 0
  })));
  const contentImages = images.filter(i => !i.src?.includes('logo') && !i.src?.includes('icon'));
  console.log('Content images:', contentImages.length);
  console.log('Broken images:', contentImages.filter(i => i.broken).length);

  // Check prices
  const priceTexts = await page.$$eval('*', els => {
    const prices = [];
    for (const el of els) {
      const t = el.textContent?.trim() || '';
      if (/[$£€]\s?\d+|GBP|USD|EUR|\d+\s?\/\s?night/i.test(t) && t.length < 50) {
        prices.push(t);
      }
    }
    return [...new Set(prices)].slice(0, 10);
  });
  console.log('Price texts found:', priceTexts);

  // ─── 7. Mobile bottom nav ───
  console.log('\n=== 7. MOBILE BOTTOM NAV ===');
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: `${SS}/deep-inspect-mobile.png`, fullPage: false });

  // Check for bottom nav
  const bottomNav = await mobilePage.$$eval('nav, [class*="bottom" i], [class*="tab-bar" i], [class*="BottomNav" i], [role="navigation"]', els =>
    els.map(el => ({
      tag: el.tagName,
      class: el.className?.substring(0, 100),
      text: el.textContent?.trim().substring(0, 200),
      rect: el.getBoundingClientRect()
    })).filter(el => el.rect.top > 600) // bottom area
  );
  console.log('Bottom nav elements:', bottomNav.length);
  bottomNav.forEach(n => console.log(`  [${n.tag}.${n.class}] "${n.text}" top:${Math.round(n.rect.top)}`));

  // Also screenshot scrolled to bottom
  await mobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: `${SS}/deep-inspect-mobile-bottom.png`, fullPage: false });
  await mobileCtx.close();

  // ─── 8. Property detail images ───
  console.log('\n=== 8. PROPERTY DETAIL IMAGES ===');
  await page.goto(`${BASE}/property/prop-001`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SS}/deep-inspect-property.png` });

  const propImages = await page.$$eval('img', els => els.map(el => ({
    src: el.src?.substring(0, 120),
    alt: el.alt,
    naturalWidth: el.naturalWidth,
    broken: el.naturalWidth === 0
  })));
  console.log('Total images:', propImages.length);
  const realImages = propImages.filter(i => !i.src?.includes('logo') && !i.src?.includes('icon') && !i.src?.includes('svg'));
  console.log('Non-logo images:', realImages.length);
  realImages.forEach(i => console.log(`  ${i.broken ? 'BROKEN' : 'OK'} ${i.src}`));

  // Check for placeholder indicators
  const hasPlaceholder = await page.$('text=No image, text=placeholder, [class*="placeholder" i]').catch(() => null);
  console.log('Placeholder text found?', !!hasPlaceholder);

  // ─── 9. Sign up email form ───
  console.log('\n=== 9. SIGN UP EMAIL FORM ===');
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${SS}/deep-inspect-signup-before.png` });

  const signupEmailBtn = await page.$('button:has-text("Sign up with Email"), button:has-text("Email"), button:has-text("email")');
  if (signupEmailBtn) {
    console.log('Found "Sign up with Email" button');
    await signupEmailBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/deep-inspect-signup-after.png` });

    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passInput = await page.$('input[type="password"]');
    console.log('Email input appeared?', !!emailInput);
    console.log('Password input appeared?', !!passInput);
  } else {
    console.log('No "Sign up with Email" button found');
    const btns = await page.$$eval('button, a[role="button"]', els => els.map(el => el.textContent.trim().substring(0, 80)));
    console.log('Buttons on /signup:', btns);
    // Check if form is already visible
    const emailInput = await page.$('input[type="email"]');
    const passInput = await page.$('input[type="password"]');
    console.log('Email input visible?', !!emailInput);
    console.log('Password input visible?', !!passInput);
  }

  // ─── 10. Navbar Stays/Experiences toggle ───
  console.log('\n=== 10. NAVBAR STAYS/EXPERIENCES TOGGLE ===');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  const staysBtn = await page.$('button:has-text("Stays"), [role="tab"]:has-text("Stays"), a:has-text("Stays")');
  const expBtn = await page.$('button:has-text("Experiences"), [role="tab"]:has-text("Experiences"), a:has-text("Experiences")');
  console.log('Stays button/tab found?', !!staysBtn);
  console.log('Experiences button/tab found?', !!expBtn);

  if (staysBtn && expBtn) {
    // Check if it looks like a toggle pill
    const staysClass = await staysBtn.getAttribute('class');
    console.log('Stays class:', staysClass?.substring(0, 100));

    // Click Experiences
    await expBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS}/deep-inspect-toggle-experiences.png` });
    console.log('Clicked Experiences toggle');

    // Click Stays back
    const staysBtn2 = await page.$('button:has-text("Stays"), [role="tab"]:has-text("Stays"), a:has-text("Stays")');
    if (staysBtn2) {
      await staysBtn2.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SS}/deep-inspect-toggle-stays.png` });
      console.log('Clicked Stays toggle');
    }
  } else {
    // Check for any toggle-like elements
    const toggles = await page.$$eval('[class*="toggle" i], [class*="pill" i], [class*="tab" i], [role="tablist"]', els =>
      els.map(el => `[${el.tagName}.${el.className?.substring(0,60)}] "${el.textContent?.trim().substring(0,80)}"`)
    );
    console.log('Toggle-like elements:', toggles);
  }

  await page.screenshot({ path: `${SS}/deep-inspect-home-final.png` });

  console.log('\n=== INSPECTION COMPLETE ===');
  await browser.close();
})();
