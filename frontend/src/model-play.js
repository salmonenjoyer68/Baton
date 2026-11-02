// The model seam: slot transitions, the request sent to the local model server,
// and the strict parser for its reply. The transitions are pure: they take the
// slot list and return a new one, never mutating a slot, an instrument, or a
// neighbouring slot. The instrument is shared, so its authored pattern is the
// one thing these transitions must leave alone. Parsing and request building
// are pure too, so both are tested without a browser or a model.

import { LOOP_BEATS } from "./loop.js";

export const CONDUCTOR = "conductor";
export const MODEL = "model";

// The two verdicts a conductor can give a landed take. A take starts unrated
// (null) and must be rated before another request is allowed.
export const ACCEPTED = "accepted";
export const REJECTED = "rejected";

// Swapping models is a two-line edit: the server address and the model name.
// The README documents the origin allow-list the browser needs from the server.
export const MODEL_SERVER = "http://127.0.0.1:11434";
export const MODEL_NAME = "qwen2.5:3b";

// Every rejected reply carries one of these names; the slot card turns it into
// copy. No clamping, no padding, no truncation.
export const TAKE_REASONS = Object.freeze({
  NOT_JSON: "not-json",
  NO_PATTERN: "no-pattern",
  WRONG_LENGTH: "wrong-length",
  NON_NUMERIC: "non-numeric",
  OUT_OF_RANGE: "out-of-range",
  NO_REPLY: "no-reply"
});

// Give the slot's assignment to the model. No take exists yet, so the slot
// keeps sounding its current pattern until one lands.
export function handoff(slots, index) {
  const slot = slots[index];
  if (!slot) return slots;
  const next = [...slots];
  next[index] = { ...slot, performer: MODEL, take: null };
  return next;
}

// Place an instrument in a slot. Dropping the instrument the slot already
// holds is not a replacement: it keeps its performer, mixing flags, override
// and take log. A different instrument starts a fresh conductor assignment.
export function placeInstrument(slots, index, instrument) {
  const slot = slots[index];
  if (slot && slot.sound.id === instrument.id) return slots;
  const next = [...slots];
  next[index] = {
    sound: instrument,
    performer: CONDUCTOR,
    muted: slot?.muted ?? false,
    solo: slot?.solo ?? false,
    override: null,
    takes: [],
    take: null
  };
  return next;
}

// Take the slot back: the conductor owns it again, the override and the take
// log are gone, and the instrument's authored pattern resumes untouched.
export function takeBack(slots, index) {
  const slot = slots[index];
  if (!slot) return slots;
  const next = [...slots];
  next[index] = { ...slot, performer: CONDUCTOR, override: null, takes: [], take: null };
  return next;
}

// A take becomes the slot's override; the scheduler's pending/current split
// makes it enter on the next loop boundary. It also joins the take log unrated:
// the conductor must judge it before the model may take another turn. The
// instrument and its authored pattern are untouched, so the shelf and every
// other slot keep playing theirs.
export function applyTake(slots, index, pattern) {
  const slot = slots[index];
  if (!slot) return slots;
  const next = [...slots];
  next[index] = {
    ...slot,
    override: [...pattern],
    takes: [...(slot.takes ?? []), { pattern: [...pattern], rating: null }],
    take: { status: "landed" }
  };
  return next;
}

// True while the latest take has no verdict. The card disables TAKE and the
// request path refuses to run until the conductor accepts or rejects it.
export function hasUnratedTake(slot) {
  const takes = slot?.takes;
  return Boolean(takes && takes.length > 0 && takes[takes.length - 1].rating === null);
}

// Record the conductor's verdict on the newest take. Earlier verdicts and the
// sounding pattern stay as they are; with nothing unrated this changes nothing.
export function rateTake(slots, index, rating) {
  if (rating !== ACCEPTED && rating !== REJECTED) {
    throw new TypeError(`unknown rating: ${rating}`);
  }
  const slot = slots[index];
  if (!slot || !hasUnratedTake(slot)) return slots;
  const takes = slot.takes;
  const next = [...slots];
  next[index] = {
    ...slot,
    takes: [...takes.slice(0, -1), { ...takes[takes.length - 1], rating }],
    take: { status: "rated", rating }
  };
  return next;
}

// Claim a slot for one in-flight request. The token identifies that request:
// a reply whose token no longer sits on the slot was superseded by a handoff,
// a replacement, a removal, or a later request, and must be dropped. A slot
// that is empty, conductor-played, already pending, or holding an unrated take
// is left alone.
export function beginTake(slots, index, token) {
  const slot = slots[index];
  if (!slot || slot.performer !== MODEL || slot.take?.status === "pending" || hasUnratedTake(slot)) {
    return slots;
  }
  const next = [...slots];
  next[index] = { ...slot, take: { status: "pending", token } };
  return next;
}

// Apply one reply to the slot that still carries its token. A usable take
// becomes the override through `applyTake`; every transport failure gets its
// own named status so the card can tell a timeout, a server error, an offline
// server and an unusable reply apart. A stale token changes nothing.
export function settleTake(slots, index, token, result) {
  const slot = slots[index];
  if (!slot || slot.take?.token !== token) return slots;
  if (result.ok) return applyTake(slots, index, result.pattern);
  const take = result.kind === "server"
    ? { status: "server", code: result.status }
    : result.kind === "unusable"
      ? { status: "rejected", reason: result.reason }
      : { status: result.kind };
  const next = [...slots];
  next[index] = { ...slot, take };
  return next;
}

// The request carries only the handed instrument (name, category, the pattern
// the slot is sounding) and the slot's take log. The caller passes the slot's
// live pattern (`override ?? authored`), so a later take is told what is
// actually playing rather than the instrument's original. An empty log says
// this is the first take; otherwise every pattern is listed oldest first with
// its verdict so the model moves toward what was accepted and away from what
// was rejected.
export function buildRequest(instrument, takeLog = [], pattern = instrument.steps) {
  const log = takeLog.length === 0
    ? ["Take log: no prior takes. This is your first take."]
    : [
        "Take log, oldest take first. Each line is the pattern and the conductor's verdict:",
        ...takeLog.map((take, index) =>
          `Take ${index + 1} - ${take.rating ?? "unrated"}: ${take.pattern.join(", ")}`
        ),
        "Move toward the patterns the conductor accepted and away from the ones they rejected."
      ];
  return {
    model: MODEL_NAME,
    stream: false,
    format: "json",
    prompt: [
      "You are a model performer in Baton, a game where instruments share an eight-beat loop.",
      "Propose one pattern for the single instrument you were handed.",
      `Instrument: ${instrument.name}`,
      `Category: ${instrument.category}`,
      `Current pattern, eight velocities from 0 (silent) to 1 (loudest): ${pattern.join(", ")}`,
      ...log,
      'Reply with only a JSON object of the form {"pattern": [v0, v1, v2, v3, v4, v5, v6, v7]}.',
      "The pattern must hold exactly eight numbers, each between 0 and 1. No prose, no code fences, no other keys."
    ].join("\n")
  };
}

// Strict reply parsing: JSON, a pattern array of exactly LOOP_BEATS entries, and
// every entry a finite number within 0-1. A rejection names its reason.
export function parseTake(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, reason: TAKE_REASONS.NOT_JSON };
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.pattern)) {
    return { ok: false, reason: TAKE_REASONS.NO_PATTERN };
  }
  const pattern = payload.pattern;
  if (pattern.length !== LOOP_BEATS) {
    return { ok: false, reason: TAKE_REASONS.WRONG_LENGTH };
  }
  for (const velocity of pattern) {
    if (typeof velocity !== "number" || !Number.isFinite(velocity)) {
      return { ok: false, reason: TAKE_REASONS.NON_NUMERIC };
    }
    if (velocity < 0 || velocity > 1) {
      return { ok: false, reason: TAKE_REASONS.OUT_OF_RANGE };
    }
  }
  return { ok: true, pattern: [...pattern] };
}

// One request, one take, with a deadline. The transport is separated so the
// caller can tell a server that cannot be reached, one that answered with an
// error status, one that took too long, and a reply that cannot be used apart.
// The timeout frees the slot even when the transport ignores the abort signal.
export const TAKE_TIMEOUT_MS = 30000;

export async function requestTake(
  instrument,
  takeLog = [],
  { pattern = instrument.steps, fetchImpl = globalThis.fetch, timeoutMs = TAKE_TIMEOUT_MS } = {}
) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  // Race the transport against the abort so a fetch that ignores the signal
  // cannot leave the request pending forever.
  const deadline = new Promise((resolve, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("take timed out")), { once: true });
  });

  try {
    let response;
    try {
      response = await Promise.race([
        fetchImpl(`${MODEL_SERVER}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequest(instrument, takeLog, pattern)),
          signal: controller.signal
        }),
        deadline
      ]);
    } catch {
      return timedOut ? { ok: false, kind: "timeout" } : { ok: false, kind: "unreachable" };
    }
    if (!response.ok) return { ok: false, kind: "server", status: response.status };
    let envelope;
    try {
      envelope = await Promise.race([response.json(), deadline]);
    } catch {
      return timedOut
        ? { ok: false, kind: "timeout" }
        : { ok: false, kind: "unusable", reason: TAKE_REASONS.NO_REPLY };
    }
    if (!envelope || typeof envelope.response !== "string") {
      return { ok: false, kind: "unusable", reason: TAKE_REASONS.NO_REPLY };
    }
    const parsed = parseTake(envelope.response);
    return parsed.ok ? parsed : { ok: false, kind: "unusable", reason: parsed.reason };
  } finally {
    clearTimeout(timer);
  }
}
