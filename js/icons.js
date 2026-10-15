// Small inline SVG icons. Line icons use currentColor so CSS can color them.

const line = body =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  coin: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#b9770e"/><circle cx="12" cy="11.2" r="10" fill="#ffd34d"/>
    <circle cx="12" cy="11.2" r="7.2" fill="none" stroke="#e0a215" stroke-width="1.4"/>
    <text x="12" y="15.4" text-anchor="middle" font-size="11" font-weight="900" fill="#b9770e" font-family="system-ui, sans-serif">$</text></svg>`,
  lock:     line('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  soundOn:  line('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: line('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  menu:     line('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  globe:    line('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  merge:    line('<path d="M6 4v5a6 6 0 0 0 6 6h0M18 4v5a6 6 0 0 1-6 6v5"/><path d="M9 18l3 3 3-3"/>'),
  income:   line('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  slots:    line('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M17.5 14v7M14 17.5h7"/>'),
  rebirth:  line('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  check:    line('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  up:       line('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  close:    line('<path d="M6 6l12 12M18 6L6 18"/>'),
  crate: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="9" y="27" width="46" height="31" rx="5" fill="#e23c7e"/>
    <rect x="9" y="27" width="46" height="8" fill="#c22a68"/>
    <rect x="5" y="18" width="54" height="12" rx="4" fill="#ff6fa8"/>
    <rect x="5" y="18" width="54" height="4" rx="2" fill="#ff9cc4"/>
    <rect x="28" y="18" width="8" height="40" fill="#ffd34d"/>
    <rect x="28" y="18" width="3" height="40" fill="#fff0a8"/>
    <path d="M32 18c-5-11-19-12-17-3 1 5 11 4 17 3zM32 18c5-11 19-12 17-3-1 5-11 4-17 3z" fill="#ffd34d" stroke="#d99a12" stroke-width="1.5"/>
    <circle cx="32" cy="18" r="3.5" fill="#ffb81c"/></svg>`,
};
