// Money formatting: $105.80, $1.25K, $3.40M, ... then scientific notation for huge numbers.
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(n) {
  if (!isFinite(n) || n < 0) return '$0.00';
  if (n < 1000) return '$' + n.toFixed(2);
  const group = Math.floor(Math.log10(n) / 3);
  if (group >= SUFFIXES.length) return '$' + n.toExponential(2).replace('+', '');
  const scaled = n / Math.pow(1000, group);
  // 999.996K would print as "1000.00K"; show it as "1.00M" instead.
  if (scaled >= 999.995 && group + 1 < SUFFIXES.length) return '$1.00' + SUFFIXES[group + 1];
  return '$' + scaled.toFixed(2) + SUFFIXES[group];
}

export function fmtShort(n) { return fmt(n).slice(1); } // strip $

// Compact money for small labels: $12, $1.2K, $35M.
export function fmtCompact(n) {
  if (n < 1000) return '$' + Math.round(n);
  const text = fmt(n);
  return text.replace(/\.(\d)\d(?=[A-Za-z])/, (m, d) => (d === '0' ? '' : '.' + d));
}

export function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(sec)}s`;
}
