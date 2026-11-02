# Baton

A browser music-mixing game with an 8-bit console skin. Pick sounds from the
shelf, drop them on the crew, and each character starts performing one looping
layer on a shared 8-beat grid at 110 BPM. Stack all seven and the track is yours.

Every one of the 20 sounds is synthesized at runtime with the Web Audio API —
there are no audio files, no assets to download, and no backend. The whole game
is a single static page.

> **Baton is meant to be played by AI musicians, not by hand.** The end goal is a
> crew of autonomous agents that each decide what to play, bar by bar, while the
> conductor keeps them in time and in key. The first musical agent has landed as
> a standalone CLI DJ in [`music-agent/`](music-agent/README.md): you ask for
> music in plain English and a local Ollama model searches, queues, and plays it.
> It is not wired to the browser game yet — there you still place every sound
> yourself. See [Status](#status) for exactly what exists.

![Baton 8-bit stage and sound shelf](docs/preview.webp)

## Features

- **Seven characters, seven layers.** Each slot holds one sound with its own
  eight-step pattern, so layers interlock instead of all firing on every beat.
- **Twenty procedural sounds** across four categories — Beats, Bass + Melody,
  Effects, Voices — all in C minor pentatonic, so any combination stays in key.
- **Real audio-clock timing.** A lookahead scheduler schedules notes at absolute
  `AudioContext` times. New layers enter on the next loop boundary; mute, solo,
  and removal apply immediately.
- **Mouse, touch, and keyboard.** Pointer-event drag and drop (no HTML5 drag
  API), tap-to-select, and a keyboard path: select a sound tile, focus a
  character, press Enter to place it, or Delete/Backspace to clear it. Drag a
  character's sound off the stage to remove it.
- **8-bit, modern.** Dark eight-colour palette, Press Start 2P display type,
  Inter body copy, hard 4 px frames, stepped corners, and offset shadows with no
  gradients or blur. All characters, icons, and the logo are inline SVG pixel art.
- **Responsive.** Verified at 375 px, 768 px, and 1440 px. The stage scrolls
  horizontally on phones, becomes a four-column grid on tablets, and a
  seven-column stage on desktop. The sound shelf sits below it.
- **Explicit state.** Mute and solo expose `aria-pressed`; the beat indicator and
  each layer's pattern dots are driven by the audio clock. Motion is stepped and
  disabled under `prefers-reduced-motion`.
- **First musical agent.** `music-agent/` is a working command-line DJ: a small
  local Ollama model calls eight tools — `search_music`, `play`, `queue_add`,
  `pause`, `resume`, `skip`, `set_volume`, `now_playing` — over yt-dlp search
  and mpv playback. No cloud API, no API key, no audio written to disk.

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

No environment variables, API keys, or backend services are needed to play the
browser game.

### First musical agent (CLI)

The agent lives in `music-agent/` and is independent of the browser game. It
needs Python 3.10+, a running [Ollama](https://ollama.com) server with a small
tool-calling model, and [mpv](https://mpv.io) on `PATH`:

From the repository root:

```sh
sudo apt install mpv                 # macOS: brew install mpv, Windows: winget install mpv
ollama serve                         # in another terminal
ollama pull qwen2.5:3b

python -m venv .venv                 # skip if .venv already exists
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r music-agent/requirements.txt
cd music-agent
python agent.py
```

Then type requests such as `play something chill for coding`, `skip this`,
`queue some Beatles`, `turn it down to 30`, or `what's playing?`. The agent reads
`OLLAMA_MODEL` and `OLLAMA_HOST` from the environment, defaulting to
`qwen2.5:3b` and `http://127.0.0.1:11434`; `llama3.2:3b` and `qwen3:4b` work by
changing only `OLLAMA_MODEL`. Put overrides in a repo-root `.env` (copy
`.env.example`); `.env` and `.env.*` are gitignored, so real keys and local
settings never enter the repository. Full details, including troubleshooting,
are in [`music-agent/README.md`](music-agent/README.md).

## How to play

| Action | Mouse | Touch | Keyboard |
| --- | --- | --- | --- |
| Start audio | Click **START THE MIX** | Tap **START THE MIX** | Focus the button, press Enter |
| Place a sound | Drag a tile onto a character, or click a tile then a character | Drag a tile onto a character, or tap a tile then a character | Focus a tile, press Enter, focus a character, press Enter |
| Replace a sound | Drop another sound on an occupied character | Same | Select another sound, then press Enter on the character |
| Move a sound | Drag it from one character to another | Same | — |
| Remove a sound | Drag it off the stage | Same | Focus the character, press Delete or Backspace |
| Mute / solo a layer | Toggle **Mute** / **Solo** on the card | Same | Tab to the toggle, press Space or Enter |
| Pause the music | **PAUSE** in the header | Same | Same |

The header shows tempo, a Play/Pause control, and an eight-step beat indicator.
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
  src/main.jsx          React app: state, drag/tap/keyboard handling, pixel UI
  src/style.css         Eight palette tokens, 8-bit design system, responsive CSS
  index.html            Entry point
  vite.config.js        Vite config (this directory is the root)
  tailwind.config.js    Tailwind content globs
  postcss.config.js     Tailwind pipeline
music-agent/            Working CLI DJ: local Ollama model + yt-dlp + mpv
  agent.py              Chat loop, tool rounds, model/server checks
  src/tools.py          Eight music and playback tools, JSON schemas
  src/player.py         mpv JSON IPC wrapper: play, queue, pause, volume
  README.md             Agent install, run, and troubleshooting
docs/
  architecture.md       Planned conductor service (not implemented)
  preview.webp          Screenshot for this README
backend/                Planned conductor + AI musician adapters (docstrings only)
backend/musicians/      gemini, groq, ollama, rule_based adapters (docstrings only)
tests/                  Test stubs
```

### Stack

React 18, Vite 6, Tailwind CSS (PostCSS pipeline), and the Web Audio API. No
audio libraries, router, state manager, or UI kit. Press Start 2P and Inter load
from Google Fonts; every other visual is CSS or inline SVG drawn in code.
Tailwind's preflight is active, but the components style themselves with
hand-written CSS and the eight palette tokens in `src/style.css`.

The CLI agent is plain Python 3.10+ using the `ollama` and `yt-dlp` packages;
playback goes through mpv's JSON IPC socket, so there is no Python audio
library and no cloud dependency.

## Status

Two things work today, independently.

**The browser game** is complete and playable by hand: twenty sounds, seven
characters, pattern-based layers, mute/solo, pointer drag on mouse and touch,
keyboard placement and removal, and a responsive dark 8-bit interface.

**The first musical agent** is a working command-line DJ in `music-agent/`. A
local Ollama model reads plain-English requests, calls tools, and controls mpv
through yt-dlp streams. It is not connected to the browser game and does not
produce Baton notes — it is a separate, self-contained agent.

| Piece | State |
| --- | --- |
| `music-agent/agent.py` | Working — Ollama chat loop, model/server checks, up to 6 tool rounds, last 10 messages, `num_ctx` 4096 |
| `music-agent/src/tools.py` | Working — `search_music`, `play`, `queue_add`, `pause`, `resume`, `skip`, `set_volume`, `now_playing`; failures return `{"ok": false, "error": ...}` |
| `music-agent/src/player.py` | Working — mpv JSON IPC wrapper with play queue and volume; no extra Python dependency |
| `music-agent/README.md` | Install, run, and troubleshooting for the CLI agent |

The conductor-side musician system is still scaffolding. Nothing in
`backend/` runs, the frontend opens no WebSocket, and no model generates a
musical bar:

| Piece | State |
| --- | --- |
| `backend/main.py` | Empty — no FastAPI app is served |
| `backend/conductor/scheduler.py`, `score.py`, `validator.py` | Docstrings only |
| `backend/musicians/{gemini,groq,ollama,rule_based}_musician.py` | Docstrings only |
| `backend/schemas/notes.py` | Docstrings only |
| `docs/architecture.md` | One-paragraph intent: "The conductor coordinates shared musical state and schedules musicians in parallel. Validated bars are delivered to the frontend over WebSocket." |
| `.env.example` | `OLLAMA_MODEL`/`OLLAMA_HOST` for the CLI agent; `GROQ_API_KEY`/`GEMINI_API_KEY` reserved for the planned model-backed musicians |
| `tests/` | Test stubs |

So the intended shape is a conductor service that asks several musician agents
for a bar, validates their notes against the current key and tempo, and streams
the accepted bars to this frontend over WebSocket. The CLI agent covers the
request → model → tool → playback loop, but not note generation; nothing in the
browser game depends on either yet — the frontend plays the layers you place.

### What still has to be built

- A conductor that owns tempo, key, chord progression, and bar number.
- Musician adapters (Gemini, Groq, Ollama, plus the rule-based baseline) behind a
  common interface, emitting validated bars rather than controlling playback.
- Note validation and correction against the scale in `backend/conductor/validator.py`.
- A WebSocket channel from the conductor to the browser, plus a frontend client
  that applies incoming bars to the stage.
- Shared state so the browser and the agents see the same loop position.

## Development notes

- Audio and drag behaviour cannot be validated by reading code. Run the dev
  server and check in a browser at 375 px, 768 px, and 1440 px.
- On short viewports, scroll until the stage and the sound shelf are both visible
  before dragging (or use tap-to-select or the keyboard path).
- The palette is deliberately capped at eight colour variables in `:root`; extend
  those tokens instead of introducing literal colours. Category accents and
  component frames are aliases of those tokens.
- Motion uses short stepped transitions and is gated behind
  `prefers-reduced-motion`; keep new animation inside that media query.
- `npm run build` is the only configured check — there is no lint or test runner.
- `AGENTS.md` documents the engine invariants and conventions for contributors
  working with coding agents.
