// scripts/snapshots.js
// Simple Playwright-powered visual snapshot script
// - Launches a headless browser
// - Visits the local preview (or a provided BASE_URL)
// - Captures screenshots at mobile, tablet, desktop widths
// - Stores outputs in ./artifacts/screenshots/<commit-or-timestamp>

import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/';
const OUT_DIR = path.join(process.cwd(), 'artifacts', 'screenshots');

function ensureDir(p){
  fs.mkdirSync(p, { recursive: true });
}

function runId(){
  const fromCI = process.env.GITHUB_SHA || process.env.BUILD_ID;
  return fromCI ? fromCI.substring(0,7) : new Date().toISOString().replace(/[:.]/g,'-');
}

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 700, userAgent: devices['iPhone 13'].userAgent, deviceScaleFactor: 3 },
  { name: 'tablet', width: 820, height: 900, userAgent: devices['iPad (gen 7)'].userAgent, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1366, height: 900 }
];

async function main(){
  ensureDir(OUT_DIR);
  const targetDir = path.join(OUT_DIR, runId());
  ensureDir(targetDir);

  console.log(`[snapshots] Using BASE_URL=${BASE_URL}`);
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS){
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.userAgent,
        deviceScaleFactor: vp.deviceScaleFactor,
      });
      const page = await context.newPage();

      // navigate and wait network idle
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // dismiss any install banners if present
      await page.evaluate(() => {
        const el = document.getElementById('installBtn');
        el?.setAttribute('aria-hidden', 'true');
      });

      // capture full page screenshot
      const outPath = path.join(targetDir, `${vp.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`[snapshots] saved ${outPath}`);

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[snapshots] error', err);
  process.exit(1);
});