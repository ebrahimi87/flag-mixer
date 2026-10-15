import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAGS, REBIRTHS, UPGRADES, flagIncome, flagMergeBonus, AUSTRIA_TIER, SAVE_KEY,
  COMBO_MAX_STEPS, CRATE_CASH_MIN,
} from '../../js/data.js';
import * as rules from '../../js/state.js';
import { fmt, fmtCompact } from '../../js/format.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) };
}

// Returns the given numbers in order, like Math.random but predictable.
function sequence(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('economy formulas and tables match the original game', () => {
  assert.equal(flagIncome(0), 2);
  assert.equal(flagIncome(3), 2 * 2.5 ** 3);
  assert.equal(flagMergeBonus(0), 80);
  assert.equal(flagMergeBonus(5), 80 * 2.2 ** 5);
  assert.equal(REBIRTHS.length, FLAGS.length - 2);
  assert.deepEqual(REBIRTHS[0], { flagTier: 2, flagCount: 5, cash: 1_000_000, mult: 1.5 });
  assert.equal(REBIRTHS[3].cash, 1_000_000 * 125);
  assert.deepEqual(REBIRTHS.slice(0, 12).map(r => r.flagCount), [5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7]);
  assert.equal(REBIRTHS[100].flagCount, 7);
  assert.deepEqual(UPGRADES.map(u => [u.id, u.cost, u.requires]), [
    ['merge1', 500, null], ['merge2', 6_000, 'merge1'], ['income1', 2_000, null],
    ['income2', 30_000, 'income1'], ['slots', 50_000, null],
  ]);
});

test('flag ladder keeps the original 197 countries in order', () => {
  assert.equal(FLAGS.length, 197);
  assert.equal(FLAGS[0].name, 'Afghanistan');
  assert.equal(FLAGS[2].name, 'Algeria');
  assert.equal(FLAGS[AUSTRIA_TIER].name, 'Austria');
  assert.equal(FLAGS.at(-1).name, 'Zimbabwe');
  assert.equal(new Set(FLAGS.map(f => f.code)).size, 197);
});

test('a new game starts like the original', () => {
  const s = rules.newState();
  assert.equal(s.cash, 100);
  assert.equal(s.slots.length, 12);
  assert.equal(s.slots[0], 0);
  assert.equal(rules.slotLimit(s), 10);
  assert.equal(rules.incomePerSec(s), 2);
  assert.equal(rules.buyCost(s), 100);
});

test('buying fills the first open slot and skips the crate slot', () => {
  const s = rules.newState();
  s.crate = 1;
  assert.equal(rules.buyFlag(s), 2);
  assert.equal(s.cash, 0);
  assert.equal(rules.buyFlag(s), -1, 'cannot afford');
  s.cash = 1e9;
  for (let i = 0; i < 7; i++) rules.buyFlag(s);
  assert.equal(rules.buyFlag(s), -1, 'board full (slot 1 holds the crate)');
});

test('dropping moves, swaps, or merges', () => {
  const s = rules.newState();
  s.slots = [0, null, 3, 3, 196, 196, null, null, null, null, 5, null];
  assert.deepEqual(rules.dropFlag(s, 0, 1), { kind: 'move' });
  assert.deepEqual(s.slots.slice(0, 2), [null, 0]);
  assert.deepEqual(rules.dropFlag(s, 1, 2), { kind: 'swap' });
  assert.deepEqual(s.slots.slice(1, 3), [3, 0]);
  assert.equal(rules.dropFlag(s, 4, 5), null, 'the last flag cannot merge');
  assert.equal(rules.dropFlag(s, 1, 10), null, 'slot 10 is locked without the upgrade');
  s.crate = 6;
  assert.equal(rules.dropFlag(s, 1, 6), null, 'cannot drop onto a crate');

  const cash = s.cash;
  const result = rules.dropFlag(s, 1, 3);
  assert.equal(result.kind, 'merge');
  assert.equal(result.tier, 4);
  assert.equal(result.isNew, true);
  assert.equal(s.slots[1], null);
  assert.equal(s.slots[3], 4);
  assert.equal(s.cash - cash, flagMergeBonus(3));
  assert.ok(s.discovered.has(4));
  assert.equal(s.merges, 1);
});

test('merge cash stacks upgrades, the rebirth multiplier, and combos', () => {
  const s = rules.newState();
  s.upgrades = { merge1: 1, merge2: 1 };
  s.multiplier = 2.25;
  assert.equal(rules.mergeBonus(s, 4), flagMergeBonus(4) * 1.5 * 2.25);
  assert.equal(rules.mergeBonus(s, 4, 2), flagMergeBonus(4) * 1.5 * 2.25 * 1.2);
  s.upgrades.income1 = 1;
  assert.equal(rules.incomePerSec(s), 2 * 1.2 * 2.25);
});

test('combo grows for quick merges, caps, and resets after a pause', () => {
  const s = rules.newState();
  s.slots = new Array(12).fill(0);
  const chains = [];
  for (let i = 0; i < 5; i++) {
    chains.push(rules.dropFlag(s, i * 2, i * 2 + 1).chain);
    rules.tick(s, 1);
  }
  assert.deepEqual(chains, [1, 2, 3, 4, 5]);
  s.slots = new Array(12).fill(0);
  for (let i = 0; i < 4; i++) rules.dropFlag(s, i * 2, i * 2 + 1);
  assert.equal(s.combo, COMBO_MAX_STEPS);
  rules.tick(s, 10);
  s.slots[0] = 0; s.slots[2] = 0;
  assert.equal(rules.dropFlag(s, 0, 2).chain, 1);
});

test('rebirth needs the flags and the cash, then resets like the original', () => {
  const s = rules.newState();
  s.slots = [2, 2, 2, 2, 2, null, null, null, null, null, null, null];
  s.cash = 999_999;
  s.upgrades = { income1: 1 };
  s.buyTier = 0;
  assert.equal(rules.doRebirth(s), false);
  s.cash = 1_000_000;
  assert.equal(rules.doRebirth(s), true);
  assert.equal(s.rebirths, 1);
  assert.equal(s.multiplier, 1.5);
  assert.equal(s.cash, 100);
  assert.deepEqual(s.slots, [0, AUSTRIA_TIER, null, null, null, null, null, null, null, null, null, null]);
  assert.deepEqual(s.upgrades, { income1: 1 }, 'upgrades are kept');
  assert.ok(s.discovered.has(AUSTRIA_TIER));
  assert.equal(rules.rebirthProgress(s).rb.flagTier, 3);
});

test('shop tier unlocks every 3 rebirths', () => {
  const s = rules.newState();
  s.rebirths = 2;
  assert.equal(rules.upgradeBuyTier(s), false);
  s.rebirths = 3;
  assert.equal(rules.upgradeBuyTier(s), true);
  assert.equal(s.buyTier, 1);
  assert.equal(rules.buyCost(s), 500);
});

test('an original-format save loads, with offline income capped at 8 hours', () => {
  const now = Date.UTC(2026, 9, 15, 12);
  const original = {
    cash: 5000, slots: [3, 3, null, 1, null, null, null, null, null, null, null, null],
    rebirths: 1, multiplier: 1.5, discovered: [0, 1, 2, 3, 9], upgrades: { income1: 1 }, buyTier: 0,
    lastSave: now - 10 * 3600 * 1000,
  };
  const { state, offlineSec, offlineCash } = rules.loadState(memoryStorage({ [SAVE_KEY]: JSON.stringify(original) }), now);
  const income = (2 * flagIncome(3) + flagIncome(1)) * 1.2 * 1.5;
  assert.equal(offlineSec, 8 * 3600);
  assert.ok(Math.abs(offlineCash - income * 8 * 3600) < 1e-6);
  assert.ok(Math.abs(state.cash - (5000 + offlineCash)) < 1e-6);
  assert.deepEqual(state.slots, original.slots);
  assert.equal(state.multiplier, 1.5);
  assert.deepEqual([...state.discovered], [0, 1, 2, 3, 9]);
  assert.equal(state.crate, null);
  assert.equal(state.muted, false);
});

test('saving and loading keeps the new fields', () => {
  const storage = memoryStorage();
  const s = rules.newState();
  s.crate = 4; s.muted = true; s.merges = 7;
  rules.saveState(s, storage, 1000);
  const { state, offlineCash } = rules.loadState(storage, 1000);
  assert.equal(state.crate, 4);
  assert.equal(state.muted, true);
  assert.equal(state.merges, 7);
  assert.equal(offlineCash, 0);
});

test('a broken save starts a fresh game', () => {
  const { state } = rules.loadState(memoryStorage({ [SAVE_KEY]: '{not json' }), 0);
  assert.equal(state.cash, 100);
});

test('lucky crate drops into an open slot after the delay and opens into a prize', () => {
  const s = rules.newState();
  assert.equal(rules.tick(s, 10, sequence(0)), null, 'too early');
  const idx = rules.tick(s, 40, sequence(0.99));
  assert.equal(idx, 9, 'last open slot');
  assert.equal(rules.tick(s, 500, sequence(0)), null, 'only one crate at a time');

  s.buyTier = 0;
  const prize = rules.openCrate(s, sequence(0.5, 0.7)); // 0.7 lands in the "+1 tier" band
  assert.deepEqual(prize, { idx: 9, kind: 'flag', tier: 1, isNew: true });
  assert.equal(s.slots[9], 1);
  assert.equal(s.crate, null);
  assert.ok(s.nextCrateAt >= s.clock + 75 && s.nextCrateAt <= s.clock + 120);
});

test('crate prize bands follow the configured odds', () => {
  const prizeFor = roll => {
    const s = rules.newState();
    s.crate = 3;
    return rules.openCrate(s, sequence(0, roll));
  };
  assert.equal(prizeFor(0.10).tier, 0);
  assert.equal(prizeFor(0.65).tier, 1);
  assert.equal(prizeFor(0.82).tier, 2);
  const cash = prizeFor(0.90);
  assert.equal(cash.kind, 'cash');
  assert.equal(cash.amount, CRATE_CASH_MIN);
});

test('a full board delays the crate until a slot opens', () => {
  const s = rules.newState();
  s.slots = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, null, null];
  assert.equal(rules.tick(s, 60, sequence(0)), null);
  s.slots[4] = null;
  assert.equal(rules.tick(s, 0.1, sequence(0)), 4);
});

test('money formatting', () => {
  assert.equal(fmt(105.8), '$105.80');
  assert.equal(fmt(1000), '$1.00K');
  assert.equal(fmt(999_999), '$1.00M');
  assert.equal(fmt(2.5e9), '$2.50B');
  assert.equal(fmt(1e15), '$1.00Qa');
  assert.equal(fmt(1e40), '$1.00e40');
  assert.equal(fmt(-5), '$0.00');
  assert.equal(fmtCompact(1_000_000), '$1M');
  assert.equal(fmtCompact(1250), '$1.2K');
  assert.equal(fmtCompact(42.7), '$43');
});
