import { test, expect } from '@playwright/test';

const SAVE_KEY = 'flagMixer_v1';

// Opens the game with an optional save already in localStorage.
async function openGame(page, save = null) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
  if (save) {
    await page.addInitScript(([key, value]) => {
      if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); }
    }, [SAVE_KEY, JSON.stringify(save)]);
  }
  await page.goto('./?test');
  await page.waitForFunction(() => window.__flagMixer);
  return errors;
}

function saveWith(fields) {
  return {
    cash: 100, slots: [0, null, null, null, null, null, null, null, null, null, null, null],
    rebirths: 0, multiplier: 1, discovered: [0], upgrades: {}, buyTier: 0, lastSave: Date.now(), ...fields,
  };
}

const slot = (page, i) => page.locator(`.slot[data-idx="${i}"]`);
const gameState = page => page.evaluate(() => {
  const s = window.__flagMixer.state;
  return { cash: s.cash, slots: s.slots, crate: s.crate, merges: s.merges, rebirths: s.rebirths, multiplier: s.multiplier };
});

// Drags with pointer events the way a finger or mouse would.
async function drag(page, from, to, pointerType) {
  const a = await slot(page, from).boundingBox();
  const b = await slot(page, to).boundingBox();
  const lift = pointerType === 'touch' ? 60 : 0; // the game lifts the ghost 60px above a finger
  await page.evaluate(({ a, b, lift, pointerType, from }) => {
    const fire = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, pointerType, isPrimary: true, clientX: x, clientY: y, button: 0,
    }));
    const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
    const bx = b.x + b.width / 2, by = b.y + b.height / 2 + lift;
    fire(document.querySelector(`.slot[data-idx="${from}"]`), 'pointerdown', ax, ay);
    for (let i = 1; i <= 8; i++) fire(document, 'pointermove', ax + (bx - ax) * i / 8, ay + (by - ay) * i / 8);
    fire(document, 'pointerup', bx, by);
  }, { a, b, lift, pointerType, from });
}

test('loads cleanly with every flag image present', async ({ page }) => {
  const errors = await openGame(page);
  await expect(slot(page, 0)).toHaveClass(/filled/);
  await expect(slot(page, 0).locator('.slot-name')).toHaveText('Afghanistan');
  const missing = await page.evaluate(async () => {
    const codes = [...document.querySelectorAll('.col-item img')].map(img => img.getAttribute('src'));
    const square = codes.map(src => src.replace('/4x3/', '/1x1/'));
    const results = await Promise.all([...codes, ...square].map(async src => [src, (await fetch(src)).ok]));
    return results.filter(([, ok]) => !ok).map(([src]) => src);
  });
  expect(missing).toEqual([]);
  expect(await page.locator('.col-item').count()).toBe(197);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('the board fits the screen without sideways scrolling', async ({ page }) => {
  await openGame(page);
  const viewport = page.viewportSize();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (let i = 0; i < 12; i++) {
    const box = await slot(page, i).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
  const buy = await page.locator('#buy-btn').boundingBox();
  expect(buy.y + buy.height).toBeLessThanOrEqual(viewport.height);
});

test('buy, then drag a flag onto its twin to merge', async ({ page }, info) => {
  const errors = await openGame(page);
  await page.locator('#buy-btn').click();
  let s = await gameState(page);
  expect(s.slots.slice(0, 2)).toEqual([0, 0]);
  expect(s.cash).toBeLessThan(100);

  await drag(page, 0, 1, info.project.use.hasTouch ? 'touch' : 'mouse');
  s = await gameState(page);
  expect(s.slots.slice(0, 2)).toEqual([null, 1]);
  expect(s.merges).toBe(1);
  await expect(slot(page, 1).locator('.slot-name')).toHaveText('Albania');
  await expect(page.locator('#banner')).toHaveClass(/show/);
  await expect(page.locator('#banner .banner-name')).toHaveText('Albania');
  await expect(page.locator('#atlas-count')).toHaveText('2 / 197');
  expect(errors).toEqual([]);
});

test('dropping on a different flag swaps them; dropping on an empty slot moves', async ({ page }, info) => {
  await openGame(page, saveWith({ slots: [0, 3, null, null, null, null, null, null, null, null, null, null], discovered: [0, 3] }));
  const type = info.project.use.hasTouch ? 'touch' : 'mouse';
  await drag(page, 0, 1, type);
  expect((await gameState(page)).slots.slice(0, 3)).toEqual([3, 0, null]);
  await drag(page, 1, 2, type);
  expect((await gameState(page)).slots.slice(0, 3)).toEqual([3, null, 0]);
});

test('a lucky crate drops and opens with a tap', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => { window.__flagMixer.state.nextCrateAt = 0; });
  await expect(page.locator('.slot.crate-slot')).toHaveCount(1);
  const idx = (await gameState(page)).crate;
  expect(idx).not.toBeNull();
  await expect(page.locator('#tip')).toContainText('lucky crate');
  await slot(page, idx).click();
  const s = await gameState(page);
  expect(s.crate).toBeNull();
  await expect(page.locator('.slot.crate-slot')).toHaveCount(0);
});

test('rebirth asks first, then resets the board with a free Austria', async ({ page }) => {
  await openGame(page, saveWith({
    cash: 2_000_000, slots: [2, 2, 2, 2, 2, null, null, null, null, null, null, null], discovered: [0, 1, 2],
  }));
  await expect(page.locator('#rebirth')).toHaveClass(/ready/);
  await page.locator('#rebirth-btn').click();
  await expect(page.locator('.modal h2')).toHaveText('Rebirth?');
  await page.getByRole('button', { name: 'Rebirth!' }).click();
  const s = await gameState(page);
  expect(s.rebirths).toBe(1);
  expect(s.multiplier).toBe(1.5);
  expect(s.slots.slice(0, 3)).toEqual([0, 9, null]);
  await expect(slot(page, 1).locator('.slot-name')).toHaveText('Austria');
  await expect(page.locator('#rebirth-title')).toHaveText('Rebirth 2');
});

test('coming back after a while shows the offline earnings', async ({ page }) => {
  await openGame(page, saveWith({ cash: 50, lastSave: Date.now() - 2 * 3600 * 1000 }));
  await expect(page.locator('.modal.welcome')).toBeVisible();
  await expect(page.locator('.modal .big-cash')).toHaveText('$14.40K');
  await page.getByRole('button', { name: 'Collect' }).click();
  await expect(page.locator('.modal.welcome')).toHaveCount(0);
  await expect(page.locator('#cash-display')).toHaveText(/\$14\.4\dK/, { timeout: 5000 });
});

test('progress survives a reload', async ({ page }) => {
  await openGame(page);
  await page.locator('#buy-btn').click();
  await page.reload();
  await page.waitForFunction(() => window.__flagMixer);
  expect((await gameState(page)).slots.slice(0, 2)).toEqual([0, 0]);
});

test('a second finger during a drag is ignored and nothing gets stuck', async ({ page }) => {
  await openGame(page, saveWith({ slots: [0, 0, 3, null, null, null, null, null, null, null, null, null], discovered: [0, 3] }));
  const boxes = await Promise.all([0, 1, 2].map(i => slot(page, i).boundingBox()));
  await page.evaluate(boxes => {
    const center = b => [b.x + b.width / 2, b.y + b.height / 2];
    const fire = (target, type, id, [x, y]) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: id, pointerType: 'mouse', isPrimary: id === 1, clientX: x, clientY: y, button: 0,
    }));
    const [a, b, c] = boxes.map(center);
    fire(document.querySelector('.slot[data-idx="0"]'), 'pointerdown', 1, a);
    fire(document, 'pointermove', 1, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    fire(document.querySelector('.slot[data-idx="2"]'), 'pointerdown', 2, c);  // second finger
    fire(document, 'pointerup', 2, c);
    fire(document, 'pointermove', 1, b);
    fire(document, 'pointerup', 1, b);
  }, boxes);
  const s = await gameState(page);
  expect(s.slots.slice(0, 3)).toEqual([null, 1, 3]);
  await expect(page.locator('#drag-ghost')).toBeHidden();
  await expect(page.locator('.slot.dragging')).toHaveCount(0);
});

test('time spent in a hidden tab pays once, capped at 8 hours', async ({ page }) => {
  await openGame(page);
  const before = (await gameState(page)).cash;
  await page.evaluate(() => {
    window.__hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
    const realNow = Date.now.bind(Date);
    window.__offset = 0;
    Date.now = () => realNow() + window.__offset;
    window.__hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Ten hours pass while hidden, one hour at a time, with the game's timers still running.
  for (let hour = 1; hour <= 10; hour++) {
    await page.evaluate(h => { window.__offset = h * 3600 * 1000; }, hour);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => { window.__hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('.modal.welcome')).toBeVisible();
  await expect(page.locator('.modal .big-cash')).toHaveText('$57.60K'); // 2/sec × 8 hours
  const gained = (await gameState(page)).cash - before;
  expect(gained).toBeGreaterThan(57_600);
  expect(gained).toBeLessThan(57_610);
});
