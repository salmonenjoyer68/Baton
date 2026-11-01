# Baton

A browser music-mixing game. Pick sounds from the shelf, drop them on the crew,
and each character starts performing one looping layer on a shared 8-beat grid at
110 BPM. Stack all seven and the beach party is yours.

Every one of the 20 sounds is synthesized at runtime with the Web Audio API —
there are no audio files, no assets to download, and no backend. The whole game
is a single static page.

![Baton stage and sound shelf](docs/preview.webp)

## Features

- **Seven characters, seven layers.** Each slot holds one sound with its own
  eight-step pattern, so layers interlock instead of all firing on every beat.
- **Twenty procedural sounds** across four categories — Beats, Bass + Melody,
  Effects, Voices — all in C minor pentatonic, so any combination stays in key.
- **Real audio-clock timing.** A lookahead scheduler schedules notes at absolute
  `AudioContext` times. New layers enter on the next loop boundary; mute, solo,
  and removal apply immediately.
- **Mouse and touch.** Pointer-event drag and drop (no HTML5 drag API), plus
  tap-to-select as a fallback. Drag a character's sound off the stage to remove
  it.
- **Responsive.** Verified at 375 px and 1440 px. The stage scrolls horizontally
  on phones; the sound shelf sits below it.
- **Explicit state.** Mute and solo expose `aria-pressed`; the beat indicator and
  each layer's pattern dots are driven by the audio clock.

## Getting started

Requires Node 18+ and npm.

```sh
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Production build:

```sh
npm run build    # outputs to ../dist
npm run preview
```

No environment variables, API keys, or backend services are needed to play.

## How to play

| Action | Mouse / keyboard | Touch |
| --- | --- | --- |
| Start audio | Click **Tap to start** | Tap **Tap to start** |
| Place a sound | Drag a tile onto a character, or click a tile then a character | Drag a tile onto a character, or tap a tile then a character |
| Replace a sound | Drop another sound on an occupied character | Same |
| Move a sound | Drag it from one character to another | Same |
| Remove a sound | Drag it off the stage | Same |
| Mute / solo a layer | Toggle **Mute** / **Solo** on the card | Same |
| Stop the music | **Pause** in the header | Same |

The header shows tempo, a play/pause control, and an eight-dot beat indicator.
The stage header counts how many of the seven characters are performing.

## How it works

### Scheduling

`AudioEngine` runs a 25 ms ticker that looks 120 ms ahead and schedules every
note at an absolute time on `AudioContext.currentTime`. The ticker only decides
*what* to queue; it never decides *when* a note sounds. Loop position is derived
from a fixed origin, and if the tab is throttled the scheduler skips forward on
the grid rather than firing late notes.

The visual beat comes from a `requestAnimationFrame` loop reading the same audio
clock, so the bounce animation and the beat dots cannot drift away from the
sound.

### Sound model

`frontend/src/sounds.js` is the single source of truth. Each sound carries its
category, an eight-step velocity pattern, a gain, and a synthesis recipe:

```js
{
  id: "beats-kick",
  name: "Kick bloom",
  category: "beats",
  steps: [1, 0, 0, 0, 0.85, 0, 0, 0],
  gain: 0.95,
  tone: { wave: "sine", note: "C2", glideTo: "C1", glide: 0.12, duration: 0.36 }
}
```

`tone` drives an oscillator (with optional glide and filter), `noise` drives a
filtered buffer — a sound may use either or both. Adding or retuning a sound is a
one-entry edit; nothing in the engine or the UI hard-codes a sound.

Pitches come from a `NOTE_HZ` table covering C minor pentatonic across three
octaves, and an unknown note name fails at module load instead of producing a
silent NaN frequency.

### Project structure

```
frontend/
  src/sounds.js         Sound model: categories, note table, 20 recipes
  src/characters.js     Character model: 7 slots (name, colour, accessory)
  src/audio-engine.js   Lookahead scheduler and recipe playback
  src/main.jsx          React app: state, drag/tap handling, stage and shelf
  src/style.css         Palette tokens and all styling
  index.html            Entry point
  vite.config.js        Vite config (this directory is the root)
  tailwind.config.js    Tailwind content globs
  postcss.config.js     Tailwind pipeline
docs/
  architecture.md       Planned conductor service (not implemented)
  preview.webp          Screenshot for this README
backend/                FastAPI + musician scaffolding, docstrings only
tests/                  Test stubs
```

### Stack

React 18, Vite 6, Tailwind CSS (PostCSS pipeline), and the Web Audio API. No
audio libraries, router, state manager, or UI kit. Tailwind's preflight is active,
but the components style themselves with hand-written CSS and the palette tokens
in `src/style.css`.

## Status

The playable game is complete on the frontend. `backend/` and
`docs/architecture.md` are placeholders for a planned conductor service that
would coordinate shared musical state over WebSocket; they contain no
implementation, and nothing in the game depends on them.

## Development notes

- Audio and drag behaviour cannot be validated by reading code. Run the dev
  server and check in a browser.
- On short viewports, scroll until the stage and the sound shelf are both visible
  before dragging (or use tap-to-select).
- `AGENTS.md` documents the engine invariants and conventions for contributors
  working with coding agents.
