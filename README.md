# Flag Mixer

A cozy idle merge game for the browser (iPad, phone, or desktop). Buy flags, drag two matching flags together to merge them into the next country's flag, and collect all 197. Every flag on the board earns money each second, and higher-level flags earn more.

## How to play

- **Buy** a flag with the green button (starts at $100).
- **Drag** a flag onto its twin to **merge** them into the next flag and earn a cash bonus. Drop a flag on an empty slot to move it, or on a different flag to swap places.
- **Combo:** merge again within 3.5 seconds for extra merge cash (+10% per chained merge, up to +50%).
- **Lucky crates** drop into an empty slot now and then. Tap one for a free flag (sometimes a higher level) or a cash prize.
- **Upgrades** add merge cash, income, or 2 extra board slots.
- **Rebirth** when you meet the goal at the top right: your board and cash reset, and you get a permanent ×1.5 income multiplier plus a free Austria. The shop sells a higher flag every 3 rebirths.
- The **Flag Atlas** at the bottom shows every flag you have discovered. Tap it to see them all.

Progress saves on the device (`localStorage`). When you come back, you collect what your flags earned while you were away (up to 8 hours). On iPad, use **Share → Add to Home Screen** for full-screen play.

## Run locally

```sh
npm run serve        # http://127.0.0.1:4181 (any static file server works)
```

There is no build step: plain HTML, CSS, and JavaScript modules. A static file server is needed because browsers do not load JavaScript modules from `file://`.

## Tests

```sh
npm install          # Playwright, for browser tests
npm run logic        # rules tests in Node: economy, saves, crates, combos
npm run browser      # plays the game in Chromium at desktop, iPad, phone, and GitHub Pages sizes
npm run validate     # both
node tools/tour.mjs  # screenshots of the main moments → .artifacts/tour/
```

Add `?test` to the URL to expose `window.__flagMixer` (state and rules) for tests.

## How the code fits together

```
index.html ─► js/main.js   controller: loads the save, handles input, runs the loops
               ├─ js/state.js   rules: state, save/load, buy, drop (move/swap/merge), crates, rebirth
               │    └─ js/data.js   flag list, economy formulas, upgrade and rebirth tables, tuning
               ├─ js/ui.js      draws the board, panels, banner, and dialogs
               ├─ js/drag.js    pointer input: drag between slots, or tap
               ├─ js/fx.js      particle canvas, floating text, screen shake, flag colors
               ├─ js/sound.js   sound effects made with Web Audio (no audio files)
               └─ js/format.js  money text: $1.25K, $3.40M, ...
```

Example: dragging a flag onto its twin calls `rules.dropFlag(state, from, to)`, which returns `{ kind: 'merge', tier, bonus, chain, isNew }`. `main.js` then redraws the board, plays the burst, coins, and sound, and shows the "New flag!" card when `isNew` is true.

The game balance lives in `js/data.js`. A flag's *tier* is its place in the list, starting at 0 (the game shows it as level = tier + 1, so Afghanistan is level 1). Income per flag is `2 × 2.5^tier` per second, and merging two flags of tier t pays `80 × 2.2^t`. The combo, crate, and rarity settings are listed there too.

## Credits

Flag artwork: [flag-icons](https://github.com/lipis/flag-icons) (MIT license). See `THIRD_PARTY_LICENSES.txt`.
