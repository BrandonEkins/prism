/**
 * Auto-capture screenshots of every Prism feature for the docs site.
 *
 * Run against the screenshots stack (port :3010) with:
 *
 *   docker-compose -f docker-compose.screenshots.yml up -d
 *   # ... wait ~90s for first boot ...
 *   npm run screenshots:capture
 *
 * Saves to docs/demos/ with stable filenames so the docs site + README
 * references stay valid across re-runs. Captures both light + dark theme
 * for the main dashboard, plus mobile viewport variants.
 *
 * Login is automatic — uses Alex (parent) with PIN 1234 from the seed.
 * No setup wizard needed; the seed pre-creates users + settings + layout.
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.PRISM_URL || 'http://localhost:3010';
const PIN = '1234';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'demos');

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 }; // iPhone 14

interface CaptureSpec {
  name: string;
  url: string;
  description: string;
  /** Wait extra ms after navigation (for animations / lazy-load) */
  settleMs?: number;
  /** Set the theme before capture: 'light' | 'dark' (default light) */
  theme?: 'light' | 'dark';
  /** Mobile viewport instead of desktop */
  mobile?: boolean;
  /** Optional pre-screenshot setup (e.g. click into a sub-view) */
  setup?: (page: Page) => Promise<void>;
}

const SCREENSHOTS: CaptureSpec[] = [
  // ─── Dashboard ─────────────────────────────────────────────
  {
    name: 'dashboard-light',
    url: '/',
    description: 'Dashboard with widgets (light mode)',
    theme: 'light',
    settleMs: 1500,
  },
  {
    name: 'dashboard-dark',
    url: '/',
    description: 'Dashboard with widgets (dark mode)',
    theme: 'dark',
    settleMs: 1500,
  },
  {
    name: 'dashboard-mobile',
    url: '/',
    description: 'Mobile dashboard (single-column cards)',
    mobile: true,
    settleMs: 1000,
  },

  // ─── Calendar ──────────────────────────────────────────────
  {
    name: 'calendar-month',
    url: '/calendar',
    description: 'Calendar month view',
    settleMs: 1500,
    setup: async (page) => {
      // Switch to month view if not default
      const monthBtn = page.locator('button:has-text("Month")').first();
      if (await monthBtn.isVisible()) {
        await monthBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    },
  },
  {
    name: 'calendar-week',
    url: '/calendar',
    description: 'Calendar week view',
    settleMs: 1500,
    setup: async (page) => {
      const viewBtn = page.locator('button:has-text("1W")').first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    },
  },
  {
    name: 'calendar-agenda',
    url: '/calendar',
    description: 'Calendar agenda view',
    settleMs: 1000,
    setup: async (page) => {
      const viewBtn = page.locator('button:has-text("Agenda")').first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    },
  },
  {
    name: 'calendar-mobile',
    url: '/calendar',
    description: 'Mobile calendar (agenda-only)',
    mobile: true,
    settleMs: 1000,
  },

  // ─── Shopping ──────────────────────────────────────────────
  {
    name: 'shopping',
    url: '/shopping',
    description: 'Shopping list with category grid',
    settleMs: 1000,
  },
  {
    name: 'shopping-mobile',
    url: '/shopping',
    description: 'Mobile shopping list',
    mobile: true,
    settleMs: 1000,
  },

  // ─── Recipes ───────────────────────────────────────────────
  {
    name: 'recipes',
    url: '/recipes',
    description: 'Recipe library grid',
    settleMs: 1000,
  },

  // ─── Tasks ─────────────────────────────────────────────────
  {
    name: 'tasks',
    url: '/tasks',
    description: 'Tasks page with multiple lists',
    settleMs: 1000,
  },

  // ─── Chores ────────────────────────────────────────────────
  {
    name: 'chores',
    url: '/chores',
    description: 'Chores grouped by person',
    settleMs: 1000,
  },

  // ─── Meals ─────────────────────────────────────────────────
  {
    name: 'meals',
    url: '/meals',
    description: 'Weekly meal planner',
    settleMs: 1000,
  },

  // ─── Goals ─────────────────────────────────────────────────
  {
    name: 'goals',
    url: '/goals',
    description: 'Goals page with points waterfall',
    settleMs: 1000,
  },

  // ─── Wishes & Gift Ideas ───────────────────────────────────
  {
    name: 'wishes',
    url: '/wishes',
    description: 'Wish lists with claim tracking',
    settleMs: 1000,
  },

  // ─── Photos ────────────────────────────────────────────────
  {
    name: 'photos',
    url: '/photos',
    description: 'Photo gallery',
    settleMs: 1500,
  },

  // ─── Travel Map ────────────────────────────────────────────
  {
    name: 'travel-globe',
    url: '/travel',
    description: 'Travel map globe with pins',
    settleMs: 3500, // globe takes time to render
  },

  // ─── Weekend Ideas ─────────────────────────────────────────
  {
    name: 'weekend',
    url: '/weekend',
    description: 'Weekend Ideas activity board',
    settleMs: 1000,
  },

  // ─── Messages ──────────────────────────────────────────────
  {
    name: 'messages',
    url: '/messages',
    description: 'Family message board',
    settleMs: 1000,
  },
];

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(t);
    try {
      localStorage.setItem('theme', t);
    } catch {}
  }, theme);
}

async function loginAsAlex(page: Page) {
  const familyResp = await page.request.get('/api/family');
  const familyJson = await familyResp.json();
  const members = Array.isArray(familyJson) ? familyJson : familyJson.members;
  const alex = members.find((m: { name: string }) => m.name === 'Alex');
  if (!alex) throw new Error('Alex not found in /api/family — did the seed run?');

  const data: Record<string, unknown> = { pin: PIN };
  if (alex.id) data.userId = alex.id;
  else if (typeof alex.loginIndex === 'number') data.memberIndex = alex.loginIndex;
  else throw new Error('Alex has neither id nor loginIndex');

  const loginResp = await page.request.post('/api/auth/login', { data });
  if (!loginResp.ok()) {
    throw new Error(`Login failed: ${loginResp.status()} ${await loginResp.text()}`);
  }
}

/**
 * Wait until any loading indicators have disappeared. Next.js dev mode
 * compiles each route on first hit, taking several seconds, during which
 * the page shows "Loading shopping lists…" / a "Prism" splash / skeleton
 * placeholders. Polling for their absence is more reliable than a fixed
 * sleep that risks capturing the splash.
 */
async function waitForContentReady(page: Page, settleMs = 2500): Promise<void> {
  // Poll until both: (a) the page is no longer the "Prism" splash, and
  // (b) no "Loading X..." indicator is visible. Next.js dev mode compiles
  // each route on first hit (several seconds), so a fixed sleep risks
  // capturing the loading state. 30s timeout fallback keeps the script
  // from hanging if the heuristic ever misses.
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText.trim();
        if (text === 'Prism' || text === '' || text === 'Loading...') return false;
        if (/Loading\s+\w+\.\.\./.test(text)) return false;
        return true;
      },
      { timeout: 30_000, polling: 250 },
    )
    .catch(() => {
      // Best-effort — fall through to the static settle delay if we time out.
    });
  await page.waitForTimeout(settleMs);
}

async function captureOnce(browser: Browser, spec: CaptureSpec): Promise<void> {
  const viewport = spec.mobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT;
  const context: BrowserContext = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
    reducedMotion: 'reduce',
    colorScheme: spec.theme === 'dark' ? 'dark' : 'light',
  });

  const page = await context.newPage();

  try {
    // Login first (against the base URL — sets auth cookies on the context).
    // Use 'load' rather than 'networkidle': Next.js dev mode keeps a hot-reload
    // websocket open, so networkidle never fires and every navigation times out.
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await loginAsAlex(page);

    // Navigate to the target page.
    await page.goto(spec.url, { waitUntil: 'load', timeout: 60_000 });

    if (spec.theme) {
      await setTheme(page, spec.theme);
      await page.waitForTimeout(300);
    }

    if (spec.setup) {
      await spec.setup(page);
    }

    // Wait for content to be ready (loading indicators gone), then a small
    // extra settle for animations + render finalization.
    await waitForContentReady(page, spec.settleMs ?? 1500);

    const outPath = path.join(OUT_DIR, `${spec.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
  } finally {
    await context.close();
  }
}

/**
 * Wait for the screenshots stack to be reachable again. Next.js dev mode can
 * crash under load; Docker restarts the container, which means we have to
 * wait for migrate + seed + dev-server-boot before retrying.
 */
async function waitForStackReady(timeoutMs = 180_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`${BASE_URL}/api/health`);
      if (resp.ok) return true;
    } catch {
      // Server down — keep waiting.
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  return false;
}

async function captureOne(browser: Browser, spec: CaptureSpec): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await captureOnce(browser, spec);
      console.log(`  ✓ ${spec.name}.png  (${spec.description})`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('ERR_EMPTY_RESPONSE') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('Timeout');

      if (isTransient && attempt < 3) {
        console.warn(`  ⟲ ${spec.name}  attempt ${attempt} failed (${msg.split('\n')[0]}); waiting for stack...`);
        await waitForStackReady();
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }

      console.error(`  ✗ ${spec.name}  FAILED: ${msg.split('\n')[0]}`);
      return false;
    }
  }
  return false;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`\nCapturing ${SCREENSHOTS.length} screenshots from ${BASE_URL}`);
  console.log(`Output: ${OUT_DIR}\n`);

  // Quick health check before spinning up the browser
  try {
    const resp = await fetch(`${BASE_URL}/api/health`);
    if (!resp.ok) {
      throw new Error(`/api/health returned ${resp.status}`);
    }
  } catch (err) {
    console.error(`\nERROR: Cannot reach ${BASE_URL}.`);
    console.error('Boot the screenshots stack first:');
    console.error('  docker-compose -f docker-compose.screenshots.yml up -d\n');
    process.exit(1);
  }

  const browser = await chromium.launch();
  let ok = 0;
  let failed = 0;

  try {
    for (const spec of SCREENSHOTS) {
      const success = await captureOne(browser, spec);
      if (success) ok++;
      else failed++;
      // Small pause between captures so the dev server has time to recover
      // from the previous on-demand compile before we hit it with another.
      await new Promise((r) => setTimeout(r, 1_500));
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. ${ok} of ${SCREENSHOTS.length} captured`);
  if (failed > 0) {
    console.log(`${failed} failed — re-run to retry, or capture individually.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
