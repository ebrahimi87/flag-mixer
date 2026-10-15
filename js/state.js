// Game rules: the state object, saving and loading, and every player action.
// Nothing here touches the page, so the tests run these functions directly in Node.
// Times use `state.clock`: seconds of play since the page loaded, advanced by tick().

import {
  FLAGS, REBIRTHS, UPGRADES, flagIncome, flagMergeBonus,
  SLOT_COUNT_BASE, SLOT_COUNT_MAX, START_CASH, AUSTRIA_TIER, OFFLINE_CAP_SEC, SAVE_KEY,
  COMBO_WINDOW_SEC, COMBO_STEP, COMBO_MAX_STEPS,
  CRATE_FIRST_DELAY_SEC, CRATE_DELAY_MIN_SEC, CRATE_DELAY_MAX_SEC,
  CRATE_CASH_SECONDS, CRATE_CASH_MIN, CRATE_PRIZES,
} from './data.js';

export function newState() {
  const slots = new Array(SLOT_COUNT_MAX).fill(null);
  slots[0] = 0; // start with one Afghanistan
  return {
    cash:       START_CASH,
    slots,
    rebirths:   0,
    multiplier: 1,
    discovered: new Set([0]),
    upgrades:   {},
    buyTier:    0,
    muted:      false,
    crate:      null,  // index of the slot that holds a lucky crate, or null
    merges:     0,     // merges ever made; used to retire the beginner tips
    // Session-only fields (not saved)
    clock:       0,
    combo:       0,    // merges chained so far in the current combo (0 = no chain yet)
    comboUntil:  -1,
    nextCrateAt: CRATE_FIRST_DELAY_SEC,
  };
}

// ── Persistence ──────────────────────────────────────────────────────────────
// The save format extends the original 'flagMixer_v1' save, so older saves still load.
export function saveState(state, storage, nowMs) {
  const data = {
    cash:       state.cash,
    slots:      state.slots,
    rebirths:   state.rebirths,
    multiplier: state.multiplier,
    discovered: [...state.discovered],
    upgrades:   state.upgrades,
    buyTier:    state.buyTier,
    muted:      state.muted,
    crate:      state.crate,
    merges:     state.merges,
    lastSave:   nowMs,
  };
  try { storage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (_) {}
}

// Returns the state plus the cash earned while the game was closed (capped at 8 hours).
export function loadState(storage, nowMs) {
  const state = newState();
  let raw = null;
  try { raw = storage.getItem(SAVE_KEY); } catch (_) {}
  if (!raw) return { state, offlineSec: 0, offlineCash: 0 };

  let d;
  try { d = JSON.parse(raw); } catch (e) {
    console.warn('Save load failed, starting fresh.', e);
    return { state, offlineSec: 0, offlineCash: 0 };
  }
  state.cash       = d.cash       ?? START_CASH;
  state.slots      = d.slots      ?? new Array(SLOT_COUNT_MAX).fill(null);
  state.rebirths   = d.rebirths   ?? 0;
  state.multiplier = d.multiplier ?? 1;
  state.discovered = new Set(d.discovered ?? [0]);
  state.upgrades   = d.upgrades   ?? {};
  state.buyTier    = d.buyTier    ?? 0;
  state.muted      = d.muted      ?? false;
  state.merges     = d.merges     ?? 0;
  while (state.slots.length < SLOT_COUNT_MAX) state.slots.push(null);
  state.crate = Number.isInteger(d.crate) && isSlotOpenIgnoringCrate(state, d.crate) ? d.crate : null;

  const offlineSec  = Math.min(Math.max((nowMs - (d.lastSave ?? nowMs)) / 1000, 0), OFFLINE_CAP_SEC);
  const offlineCash = incomePerSec(state) * offlineSec;
  state.cash += offlineCash;
  return { state, offlineSec, offlineCash };
}

// ── Calculations ─────────────────────────────────────────────────────────────
export function upgradeLevel(state, id) { return state.upgrades[id] ?? 0; }
export function slotLimit(state)        { return upgradeLevel(state, 'slots') ? SLOT_COUNT_MAX : SLOT_COUNT_BASE; }

export function incomePerSec(state) {
  let base = 0;
  const limit = slotLimit(state);
  for (let i = 0; i < limit; i++) {
    if (state.slots[i] !== null) base += flagIncome(state.slots[i]);
  }
  const incomeMult = 1 + 0.20 * (upgradeLevel(state, 'income1') + upgradeLevel(state, 'income2'));
  return base * incomeMult * state.multiplier;
}

// Income of one flag on the board, with upgrades and the rebirth multiplier.
export function flagIncomeNow(state, tier) {
  const incomeMult = 1 + 0.20 * (upgradeLevel(state, 'income1') + upgradeLevel(state, 'income2'));
  return flagIncome(tier) * incomeMult * state.multiplier;
}

export function mergeBonus(state, tier, comboSteps = 0) {
  const mergeMult = 1 + 0.25 * (upgradeLevel(state, 'merge1') + upgradeLevel(state, 'merge2'));
  return flagMergeBonus(tier) * mergeMult * state.multiplier * (1 + COMBO_STEP * comboSteps);
}

export function buyCost(state)          { return 100 * Math.pow(5, state.buyTier); }
export function canUpgradeBuyTier(state) { return state.rebirths >= 3 * (state.buyTier + 1) && state.buyTier + 1 < FLAGS.length; }

function isSlotOpenIgnoringCrate(state, i) { return i >= 0 && i < slotLimit(state) && state.slots[i] === null; }
export function isSlotOpen(state, i)    { return isSlotOpenIgnoringCrate(state, i) && state.crate !== i; }

export function openSlots(state) {
  const open = [];
  for (let i = 0; i < slotLimit(state); i++) if (isSlotOpen(state, i)) open.push(i);
  return open;
}

export function rebirthProgress(state) {
  const rb = REBIRTHS[state.rebirths];
  if (!rb) return null;
  let flagCount = 0;
  for (let i = 0; i < slotLimit(state); i++) {
    if (state.slots[i] === rb.flagTier) flagCount++;
  }
  const hasFlags = flagCount >= rb.flagCount;
  const hasCash  = state.cash >= rb.cash;
  return { rb, flagCount, hasFlags, hasCash, ready: hasFlags && hasCash };
}

// ── Time ─────────────────────────────────────────────────────────────────────
// Advances the clock and pays income. Returns the slot where a lucky crate dropped, or null.
export function tick(state, dt, random = Math.random) {
  state.clock += dt;
  state.cash  += incomePerSec(state) * dt;

  if (state.crate === null && state.clock >= state.nextCrateAt) {
    const open = openSlots(state);
    if (open.length > 0) {
      state.crate = open[Math.floor(random() * open.length)];
      return state.crate;
    }
  }
  return null;
}

// ── Actions ──────────────────────────────────────────────────────────────────
// Returns the slot the new flag went into, or -1 when the player cannot buy.
export function buyFlag(state) {
  const cost = buyCost(state);
  if (state.cash < cost) return -1;
  const open = openSlots(state);
  if (open.length === 0) return -1;

  state.cash -= cost;
  state.slots[open[0]] = state.buyTier;
  state.discovered.add(state.buyTier);
  return open[0];
}

// Drops the flag from slot `from` onto slot `to`.
// Returns what happened: null (nothing), { kind: 'move' }, { kind: 'swap' },
// or { kind: 'merge', tier, bonus, chain, isNew } where `tier` is the new flag.
export function dropFlag(state, from, to) {
  const limit = slotLimit(state);
  if (from === to || to < 0 || to >= limit || from >= limit) return null;
  if (state.crate === to) return null;
  const fromTier = state.slots[from];
  const toTier   = state.slots[to];
  if (fromTier === null) return null;

  if (toTier === null) {
    state.slots[to]   = fromTier;
    state.slots[from] = null;
    return { kind: 'move' };
  }
  if (fromTier !== toTier) {
    state.slots[to]   = fromTier;
    state.slots[from] = toTier;
    return { kind: 'swap' };
  }
  if (fromTier + 1 >= FLAGS.length) return null;

  state.combo      = state.clock <= state.comboUntil ? Math.min(state.combo + 1, COMBO_MAX_STEPS) : 0;
  state.comboUntil = state.clock + COMBO_WINDOW_SEC;

  const tier  = fromTier + 1;
  const bonus = mergeBonus(state, fromTier, state.combo);
  const isNew = !state.discovered.has(tier);
  state.slots[from] = null;
  state.slots[to]   = tier;
  state.cash       += bonus;
  state.discovered.add(tier);
  state.merges++;
  return { kind: 'merge', tier, bonus, chain: state.combo + 1, isNew };
}

export function buyUpgrade(state, id) {
  const upg = UPGRADES.find(u => u.id === id);
  if (!upg) return false;
  if (upgradeLevel(state, id) >= 1) return false;
  if (upg.requires && !upgradeLevel(state, upg.requires)) return false;
  if (state.cash < upg.cost) return false;

  state.cash -= upg.cost;
  state.upgrades[id] = 1;
  return true;
}

export function upgradeBuyTier(state) {
  if (!canUpgradeBuyTier(state)) return false;
  state.buyTier++;
  state.discovered.add(state.buyTier);
  return true;
}

export function doRebirth(state) {
  const progress = rebirthProgress(state);
  if (!progress || !progress.ready) return false;

  state.multiplier *= progress.rb.mult;
  state.rebirths++;
  state.cash  = START_CASH;
  state.slots = new Array(SLOT_COUNT_MAX).fill(null);
  state.slots[0] = 0;            // free Afghanistan
  state.slots[1] = AUSTRIA_TIER; // free Austria
  state.discovered.add(AUSTRIA_TIER);
  state.crate       = null;
  state.combo       = 0;
  state.comboUntil  = -1;
  state.nextCrateAt = state.clock + CRATE_FIRST_DELAY_SEC;
  return true;
}

// Opens the lucky crate. Returns { idx, kind: 'flag', tier, isNew } or { idx, kind: 'cash', amount }.
export function openCrate(state, random = Math.random) {
  const idx = state.crate;
  if (idx === null) return null;
  state.crate = null;
  state.nextCrateAt = state.clock + CRATE_DELAY_MIN_SEC + random() * (CRATE_DELAY_MAX_SEC - CRATE_DELAY_MIN_SEC);

  let roll = random();
  const prize = CRATE_PRIZES.find(p => (roll -= p.chance) < 0) ?? CRATE_PRIZES[0];
  if (prize.kind === 'cash') {
    const amount = Math.max(CRATE_CASH_MIN, incomePerSec(state) * CRATE_CASH_SECONDS);
    state.cash += amount;
    return { idx, kind: 'cash', amount };
  }
  const tier  = Math.min(state.buyTier + prize.tierBoost, FLAGS.length - 1);
  const isNew = !state.discovered.has(tier);
  state.slots[idx] = tier;
  state.discovered.add(tier);
  return { idx, kind: 'flag', tier, isNew };
}
