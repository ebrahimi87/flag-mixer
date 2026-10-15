// Game controller: loads the save, wires player input to the rules, and plays the effects.
//
//   input (drag.js, buttons) ─► rules (state.js) ─► ui.js redraw + fx.js / sound.js effects
//   setInterval(tick, 100ms) ─► income, lucky crates, panel refresh, autosave
//   requestAnimationFrame(frame) ─► smooth cash counter

import { FLAGS, OFFLINE_CAP_SEC, SAVE_KEY } from './data.js';
import * as rules from './state.js';
import * as ui from './ui.js';
import * as fx from './fx.js';
import { sfx, unlock as unlockAudio, setMuted } from './sound.js';
import { setupBoardInput } from './drag.js';
import { fmt, fmtCompact, fmtDuration } from './format.js';
import { ICONS } from './icons.js';

const storage = window.localStorage;
const { state, offlineSec, offlineCash } = rules.loadState(storage, Date.now());
const els = ui.els;

// Cash already earned but not yet shown: the counter catches up as coins land.
let pendingCash = 0;
let shownCash = state.cash;
let resetting = false;
let lastTick = Date.now();
let saveTimer = 0;
let actionSaveTimer = 0;
let lastInput = Date.now();
let draggingFrom = null;
let lastCoinSound = 0;
const pulseTimers = new Array(state.slots.length).fill(0).map((_, i) => 1.5 + i * 0.33);

// The save time is `lastTick`: the moment up to which income has been paid.
// While the page is hidden that stays at the moment it was hidden, so a reload pays the gap once.
function save() {
  clearTimeout(actionSaveTimer);
  actionSaveTimer = 0;
  if (!resetting) rules.saveState(state, storage, lastTick);
}

// Group rapid actions into one storage write. Hiding or leaving still saves immediately.
function requestSave() {
  if (!actionSaveTimer) actionSaveTimer = setTimeout(save, 250);
}

function refreshPanels() {
  ui.renderIncome(state);
  ui.renderRebirth(state);
  ui.renderShop(state, onUpgradeShopTier);
  ui.renderUpgrades(state, onBuyUpgrade);
}

function slotCenter(i) { return fx.centerOf(els.slots[i].el); }
function slotSize()    { return els.slots[0].el.getBoundingClientRect().width; }

// Coins fly from (x, y) to the cash counter; `amount` is shown as they land.
function payOut(x, y, amount, coins) {
  pendingCash += amount;
  const share = amount / coins;
  fx.coinsTo(x, y, els.cashRow, coins, () => {
    pendingCash = Math.max(0, pendingCash - share);
    ui.bumpCash();
    const now = performance.now();
    if (now - lastCoinSound > 70) { sfx.coin(); lastCoinSound = now; }
  });
}

// ── Buying ───────────────────────────────────────────────────────────────────
function onBuy() {
  unlockAudio();
  const cost = rules.buyCost(state);
  const { x, y } = fx.centerOf(els.buyBtn);
  if (rules.openSlots(state).length === 0) {
    sfx.deny();
    ui.nudge(els.buyBtn);
    fx.floatText(x, y - 40, 'Board full! Merge flags to make room', 'warn');
    return;
  }
  if (state.cash < cost) {
    sfx.deny();
    ui.nudge(els.buyBtn);
    fx.floatText(x, y - 40, `Need ${fmt(cost - state.cash)} more`, 'warn');
    return;
  }
  const idx = rules.buyFlag(state);
  shownCash = Math.min(shownCash, state.cash);
  sfx.buy();
  ui.renderSlots(state);
  ui.animateSlot(idx, 'drop-in');
  const c = slotCenter(idx);
  fx.sparks(c.x, c.y, fx.flagColors(state.slots[idx]), 14, 220);
  afterAction();
}

function onUpgradeShopTier() {
  unlockAudio();
  if (!rules.upgradeBuyTier(state)) return;
  sfx.discover();
  const { x, y } = fx.centerOf(els.buyBtn);
  fx.confetti(x, y, fx.flagColors(state.buyTier), 40, 500);
  ui.showDiscovery(state, state.buyTier);
  afterAction();
}

function onBuyUpgrade(id, card) {
  unlockAudio();
  if (!rules.buyUpgrade(state, id)) { sfx.deny(); ui.nudge(card); return; }
  shownCash = Math.min(shownCash, state.cash);
  sfx.crateOpen();
  const { x, y } = fx.centerOf(card);
  fx.sparks(x, y, ['#ffd34d', '#ffffff', '#4df0b0'], 30, 300);
  fx.ring(x, y, '#ffd34d', 70, 8);
  if (id === 'slots') {
    ui.renderSlots(state);
    ui.layoutBoard();
    for (let i = 10; i < 12; i++) { const c = slotCenter(i); fx.ring(c.x, c.y, '#4df0b0', slotSize() * 0.7); }
  }
  afterAction();
}

// ── Board input ──────────────────────────────────────────────────────────────
function onPickUp(from) {
  unlockAudio();
  draggingFrom = from;
  ui.setHints([]);
  ui.startDragVisual(state, from);
  sfx.pickup();
}

function onDrop(from, to) {
  draggingFrom = null;
  ui.endDragVisual();
  const result = to === null ? null : rules.dropFlag(state, from, to);
  if (!result) { ui.animateSlot(from, 'land'); return; }

  ui.renderSlots(state);
  if (result.kind === 'merge') {
    celebrateMerge(to, result);
  } else {
    sfx.drop();
    ui.animateSlot(to, 'land');
    if (result.kind === 'swap') ui.animateSlot(from, 'land');
  }
  afterAction();
}

function celebrateMerge(idx, result) {
  const { x, y } = slotCenter(idx);
  const size = slotSize();
  const colors = fx.flagColors(result.tier);
  ui.animateSlot(idx, 'pop');
  fx.ring(x, y, '#ffffff', size * 0.8, 12, 0.45);
  fx.sparks(x, y, colors, 26 + Math.min(result.tier, 20) * 2, 260 + size * 2);
  fx.floatText(x, y - size * 0.25, '+' + fmt(result.bonus), 'cash big');
  if (result.chain >= 2) {
    fx.floatText(x, y - size * 0.75, `Combo ×${result.chain}!`, 'combo');
    fx.ring(x, y, '#ff7ad9', size * 1.2, 8, 0.6);
  }
  payOut(x, y, result.bonus, Math.min(4 + result.chain * 2, 14));
  sfx.merge(result.tier, result.chain);
  navigator.vibrate?.(result.isNew ? [18, 40, 28] : 14);

  if (result.isNew) {
    fx.shake(0.8);
    fx.confetti(x, y, colors, 50, 620);
    setTimeout(() => { sfx.discover(); ui.showDiscovery(state, result.tier); }, 220);
  } else if (result.chain >= 3) {
    fx.shake(0.4);
  }
}

function onTap(i) {
  unlockAudio();
  if (state.crate === i) { openCrate(); return; }
  const { x, y } = slotCenter(i);
  if (i >= rules.slotLimit(state)) {
    fx.floatText(x, y, 'Buy the Extra Slots upgrade to unlock', 'info');
    return;
  }
  const tier = state.slots[i];
  if (tier === null) return;
  sfx.tap();
  ui.animateSlot(i, 'wiggle');
  fx.floatText(x, y - slotSize() * 0.6, `${FLAGS[tier].name} · ${fmtCompact(rules.flagIncomeNow(state, tier))}/sec`, 'info');
}

function openCrate() {
  const prize = rules.openCrate(state);
  const { x, y } = slotCenter(prize.idx);
  const size = slotSize();
  sfx.crateOpen();
  fx.ring(x, y, '#ffd34d', size, 14, 0.5);
  fx.confetti(x, y, ['#ff6fa8', '#ffd34d', '#ffffff', '#5cc8ff', '#4df0b0'], 45, 560);
  ui.renderSlots(state);
  if (prize.kind === 'cash') {
    fx.floatText(x, y - size * 0.3, '+' + fmt(prize.amount), 'cash big');
    payOut(x, y, prize.amount, 12);
  } else {
    ui.animateSlot(prize.idx, 'pop');
    fx.floatText(x, y - size * 0.55, `Free ${FLAGS[prize.tier].name}!`, 'combo');
    if (prize.isNew) setTimeout(() => { sfx.discover(); ui.showDiscovery(state, prize.tier); }, 250);
  }
  afterAction();
}

function afterAction() {
  lastInput = Date.now();
  ui.setHints([]);
  refreshPanels();
  ui.renderAtlas(state);
  updateTip();
  requestSave();
}

// ── Rebirth ──────────────────────────────────────────────────────────────────
function onRebirthClick() {
  unlockAudio();
  const p = rules.rebirthProgress(state);
  if (!p || !p.ready) { sfx.deny(); ui.nudge(els.rebirth); return; }
  ui.openModal({
    className: 'confirm',
    html: `
      <div class="modal-icon purple">${ICONS.rebirth}</div>
      <h2>Rebirth?</h2>
      <p>Your board and cash reset. You keep your upgrades, shop level, and Flag Atlas.</p>
      <p class="reward">Income ×${(state.multiplier * p.rb.mult).toFixed(2)} forever<br>+ a free Austria</p>`,
    buttons: [
      { label: 'Not yet', cls: 'ghost' },
      { label: 'Rebirth!', cls: 'purple', onClick: doRebirth },
    ],
  });
}

function doRebirth() {
  if (!rules.doRebirth(state)) return;
  pendingCash = 0;
  shownCash = state.cash;
  sfx.rebirth();
  ui.rebirthFlash(state.multiplier);
  fx.shake(1);
  setTimeout(() => {
    ui.renderSlots(state);
    ui.animateSlot(0, 'drop-in');
    ui.animateSlot(1, 'drop-in');
    const w = window.innerWidth, h = window.innerHeight;
    fx.confetti(w / 2, h * 0.55, ['#a56bff', '#ff5fa2', '#ffd34d', '#5cc8ff', '#ffffff'], 120, 900);
  }, 450);
  ui.renderSlots(state);
  afterAction();
}

// ── Offline earnings ─────────────────────────────────────────────────────────
function welcomeBack(amount, seconds, capped = false) {
  pendingCash += amount;
  let collected = false;
  const collect = () => {
    if (collected) return;
    collected = true;
    pendingCash = Math.max(0, pendingCash - amount);
    const w = window.innerWidth, h = window.innerHeight;
    payOut(w / 2, h / 2, amount, 16);
    sfx.crateOpen();
  };
  ui.openModal({
    className: 'welcome',
    html: `
      <div class="modal-icon gold">${ICONS.coin}</div>
      <h2>Welcome back!</h2>
      <p>While you were away for ${fmtDuration(seconds)}, your flags earned</p>
      <div class="big-cash">${fmt(amount)}</div>
      ${capped ? '<p class="muted">Away earnings stop after 8 hours.</p>' : ''}`,
    buttons: [{ label: 'Collect', cls: 'gold', onClick: collect }],
    onClose: collect,
  });
}

// ── Menu, atlas, sound ───────────────────────────────────────────────────────
function onSound() {
  unlockAudio();
  state.muted = !state.muted;
  setMuted(state.muted);
  ui.renderSound(state);
  if (!state.muted) sfx.tap();
  save();
}

function onAtlas() {
  unlockAudio();
  sfx.tap();
  ui.openModal({ className: 'atlas', html: ui.atlasModalHTML(state) });
}

function onMenu() {
  unlockAudio();
  sfx.tap();
  ui.openModal({
    className: 'menu',
    html: `
      <h2>How to play</h2>
      <ul class="howto">
        <li><b>Buy</b> flags with the green button.</li>
        <li><b>Drag</b> a flag onto its twin to <b>merge</b> them into the next country and earn cash.</li>
        <li>Every flag on the board earns money each second. Higher levels earn more.</li>
        <li>Merge quickly for a <b>combo</b> bonus, and tap <b>lucky crates</b> when they drop.</li>
        <li><b>Rebirth</b> when you meet the goal at the top: income grows forever.</li>
      </ul>
      <p class="muted small">Progress saves on this device. Flag art: flag-icons (MIT license).</p>`,
    buttons: [
      { label: state.muted ? 'Sound: off' : 'Sound: on', cls: 'blue', keepOpen: true,
        onClick: btn => { onSound(); btn.textContent = state.muted ? 'Sound: off' : 'Sound: on'; } },
      { label: 'Reset progress', cls: 'red', onClick: confirmReset },
    ],
  });
}

function confirmReset() {
  ui.openModal({
    className: 'confirm',
    html: `<h2>Start over?</h2><p>This erases all progress on this device: cash, flags, rebirths, and the Flag Atlas.</p>`,
    buttons: [
      { label: 'Keep playing', cls: 'ghost' },
      { label: 'Erase everything', cls: 'red', onClick: () => {
        resetting = true;
        storage.removeItem(SAVE_KEY);
        location.reload();
      } },
    ],
  });
}

// ── Tips and hints ───────────────────────────────────────────────────────────
// The lowest-level pair of matching flags on the board, or null.
function findPair() {
  const limit = rules.slotLimit(state);
  let best = null;
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const t = state.slots[i];
      if (t !== null && t === state.slots[j] && t + 1 < FLAGS.length && (!best || t < state.slots[best[0]])) best = [i, j];
    }
  }
  return best;
}

function updateTip() {
  let text = '';
  if (state.crate !== null && state.merges < 15) text = 'A lucky crate dropped! Tap it to open.';
  else if (state.merges === 0) text = findPair() ? 'Drag a flag onto its twin to merge them!' : `Tap Buy to get another ${FLAGS[state.buyTier].name}.`;
  else if (state.merges < 3) text = 'Each merge makes a new flag and pays cash. Keep going!';
  ui.renderTip(text);
}

// After a few idle seconds, matching pairs wiggle to suggest a merge.
function updateHints() {
  if (draggingFrom !== null || Date.now() - lastInput < 5000) return;
  ui.setHints(findPair() ?? []);
}

// Each flag pops a small "+$" now and then, so the board feels alive.
function incomePulses(dt) {
  if (document.hidden || ui.isModalOpen()) return;
  const limit = rules.slotLimit(state);
  for (let i = 0; i < limit; i++) {
    const tier = state.slots[i];
    if (tier === null || i === draggingFrom) continue;
    pulseTimers[i] -= dt;
    if (pulseTimers[i] > 0) continue;
    pulseTimers[i] = 4;
    const { x, y } = slotCenter(i);
    fx.floatText(x, y - slotSize() * 0.45, '+' + fmtCompact(rules.flagIncomeNow(state, tier) * 4), 'small');
  }
}

// A drop target is an open slot or another flag (merge or swap).
function isDropTarget(from, to) {
  if (to === null || to === from) return false;
  return rules.isSlotOpen(state, to) || (to < rules.slotLimit(state) && state.slots[to] !== null);
}

// While the page is hidden the game clock stops. When it shows again, the next tick pays the
// whole time away as one gap (capped at 8 hours) and shows the welcome-back dialog.
function onVisibility() {
  if (document.hidden) {
    const now = Date.now();
    advance(Math.min((now - lastTick) / 1000, OFFLINE_CAP_SEC));
    lastTick = now;
    save();
  } else {
    tick();
  }
}

// ── Loops ────────────────────────────────────────────────────────────────────
// Pays income for `dt` seconds and shows a lucky crate if one drops.
function advance(dt) {
  const crateIdx = rules.tick(state, dt);
  if (crateIdx !== null) {
    ui.renderSlots(state);
    ui.animateSlot(crateIdx, 'crate-drop');
    sfx.crateDrop();
    updateTip();
  }
}

function tick() {
  if (document.hidden) return; // time away is paid in one capped gap when the page shows again
  const now = Date.now();
  const dt = Math.min((now - lastTick) / 1000, OFFLINE_CAP_SEC);
  lastTick = now;
  const before = state.cash;
  advance(dt);
  // A long gap while visible means the device slept or the page was suspended.
  if (dt >= 60) welcomeBack(state.cash - before, dt, dt >= OFFLINE_CAP_SEC);
  incomePulses(Math.min(dt, 1));
  updateHints();
  refreshPanels();

  saveTimer += dt;
  if (saveTimer >= 10) { saveTimer = 0; save(); }
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  const target = Math.max(0, state.cash - pendingCash);
  shownCash += (target - shownCash) * (1 - Math.exp(-dt * 10));
  if (Math.abs(target - shownCash) < 0.005) shownCash = target;
  ui.renderCash(shownCash);
  requestAnimationFrame(frame);
}

// ── Start ────────────────────────────────────────────────────────────────────
function init() {
  ui.buildStatic();
  ui.buildBoard();
  ui.buildAtlasStrip();
  ui.renderSlots(state);
  ui.renderSound(state);
  setMuted(state.muted);
  refreshPanels();
  ui.renderAtlas(state);
  updateTip();
  ui.layoutBoard();
  fx.resizeFx();
  state.slots.forEach(t => { if (t !== null) fx.flagColors(t); });

  setupBoardInput({
    slotEls: els.slots.map(s => s.el),
    ghost: els.ghost,
    canDrag: i => i < rules.slotLimit(state) && state.slots[i] !== null && state.crate !== i,
    onPickUp,
    onHover: (from, to) => ui.hoverDragVisual(isDropTarget(from, to) ? to : null),
    onDrop,
    onTap,
    onCancel: () => { draggingFrom = null; ui.endDragVisual(); },
  });

  els.buyBtn.addEventListener('click', onBuy);
  els.rebirthBtn.addEventListener('click', onRebirthClick);
  els.soundBtn.addEventListener('click', onSound);
  els.menuBtn.addEventListener('click', onMenu);
  els.atlasBtn.addEventListener('click', onAtlas);
  els.strip.addEventListener('click', onAtlas);
  document.addEventListener('pointerdown', () => { lastInput = Date.now(); ui.setHints([]); unlockAudio(); }, { capture: true });
  // Safari and Chrome only allow sound to start on a finished tap, so try again on lift.
  document.addEventListener('pointerup', unlockAudio, { capture: true });

  new ResizeObserver(() => ui.layoutBoard()).observe(els.trayArea);
  window.addEventListener('resize', fx.resizeFx);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', save);

  if (offlineSec >= 60 && offlineCash > 0) {
    shownCash = state.cash - offlineCash;
    welcomeBack(offlineCash, offlineSec, offlineSec >= OFFLINE_CAP_SEC);
  }

  setInterval(tick, 100);
  requestAnimationFrame(frame);

  // Test hook: lets the browser tests read and drive the game state.
  if (new URLSearchParams(location.search).has('test')) window.__flagMixer = { state, rules, save, tick };
}

init();
