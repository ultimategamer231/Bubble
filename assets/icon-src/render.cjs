// Renders the SVG sources in this folder to the PNGs referenced by app.config.ts.
// Usage (needs Playwright + Chromium available): node assets/icon-src/render.cjs
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const here = __dirname;
const out = join(here, '..', 'images');
const jobs = [
  ['adaptive-foreground.svg', 'adaptive-foreground.png', 1024],
  ['adaptive-monochrome.svg', 'adaptive-monochrome.png', 1024],
  ['icon.svg', 'icon.png', 1024],
  ['splash.svg', 'splash-icon.png', 512],
];
(async () => {
const browser = await chromium.launch();
for (const [src, dest, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(join(here, src), 'utf8');
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  await page.screenshot({ path: join(out, dest), omitBackground: true });
  await page.close();
}
await browser.close();
})();
