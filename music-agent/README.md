# Music Agent

A command-line music DJ. You type a request in plain English; a small local
model (served by [Ollama](https://ollama.com)) decides which tools to call, and
the music plays on your machine through [mpv](https://mpv.io). No cloud API, no
API key, no audio written to disk.

```
you> play something chill for coding
  · search_music -> ok
  · play -> ok
  · queue_add -> ok
  · queue_add -> ok
agent> Playing "lofi hip hop radio" and queued two more for you.
```

## Requirements

- Python 3.10+
- [Ollama](https://ollama.com/download) installed and running
- [mpv](https://mpv.io/installation/) installed and on your `PATH`
- A machine that can run a 3B–4B model (the default needs ~2 GB free VRAM/RAM)

## Install

The repo already has a virtualenv at the repository root; reuse it instead of
creating a second one:

```sh
# from the repository root (the folder containing music-agent/)
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r music-agent/requirements.txt
cd music-agent
```

Install the player:

```sh
sudo apt install mpv               # Debian / Ubuntu
brew install mpv                   # macOS
winget install mpv                 # Windows
```

Install Ollama, start it, and pull a small tool-calling model:

```sh
ollama serve                       # leave this running in another terminal
ollama pull qwen2.5:3b
```

Use a different model with one environment variable — `llama3.2:3b` and
`qwen3:4b` also work:

```sh
OLLAMA_MODEL=llama3.2:3b python agent.py
```

Or put it in the repo-root `.env` (copy `.env.example` there), which `agent.py`
reads on startup. Real environment variables override the file:

```sh
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_HOST=http://127.0.0.1:11434
```

## Run

```sh
python agent.py
```

The agent checks on startup that the Ollama server answers and that the model
is pulled. If not, it prints the exact `ollama serve` / `ollama pull` command
and exits. Ctrl+C stops playback and closes mpv.

## Example prompts

- `play something chill for coding`
- `queue some Beatles`
- `skip this`
- `turn it down to 30`
- `what's playing?`

## How it works

- `agent.py` — the chat loop. Sends your message plus tool schemas to Ollama,
  runs every requested tool, feeds the results back, and repeats until the model
  replies with text (at most 6 tool rounds per message). History is trimmed to
  the last 10 messages and `num_ctx` is 4096 to keep memory small.
- `src/tools.py` — eight tools: `search_music`, `play`, `queue_add`, `pause`,
  `resume`, `skip`, `set_volume`, `now_playing`. Search uses
  `yt-dlp "ytsearch5:<query>"` and returns title, artist, duration, and URL.
  Failures come back as `{"ok": false, "error": "..."}` so the model can recover.
- `src/player.py` — an mpv wrapper speaking mpv's JSON IPC (Unix socket, or a
  named pipe on Windows). Owns the play queue and the volume.

## Troubleshooting

- `mpv is not installed.` — install mpv (see above); search still works without it.
- `Could not reach the Ollama server.` — run `ollama serve`.
- `the model ... is not pulled` — run `ollama pull <model>`.
- A track fails to resolve — YouTube changes often; upgrade yt-dlp:
  `pip install -U yt-dlp`.
