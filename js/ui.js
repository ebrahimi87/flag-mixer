// Page rendering: builds the board, panels, and dialogs once, then refreshes them from the state.
// This module only draws; main.js decides what happens when the player acts.

import { FLAGS, UPGRADES, RARITIES, SLOT_COUNT_MAX, flagSquare, flagWide, rarityIndex } from './data.js';
import * as rules from './state.js';
import { fmt, fmtCompact } from './format.js';
import { ICONS } from './icons.js';

const $ = id => document.getElementById(id);

export const els = {
  app:          $('app'),
  board:        $('board'),
  trayArea:     $('tray-area'),
  grid:         $('slots-grid'),
  tip:          $('tip'),
  cashRow:      $('cash-row'),
  cash:         $('cash-display'),
  income:       $('income-display'),
  multiplier:   $('multiplier-badge'),
  rebirth:      $('rebirth'),
  rebirthTitle: $('rebirth-title'),
  rebirthReward:$('rebirth-reward'),
  reqFlagImg:   $('req-flag-img'),
  reqFlags:     $('req-flags'),
  reqCash:      $('req-cash'),
  rebirthBtn:   $('rebirth-btn'),
  soundBtn:     $('sound-btn'),
  menuBtn:      $('menu-btn'),
  buyBtn:       $('buy-btn'),
  buyMedalImg:  $('buy-medal').querySelector('img'),
  buyName:      $('buy-name'),
  buyCost:      $('buy-cost'),
  buyTierUp:    $('buy-tier-upgrade'),
  upgradesList: $('upgrades-list'),
  atlasCount:   $('atlas-count'),
  atlasFill:    document.querySelector('#atlas .atlas-head .fill'),
  atlasBtn:     $('atlas-btn'),
  strip:        $('collection-strip'),
  ghost:        $('drag-ghost'),
  banner:       $('banner'),
  modalRoot:    $('modal-root'),
  slots:        [],   // per slot: { el, medal, img, chip, name }
};

export function lvl(tier) { return tier + 1; } // players see Lv 1 for Afghanistan

// ── Static decoration ────────────────────────────────────────────────────────
export function buildStatic() {
  document.querySelectorAll('.coin-icon').forEach(el => { el.innerHTML = ICONS.coin; });
  document.querySelector('.logo-globe').innerHTML = ICONS.globe;
  els.rebirthBtn.querySelector('.icon').innerHTML = ICONS.rebirth;
  els.menuBtn.innerHTML = ICONS.menu;
}

// ── Medals: a flag inside a rim whose color shows the tier band ──────────────
function medalMarkup() {
  return `<div class="rim"></div><div class="face"><img alt="" draggable="false"><div class="sheen"></div><div class="gloss"></div></div><div class="tier-chip"></div>`;
}

function styleMedal(medal, tier) {
  const r = rarityIndex(tier);
  const rarity = RARITIES[r];
  medal.dataset.rarity = r;
  medal.classList.toggle('rainbow', !rarity.rim);
  medal.classList.toggle('sparkly', r >= 7);
  if (rarity.rim) {
    medal.style.setProperty('--rim-a', rarity.rim[0]);
    medal.style.setProperty('--rim-b', rarity.rim[1]);
  }
  medal.style.setProperty('--glow', r >= 2 ? (rarity.rim ? rarity.rim[0] + '88' : '#ffffffaa') : 'transparent');
}

export function medalHTML(tier) {
  const div = document.createElement('div');
  div.className = 'medal';
  div.innerHTML = medalMarkup();
  styleMedal(div, tier);
  div.querySelector('img').src = flagSquare(tier);
  div.querySelector('.tier-chip').textContent = lvl(tier);
  return div;
}

// ── Board ────────────────────────────────────────────────────────────────────
export function buildBoard() {
  els.grid.innerHTML = '';
  els.slots = [];
  for (let i = 0; i < SLOT_COUNT_MAX; i++) {
    const el = document.createElement('div');
    el.className = 'slot empty';
    el.dataset.idx = i;
    el.innerHTML = `
      <div class="socket"></div>
      <div class="medal" style="--delay:${(-i * 0.37).toFixed(2)}s">${medalMarkup()}</div>
      <div class="slot-name"></div>
      <div class="crate">${ICONS.crate}<span>Tap!</span></div>
      <div class="lock">${ICONS.lock}<span>Extra Slots</span></div>`;
    els.grid.appendChild(el);
    els.slots.push({
      el,
      medal: el.querySelector('.medal'),
      img:   el.querySelector('.medal img'),
      chip:  el.querySelector('.tier-chip'),
      name:  el.querySelector('.slot-name'),
      tier:  null,
    });
  }
}

export function renderSlots(state) {
  const limit = rules.slotLimit(state);
  els.slots.forEach((s, i) => {
    const locked = i >= limit;
    const crate  = state.crate === i;
    const tier   = locked || crate ? null : state.slots[i];
    s.el.classList.toggle('locked', locked);
    s.el.classList.toggle('crate-slot', crate);
    s.el.classList.toggle('filled', tier !== null);
    s.el.classList.toggle('empty', !locked && !crate && tier === null);
    if (tier !== null && tier !== s.tier) {
      s.img.src = flagSquare(tier);
      s.chip.textContent = lvl(tier);
      s.name.textContent = FLAGS[tier].name;
      styleMedal(s.medal, tier);
    }
    s.tier = tier;
    s.el.setAttribute('aria-label', tier !== null ? `${FLAGS[tier].name}, level ${lvl(tier)}` : crate ? 'Lucky crate' : locked ? 'Locked slot' : 'Empty slot');
  });
}

// Plays a one-shot CSS animation class on a slot's medal (or crate).
export function animateSlot(i, name) {
  const target = name.startsWith('crate') ? els.slots[i].el.querySelector('.crate') : els.slots[i].medal;
  target.classList.remove(name);
  void target.offsetWidth;
  target.classList.add(name);
  target.addEventListener('animationend', () => target.classList.remove(name), { once: true });
}

// Picks the column count that gives the biggest slots for the space available.
export function layoutBoard() {
  const w = els.trayArea.clientWidth;
  const h = els.trayArea.clientHeight;
  let best = { size: 0, cols: 6 };
  for (const cols of [6, 4, 3]) {
    const rows = Math.ceil(SLOT_COUNT_MAX / cols);
    const byWidth  = w / (cols + (cols - 1) * 0.2 + 0.5);
    const byHeight = h / (rows + (rows - 1) * 0.3 + 0.5);
    const size = Math.min(byWidth, byHeight, 150);
    if (size > best.size + 4) best = { size, cols };
  }
  const size = Math.max(54, Math.floor(best.size));
  const style = els.grid.style;
  style.setProperty('--cols', best.cols);
  style.setProperty('--slot-size', size + 'px');
  style.setProperty('--gap-x', Math.round(size * 0.2) + 'px');
  style.setProperty('--gap-y', Math.round(size * 0.3) + 'px');
  style.setProperty('--pad', Math.round(size * 0.25) + 'px');
  els.ghost.style.setProperty('--slot-size', size + 'px');
}

// ── Drag visuals ─────────────────────────────────────────────────────────────
export function startDragVisual(state, from) {
  const tier = state.slots[from];
  els.ghost.innerHTML = '';
  els.ghost.appendChild(medalHTML(tier));
  els.ghost.style.display = 'block';
  els.slots[from].el.classList.add('dragging');
  els.slots.forEach((s, i) => {
    if (i === from) return;
    if (state.slots[i] === tier && s.tier === tier) s.el.classList.add('match');
    else if (rules.isSlotOpen(state, i)) s.el.classList.add('can-drop');
  });
}

export function hoverDragVisual(target) {
  els.slots.forEach((s, i) => s.el.classList.toggle('drag-over', i === target));
}

export function endDragVisual() {
  els.ghost.style.display = 'none';
  els.slots.forEach(s => s.el.classList.remove('dragging', 'match', 'can-drop', 'drag-over'));
}

export function setHints(indices) {
  els.slots.forEach((s, i) => s.el.classList.toggle('hint', indices.includes(i)));
}

// ── Header ───────────────────────────────────────────────────────────────────
let shownCashText = '';
export function renderCash(value) {
  const text = fmt(value);
  if (text !== shownCashText) { els.cash.textContent = text; shownCashText = text; }
}

export function bumpCash() {
  els.cashRow.classList.remove('bump');
  void els.cashRow.offsetWidth;
  els.cashRow.classList.add('bump');
}

export function renderIncome(state) {
  els.income.textContent = '+' + fmt(rules.incomePerSec(state)) + '/sec';
  els.multiplier.textContent = state.multiplier > 1 ? '×' + state.multiplier.toFixed(2) : '';
}

export function renderSound(state) {
  els.soundBtn.innerHTML = state.muted ? ICONS.soundOff : ICONS.soundOn;
  els.soundBtn.classList.toggle('off', state.muted);
}

let rebirthFlagTier = null;
export function renderRebirth(state) {
  const p = rules.rebirthProgress(state);
  if (!p) {
    els.rebirthTitle.textContent = 'All rebirths done!';
    els.rebirthReward.textContent = '×' + state.multiplier.toFixed(2);
    els.rebirth.classList.add('complete');
    els.rebirthBtn.disabled = true;
    return;
  }
  const { rb, flagCount, hasFlags, hasCash, ready } = p;
  els.rebirthTitle.textContent = `Rebirth ${state.rebirths + 1}`;
  els.rebirthReward.textContent = `×${rb.mult} income + free Austria`;
  if (rebirthFlagTier !== rb.flagTier) {
    els.reqFlagImg.src = flagSquare(rb.flagTier);
    rebirthFlagTier = rb.flagTier;
  }
  setBar(els.reqFlags, Math.min(1, flagCount / rb.flagCount), hasFlags,
    `${Math.min(flagCount, rb.flagCount)}/${rb.flagCount} × ${FLAGS[rb.flagTier].name}`);
  setBar(els.reqCash, Math.min(1, state.cash / rb.cash), hasCash,
    `${fmtCompact(Math.min(state.cash, rb.cash))} / ${fmtCompact(rb.cash)}`);
  els.rebirthBtn.disabled = !ready;
  els.rebirth.classList.toggle('ready', ready);
}

function setBar(container, fraction, done, text) {
  const fill = container.querySelector('.fill');
  fill.style.width = (fraction * 100).toFixed(1) + '%';
  fill.classList.toggle('done', done);
  const label = container.querySelector('.bar-text');
  if (label.textContent !== text) label.textContent = text;
}

// ── Shop ─────────────────────────────────────────────────────────────────────
let shopTier = null;
let shopUpgradeKey = '';
export function renderShop(state, onUpgradeTier) {
  const cost = rules.buyCost(state);
  const full = rules.openSlots(state).length === 0;
  if (shopTier !== state.buyTier) {
    els.buyMedalImg.src = flagSquare(state.buyTier);
    els.buyName.textContent = 'Buy ' + FLAGS[state.buyTier].name;
    shopTier = state.buyTier;
  }
  els.buyCost.textContent = full ? 'Board full' : fmt(cost);
  els.buyBtn.classList.toggle('cant-afford', state.cash < cost);
  els.buyBtn.classList.toggle('full', full);

  // The shop-tier upgrade only re-renders when what it shows changes.
  const canUp = rules.canUpgradeBuyTier(state);
  const key = `${state.buyTier}:${canUp}`;
  if (key === shopUpgradeKey) return;
  shopUpgradeKey = key;
  const next = FLAGS[state.buyTier + 1];
  if (canUp) {
    els.buyTierUp.innerHTML = `
      <button class="btn-candy purple shop-up">
        <span class="icon">${ICONS.up}</span>
        <span><b>Upgrade shop</b><small>Buy ${next.name} instead · ${fmt(cost * 5)}/flag</small></span>
      </button>`;
    els.buyTierUp.querySelector('button').addEventListener('click', onUpgradeTier);
  } else if (next) {
    els.buyTierUp.innerHTML = `<div class="next-unlock-hint">Shop sells ${next.name} at rebirth ${3 * (state.buyTier + 1)}</div>`;
  } else {
    els.buyTierUp.innerHTML = '';
  }
}

// ── Upgrades ─────────────────────────────────────────────────────────────────
// Cards appear once their requirement is owned, as in the original game.
export function renderUpgrades(state, onBuy) {
  UPGRADES.forEach((upg, order) => {
    let card = els.upgradesList.querySelector(`[data-upg="${upg.id}"]`);
    const owned  = rules.upgradeLevel(state, upg.id) >= 1;
    const reqMet = !upg.requires || rules.upgradeLevel(state, upg.requires) > 0;
    if (!card) {
      if (!reqMet) return;
      card = document.createElement('button');
      card.className = 'upgrade-card';
      card.dataset.upg = upg.id;
      card.dataset.order = order;
      card.innerHTML = `
        <span class="upg-icon ${upg.icon}">${ICONS[upg.icon]}</span>
        <span class="upg-body"><span class="upg-name">${upg.name}</span><span class="upg-desc">${upg.desc}</span></span>
        <span class="upg-cost"></span>`;
      card.addEventListener('click', () => onBuy(upg.id, card));
      const after = [...els.upgradesList.children].find(c => Number(c.dataset.order) > order);
      els.upgradesList.insertBefore(card, after ?? null);
    }
    const costEl = card.querySelector('.upg-cost');
    card.classList.toggle('owned', owned);
    card.classList.toggle('affordable', !owned && state.cash >= upg.cost);
    const text = owned ? 'Owned' : fmtCompact(upg.cost);
    if (costEl.textContent !== text) costEl.innerHTML = owned ? ICONS.check + 'Owned' : text;
  });
}

// ── Flag Atlas strip ─────────────────────────────────────────────────────────
export function buildAtlasStrip() {
  els.strip.innerHTML = '';
  FLAGS.forEach((flag, i) => {
    const item = document.createElement('button');
    item.className = 'col-item';
    item.dataset.tier = i;
    item.innerHTML = `
      <span class="col-flag"><img src="${flagWide(i)}" alt="" loading="lazy" draggable="false"><span class="col-lock">${ICONS.lock}</span></span>
      <span class="col-name">${flag.name}</span>`;
    els.strip.appendChild(item);
  });
}

let atlasNext = -1;
export function renderAtlas(state) {
  const items = els.strip.children;
  let next = -1;
  for (let i = 0; i < items.length; i++) {
    const disc = state.discovered.has(i);
    items[i].classList.toggle('discovered', disc);
    if (!disc && next === -1) next = i;
  }
  if (next !== atlasNext) {
    if (atlasNext >= 0) items[atlasNext].classList.remove('next');
    if (next >= 0) {
      items[next].classList.add('next');
      const strip = els.strip;
      const left = items[next].offsetLeft - strip.clientWidth / 2 + items[next].offsetWidth / 2;
      strip.scrollTo({ left: Math.max(0, left), behavior: atlasNext === -1 ? 'auto' : 'smooth' });
    }
    atlasNext = next;
  }
  els.atlasCount.textContent = `${state.discovered.size} / ${FLAGS.length}`;
  els.atlasFill.style.width = (state.discovered.size / FLAGS.length * 100).toFixed(1) + '%';
}

export function atlasModalHTML(state) {
  const cards = FLAGS.map((flag, i) => {
    const disc = state.discovered.has(i);
    const r = RARITIES[rarityIndex(i)];
    return `
      <div class="atlas-card ${disc ? 'discovered' : ''}" data-rarity="${rarityIndex(i)}">
        <span class="atlas-flag"><img src="${flagWide(i)}" alt="" loading="lazy"><span class="col-lock">${ICONS.lock}</span></span>
        <span class="atlas-name">${flag.name}</span>
        <span class="atlas-meta">Lv ${lvl(i)} · ${r.name}${disc ? ` · ${fmtCompact(rules.flagIncomeNow(state, i))}/s` : ''}</span>
      </div>`;
  }).join('');
  return `
    <h2>${ICONS.globe} Flag Atlas</h2>
    <p class="muted">${state.discovered.size} of ${FLAGS.length} flags discovered. Merge flags to find the rest!</p>
    <div class="atlas-grid">${cards}</div>`;
}

// ── Tip line above the board ─────────────────────────────────────────────────
export function renderTip(text) {
  if (els.tip.textContent !== text) els.tip.textContent = text;
  els.tip.classList.toggle('show', text !== '');
}

// ── Waving flag (vertical slices that bob out of step) ───────────────────────
export function waveFlagHTML(tier, slices = 24) {
  const url = flagWide(tier);
  let parts = '';
  for (let i = 0; i < slices; i++) {
    const pos = (i / (slices - 1) * 100).toFixed(2);
    parts += `<i style="background-image:url('${url}');background-size:${slices * 100}% 100%;background-position:${pos}% 0;animation-delay:${(-i * 0.055).toFixed(3)}s"></i>`;
  }
  return `<div class="wave-flag">${parts}<b class="wave-shade"></b></div>`;
}

// ── "New flag!" banner, queued so several discoveries play one after another ─
const bannerQueue = [];
let bannerBusy = false;
let bannerTimer = 0;

export function showDiscovery(state, tier) {
  bannerQueue.push(tier);
  if (!bannerBusy) nextBanner(state);
}

function nextBanner(state) {
  const tier = bannerQueue.shift();
  if (tier === undefined) { bannerBusy = false; return; }
  bannerBusy = true;
  const r = RARITIES[rarityIndex(tier)];
  els.banner.innerHTML = `
    <div class="banner-card" data-rarity="${rarityIndex(tier)}">
      ${waveFlagHTML(tier)}
      <div class="banner-text">
        <div class="kicker">New flag!</div>
        <div class="banner-name">${FLAGS[tier].name}</div>
        <div class="banner-meta"><span class="rarity-pill">${r.name}</span> Lv ${lvl(tier)} · ${fmtCompact(rules.flagIncomeNow(state, tier))}/sec</div>
      </div>
    </div>`;
  els.banner.classList.remove('show');
  void els.banner.offsetWidth;
  els.banner.classList.add('show');
  const hide = () => {
    clearTimeout(bannerTimer);
    els.banner.onclick = null;
    els.banner.classList.remove('show');
    setTimeout(() => nextBanner(state), 350);
  };
  els.banner.onclick = hide;
  bannerTimer = setTimeout(hide, 2600);
}

// ── Rebirth celebration overlay ──────────────────────────────────────────────
export function rebirthFlash(multiplier) {
  const el = document.createElement('div');
  el.className = 'rebirth-flash';
  el.innerHTML = `<div><div class="rf-title">REBIRTH!</div><div class="rf-sub">Income ×${multiplier.toFixed(2)} forever</div></div>`;
  el.addEventListener('animationend', () => el.remove());
  document.body.appendChild(el);
}

// ── Modals ───────────────────────────────────────────────────────────────────
// buttons: [{ label, cls, onClick, keepOpen }]; returns { el, close }.
export function openModal({ html, className = '', buttons = [], onClose, dismissable = true }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `
    <div class="modal ${className}" role="dialog" aria-modal="true">
      ${dismissable ? `<button class="modal-x" aria-label="Close">${ICONS.close}</button>` : ''}
      ${html}
      <div class="modal-buttons"></div>
    </div>`;
  const row = wrap.querySelector('.modal-buttons');
  let closed = false;
  const onKey = e => { if (e.key === 'Escape' && els.modalRoot.lastElementChild === wrap) close(); };
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 220);
    onClose?.();
  }
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.className = 'btn-candy ' + (b.cls ?? 'blue');
    btn.textContent = b.label;
    btn.addEventListener('click', () => { b.onClick?.(btn); if (!b.keepOpen) close(); });
    row.appendChild(btn);
  }
  if (dismissable) {
    document.addEventListener('keydown', onKey);
    wrap.querySelector('.modal-x').addEventListener('click', close);
    wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(); });
  }
  els.modalRoot.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  return { el: wrap, close };
}

export function isModalOpen() { return els.modalRoot.children.length > 0; }

export function nudge(el) {
  el.classList.remove('nudge');
  void el.offsetWidth;
  el.classList.add('nudge');
}
