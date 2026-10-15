// Renders assets/icon.svg to the PNG sizes that iPad home screens and the web manifest use.
// Run: node tools/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../assets/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // iPad rounds home-screen icons itself, so the 180px icon is a full square.
  const art = size === 180 ? svg.replace('rx="112"', 'rx="0"') : svg;
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${art}`);
  await page.screenshot({ path: new URL(`../assets/icon-${size}.png`, import.meta.url).pathname, omitBackground: true });
  await page.close();
}
await browser.close();
console.log('Wrote assets/icon-180.png, icon-192.png, icon-512.png');
