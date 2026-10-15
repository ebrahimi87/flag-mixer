// Sound effects synthesized with the Web Audio API, so the game ships no audio files.
// Browsers only start audio after a user gesture: call unlock() from the first tap.

let ctx = null;
let master = null;
let muted = false;

const VOLUME = 0.55;

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : VOLUME;
}

export function unlock() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    const limiter = ctx.createDynamicsCompressor(); // keeps overlapping sounds from clipping
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone({ freq, to = freq, type = 'sine', start = 0, dur = 0.15, vol = 0.3 }) {
  if (!ctx || muted) return;
  const t0   = ctx.currentTime + start;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A burst of noise through a sweeping band-pass filter: a "whoosh".
function whoosh({ start = 0, dur = 0.3, vol = 0.15, from = 600, to = 5000 }) {
  if (!ctx || muted) return;
  const t0  = ctx.currentTime + start;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src    = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain   = ctx.createGain();
  src.buffer = buf;
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

// Notes on a major pentatonic scale starting at C5; any step sounds good after any other.
const PENTATONIC = [0, 2, 4, 7, 9];
function note(step) {
  const octave = Math.floor(step / 5);
  return 523.25 * Math.pow(2, octave + PENTATONIC[step % 5] / 12);
}

export const sfx = {
  tap()    { tone({ freq: 880, to: 990, dur: 0.05, vol: 0.10 }); },
  buy()    { tone({ freq: 520, to: 880, type: 'triangle', dur: 0.12, vol: 0.25 }); },
  deny()   { tone({ freq: 190, to: 130, type: 'square', dur: 0.14, vol: 0.07 }); },
  pickup() { tone({ freq: 620, to: 760, dur: 0.07, vol: 0.12 }); },
  drop()   { tone({ freq: 420, to: 300, type: 'triangle', dur: 0.09, vol: 0.16 }); },
  coin()   {
    tone({ freq: 1568, type: 'square', dur: 0.05, vol: 0.035 });
    tone({ freq: 2093, type: 'square', start: 0.05, dur: 0.14, vol: 0.035 });
  },
  // Pitch climbs with the flag tier and with each chained combo merge.
  merge(tier, chain) {
    const step = (tier % 10) + Math.min(chain - 1, 5);
    tone({ freq: note(step),     type: 'triangle', dur: 0.16, vol: 0.26 });
    tone({ freq: note(step + 2), type: 'triangle', start: 0.06, dur: 0.20, vol: 0.24 });
    tone({ freq: note(step + 4), type: 'sine',     start: 0.12, dur: 0.40, vol: 0.20 });
    whoosh({ dur: 0.22, vol: 0.05, from: 1500, to: 7000 });
  },
  discover() {
    [0, 2, 4, 5, 7].forEach((s, i) => tone({ freq: note(s + 5), type: 'triangle', start: 0.09 * i, dur: 0.30, vol: 0.18 }));
    tone({ freq: note(15), type: 'sine', start: 0.45, dur: 0.8, vol: 0.12 });
  },
  crateDrop() {
    tone({ freq: 240, to: 110, type: 'sine', dur: 0.18, vol: 0.30 });
    tone({ freq: note(7), type: 'triangle', start: 0.12, dur: 0.15, vol: 0.12 });
  },
  crateOpen() {
    whoosh({ dur: 0.35, vol: 0.12, from: 400, to: 6000 });
    [0, 2, 4, 7].forEach((s, i) => tone({ freq: note(s + 3), type: 'triangle', start: 0.18 + 0.06 * i, dur: 0.25, vol: 0.18 }));
  },
  rebirth() {
    whoosh({ dur: 1.1, vol: 0.18, from: 200, to: 8000 });
    tone({ freq: 130, to: 1046, type: 'sawtooth', dur: 1.0, vol: 0.06 });
    [0, 2, 4].forEach(s => tone({ freq: note(s + 5), type: 'triangle', start: 0.9, dur: 1.2, vol: 0.16 }));
  },
};
