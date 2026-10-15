// Screenshot tour of the main moments, for checking the look on several screen sizes.
// Needs the static server (npm run serve). Run: node tools/tour.mjs → .artifacts/tour/*.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4181/';
const out = new URL('../.artifacts/tour/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const midGame = {
  cash: 4_850_000, slots: [12, 12, 8, 15, 19, 22, 4, 4, 1, 26, null, 9], rebirths: 4, multiplier: 5.0625,
  discovered: [...Array(27).keys()], upgrades: { merge1: 1, merge2: 1, income1: 1, income2: 1, slots: 1 },
  buyTier: 1, merges: 300, lastSave: Date.now(),
};

const sizes = [
  ['ipad', { width: 1180, height: 820 }],
  ['phone', { width: 390, height: 844 }],
];

const browser = await chromium.launch();
for (const [name, viewport] of sizes) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript(save => localStorage.setItem('flagMixer_v1', save), JSON.stringify(midGame));
  await page.goto(base + '?test');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}${name}-1-midgame.png` });

  // Merge the two level-13 flags (slots 0 and 1) and catch the burst.
  const a = await page.locator('.slot[data-idx="0"]').boundingBox();
  const b = await page.locator('.slot[data-idx="1"]').boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 10, { steps: 6 });
  await page.screenshot({ path: `${out}${name}-2-dragging.png` });
  await page.mouse.up();
  await page.waitForTimeout(260);
  await page.screenshot({ path: `${out}${name}-3-merge.png` });

  await page.evaluate(() => { window.__flagMixer.state.nextCrateAt = 0; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}${name}-4-crate.png` });

  await page.locator('#atlas-btn').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}${name}-5-atlas.png` });
  await page.keyboard.press('Escape');
  await ctx.close();
}

// New player: first merge with the discovery banner.
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto(base + '?test');
await page.locator('#buy-btn').click();
const a = await page.locator('.slot[data-idx="0"]').boundingBox();
const b = await page.locator('.slot[data-idx="1"]').boundingBox();
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
await page.mouse.down();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}new-1-first-merge.png` });

// Rebirth celebration.
await page.evaluate(() => {
  const s = window.__flagMixer.state;
  s.slots = [2, 2, 2, 2, 2, null, null, null, null, null, null, null];
  s.cash = 2e6;
});
await page.waitForTimeout(300);
await page.locator('#rebirth-btn').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}new-2-rebirth-confirm.png` });
await page.getByRole('button', { name: 'Rebirth!' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}new-3-rebirth-flash.png` });
await ctx.close();

// Welcome back.
const ctx2 = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });
const page2 = await ctx2.newPage();
await page2.addInitScript(save => localStorage.setItem('flagMixer_v1', save), JSON.stringify({ ...midGame, lastSave: Date.now() - 3 * 3600e3 }));
await page2.goto(base + '?test');
await page2.waitForTimeout(800);
await page2.screenshot({ path: `${out}new-4-welcome.png` });
await browser.close();
console.log('Wrote screenshots to', out);
