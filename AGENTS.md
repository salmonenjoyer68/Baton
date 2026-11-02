# AGENTS.md

Guidance for agents working in this repo.

## What this is

Baton is a browser music-mixing game in the style of Incredibox: the conductor
hands instruments to 7 characters, each performing a pattern on a shared 8-beat
loop at 110 BPM. The only implemented code is the frontend
(`frontend/src/`). A `backend/` tree exists but is entirely docstring stubs.

A **performer** is whoever plays a slot: a character the conductor assigned an
instrument to, or a model handed one. `CONTEXT.md` holds the rest of the
vocabulary — use its terms in docs, issues, and code comments.

## Source of truth

- `frontend/frontend.md` — the locked product spec: stack, 20 instruments, 7
  characters, audio timing rules, palette, responsive targets, and an explicit
  "Do NOT build" list. Read it before adding anything.
- `docs/architecture.md` — describes a coordinator/WebSocket backend that does
  **not** exist yet. Treat it as intent, not as a description of current code.

## Layout

```
frontend/
  src/sounds.js          Sound model: categories, note table, 20 recipes + patterns
  src/characters.js      Character model: 7 slots (name, blob colour, accessory)
  src/model-play.js      Model seam: pure slot transitions, request building,
                         strict reply parsing, model server constants
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
npm test        # node --test, no dependency
```

There is no root `package.json`; always run from `frontend/`.
There is no lint or formatter configured.

Tests use Node's built-in runner (`node --test`, Node 22+), so nothing is
installed. Put a test beside the module it covers as `<module>.test.js`; the
runner discovers `*.test.js` under `frontend/` (excluding `node_modules/`) and
exits non-zero when any assertion fails. Prefer plain `node:test` and
`node:assert/strict` imports over a local helper.

## Audio engine invariants

These are load-bearing; changes here need a browser check, not just a read:

- Timing is a lookahead scheduler: `setInterval(schedule, 25)` only *drives* the
  loop; sounds are scheduled at absolute times on `AudioContext.currentTime`
  with a 0.12 s horizon. Never schedule note starts from `setInterval` or
  `setTimeout` timestamps.
- `schedule()` skips forward on the grid when the ticker falls behind (background
  tab), so it never schedules notes in the past or bursts to catch up.
- `pendingLayers` is flushed into `layers` only when `beat === 0`, so a *new or
  replaced* sound or pattern enters on a loop boundary. Mute, solo, and removal
  apply immediately through `setLayer`, because they only touch an already-playing
  layer's flags.
- The visual beat comes from `reportBeat()`, a `requestAnimationFrame` loop that
  derives the beat index from `AudioContext.currentTime` against `origin`. Do not
  reintroduce timers for UI sync.
- Grid: `BPM = 110`, `LOOP_BEATS = 8`, `BEAT_SECONDS = 60 / BPM`. The UI passes
  `--beat-ms` (= `BEAT_SECONDS * 500`) to CSS so the beat bounce matches the tempo.
- Each layer sounds only where its pattern says: `layer.override[beat]` when the
  slot has an override, otherwise `sound.steps[beat]`. The value is a velocity,
  0 meaning silence. Steps arrays are hand-written, so their length must stay
  equal to `LOOP_BEATS`. The instrument keeps its authored pattern; an override
  belongs to the slot.
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
- Dropping an instrument tile on a slot assigns/replaces; dragging a slot's
  instrument to another slot moves it; releasing it outside every slot removes it.
- Tapping still works: tap a tile to select, then tap a slot to place. Keep both
  paths working — the tap path is what works when the shelf and stage are not
  both on screen.
- Controls inside a slot (mute/solo/handoff) opt out of dragging via
  `closest("button")`. A `blur` handler aborts in-flight drags.
- Touch gestures: `.sound-tile` uses `touch-action: none` (a drag from the shelf
  must not become a browser pan); `.slot` uses `pan-y`, so the page still
  scrolls over the stage while horizontal slot-to-slot drags reach the pointer
  handlers. The stage is a wrapping grid at every width — do not reintroduce
  horizontal stage scrolling.

## Frontend conventions

- Plain CSS classes in `style.css`; Tailwind is wired (PostCSS + preflight) but
  the JSX uses no utility classes. Preflight means headings/buttons get no UA
  styling, so set `font-size`/`font-weight` explicitly when adding elements.
- Colours come from the eight CSS variables in `:root` (`--bg`, `--surface`,
  `--text`, `--muted`, `--accent`, `--accent-2`, `--success`, `--danger`). Use
  them (or a `color-mix` of them) instead of new hex literals: no hex value
  exists outside that block. `frontend/frontend.md` still specifies the older
  Coral/Turquoise/Sand summer palette and forbids dark mode; that conflict is
  unresolved — this file describes the shipped code, the product spec is
  aspirational until someone decides.
- Slot state is one array, `slots`, of length `SLOT_COUNT`: each entry is
  `null` or an assignment
  `{ sound, performer, muted, solo, override, takes }`, where `performer` is
  `"conductor"` or `"model"`, `override` is an eight-velocity pattern or `null`,
  and `takes` is the slot's take log. A sound is a recipe object from
  `sounds.js`; nothing in the UI or engine keys off an index into a second table.
  Transitions that change an assignment (handoff, take-back) and the one that
  installs a take (override) are pure functions in `model-play.js`; they return
  a new slot list and never mutate the shared instrument or a neighbouring slot.
- `sounds.js` is the single source of truth for sounds — `SOUNDS` plus the
  grouped `CATEGORY_GROUPS`. Tile and chip classes are the category id
  (`beats`, `melody`, `effects`, `voices`), and the CSS category classes supply
  `--tile` / `--tile-soft` per category.
- Characters are inline SVG (`CharacterArt`) driven by `characters.js`; the
  `accessory` field selects the drawn accessory. The performing animation
  restarts each beat by remounting on `key={beat}`.
- Slot cards render four model-driven pieces: the category-tinted `.chip`, the
  `.steps` pattern dots (the slot's override when it has one, otherwise the
  authored pattern; velocity > 0 lit, current beat marked `.now`), the
  `Mute`/`Solo`/`Model` toggles (`aria-pressed` + `.on`), and the `.slot-performer`
  badge naming the slot's performer (`CONDUCTOR` or `MODEL`). Handoff is the
  `Model` toggle: it hands the assignment to the model or takes it back. A
  model-played card also shows a `TAKE` button; one press sends one request.
- The app is a single page with no router and no persistence. The browser calls
  the user's local model server directly; nothing in this repo sits between the
  two.

## Model seam

`frontend/src/model-play.js` is the only module that knows the model. It holds
the two swap points as constants:

```js
export const MODEL_SERVER = "http://127.0.0.1:11434";
export const MODEL_NAME = "qwen2.5:3b";
```

Editing those two lines swaps models; there is no settings surface and nothing
is persisted. The server's origin allow-list is a machine setting, not repo
configuration — `README.md` documents `OLLAMA_ORIGINS` for localhost:5173.

The module's pieces are deliberately pure and unit-tested at that seam:

- `buildRequest(instrument)` returns the Ollama request body. It carries only
  the handed instrument — name, category, current eight velocities — and asks
  for one JSON object with a `pattern` array and no prose.
- `parseTake(text)` returns `{ ok: true, pattern }` or `{ ok: false, reason }`.
  Strict: JSON, an object with a `pattern` array of exactly `LOOP_BEATS`
  entries, every entry a finite number in 0–1. Reasons are named in
  `TAKE_REASONS` (`not-json`, `no-pattern`, `wrong-length`, `non-numeric`,
  `out-of-range`, `no-reply`). Never clamp or pad.
- `applyTake(slots, index, pattern)` installs the override on that slot only.
  The instrument's authored pattern and every other slot are untouched.
- `requestTake(instrument, fetchImpl)` posts to `${MODEL_SERVER}/api/generate`
  and distinguishes `{ ok: false, kind: "unreachable" }` from
  `{ ok: false, kind: "unusable", reason }`. The UI keeps "in flight" as a third
  state, so the three failures look different on the card.

A landed take goes through `engine.setLayer`, so the existing pending/current
split enters it at the next `beat === 0`. Do not add a timer path. A reply that
arrives after the slot has been reassigned, removed, or handed back must be
dropped using the take token in `main.jsx`.

## Scope discipline

The spec forbids auth, accounts, server saving, leaderboards, dark mode,
recording/export, level systems, and extra libraries beyond React + Vite +
Tailwind. Do not add those, and do not grow the `backend/` stubs into an
implementation unless the user asks for it explicitly.

## Verification

Audio and drag behaviour cannot be checked by reading code. Run the dev server
and check in a browser: console clean, all 20 instruments audible and in sync over
2+ minutes, assign/replace/remove/mute/solo/handoff with mouse and touch, beat
indicator, and layout at 375 px and 1440 px.

Pointer checks that matter: drag a tile onto a slot, drag a slot's instrument off
the stage, tap-tile-then-tap-slot, and press a slot's `Model` toggle — it must
change the performer without starting a drag. On small viewports scroll until the
stage and the shelf are both visible before dragging.

## Known gaps

- Recipes are synthesis-only. Swapping a sound for a sample file would need a
  `sample` path in the engine, not just a config edit.
- Pattern steps are literals; nothing checks their length against `LOOP_BEATS`
  at load time (the note table is the only validated data).
- `frontend/js/*` and `frontend/css/style.css` are still dead stubs from the
  first commit.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
