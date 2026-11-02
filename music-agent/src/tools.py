"""Agent tools: music search (yt-dlp) plus playback control (mpv).

Every public tool returns a plain dict. Failures are ``{"ok": False, "error":
"..."}`` instead of exceptions, because small local models often recover when
they can read *why* something failed.

Tool schemas are deliberately flat and short: 3B-class models lose accuracy on
deeply nested parameter objects.
"""

from __future__ import annotations

import json

import yt_dlp

from .player import MPVPlayer, PlayerError

SEARCH_LIMIT = 5

# Search only: yt-dlp must not write anything to disk.
SEARCH_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "extract_flat": True,
    "noplaylist": True,
    "cachedir": False,
    "socket_timeout": 15,
}

# Resolve a page URL to a direct audio stream URL; still no download.
RESOLVE_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noplaylist": True,
    "cachedir": False,
    "format": "bestaudio/best",
    "socket_timeout": 15,
}

_player = MPVPlayer()
_titles: dict[str, str] = {}


def shutdown() -> None:
    """Stop mpv and release the control socket."""
    _player.close()


def _error(message: str) -> dict:
    return {"ok": False, "error": message}


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _as_int(value) -> int | None:
    """Numbers often arrive as strings from small models (e.g. "30")."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else None
    if isinstance(value, str):
        text = value.strip()
        try:
            return int(text)
        except ValueError:
            try:
                number = float(text)
            except ValueError:
                return None
            return int(number) if number.is_integer() else None
    return None


def _format_duration(seconds) -> str:
    number = _as_int(seconds)
    if number is None or number <= 0:
        return "unknown"
    minutes, remainder = divmod(number, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{remainder:02d}"
    return f"{minutes}:{remainder:02d}"


def _first_entry(info: dict) -> dict:
    entries = info.get("entries")
    if entries:
        for entry in entries:
            if entry:
                return entry
    return info


def _resolve_stream(url: str) -> tuple[str, str]:
    with yt_dlp.YoutubeDL(RESOLVE_OPTS) as ydl:
        info = ydl.extract_info(url, download=False)
    if not info:
        raise RuntimeError("no media found at that URL")
    info = _first_entry(info)
    stream = info.get("url")
    if not stream:
        candidates = [
            fmt for fmt in info.get("formats") or []
            if fmt.get("url") and fmt.get("acodec") not in (None, "none")
        ]
        candidates.sort(key=lambda fmt: fmt.get("abr") or 0)
        if not candidates:
            raise RuntimeError("no audio stream is available")
        stream = candidates[-1]["url"]
    return stream, info.get("title") or _titles.get(url) or url


# -- tools ----------------------------------------------------------------


def search_music(query) -> dict:
    text = _text(query)
    if not text:
        return _error("query must be a non-empty string.")
    try:
        with yt_dlp.YoutubeDL(SEARCH_OPTS) as ydl:
            info = ydl.extract_info(f"ytsearch{SEARCH_LIMIT}:{text}", download=False)
    except Exception as exc:  # network, DNS, yt-dlp extraction
        return _error(f"search failed: {exc}")
    results = []
    for entry in (info or {}).get("entries") or []:
        if not entry:
            continue
        url = entry.get("webpage_url") or entry.get("url")
        if not url:
            continue
        title = entry.get("title") or "unknown title"
        _titles[url] = title
        results.append(
            {
                "title": title,
                "artist": entry.get("channel") or entry.get("uploader") or "unknown",
                "duration": _format_duration(entry.get("duration")),
                "url": url,
            }
        )
    if not results:
        return _error(f"no search results for {text!r}.")
    return {"ok": True, "results": results}


def play(url) -> dict:
    target = _text(url)
    if not target:
        return _error("url must be a non-empty string.")
    if not target.lower().startswith(("http://", "https://")):
        return _error("url must be an http(s) link; call search_music first.")
    try:
        stream, _title = _resolve_stream(target)
    except Exception as exc:
        return _error(f"could not resolve that link: {exc}")
    try:
        track = _player.play(stream)
    except PlayerError as exc:
        return _error(str(exc))
    return {"ok": True, "playing": track["title"], "url": target}


def queue_add(url) -> dict:
    target = _text(url)
    if not target:
        return _error("url must be a non-empty string.")
    if not target.lower().startswith(("http://", "https://")):
        return _error("url must be an http(s) link; call search_music first.")
    title = _titles.get(target, target)
    length = _player.enqueue(target, title)["queued"]
    return {"ok": True, "queued": title, "queue_length": length}


def skip() -> dict:
    try:
        entry = _player.pop_next()
    except PlayerError as exc:
        return _error(str(exc))
    try:
        stream, title = _resolve_stream(entry["url"])
    except Exception as exc:
        _player.queue.insert(0, entry)  # keep it so a retry is possible
        return _error(f"could not resolve the next track: {exc}")
    try:
        track = _player.play(stream)
    except PlayerError as exc:
        _player.queue.insert(0, entry)
        return _error(str(exc))
    return {"ok": True, "playing": track["title"] or title}


def pause() -> dict:
    try:
        state = _player.pause()
    except PlayerError as exc:
        return _error(str(exc))
    return {"ok": True, "paused": True, "current": _current_title(state)}


def resume() -> dict:
    try:
        state = _player.resume()
    except PlayerError as exc:
        return _error(str(exc))
    return {"ok": True, "paused": False, "current": _current_title(state)}


def set_volume(level) -> dict:
    value = _as_int(level)
    if value is None:
        return _error("level must be a whole number between 0 and 100.")
    if not 0 <= value <= 100:
        return _error("level must be between 0 and 100.")
    try:
        applied = _player.set_volume(value)
    except PlayerError as exc:
        return _error(str(exc))
    return {"ok": True, "volume": applied}


def now_playing() -> dict:
    state = _player.status()
    return {
        "ok": True,
        "playing": state["playing"],
        "paused": state["paused"],
        "volume": state["volume"],
        "current": _current_title(state),
        "queue": [entry.get("title") or entry["url"] for entry in state["queue"]],
    }


def _current_title(state: dict) -> str | None:
    current = state.get("current")
    return current["title"] if current else None


TOOL_FUNCS = {
    "search_music": search_music,
    "play": play,
    "queue_add": queue_add,
    "pause": pause,
    "resume": resume,
    "skip": skip,
    "set_volume": set_volume,
    "now_playing": now_playing,
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_music",
            "description": "Search music; returns 5 results with title, artist, duration, url.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "what to search for"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "play",
            "description": "Play a result url now, replacing the current track.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string", "description": "url from search_music"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "queue_add",
            "description": "Add a result url to the end of the queue.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string", "description": "url from search_music"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pause",
            "description": "Pause playback.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "resume",
            "description": "Resume playback.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "skip",
            "description": "Play the next queued track.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_volume",
            "description": "Set volume, 0-100.",
            "parameters": {
                "type": "object",
                "properties": {"level": {"type": "integer", "description": "0 to 100"}},
                "required": ["level"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "now_playing",
            "description": "Return the current track and the queue.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

# Every tool takes only the properties declared in its schema; anything else the
# model invents is dropped before the call.
_TOOL_ARGS = {
    schema["function"]["name"]: set(schema["function"]["parameters"].get("properties", {}))
    for schema in TOOL_SCHEMAS
}


def parse_arguments(raw) -> dict | None:
    """Accept a dict or a JSON string (older models emit strings)."""
    if raw is None:
        return {}
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return {}
        try:
            raw = json.loads(text)
        except json.JSONDecodeError:
            return None
    return raw if isinstance(raw, dict) else None


def call_tool(name: str, arguments) -> dict:
    """Run a tool by name without ever raising."""
    func = TOOL_FUNCS.get(name)
    if func is None:
        return _error(f"unknown tool {name!r}.")
    parsed = parse_arguments(arguments)
    if parsed is None:
        return _error(f"arguments for {name} were not a JSON object.")
    kwargs = {key: parsed[key] for key in _TOOL_ARGS[name] if key in parsed}
    try:
        return func(**kwargs)
    except Exception as exc:  # last line of defence, the loop must not die
        return _error(f"{name} failed: {exc}")
