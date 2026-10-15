// Visual effects: a full-screen particle canvas (sparks, confetti, flying coins, rings),
// floating text, and screen shake. The animation loop only runs while something is moving.

import { flagSquare } from './data.js';

const canvas = document.getElementById('fx');
const g = canvas.getContext('2d');
const floaters = document.getElementById('floaters');
const DEFAULT_COLORS = ['#ffd34d', '#ffffff', '#5cc8ff', '#ff5fa2'];

let particles = [];
let running = false;
let lastFrame = 0;
let dpr = 1;

export function resizeFx() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function start() {
  if (running) return;
  running = true;
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => p.update(p, dt));
  for (const p of particles) p.draw(p);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  if (particles.length > 0) requestAnimationFrame(frame);
  else { running = false; g.clearRect(0, 0, canvas.width, canvas.height); }
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

// ── Particle kinds ───────────────────────────────────────────────────────────
function updateBallistic(p, dt) {
  p.life -= dt;
  p.vy += p.gravity * dt;
  p.vx *= 1 - p.drag * dt;
  p.vy *= 1 - p.drag * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.spin += p.spinSpeed * dt;
  return p.life > 0;
}

function drawSpark(p) {
  const t = p.life / p.maxLife;
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = t;
  g.fillStyle = p.color;
  g.beginPath();
  g.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, Math.PI * 2);
  g.fill();
}

function drawConfetti(p) {
  const t = Math.min(1, p.life / 0.4);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = t;
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.spin);
  g.scale(1, Math.cos(p.spin * 1.7)); // flutter
  g.fillStyle = p.color;
  g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
  g.restore();
}

function drawRing(p) {
  const t = 1 - p.life / p.maxLife;
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = (1 - t) * 0.9;
  g.strokeStyle = p.color;
  g.lineWidth = p.width * (1 - t) + 1;
  g.beginPath();
  g.arc(p.x, p.y, p.size * (0.2 + t * 0.8), 0, Math.PI * 2);
  g.stroke();
}

function updateRing(p, dt) { p.life -= dt; return p.life > 0; }

function drawCoin(p) {
  const r = p.size;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.save();
  g.translate(p.x, p.y);
  g.scale(Math.max(0.25, Math.abs(Math.cos(p.spin))), 1);
  g.fillStyle = '#b9770e';
  g.beginPath(); g.arc(0, r * 0.12, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd34d';
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff4c2';
  g.beginPath(); g.arc(-r * 0.3, -r * 0.35, r * 0.28, 0, Math.PI * 2); g.fill();
  g.restore();
}

// Coins rise and scatter for a moment, then fly along a curve into the target.
function updateCoin(p, dt) {
  p.age += dt;
  p.spin += 9 * dt;
  if (p.age < p.scatter) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 900 * dt;
    p.sx = p.x; p.sy = p.y;
    return true;
  }
  const t = Math.min(1, (p.age - p.scatter) / p.flight);
  const e = t * t * (3 - 2 * t);
  const cx = (p.sx + p.tx) / 2 + p.bend;
  const cy = Math.min(p.sy, p.ty) - 80;
  p.x = (1 - e) * (1 - e) * p.sx + 2 * (1 - e) * e * cx + e * e * p.tx;
  p.y = (1 - e) * (1 - e) * p.sy + 2 * (1 - e) * e * cy + e * e * p.ty;
  if (t >= 1) { p.onArrive?.(); return false; }
  return true;
}

// ── Public effects ───────────────────────────────────────────────────────────
export function sparks(x, y, colors = DEFAULT_COLORS, count = 24, speed = 380) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(speed * 0.3, speed);
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: 260, drag: 2.2,
      size: rand(2, 5), color: pick(colors), life: rand(0.4, 0.9), maxLife: 0.9,
      spin: 0, spinSpeed: 0, update: updateBallistic, draw: drawSpark,
    });
  }
  start();
}

export function confetti(x, y, colors = DEFAULT_COLORS, count = 60, speed = 650) {
  for (let i = 0; i < count; i++) {
    const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
    const v = rand(speed * 0.35, speed);
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: 700, drag: 1.6,
      size: rand(7, 12), color: pick(colors), life: rand(1.2, 2.2), maxLife: 2.2,
      spin: rand(0, 6), spinSpeed: rand(-10, 10), update: updateBallistic, draw: drawConfetti,
    });
  }
  start();
}

export function ring(x, y, color = '#ffffff', size = 90, width = 10, life = 0.5) {
  particles.push({ x, y, color, size, width, life, maxLife: life, update: updateRing, draw: drawRing });
  start();
}

// Sends `count` coins from (x, y) to the center of `targetEl`; calls onArrive once per coin.
export function coinsTo(x, y, targetEl, count, onArrive) {
  const r = targetEl.getBoundingClientRect();
  const tx = r.left + Math.min(r.width, 40) / 2;
  const ty = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, vx: rand(-220, 220), vy: rand(-420, -200), age: -i * 0.025,
      scatter: rand(0.18, 0.3), flight: rand(0.45, 0.65), bend: rand(-120, 120),
      sx: x, sy: y, tx, ty, size: rand(7, 10), spin: rand(0, 6), onArrive,
      update: updateCoin, draw: drawCoin,
    });
  }
  start();
}

export function floatText(x, y, text, className = '') {
  const el = document.createElement('div');
  el.className = 'floater ' + className;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.addEventListener('animationend', () => el.remove());
  floaters.appendChild(el);
}

export function shake(strength = 1) {
  const app = document.getElementById('app');
  app.style.setProperty('--shake', strength);
  app.classList.remove('shake');
  void app.offsetWidth; // restart the CSS animation
  app.classList.add('shake');
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ── Flag colors ──────────────────────────────────────────────────────────────
// Particles use each flag's own main colors, read from a tiny render of its SVG.
const colorCache = new Map();

export function flagColors(tier) {
  if (colorCache.has(tier)) return colorCache.get(tier);
  colorCache.set(tier, DEFAULT_COLORS);
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 20;
      const cg = c.getContext('2d', { willReadFrequently: true });
      cg.drawImage(img, 0, 0, 20, 20);
      const colors = mainColors(cg.getImageData(0, 0, 20, 20).data);
      if (colors.length > 0) colorCache.set(tier, colors);
    } catch (_) { /* keep the default palette */ }
  };
  img.src = flagSquare(tier);
  return DEFAULT_COLORS;
}

// The most common colors, rounded to 32 levels per channel, skipping near-duplicates.
function mainColors(data) {
  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = (data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | (data[i + 2] >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const picked = [];
  for (const [key] of sorted) {
    const rgb = [(key >> 10) << 3, ((key >> 5) & 31) << 3, (key & 31) << 3];
    if (picked.some(p => Math.abs(p[0] - rgb[0]) + Math.abs(p[1] - rgb[1]) + Math.abs(p[2] - rgb[2]) < 90)) continue;
    picked.push(rgb);
    if (picked.length === 4) break;
  }
  // Very dark colors vanish against the night background; lift them a little.
  return picked.map(([r, gg, b]) => {
    const lift = r + gg + b < 120 ? 70 : 0;
    return `rgb(${r + lift}, ${gg + lift}, ${b + lift})`;
  });
}
