/**
 * Visual regression suite.
 *
 * Catches render-shape bugs that pure code review cannot see: dark-mode
 * contrast, stacking-context regressions, accidental layout drift,
 * theme-resolution timing issues. See docs/code-review-modalities.md for
 * the broader rationale.
 *
 * USAGE:
 *   First time (or after intentional UI change):
 *     npm run test:visual:update
 *     # → captures new baseline screenshots under
 *     #   e2e/visual-regression.spec.ts-snapshots/
 *
 *   Subsequent runs:
 *     npm run test:visual
 *     # → compares against baselines, fails on diff above tolerance
 *
 * STABILITY NOTES:
 * - Animations are disabled via `reducedMotion: 'reduce'` to remove timing flakiness.
 * - The dynamic widgets (Clock, Weather, Photo) are masked because they show
 *   live time / live weather / a rotating photo and would never compare equal.
 * - `maxDiffPixelRatio` is set to 1% to absorb sub-pixel font rendering
 *   differences across hosts. Tighten over time as flakes are eliminated.
 * - Tests reset all data + flush Redis + login fresh in beforeAll so the
 *   visible state depends only on the seed, not on prior test runs.
 *
 * TEST-ENVIRONMENT DEPENDENCY (HARD REQUIREMENT — PII):
 * - Visual baselines capture EVERYTHING on screen: member names in the
 *   PIN modal, calendar event titles, the wallpaper photo, weather city,
 *   bus stop names. ALL of that is PII when run against a live deployment.
 * - Per `CLAUDE.md` PII policy, real names / photos / addresses MUST NOT
 *   be committed. So baselines may ONLY be captured against a synthetic-
 *   seed DB with anonymized fixtures.
 * - Set `E2E_HAS_TEST_DB=1` (and optionally `E2E_PIN=...`) when running
 *   against such a DB. Without that flag, every test in this spec is
 *   skipped — by design — to prevent accidental PII capture.
 * - Required synthetic seed (for future implementation): family members
 *   named "Alice/Bob/Carol/Dan", a fixture wallpaper from `tests/fixtures/`,
 *   no real calendar events, no real bus routes, no real weather location.
 */

import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import { loginViaAPI } from './helpers/auth';
import { resetAll } from './helpers/reset';

/**
 * Pull a seeded parent's name directly from the DB.
 *
 * The shared `getFirstParent(page)` helper relies on `/api/family` returning
 * the `role` field, which it only does for authenticated requests — chicken
 * and egg for any spec that needs to log in from a fresh page. Querying the
 * DB sidesteps the issue and keeps the parent's name out of the test source.
 */
function getSeededParentName(): string {
  const out = execSync(
    `docker exec prism-db psql -U prism -d prism -At -c "SELECT name FROM users WHERE role = 'parent' ORDER BY created_at LIMIT 1"`,
    { encoding: 'utf-8' },
  ).trim();
  if (!out) throw new Error('No seeded parent in DB — did seeds run?');
  return out;
}

// Widgets whose rendered content changes between runs. Masked from the
// screenshot (rendered as solid colored rectangles in the diff).
function dynamicMasks(page: Page) {
  return [
    page.locator('[role="region"]', { hasText: /^Clock$/ }),
    page.locator('[role="region"]', { hasText: /^Weather$/ }),
    page.locator('[role="region"]', { hasText: /^Photos?$/ }),
  ];
}

const SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.01,
  animations: 'disabled' as const,
  fullPage: false,
};

/** Set theme + perf mode via localStorage before any page script runs. */
async function setClientFlags(
  page: Page,
  opts: { theme?: 'light' | 'dark'; perfMode?: boolean } = {}
) {
  const { theme = 'light', perfMode = false } = opts;
  await page.addInitScript(
    ([t, p]) => {
      localStorage.setItem('prism-theme', t as string);
      localStorage.setItem('prism-perf-mode', String(p));
      // Disable auto-hide so the toolbar stays visible during screenshots.
      localStorage.setItem('prism:auto-hide-ui', 'false');
    },
    [theme, perfMode],
  );
}

/**
 * Auth-required tests only run when a fresh test DB is available.
 * Live deployments have unknown PINs; running these would 400 on login.
 */
const HAS_TEST_DB = process.env.E2E_HAS_TEST_DB === '1';

test.describe('Visual regression', () => {
  let parentName: string;

  test.beforeAll(() => {
    if (HAS_TEST_DB) {
      resetAll();
      parentName = getSeededParentName();
    }
  });

  test.use({
    contextOptions: { reducedMotion: 'reduce' },
    viewport: { width: 1920, height: 1080 },
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`dashboard - ${theme}`, async ({ page }) => {
      test.skip(!HAS_TEST_DB, 'Set E2E_HAS_TEST_DB=1 against a fresh-seeded DB');
      await setClientFlags(page, { theme });
      await loginViaAPI(page, parentName);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800); // let theme + seasonal vars settle

      await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, {
        ...SCREENSHOT_OPTIONS,
        mask: dynamicMasks(page),
      });
    });

    test(`dashboard perf-mode - ${theme}`, async ({ page }) => {
      test.skip(!HAS_TEST_DB, 'Set E2E_HAS_TEST_DB=1 against a fresh-seeded DB');
      await setClientFlags(page, { theme, perfMode: true });
      await loginViaAPI(page, parentName);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot(`dashboard-perf-${theme}.png`, {
        ...SCREENSHOT_OPTIONS,
        mask: dynamicMasks(page),
      });
    });

    test(`calendar - ${theme}`, async ({ page }) => {
      test.skip(!HAS_TEST_DB, 'Set E2E_HAS_TEST_DB=1 against a fresh-seeded DB');
      await setClientFlags(page, { theme });
      await loginViaAPI(page, parentName);
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot(`calendar-${theme}.png`, SCREENSHOT_OPTIONS);
    });

    test(`settings - ${theme}`, async ({ page }) => {
      test.skip(!HAS_TEST_DB, 'Set E2E_HAS_TEST_DB=1 against a fresh-seeded DB');
      await setClientFlags(page, { theme });
      await loginViaAPI(page, parentName);
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot(`settings-${theme}.png`, SCREENSHOT_OPTIONS);
    });
  }

  // PIN modal tests — also gated on E2E_HAS_TEST_DB because the modal
  // shows the seeded family members' names, which would be PII against
  // a live deployment.
  for (const theme of ['light', 'dark'] as const) {
    test(`login landing page - ${theme}`, async ({ page }) => {
      test.skip(!HAS_TEST_DB, 'Set E2E_HAS_TEST_DB=1 against a synthetic-seed DB');
      await setClientFlags(page, { theme });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);

      await expect(page).toHaveScreenshot(`login-landing-${theme}.png`, {
        ...SCREENSHOT_OPTIONS,
        mask: dynamicMasks(page),
      });
    });

    test(`PIN modal - ${theme}`, async ({ page }) => {
      test.skip(!HAS_TEST_DB, 'Set E2E_HAS_TEST_DB=1 against a synthetic-seed DB');
      await setClientFlags(page, { theme });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.click('button[aria-label="Log in"]');
      await page.waitForSelector('.z-\\[10001\\]', { timeout: 5000 });
      await page.waitForTimeout(400);

      await expect(page).toHaveScreenshot(`pin-modal-${theme}.png`, SCREENSHOT_OPTIONS);
    });
  }
});
