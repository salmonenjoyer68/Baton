# AGENTS.md

Guidance for agents working in this repo.

## What this is

Baton is a browser music-mixing game in the style of Incredibox: the player
assigns procedural sounds to 7 animated characters, each looping on a shared
8-beat grid at 110 BPM. The only implemented code is the frontend
(`frontend/src/`). A `backend/` tree exists but is entirely docstring stubs.

## Source of truth

- `frontend/frontend.md` — the locked product spec: stack, 20 sounds, 7
  characters, audio timing rules, palette, responsive targets, and an explicit
  "Do NOT build" list. Read it before adding anything.
- `docs/architecture.md` — describes a conductor/WebSocket backend that does
  **not** exist yet. Treat it as intent, not as a description of current code.

## Layout

```
frontend/
  src/sounds.js          Sound model: categories, note table, 20 recipes + patterns
  src/characters.js      Character model: 7 slots (name, blob colour, accessory)
  src/main.jsx           React app: state, slot rendering, drag/tap handlers
  src/audio-engine.js    AudioEngine class: Web Audio scheduler + recipe playback
  src/style.css          All styling, hand-written CSS + palette variables
  index.html             Entry; mounts into #app
  vite.config.js         Vite config; its directory is the root, output -> ../dist
  tailwind.config.js     Content globs for the Tailwind pipeline
  postcss.config.js      Runs Tailwind over src/style.css
  js/, css/              Legacy one-line stubs, not loaded by anything
backend/                 Python docstring stubs only; no implementation, no tests
tests/                   Docstring stubs only
```

`frontend/js/*` and `frontend/css/style.css` are dead files. Do not extend them;
the live code is in `frontend/src/`.

## Running

```sh
cd frontend
npm install
npm run dev     # vite, port 5173
npm run build
```

There is no root `package.json`; always run from `frontend/`.
There is no lint, formatter, or test runner configured.

## Audio engine invariants

These are load-bearing; changes here need a browser check, not just a read:

- Timing is a lookahead scheduler: `setInterval(schedule, 25)` only *drives* the
  loop; sounds are scheduled at absolute times on `AudioContext.currentTime`
  with a 0.12 s horizon. Never schedule note starts from `setInterval` or
  `setTimeout` timestamps.
- `schedule()` skips forward on the grid when the ticker falls behind (background
  tab), so it never schedules notes in the past or bursts to catch up.
- `pendingLayers` is flushed into `layers` only when `beat === 0`, so a *new or
  replaced* sound enters on a loop boundary. Mute, solo, and removal apply
  immediately through `setLayer`, because they only touch an already-playing
  layer's flags.
- The visual beat comes from `reportBeat()`, a `requestAnimationFrame` loop that
  derives the beat index from `AudioContext.currentTime` against `origin`. Do not
  reintroduce timers for UI sync.
- Grid: `BPM = 110`, `LOOP_BEATS = 8`, `BEAT_SECONDS = 60 / BPM`. The UI passes
  `--beat-ms` (= `BEAT_SECONDS * 500`) to CSS so the beat bounce matches the tempo.
- Each layer sounds only where its pattern says: `sound.steps[beat]` is a
  velocity, 0 meaning silence. Steps arrays are hand-written, so their length
  must stay equal to `LOOP_BEATS`.
- Playback is recipe-driven: `playSound` builds an envelope and dispatches to
  `playTone` / `playNoise` from the sound's `tone` and `noise` blocks. Adding or
  retuning a sound means editing `sounds.js` only.
- Pitches come from `NOTE_HZ` (C minor pentatonic across three octaves). A bad
  note name throws at module load. The noise buffer is created once per context.

## Interaction model

- Drag and drop uses pointer events only (`pointerdown` on the tile or slot,
  `pointermove`/`pointerup` on the app root, 6 px movement threshold). HTML5 drag
  events are deliberately absent because touch never fires them.
- Hit testing is `document.elementFromPoint(...).closest("[data-slot]")`; every
  slot carries `data-slot={index}`.
- Dropping a sound tile on a slot assigns/replaces; dragging a slot's sound to
  another slot moves it; releasing a slot's sound outside every slot removes it.
- Tapping still works: tap a tile to select, then tap a slot to place. Keep both
  paths working — the tap path is what works when the palette and stage are not
  both on screen.
- Controls inside a slot (mute/solo) opt out of dragging via
  `closest("button")`. A `blur` handler aborts in-flight drags.

## Frontend conventions

- Plain CSS classes in `style.css`; Tailwind is wired (PostCSS + preflight) but
  the JSX uses no utility classes. Preflight means headings/buttons get no UA
  styling, so set `font-size`/`font-weight` explicitly when adding elements.
- Colours come from the CSS variables in `:root` (`--coral`, `--turquoise`,
  `--pink`, `--mango`, `--sand`, `--navy`, …). Use them instead of new hex
  literals; the spec requires palette consistency.
- Slot state is one array, `slots`, of length `SLOT_COUNT`: each entry is
  `null` or `{ sound, muted, solo }`. A sound is a recipe object from
  `sounds.js`; nothing in the UI or engine keys off an index into a second table.
- `sounds.js` is the single source of truth for sounds — `SOUNDS` plus the
  grouped `CATEGORY_GROUPS`. Tile and chip classes are the category id
  (`beats`, `melody`, `effects`, `voices`), and the CSS category classes supply
  `--tile` / `--tile-soft` per category.
- Characters are inline SVG (`CharacterArt`) driven by `characters.js`; the
  `accessory` field selects the drawn accessory. The performing animation
  restarts each beat by remounting on `key={beat}`.
- Slot cards render three model-driven pieces: the category-tinted `.chip`, the
  `.steps` pattern dots (velocity > 0 lit, current beat marked `.now`), and the
  `Mute`/`Solo` toggles (`aria-pressed` + `.on`).
- The app is a single page, no router, no backend calls, no persistence.

## Scope discipline

The spec forbids auth, accounts, server saving, leaderboards, dark mode,
recording/export, level systems, and extra libraries beyond React + Vite +
Tailwind. Do not add those, and do not grow the `backend/` stubs into an
implementation unless the user asks for it explicitly.

## Verification

Audio and drag behaviour cannot be checked by reading code. Run the dev server
and check in a browser: console clean, all 20 sounds audible and in sync over
2+ minutes, assign/replace/remove/mute/solo with mouse and touch, beat
indicator, and layout at 375 px and 1440 px.

Pointer checks that matter: drag a tile onto a slot, drag a slot's sound off the
stage, and tap-tile-then-tap-slot. On small viewports scroll until the stage and
the sound shelf are both visible before dragging.

## Known gaps

- Recipes are synthesis-only. Swapping a sound for a sample file would need a
  `sample` path in the engine, not just a config edit.
- Pattern steps are literals; nothing checks their length against `LOOP_BEATS`
  at load time (the note table is the only validated data).
- `frontend/js/*` and `frontend/css/style.css` are still dead stubs from the
  first commit.
