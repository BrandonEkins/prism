/**
 * Retry capture for a single page. Usage:
 *   npx tsx scripts/capture-one.ts <url-path> <output-name> [settle-ms]
 * Example:
 *   npx tsx scripts/capture-one.ts /tasks tasks 4000
 */

import { chromium } from '@playwright/test';
import * as path from 'path';

const BASE_URL = process.env.PRISM_URL || 'http://localhost:3010';
const [, , urlPath, outputName, settleArg] = process.argv;

if (!urlPath || !outputName) {
  console.error('Usage: tsx scripts/capture-one.ts <url-path> <output-name> [settle-ms]');
  process.exit(1);
}

const settleMs = settleArg ? Number(settleArg) : 5000;
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'demos');

async function loginAsAlex(page: any) {
  const resp = await page.request.get('/api/family');
  const json = await resp.json();
  const members = Array.isArray(json) ? json : json.members;
  const alex = members.find((m: any) => m.name === 'Alex');
  const data: any = { pin: '1234' };
  if (alex.id) data.userId = alex.id;
  else if (typeof alex.loginIndex === 'number') data.memberIndex = alex.loginIndex;
  await page.request.post('/api/auth/login', { data });
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
  await loginAsAlex(page);
  await page.goto(urlPath, { waitUntil: 'load', timeout: 60_000 });

  // Wait for body content + no loading text
  await page.waitForFunction(
    () => {
      const text = document.body.innerText.trim();
      if (!text || text === 'Prism') return false;
      if (/Loading[\s\w]*\.\.\./i.test(text)) return false;
      return true;
    },
    { timeout: 30_000, polling: 250 },
  ).catch(() => {});

  await page.waitForTimeout(settleMs);

  await page.screenshot({ path: path.join(OUT_DIR, `${outputName}.png`), fullPage: false });
  console.log(`  ✓ ${outputName}.png`);

  await browser.close();
})();
