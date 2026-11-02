"""Command-line music DJ agent.

Reads a request, lets a local Ollama model call the tools in ``src.tools``,
and prints the model's reply. Run with ``python agent.py`` from the
``music-agent/`` folder.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import ollama

from src import tools


def _load_dotenv() -> None:
    """Load the repo-root `.env`. Real environment variables win."""
    path = Path(__file__).resolve().parent.parent / ".env"
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


_load_dotenv()

MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
NUM_CTX = 4096
TEMPERATURE = 0.2
# The spec's stack note overrides the 20-message default: 4096 context needs a
# short history, so only the last 10 messages go to the model.
HISTORY_LIMIT = 10
TOOL_ROUND_LIMIT = 6

SYSTEM_PROMPT = (
    "You are a music DJ agent. Use tools to search and play music. "
    "For vague requests (a mood, an activity), pick fitting search queries "
    "yourself, play the best match, and queue 2 more. Keep replies to 1-2 short "
    "sentences. Never claim music is playing unless a tool call succeeded."
)


def _model_names() -> list[str]:
    listing = ollama.list()
    models = listing.get("models") if isinstance(listing, dict) else getattr(listing, "models", [])
    names = []
    for entry in models or []:
        if isinstance(entry, dict):
            name = entry.get("model") or entry.get("name")
        else:
            name = getattr(entry, "model", None) or getattr(entry, "name", None)
        if name:
            names.append(name)
    return names


def _model_available(wanted: str, names: list[str]) -> bool:
    if wanted in names:
        return True
    if ":" in wanted:
        return False
    return any(name.split(":")[0] == wanted for name in names)


def ensure_ready() -> bool:
    """Fail fast with the exact fix when Ollama or the model is missing."""
    try:
        names = _model_names()
    except Exception as exc:  # server down, wrong host, package mismatch
        print("Could not reach the Ollama server.", file=sys.stderr)
        print(f"  Error: {exc}", file=sys.stderr)
        print("  Fix: start it with `ollama serve`, then run this again.", file=sys.stderr)
        return False
    if not _model_available(MODEL, names):
        print(f"Ollama is running, but the model {MODEL!r} is not pulled.", file=sys.stderr)
        print(f"  Fix: ollama pull {MODEL}", file=sys.stderr)
        if names:
            print("  Already available: " + ", ".join(sorted(names)), file=sys.stderr)
        return False
    return True


def _message(response) -> dict:
    if isinstance(response, dict):
        return response.get("message") or {}
    message = getattr(response, "message", None)
    if message is None:
        return {}
    if isinstance(message, dict):
        return message
    return {
        "content": getattr(message, "content", "") or "",
        "tool_calls": getattr(message, "tool_calls", None) or [],
    }


def _content(message: dict) -> str:
    content = message.get("content") or ""
    return content if isinstance(content, str) else str(content)


def _tool_calls(message: dict) -> list[dict]:
    """Normalise Ollama's tool-call objects into plain chat-protocol dicts."""
    calls = message.get("tool_calls") or []
    normalised = []
    for call in calls:
        function = call.get("function") if isinstance(call, dict) else getattr(call, "function", None)
        if function is None:
            continue
        if isinstance(function, dict):
            name = function.get("name")
            arguments = function.get("arguments")
        else:
            name = getattr(function, "name", None)
            arguments = getattr(function, "arguments", None)
        if not name:
            continue
        normalised.append({"function": {"name": name, "arguments": arguments}})
    return normalised


def _trim(messages: list[dict]) -> list[dict]:
    """System prompt plus short history, never cutting into the current turn.

    The newest user message must survive intact, otherwise a long tool sequence
    would be trimmed away and the model would be asked to answer nothing.
    """
    if not messages:
        return []
    system, body = messages[0], list(messages[1:])
    if not body:
        return [system]
    user_turns = [index for index, message in enumerate(body) if message.get("role") == "user"]
    if not user_turns:
        return [system] + body[-HISTORY_LIMIT:]
    last_user = user_turns[-1]
    start = min(max(0, len(body) - HISTORY_LIMIT), last_user)
    while start < last_user and body[start].get("role") != "user":
        start += 1
    return [system] + body[start:]


def _chat(messages: list[dict], with_tools: bool):
    kwargs = {
        "model": MODEL,
        "messages": _trim(messages),
        "options": {"num_ctx": NUM_CTX, "temperature": TEMPERATURE},
    }
    if with_tools:
        kwargs["tools"] = tools.TOOL_SCHEMAS
    return ollama.chat(**kwargs)


def run_turn(messages: list[dict], user_text: str) -> str:
    messages.append({"role": "user", "content": user_text})
    for _round in range(TOOL_ROUND_LIMIT):
        try:
            message = _message(_chat(messages, with_tools=True))
        except Exception as exc:
            return f"Sorry, the local model failed: {exc}"
        calls = _tool_calls(message)
        content = _content(message)
        if not calls:
            reply = content.strip() or "(the model sent an empty reply)"
            messages.append({"role": "assistant", "content": reply})
            return reply
        messages.append({"role": "assistant", "content": content, "tool_calls": calls})
        for call in calls:
            name = call["function"]["name"]
            result = tools.call_tool(name, call["function"]["arguments"])
            print(f"  · {name} -> {'ok' if result.get('ok') else 'error'}")
            messages.append(
                {
                    "role": "tool",
                    "tool_name": name,
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )
    # Out of tool rounds: ask for a plain summary instead of looping forever.
    try:
        message = _message(_chat(messages, with_tools=False))
    except Exception as exc:
        return f"Sorry, the local model failed: {exc}"
    reply = _content(message).strip() or "Stopped after 6 tool rounds."
    messages.append({"role": "assistant", "content": reply})
    return reply


def main() -> int:
    if not ensure_ready():
        return 1
    print(f"Music agent ready (model: {MODEL}). Ask for something to play.")
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    try:
        while True:
            try:
                user_text = input("\nyou> ").strip()
            except EOFError:
                print()
                break
            if not user_text:
                continue
            reply = run_turn(messages, user_text)
            messages = _trim(messages)
            print(f"agent> {reply}")
    except KeyboardInterrupt:
        print("\nStopping playback.")
    finally:
        tools.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
