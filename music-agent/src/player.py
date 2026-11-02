"""mpv controller.

Talks to mpv over its JSON IPC socket (a Unix socket on Linux/macOS, a named
pipe on Windows). No extra Python dependency is needed for playback.

Everything that can go wrong on the user's machine raises ``PlayerError`` with
a message a human (and the model) can act on; ``src/tools.py`` converts those
into ``{"ok": false, "error": ...}`` tool results.
"""

from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import tempfile
import time


INSTALL_HINT = (
    "mpv is not installed. Install it first: "
    "`sudo apt install mpv` (Debian/Ubuntu), `brew install mpv` (macOS), "
    "or `winget install mpv` (Windows)."
)


class PlayerError(RuntimeError):
    """A playback failure that is safe to show to the user and the model."""


class MPVPlayer:
    """A single mpv process with a small play queue in front of it."""

    def __init__(self, start_timeout: float = 10.0) -> None:
        self._proc: subprocess.Popen | None = None
        self._conn = None
        self._pipe: str | None = None
        self._buffer = b""
        self._request_id = 0
        self._start_timeout = start_timeout
        self.queue: list[dict] = []
        self.current: dict | None = None

    # -- IPC plumbing -----------------------------------------------------

    def _pipe_path(self) -> str:
        if os.name == "nt":
            return rf"\\.\pipe\music-agent-mpv-{os.getpid()}"
        return os.path.join(tempfile.gettempdir(), f"music-agent-mpv-{os.getpid()}.sock")

    def _connect(self) -> None:
        assert self._pipe is not None
        deadline = time.monotonic() + self._start_timeout
        last_error: OSError | None = None
        while time.monotonic() < deadline:
            try:
                if os.name == "nt":
                    self._conn = open(self._pipe, "r+b")
                else:
                    conn = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                    conn.settimeout(5.0)
                    conn.connect(self._pipe)
                    self._conn = conn
                self._buffer = b""
                return
            except OSError as exc:  # socket not created yet
                last_error = exc
                time.sleep(0.1)
        raise PlayerError(f"mpv did not open its control socket ({last_error}).")

    def _start(self) -> None:
        if shutil.which("mpv") is None:
            raise PlayerError(INSTALL_HINT)
        self._pipe = self._pipe_path()
        if os.name != "nt":
            try:
                os.unlink(self._pipe)
            except FileNotFoundError:
                pass
        args = [
            "mpv",
            "--idle=yes",
            "--no-video",
            "--force-window=no",
            "--no-terminal",
            "--audio-display=no",
            "--ytdl=no",
            "--volume=100",
            f"--input-ipc-server={self._pipe}",
        ]
        try:
            self._proc = subprocess.Popen(
                args,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except OSError as exc:
            raise PlayerError(f"could not start mpv: {exc}") from exc
        try:
            self._connect()
        except PlayerError:
            self._kill_process()
            raise

    def _kill_process(self) -> None:
        if self._proc is not None and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        self._proc = None
        self._close_conn()
        if self._pipe and os.name != "nt":
            try:
                os.unlink(self._pipe)
            except OSError:
                pass

    def _close_conn(self) -> None:
        conn, self._conn = self._conn, None
        if conn is None:
            return
        try:
            conn.close()
        except OSError:
            pass

    def _ensure_started(self) -> None:
        if self._proc is not None and self._proc.poll() is None and self._conn is not None:
            return
        self._kill_process()
        self._start()

    def _send(self, payload: dict) -> None:
        data = (json.dumps(payload) + "\n").encode("utf-8")
        conn = self._conn
        if conn is None:
            raise PlayerError("mpv is not running.")
        if os.name == "nt":
            conn.write(data)
            conn.flush()
        else:
            conn.sendall(data)

    def _readline(self, timeout: float) -> bytes:
        conn = self._conn
        if conn is None:
            raise PlayerError("mpv is not running.")
        if os.name == "nt":
            line = conn.readline()
            if not line:
                raise PlayerError("mpv closed its control pipe.")
            return line
        conn.settimeout(timeout)
        while b"\n" not in self._buffer:
            try:
                chunk = conn.recv(65536)
            except socket.timeout as exc:
                raise PlayerError("mpv did not answer in time.") from exc
            if not chunk:
                raise PlayerError("mpv closed its control socket.")
            self._buffer += chunk
        line, _, self._buffer = self._buffer.partition(b"\n")
        return line + b"\n"

    def _command(self, *args, timeout: float = 5.0):
        self._ensure_started()
        self._request_id += 1
        request_id = self._request_id
        self._send({"command": list(args), "request_id": request_id})
        deadline = time.monotonic() + timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise PlayerError(f"mpv did not answer `{args[0]}` in time.")
            raw = self._readline(remaining)
            try:
                reply = json.loads(raw.decode("utf-8", "replace"))
            except json.JSONDecodeError:
                continue
            if reply.get("request_id") != request_id:
                continue  # unsolicited event, not our reply
            if reply.get("error") not in (None, "success"):
                raise PlayerError(f"mpv rejected `{args[0]}`: {reply['error']}")
            return reply.get("data")

    # -- public API -------------------------------------------------------

    def play(self, url: str) -> dict:
        """Play ``url`` now, replacing whatever is playing."""
        self._command("loadfile", url, "replace")
        title = self._wait_for_title(url)
        self.current = {"title": title, "url": url}
        return self.current

    def _wait_for_title(self, url: str) -> str:
        for _ in range(10):
            try:
                title = self._command("get_property", "media-title", timeout=2.0)
            except PlayerError:
                title = None
            if isinstance(title, str) and title.strip() and title != url:
                return title.strip()
            time.sleep(0.1)
        return url

    def pause(self) -> dict:
        if self.current is None:
            raise PlayerError("nothing is playing, so there is nothing to pause.")
        self._command("set_property", "pause", True)
        return self.status()

    def resume(self) -> dict:
        if self.current is None:
            raise PlayerError("nothing is loaded, so there is nothing to resume.")
        self._command("set_property", "pause", False)
        return self.status()

    def enqueue(self, url: str, title: str | None = None) -> dict:
        self.queue.append({"url": url, "title": title or url})
        return {"queued": len(self.queue)}

    def pop_next(self) -> dict:
        if not self.queue:
            raise PlayerError("the queue is empty.")
        return self.queue.pop(0)

    def set_volume(self, level: int) -> int:
        self._command("set_property", "volume", int(level))
        return int(level)

    def status(self) -> dict:
        result = {
            "playing": False,
            "paused": False,
            "volume": 100,
            "current": None,
            "queue": list(self.queue),
        }
        if self._proc is None or self._proc.poll() is not None:
            return result
        try:
            result["volume"] = int(self._command("get_property", "volume"))
            result["paused"] = bool(self._command("get_property", "pause"))
            idle = bool(self._command("get_property", "idle-active"))
        except PlayerError:
            return result
        if self.current is not None and not idle:
            title = self.current["title"]
            try:
                live_title = self._command("get_property", "media-title")
                if isinstance(live_title, str) and live_title.strip():
                    title = live_title.strip()
            except PlayerError:
                pass
            result["current"] = {"title": title, "url": self.current["url"]}
            result["playing"] = not result["paused"]
        return result

    def close(self) -> None:
        """Stop mpv and remove the control socket. Safe to call repeatedly."""
        if self._proc is not None:
            try:
                self._command("quit", timeout=2.0)
            except PlayerError:
                pass
        self._kill_process()
        self.current = None
        self.queue.clear()
