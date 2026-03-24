import { chromium } from 'playwright';

const BASE = 'https://nfstay.app';
const SCREENSHOT_DIR = '/Users/hugo/Downloads/AI Folder/openclaw/bookingsite/e2e';

const pages = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'property', path: '/property/prop-001' },
  { name: 'signin', path: '/signin' },
  { name: 'signup', path: '/signup' },
  { name: 'checkout', path: '/checkout' },
  { name: 'booking', path: '/booking' },
  { name: 'operator', path: '/nfstay' },
  { name: 'admin', path: '/admin/nfstay' },
  { name: 'traveler-reservations', path: '/traveler/reservations' },
  { name: 'operator-onboarding', path: '/nfstay/onboarding' },
];

async function auditPage(page, { name, path }) {
  const separator = '='.repeat(70);
  console.log(`\n${separator}`);
  console.log(`PAGE: ${name} (${path})`);
  console.log(separator);

  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`  [WARN] Navigation timeout/error: ${e.message.split('\n')[0]}`);
    // still continue to capture what loaded
  }

  // Wait a bit for any client-side redirects
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  console.log(`  Final URL: ${finalUrl}`);
  if (finalUrl !== `${BASE}${path}`) {
    console.log(`  ** REDIRECT DETECTED from ${path} **`);
  }

  const title = await page.title();
  console.log(`  Title: "${title}"`);

  // Meta tags
  const metas = await page.$$eval('meta[name], meta[property]', els =>
    els.map(el => ({
      name: el.getAttribute('name') || el.getAttribute('property'),
      content: el.getAttribute('content') || '',
    })).filter(m => m.content)
  );
  if (metas.length > 0) {
    console.log(`  Meta tags (${metas.length}):`);
    for (const m of metas.slice(0, 15)) {
      console.log(`    ${m.name}: ${m.content.substring(0, 120)}`);
    }
  }

  // Headings
  const headings = await page.$$eval('h1, h2', els =>
    els.map(el => ({
      tag: el.tagName,
      text: el.innerText.trim().substring(0, 200),
      visible: el.offsetParent !== null || el.offsetHeight > 0,
    })).filter(h => h.text)
  );
  console.log(`  Headings (${headings.length}):`);
  for (const h of headings) {
    console.log(`    <${h.tag.toLowerCase()}${h.visible ? '' : ' [hidden]'}> ${h.text}`);
  }

  // Form inputs
  const inputs = await page.$$eval('input, select, textarea', els =>
    els.map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
      id: el.id || '',
      label: el.getAttribute('aria-label') || '',
      visible: el.offsetParent !== null || el.offsetHeight > 0,
    }))
  );
  if (inputs.length > 0) {
    console.log(`  Form inputs (${inputs.length}):`);
    for (const inp of inputs) {
      const desc = [
        inp.tag,
        inp.type && `type="${inp.type}"`,
        inp.name && `name="${inp.name}"`,
        inp.id && `id="${inp.id}"`,
        inp.placeholder && `placeholder="${inp.placeholder}"`,
        inp.label && `aria-label="${inp.label}"`,
        !inp.visible && '[hidden]',
      ].filter(Boolean).join(' ');
      console.log(`    ${desc}`);
    }
  }

  // Buttons
  const buttons = await page.$$eval('button, a[role="button"], [type="submit"]', els =>
    els.map(el => ({
      tag: el.tagName.toLowerCase(),
      text: el.innerText.trim().substring(0, 100),
      type: el.getAttribute('type') || '',
      href: el.getAttribute('href') || '',
      class: el.className?.substring?.(0, 80) || '',
      testId: el.getAttribute('data-testid') || '',
      visible: el.offsetParent !== null || el.offsetHeight > 0,
    })).filter(b => b.text || b.testId)
  );
  if (buttons.length > 0) {
    console.log(`  Buttons/CTAs (${buttons.length}):`);
    for (const b of buttons.slice(0, 25)) {
      const desc = [
        `<${b.tag}>`,
        b.text && `"${b.text}"`,
        b.href && `href="${b.href}"`,
        b.testId && `data-testid="${b.testId}"`,
        !b.visible && '[hidden]',
      ].filter(Boolean).join(' ');
      console.log(`    ${desc}`);
    }
  }

  // Property cards (for search page)
  if (name === 'search') {
    const cardSelectors = [
      '[data-testid*="property"]',
      '.property-card',
      '[class*="PropertyCard"]',
      '[class*="property-card"]',
      'a[href*="/property/"]',
      '[class*="listing"]',
    ];
    for (const sel of cardSelectors) {
      const count = await page.$$eval(sel, els => els.length).catch(() => 0);
      if (count > 0) {
        console.log(`  Property cards matching "${sel}": ${count}`);
      }
    }
    // Also try counting by visible card-like divs
    const links = await page.$$eval('a[href*="/property/"]', els =>
      els.map(el => el.getAttribute('href')).filter(Boolean)
    );
    if (links.length > 0) {
      console.log(`  Links to /property/ pages: ${links.length}`);
      for (const l of links.slice(0, 5)) {
        console.log(`    ${l}`);
      }
    }
  }

  // Filter labels (for search page)
  if (name === 'search') {
    const labels = await page.$$eval('label', els =>
      els.map(el => el.innerText.trim()).filter(Boolean)
    );
    if (labels.length > 0) {
      console.log(`  Labels (${labels.length}):`);
      for (const l of labels.slice(0, 15)) {
        console.log(`    "${l}"`);
      }
    }
  }

  // Social login buttons (for signin/signup)
  if (name === 'signin' || name === 'signup') {
    const socialBtns = await page.$$eval('button, a', els =>
      els.map(el => el.innerText.trim().toLowerCase())
        .filter(t => t.includes('google') || t.includes('facebook') || t.includes('apple') || t.includes('github'))
    );
    if (socialBtns.length > 0) {
      console.log(`  Social login buttons:`);
      for (const s of socialBtns) console.log(`    "${s}"`);
    }
  }

  // Error messages / empty states
  const errors = await page.$$eval('[class*="error"], [class*="Error"], [role="alert"], [class*="empty"], [class*="Empty"], .toast, [class*="not-found"], [class*="NotFound"]', els =>
    els.map(el => el.innerText.trim().substring(0, 200)).filter(Boolean)
  );
  if (errors.length > 0) {
    console.log(`  Error/empty state messages:`);
    for (const e of errors) console.log(`    "${e}"`);
  }

  // Visible text snapshot - key paragraphs
  const paragraphs = await page.$$eval('p', els =>
    els.map(el => el.innerText.trim().substring(0, 150))
      .filter(t => t.length > 20)
      .slice(0, 8)
  );
  if (paragraphs.length > 0) {
    console.log(`  Key paragraphs:`);
    for (const p of paragraphs) console.log(`    "${p}"`);
  }

  // Navigation links
  const navLinks = await page.$$eval('nav a, header a', els =>
    els.map(el => ({
      text: el.innerText.trim().substring(0, 50),
      href: el.getAttribute('href') || '',
    })).filter(l => l.text)
  );
  if (navLinks.length > 0) {
    console.log(`  Nav links (${navLinks.length}):`);
    for (const l of navLinks.slice(0, 15)) {
      console.log(`    "${l.text}" -> ${l.href}`);
    }
  }

  // Screenshot
  const screenshotPath = `${SCREENSHOT_DIR}/audit-inspect-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  Screenshot: audit-inspect-${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Capture console errors
  page.on('pageerror', err => {
    console.log(`  [JS ERROR] ${err.message.substring(0, 200)}`);
  });

  for (const pg of pages) {
    await auditPage(page, pg);
  }

  await browser.close();
  console.log('\n\nDone. All screenshots saved.');
})();
