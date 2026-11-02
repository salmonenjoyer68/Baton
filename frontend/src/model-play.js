// The model seam: slot transitions, the request sent to the local model server,
// and the strict parser for its reply. The transitions are pure: they take the
// slot list and return a new one, never mutating a slot, an instrument, or a
// neighbouring slot. The instrument is shared, so its authored pattern is the
// one thing these transitions must leave alone. Parsing and request building
// are pure too, so both are tested without a browser or a model.

import { LOOP_BEATS } from "./audio-engine.js";

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
  next[index] = { ...slot, performer: MODEL };
  return next;
}

// Take the slot back: the conductor owns it again, the override and the take
// log are gone, and the instrument's authored pattern resumes untouched.
export function takeBack(slots, index) {
  const slot = slots[index];
  if (!slot) return slots;
  const next = [...slots];
  next[index] = { ...slot, performer: CONDUCTOR, override: null, takes: [] };
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
    takes: [...(slot.takes ?? []), { pattern: [...pattern], rating: null }]
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
    takes: [...takes.slice(0, -1), { ...takes[takes.length - 1], rating }]
  };
  return next;
}

// The request carries only the handed instrument (name, category, current
// eight velocities) and the slot's take log. An empty log says this is the
// first take; otherwise every pattern is listed oldest first with its verdict
// so the model moves toward what was accepted and away from what was rejected.
export function buildRequest(instrument, takeLog = []) {
  const log = takeLog.length === 0
    ? ["Take log: no prior takes. This is your first take."]
    : [
        "Take log, oldest take first. Each line is the pattern and the conductor's verdict:",
        ...takeLog.map((take, index) =>
          `Take ${index + 1} - ${take.rating ?? "unrated"}: ${take.pattern.join(", ")}`
        ),
        "Move toward the patterns the conductor accepted and away from the ones they rejected. Do not repeat a prior pattern exactly."
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
      `Current pattern, eight velocities from 0 (silent) to 1 (loudest): ${instrument.steps.join(", ")}`,
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

// One request, one take. The transport is separated so the caller can tell a
// server that cannot be reached from a reply that cannot be used.
export async function requestTake(instrument, takeLog = [], fetchImpl = globalThis.fetch) {
  let response;
  try {
    response = await fetchImpl(`${MODEL_SERVER}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequest(instrument, takeLog))
    });
  } catch {
    return { ok: false, kind: "unreachable" };
  }
  if (!response.ok) return { ok: false, kind: "unreachable" };
  let envelope;
  try {
    envelope = await response.json();
  } catch {
    return { ok: false, kind: "unusable", reason: TAKE_REASONS.NO_REPLY };
  }
  if (!envelope || typeof envelope.response !== "string") {
    return { ok: false, kind: "unusable", reason: TAKE_REASONS.NO_REPLY };
  }
  const parsed = parseTake(envelope.response);
  return parsed.ok ? parsed : { ok: false, kind: "unusable", reason: parsed.reason };
}
