import { test, expect } from '@playwright/test';

async function openGame(page, fields = {}) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(fields => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('flagMixer_v1', JSON.stringify({
      cash: 1e12, slots: Array(12).fill(null), muted: true,
      discovered: Array.from({ length: 197 }, (_, i) => i), lastSave: Date.now(), ...fields,
    }));
  }, fields);
  await page.goto('./?test');
  await page.waitForFunction(() => window.__flagMixer);
  return errors;
}

test('rapid touch buys and merges keep input work bounded and save the final board', async ({ page }) => {
  const errors = await openGame(page);
  const result = await page.evaluate(() => {
    const { state } = window.__flagMixer;
    state.nextCrateAt = 1e9;
    const slots = [...document.querySelectorAll('.slot')];
    const boxes = slots.map(el => el.getBoundingClientRect());
    let rects = 0, forcedWidths = 0, saves = 0;
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) {
      if (this.classList.contains('slot')) rects++;
      return rect.apply(this, args);
    };
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      ...width, get() { forcedWidths++; return width.get.call(this); },
    });
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) { saves++; return setItem.apply(this, args); };
    const fire = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, button: 0,
    }));
    for (let n = 0; n < 32; n++) {
      document.getElementById('buy-btn').click();
      let pair;
      do {
        pair = null;
        for (let a = 0; a < 10 && !pair; a++) for (let b = a + 1; b < 10; b++) {
          if (state.slots[a] !== null && state.slots[a] === state.slots[b]) { pair = [a, b]; break; }
        }
        if (!pair) continue;
        const [from, to] = pair, a = boxes[from], b = boxes[to];
        const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2, by = b.y + b.height / 2 + 60;
        fire(slots[from], 'pointerdown', ax, ay);
        for (let i = 1; i <= 16; i++) fire(document, 'pointermove', ax + (bx - ax) * i / 16, ay + (by - ay) * i / 16);
        fire(document, 'pointerup', bx, by);
      } while (pair);
    }
    const work = { rects, forcedWidths, saves };
    // A reload can happen before the grouped save timer; pagehide must flush it.
    window.dispatchEvent(new Event('pagehide'));
    const saved = JSON.parse(localStorage.getItem('flagMixer_v1'));
    Element.prototype.getBoundingClientRect = rect;
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
    Storage.prototype.setItem = setItem;
    return { work, merges: state.merges, slots: [...state.slots], savedSlots: saved.slots };
  });
  expect(result.merges).toBe(31);
  expect(result.slots.filter(t => t !== null)).toEqual([5]);
  expect(result.work.rects).toBeLessThan(700); // once per gesture, not 12 reads per pointermove
  expect(result.work.forcedWidths).toBe(0);
  expect(result.work.saves).toBe(0); // rapid actions share a later save
  expect(result.savedSlots).toEqual(result.slots);
  await page.reload();
  await page.waitForFunction(() => window.__flagMixer);
  expect(await page.evaluate(() => window.__flagMixer.state.slots)).toEqual(result.slots);
  expect(errors).toEqual([]);
});

test('overlapping effects stay bounded without losing coin callbacks', async ({ page }) => {
  await openGame(page);
  const drawn = await page.evaluate(async () => {
    const fx = await import('./js/fx.js');
    const g = document.getElementById('fx').getContext('2d');
    const arc = g.arc;
    let arcs = 0;
    g.arc = function (...args) { arcs++; return arc.apply(this, args); };
    window.__arrivals = 0;
    for (let i = 0; i < 10; i++) {
      fx.sparks(200, 200, undefined, 1000);
      fx.confetti(200, 200, undefined, 1000);
      fx.ring(200, 200);
    }
    fx.coinsTo(200, 200, document.getElementById('cash-row'), 150, () => window.__arrivals++);
    for (let i = 0; i < 100; i++) fx.floatText(200, 200, 'Rapid tap');
    await new Promise(requestAnimationFrame);
    g.arc = arc;
    return { arcs, floaters: document.getElementById('floaters').children.length };
  });
  expect(drawn.arcs).toBeGreaterThan(0);
  expect(drawn.arcs).toBeLessThanOrEqual(600); // at most 200 particles, up to 3 arcs per coin
  expect(drawn.floaters).toBeLessThanOrEqual(24);
  await expect.poll(() => page.evaluate(() => window.__arrivals), { timeout: 8000 }).toBe(150);
  await expect(page.locator('#floaters .floater')).toHaveCount(0);
});

test('drag targets refresh after resizing mid-gesture', async ({ page }) => {
  await openGame(page, { slots: [0, 0, ...Array(10).fill(null)] });
  await page.evaluate(() => {
    window.__fireTouch = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, button: 0,
    }));
    const from = document.querySelector('.slot[data-idx="0"]');
    const r = from.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    window.__fireTouch(from, 'pointerdown', x, y);
    window.__fireTouch(document, 'pointermove', x + 16, y);
  });
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: viewport.width - 40, height: viewport.height + 40 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    const r = document.querySelector('.slot[data-idx="1"]').getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2 + 60;
    window.__fireTouch(document, 'pointermove', x, y);
    window.__fireTouch(document, 'pointerup', x, y);
  });
  expect(await page.evaluate(() => window.__flagMixer.state.slots.slice(0, 2))).toEqual([null, 1]);
  await expect(page.locator('#drag-ghost')).toBeHidden();
});

test('unchanged panel renders leave the DOM alone and discoveries still update', async ({ page }) => {
  await openGame(page, { discovered: [0] });
  const mutations = await page.evaluate(async () => {
    const ui = await import('./js/ui.js');
    const state = window.__flagMixer.state;
    const observer = new MutationObserver(() => {});
    for (const id of ['income-display', 'multiplier-badge', 'rebirth-title', 'rebirth-reward', 'buy-cost', 'collection-strip']) {
      observer.observe(document.getElementById(id), { childList: true, subtree: true, attributes: true });
    }
    for (let i = 0; i < 20; i++) {
      ui.renderIncome(state);
      ui.renderRebirth(state);
      ui.renderShop(state, () => {});
      ui.renderAtlas(state);
    }
    const count = observer.takeRecords().length;
    observer.disconnect();
    state.discovered.add(1);
    ui.renderAtlas(state);
    return count;
  });
  expect(mutations).toBe(0);
  await expect(page.locator('#atlas-count')).toHaveText('2 / 197');
  await expect(page.locator('.col-item[data-tier="1"]')).toHaveClass(/discovered/);
});

test('rapid celebrations replay their flash and keep the stronger shake', async ({ page }) => {
  await openGame(page, { slots: [0, ...Array(11).fill(null)] });
  const result = await page.evaluate(async () => {
    const ui = await import('./js/ui.js');
    const fx = await import('./js/fx.js');
    ui.animateSlot(0, 'pop');
    const first = ui.els.slots[0].flashAnimation;
    ui.animateSlot(0, 'pop');
    const second = ui.els.slots[0].flashAnimation;
    fx.shake(.4);
    fx.shake(1);
    return {
      replayed: first !== second, oldState: first.playState,
      duration: second.effect.getTiming().duration,
      strength: document.getElementById('app').style.getPropertyValue('--shake'),
    };
  });
  expect(result).toEqual({ replayed: true, oldState: 'idle', duration: 400, strength: '1' });
  await expect(page.locator('#app')).not.toHaveClass(/shake/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page.evaluate(async () => {
    const ui = await import('./js/ui.js');
    ui.animateSlot(0, 'pop');
    return ui.els.slots[0].animation.effect.getTiming().duration;
  });
  expect(duration).toBe(0);
});

test('atlas scrolling does not invalidate drag geometry but page scrolling does', async ({ page }) => {
  await openGame(page, { slots: [0, 0, ...Array(10).fill(null)] });
  const result = await page.evaluate(() => {
    const from = document.querySelector('.slot[data-idx="0"]');
    const to = document.querySelector('.slot[data-idx="1"]');
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x = a.x + a.width / 2, y = a.y + a.height / 2;
    let reads = 0;
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) {
      if (this.classList.contains('slot')) reads++;
      return rect.apply(this, args);
    };
    const fire = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, button: 0,
    }));
    fire(from, 'pointerdown', x, y);
    fire(document, 'pointermove', x + 16, y);
    for (let i = 0; i < 20; i++) {
      document.getElementById('collection-strip').dispatchEvent(new Event('scroll'));
      fire(document, 'pointermove', x + 16 + i, y);
    }
    const afterAtlas = reads;
    document.dispatchEvent(new Event('scroll'));
    fire(document, 'pointermove', x + 40, y);
    const afterPage = reads;
    fire(document, 'pointerup', b.x + b.width / 2, b.y + b.height / 2 + 60);
    Element.prototype.getBoundingClientRect = rect;
    return { afterAtlas, afterPage, merges: window.__flagMixer.state.merges };
  });
  expect(result).toEqual({ afterAtlas: 12, afterPage: 24, merges: 1 });
});
