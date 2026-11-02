// Pure slot transitions for handoff. Tested at the seam the parent spec names:
// a slot list goes in, a new slot list comes out, and no instrument is mutated.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACCEPTED,
  applyTake,
  beginTake,
  buildRequest,
  handoff,
  hasUnratedTake,
  MODEL,
  MODEL_NAME,
  MODEL_SERVER,
  parseTake,
  placeInstrument,
  rateTake,
  REJECTED,
  requestTake,
  settleTake,
  takeBack
} from "./model-play.js";
import { SOUNDS } from "./sounds.js";

// An assignment is one occupied slot: the shared instrument plus its performer,
// mixing flags, override and take log.
function assignment(sound, extra = {}) {
  return {
    sound,
    performer: "conductor",
    muted: false,
    solo: false,
    override: null,
    takes: [],
    take: null,
    ...extra
  };
}

test("handing a slot over marks its performer as the model", () => {
  const instrument = SOUNDS[0];
  const slots = [assignment(instrument, { muted: true }), null];
  const next = handoff(slots, 0);

  assert.equal(next[0].performer, "model");
  assert.equal(next[0].sound, instrument);
  assert.equal(next[0].muted, true);
  assert.equal(next[1], null);
  assert.equal(slots[0].performer, "conductor", "the previous slot list is untouched");
});

test("handing one slot over leaves a second slot with the same instrument alone", () => {
  const instrument = SOUNDS[0];
  const authored = [...instrument.steps];
  const otherOverride = [0.4, 0, 0, 0, 0.4, 0, 0, 0];
  const otherSlot = assignment(instrument, { muted: true, override: otherOverride });
  const slots = [assignment(instrument), otherSlot];
  const next = handoff(slots, 0);

  assert.equal(next[1], otherSlot, "the neighbouring assignment is not replaced");
  assert.equal(next[1].performer, "conductor");
  assert.equal(next[1].override, otherOverride);
  assert.deepEqual(instrument.steps, authored, "the instrument's authored pattern is unchanged");
  assert.equal(next[0].sound, next[1].sound, "both slots still share one instrument");
});

test("taking a slot back restores the conductor and clears the override and take log", () => {
  const instrument = SOUNDS[0];
  const authored = [...instrument.steps];
  const override = [0.5, 0, 0, 0, 0.5, 0, 0, 0];
  const takes = [{ pattern: override, rating: "accepted" }];
  const slots = [assignment(instrument, { performer: "model", override, takes, muted: true })];
  const next = takeBack(slots, 0);

  assert.equal(next[0].performer, "conductor");
  assert.equal(next[0].override, null);
  assert.deepEqual(next[0].takes, []);
  assert.equal(next[0].sound, instrument);
  assert.deepEqual(next[0].sound.steps, authored, "the authored pattern resumes unchanged");
  assert.equal(next[0].muted, true);
  assert.equal(slots[0].performer, "model", "the previous slot list is untouched");
  assert.equal(slots[0].override, override);
  assert.deepEqual(slots[0].takes, takes);
});

test("taking a slot back leaves a second slot with the same instrument alone", () => {
  const instrument = SOUNDS[0];
  const otherOverride = [0, 0.6, 0, 0, 0, 0, 0.6, 0];
  const otherSlot = assignment(instrument, {
    performer: "model",
    override: otherOverride,
    takes: [{ pattern: otherOverride, rating: null }]
  });
  const slots = [
    assignment(instrument, { performer: "model", override: [1, 0, 0, 0, 0, 0, 0, 0] }),
    otherSlot
  ];
  const next = takeBack(slots, 0);

  assert.equal(next[1], otherSlot, "the neighbouring assignment is not replaced");
  assert.equal(next[1].performer, "model");
  assert.equal(next[1].override, otherOverride);
  assert.equal(next[1].takes.length, 1);
  assert.equal(next[0].sound, next[1].sound, "both slots still share one instrument");
  assert.deepEqual(instrument.steps, SOUNDS[0].steps, "the instrument's authored pattern is unchanged");
});

// A take is one model reply. Strict parsing is the contract: JSON, an eight
// velocity pattern, every velocity a number in 0-1, otherwise a named reason.
test("parses a valid take into eight velocities", () => {
  const reply = '{"pattern": [1, 0, 0.25, 0, 0.5, 0, 0, 0.75]}';
  assert.deepEqual(parseTake(reply), {
    ok: true,
    pattern: [1, 0, 0.25, 0, 0.5, 0, 0, 0.75]
  });
});

test("accepts the 0 and 1 boundaries", () => {
  const reply = '{"pattern": [0, 1, 0, 1, 0, 1, 0, 1]}';
  assert.deepEqual(parseTake(reply), { ok: true, pattern: [0, 1, 0, 1, 0, 1, 0, 1] });
});

test("rejects a reply that is not JSON with the not-json reason", () => {
  assert.deepEqual(parseTake("The model proposes a kick on beats one and five."), {
    ok: false,
    reason: "not-json"
  });
  assert.deepEqual(parseTake(""), { ok: false, reason: "not-json" });
});

test("rejects JSON without a pattern array with the no-pattern reason", () => {
  assert.deepEqual(parseTake('{"groove": [1, 0, 1, 0, 1, 0, 1, 0]}'), {
    ok: false,
    reason: "no-pattern"
  });
  assert.deepEqual(parseTake("[1, 0, 1, 0, 1, 0, 1, 0]"), { ok: false, reason: "no-pattern" });
});

test("rejects a pattern that is not eight beats long with the wrong-length reason", () => {
  assert.deepEqual(parseTake('{"pattern": [1, 0, 1, 0, 1, 0, 1]}'), {
    ok: false,
    reason: "wrong-length"
  });
  assert.deepEqual(parseTake('{"pattern": [1, 0, 1, 0, 1, 0, 1, 0, 1]}'), {
    ok: false,
    reason: "wrong-length"
  });
});

test("rejects a non-numeric velocity with the non-numeric reason", () => {
  assert.deepEqual(parseTake('{"pattern": [1, 0, "0.5", 0, 0, 0, 0, 0]}'), {
    ok: false,
    reason: "non-numeric"
  });
  assert.deepEqual(parseTake('{"pattern": [1, 0, null, 0, 0, 0, 0, 0]}'), {
    ok: false,
    reason: "non-numeric"
  });
});

test("rejects a velocity outside 0-1 with the out-of-range reason", () => {
  assert.deepEqual(parseTake('{"pattern": [1, 0, 1.2, 0, 0, 0, 0, 0]}'), {
    ok: false,
    reason: "out-of-range"
  });
  assert.deepEqual(parseTake('{"pattern": [1, 0, -0.1, 0, 0, 0, 0, 0]}'), {
    ok: false,
    reason: "out-of-range"
  });
});

// The request carries only the handed instrument: name, category and its
// current eight velocities. Nothing about any other slot is in it.
test("builds a request for one instrument with its name, category and pattern", () => {
  const instrument = SOUNDS.find((sound) => sound.id === "beats-kick");
  const request = buildRequest(instrument);
  const prompt = request.prompt;

  assert.equal(request.model, MODEL_NAME);
  assert.equal(request.stream, false);
  assert.equal(request.format, "json");
  assert.match(prompt, /Kick bloom/);
  assert.match(prompt, /beats/);
  assert.match(prompt, /1, 0, 0, 0, 0\.85, 0, 0, 0/);
  assert.doesNotMatch(prompt, /Clap snap/, "another instrument never leaks into the prompt");
  assert.equal((prompt.match(/eight/gi) ?? []).length > 0, true, "the reply shape is stated");
});

// After a take lands, the slot sounds the override, so the prompt's "current
// pattern" must be that live pattern, not the instrument's authored one.
test("builds the current pattern from the slot's live pattern", () => {
  const instrument = SOUNDS.find((sound) => sound.id === "beats-kick");
  const live = [0, 0.3, 0, 0, 0, 0.3, 0, 0];
  const prompt = buildRequest(instrument, [], live).prompt;

  assert.match(prompt, /Current pattern[^\n]*0, 0\.3, 0, 0, 0, 0\.3, 0, 0/);
  assert.doesNotMatch(prompt, /1, 0, 0, 0, 0\.85/, "the authored pattern is not passed off as current");
});

// The log is what lets a later take move toward what was approved. It reaches
// the model oldest-first with every pattern and its verdict, and an empty log
// says so instead of inventing history.
test("builds a request with no prior takes when the log is empty", () => {
  const instrument = SOUNDS.find((sound) => sound.id === "beats-kick");
  const prompt = buildRequest(instrument, []).prompt;

  assert.match(prompt, /no prior takes/i);
  assert.match(prompt, /first take/i);
  assert.doesNotMatch(prompt, /Take 1\b/);
  assert.doesNotMatch(prompt, /accepted|rejected/i, "no verdict is claimed when none exists");
});

test("builds a request with the mixed verdict log oldest to newest", () => {
  const instrument = SOUNDS.find((sound) => sound.id === "beats-kick");
  const takes = [
    { pattern: [1, 0, 0, 0, 0.5, 0, 0, 0], rating: ACCEPTED },
    { pattern: [0, 0.25, 0, 0.5, 0, 0.25, 0, 0.5], rating: REJECTED },
    { pattern: [0.75, 0, 0.25, 0, 0.75, 0, 0.25, 0], rating: ACCEPTED }
  ];
  const prompt = buildRequest(instrument, takes).prompt;

  const first = prompt.indexOf("1, 0, 0, 0, 0.5, 0, 0, 0");
  const second = prompt.indexOf("0, 0.25, 0, 0.5, 0, 0.25, 0, 0.5");
  const third = prompt.indexOf("0.75, 0, 0.25, 0, 0.75, 0, 0.25, 0");
  assert.ok(first >= 0 && second > first && third > second, "the log is in oldest-first order");
  assert.match(prompt, /Take 1 - accepted:/);
  assert.match(prompt, /Take 2 - rejected:/);
  assert.match(prompt, /Take 3 - accepted:/);
  assert.match(prompt, /move toward/i, "accepted takes are named as the direction");
  assert.match(prompt, /away from/i, "rejected takes are named as what to avoid");
});

// Applying a take is the pure transition the scheduler reads: the override
// belongs to the slot, while the instrument's authored pattern and every other
// slot holding that instrument stay untouched.
test("applying a take installs the pattern as the slot's override only", () => {
  const instrument = SOUNDS[0];
  const authored = [...instrument.steps];
  const otherOverride = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];
  const modelSlot = assignment(instrument, { performer: "model", muted: true, solo: true });
  const otherSlot = assignment(instrument, { performer: "model", override: otherOverride });
  const slots = [modelSlot, otherSlot];
  const pattern = [0.9, 0, 0, 0.4, 0, 0, 0.4, 0];
  const next = applyTake(slots, 0, pattern);

  assert.deepEqual(next[0].override, pattern);
  assert.equal(next[0].performer, "model");
  assert.equal(next[0].sound, instrument);
  assert.equal(next[0].muted, true);
  assert.equal(next[0].solo, true);
  assert.equal(next[1], otherSlot, "the neighbouring assignment is not replaced");
  assert.equal(next[1].override, otherOverride);
  assert.deepEqual(instrument.steps, authored, "the instrument's authored pattern is unchanged");
  assert.equal(modelSlot.override, null, "the previous slot list is untouched");
  assert.notEqual(next[0].override, pattern, "the slot owns its pattern, not the caller's array");
});

test("applying a take to an empty slot changes nothing", () => {
  const slots = [null];
  assert.equal(applyTake(slots, 0, [1, 0, 1, 0, 1, 0, 1, 0]), slots);
});

// Every landed take joins the slot's take log oldest-first and starts unrated,
// so the next request can carry it and the conductor cannot skip a verdict.
test("a landed take joins the log unrated", () => {
  const instrument = SOUNDS[0];
  const prior = { pattern: [1, 0, 0, 0, 0, 0, 0, 0], rating: REJECTED };
  const slots = [assignment(instrument, { performer: "model", takes: [prior] })];
  const pattern = [0, 0, 0.5, 0, 0, 0, 0.5, 0];
  const next = applyTake(slots, 0, pattern);

  assert.deepEqual(next[0].takes, [prior, { pattern, rating: null }]);
  assert.notEqual(next[0].takes, slots[0].takes, "the slot owns its log, not the caller's array");
  assert.notEqual(next[0].takes[1].pattern, pattern, "the log owns its pattern, not the caller's array");
  assert.deepEqual(slots[0].takes, [prior], "the previous slot list is untouched");
});

test("hasUnratedTake is true only while the latest take lacks a verdict", () => {
  const instrument = SOUNDS[0];
  assert.equal(hasUnratedTake(assignment(instrument)), false, "a slot with no takes is not blocked");
  const landed = applyTake([assignment(instrument, { performer: "model" })], 0, [0, 1, 0, 1, 0, 1, 0, 1]);
  assert.equal(hasUnratedTake(landed[0]), true);
  const rated = rateTake(landed, 0, ACCEPTED);
  assert.equal(hasUnratedTake(rated[0]), false, "the next take may be requested after a verdict");
});

test("rating a take records the verdict on the newest take only", () => {
  const instrument = SOUNDS[0];
  const authored = [...instrument.steps];
  const first = { pattern: [1, 0, 0, 0, 0, 0, 0, 0], rating: REJECTED };
  const second = { pattern: [0, 0.5, 0, 0, 0, 0.5, 0, 0], rating: null };
  const override = [...second.pattern];
  const neighbour = assignment(instrument, { performer: "model", takes: [first] });
  const slots = [assignment(instrument, { performer: "model", override, takes: [first, second] }), neighbour];
  const next = rateTake(slots, 0, ACCEPTED);

  assert.deepEqual(next[0].takes, [first, { pattern: second.pattern, rating: ACCEPTED }]);
  assert.deepEqual(next[0].override, override, "the sounding pattern is unchanged by a verdict");
  assert.equal(next[1], neighbour, "the neighbouring assignment is not replaced");
  assert.deepEqual(instrument.steps, authored, "the instrument's authored pattern is unchanged");
  assert.equal(slots[0].takes[1].rating, null, "the previous slot list is untouched");
  assert.equal(slots[0].takes[0], first, "the earlier verdict is untouched");
});

test("rating leaves the log alone when there is no unrated take", () => {
  const instrument = SOUNDS[0];
  const rated = assignment(instrument, {
    performer: "model",
    takes: [{ pattern: [1, 0, 1, 0, 1, 0, 1, 0], rating: ACCEPTED }]
  });
  const noTakes = assignment(instrument, { performer: "model" });
  const slots = [rated, noTakes, null];

  assert.equal(rateTake(slots, 0, REJECTED), slots, "a recorded verdict is not overwritten");
  assert.equal(rateTake(slots, 1, ACCEPTED), slots, "there is no take to rate");
  assert.equal(rateTake(slots, 2, ACCEPTED), slots, "an empty slot changes nothing");
});

// Two takes can be in flight at once. Each request claims its slot with a
// token, and a reply is applied only to the slot that still carries that token,
// so the second settlement composes on the first instead of erasing it.
test("beginTake marks a model slot pending with its token", () => {
  const instrument = SOUNDS[0];
  const slots = [assignment(instrument, { performer: MODEL }), null];
  const next = beginTake(slots, 0, "take-1");

  assert.equal(next[0].take.status, "pending");
  assert.equal(next[0].take.token, "take-1");
  assert.equal(slots[0].take, null, "the previous slot list is untouched");
});

test("beginTake refuses an empty slot, a conductor slot, a pending slot and an unrated take", () => {
  const instrument = SOUNDS[0];
  const conductor = assignment(instrument);
  const pending = assignment(instrument, { performer: MODEL, take: { status: "pending", token: "t" } });
  const unrated = assignment(instrument, {
    performer: MODEL,
    takes: [{ pattern: [1, 0, 1, 0, 1, 0, 1, 0], rating: null }]
  });
  const slots = [null, conductor, pending, unrated];

  assert.equal(beginTake(slots, 0, "take-2"), slots);
  assert.equal(beginTake(slots, 1, "take-2"), slots);
  assert.equal(beginTake(slots, 2, "take-2"), slots);
  assert.equal(beginTake(slots, 3, "take-2"), slots);
});

test("settleTake drops a reply whose token the slot no longer carries", () => {
  const instrument = SOUNDS[0];
  const slots = [assignment(instrument, { performer: MODEL, take: { status: "pending", token: "take-1" } })];
  const pattern = [0.5, 0, 0, 0.5, 0, 0, 0.5, 0];

  assert.equal(settleTake(slots, 0, "stale", { ok: true, pattern }), slots);
  assert.equal(settleTake(slots, 1, "take-1", { ok: true, pattern }), slots);
});

test("two takes settled from the same starting list both survive", () => {
  const first = SOUNDS.find((sound) => sound.id === "beats-kick");
  const second = SOUNDS.find((sound) => sound.id === "beats-clap");
  const start = [
    assignment(first, { performer: MODEL }),
    assignment(second, { performer: MODEL })
  ];
  const inFlight = beginTake(beginTake(start, 0, "take-a"), 1, "take-b");
  const firstPattern = [0.9, 0, 0, 0, 0.9, 0, 0, 0];
  const secondPattern = [0, 0.4, 0, 0, 0, 0.4, 0, 0];

  const afterFirst = settleTake(inFlight, 0, "take-a", { ok: true, pattern: firstPattern });
  const afterBoth = settleTake(afterFirst, 1, "take-b", { ok: true, pattern: secondPattern });

  assert.deepEqual(afterBoth[0].override, firstPattern, "the first take is not discarded");
  assert.deepEqual(afterBoth[1].override, secondPattern, "the second take lands too");
  assert.equal(afterBoth[0].takes.length, 1);
  assert.equal(afterBoth[1].takes.length, 1);
  assert.equal(afterBoth[0].take.status, "landed");
  assert.equal(afterBoth[1].take.status, "landed");
});

test("settleTake records each transport failure as its own status", () => {
  const instrument = SOUNDS[0];
  const base = [assignment(instrument, { performer: MODEL })];

  const failures = [
    [{ ok: false, kind: "unreachable" }, { status: "unreachable" }],
    [{ ok: false, kind: "timeout" }, { status: "timeout" }],
    [{ ok: false, kind: "server", status: 500 }, { status: "server", code: 500 }],
    [{ ok: false, kind: "unusable", reason: "not-json" }, { status: "rejected", reason: "not-json" }]
  ];
  for (const [result, expected] of failures) {
    const pending = beginTake(base, 0, "take-1");
    assert.deepEqual(settleTake(pending, 0, "take-1", result)[0].take, expected);
  }
});

// Dropping the instrument a slot already holds is not a new assignment: the
// performer, override and take log stay. A different instrument resets them.
test("re-dropping the same instrument keeps the slot's take log and override", () => {
  const instrument = SOUNDS[0];
  const override = [0, 0.5, 0, 0, 0, 0.5, 0, 0];
  const takes = [{ pattern: override, rating: ACCEPTED }];
  const slot = assignment(instrument, { performer: MODEL, muted: true, override, takes });
  const slots = [slot];

  assert.equal(placeInstrument(slots, 0, instrument), slots);
});

test("placing a different instrument starts a fresh assignment", () => {
  const previous = SOUNDS.find((sound) => sound.id === "beats-kick");
  const replacement = SOUNDS.find((sound) => sound.id === "beats-clap");
  const slots = [assignment(previous, {
    performer: MODEL,
    muted: true,
    solo: true,
    override: [0, 0.5, 0, 0, 0, 0.5, 0, 0],
    takes: [{ pattern: [0, 0.5, 0, 0, 0, 0.5, 0, 0], rating: null }]
  })];
  const next = placeInstrument(slots, 0, replacement);

  assert.equal(next[0].sound, replacement);
  assert.equal(next[0].performer, "conductor");
  assert.equal(next[0].muted, true, "the mixing flags belong to the slot");
  assert.equal(next[0].solo, true);
  assert.equal(next[0].override, null);
  assert.deepEqual(next[0].takes, []);
  assert.equal(next[0].take, null);
  assert.equal(slots[0].performer, "model", "the previous slot list is untouched");
});

// Transport classification: a server that never answered, a reply that broke
// the contract, and an accepted take each come back as a different shape.
test("a model server that cannot be reached is reported as unreachable", async () => {
  const instrument = SOUNDS[0];
  const offline = async () => { throw new TypeError("Failed to fetch"); };

  assert.deepEqual(await requestTake(instrument, [], { fetchImpl: offline }), {
    ok: false,
    kind: "unreachable"
  });
});

// A server that answers is not unreachable: a 404 for a mistyped model name
// must not tell the conductor to start Ollama.
test("a server that answers with an error status is reported as a server failure", async () => {
  const instrument = SOUNDS[0];
  const missingModel = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: "model 'qwen' not found" })
  });
  const broken = async () => ({ ok: false, status: 500, json: async () => ({}) });

  assert.deepEqual(await requestTake(instrument, [], { fetchImpl: missingModel }), {
    ok: false,
    kind: "server",
    status: 404
  });
  assert.deepEqual(await requestTake(instrument, [], { fetchImpl: broken }), {
    ok: false,
    kind: "server",
    status: 500
  });
});

// A request that never settles must free the slot. The transport is aborted at
// the deadline, and a transport that ignores the signal is still abandoned.
test("a request that outlives the timeout is aborted and reported as a timeout", async () => {
  const instrument = SOUNDS[0];
  let signal = null;
  const hang = (url, init) => new Promise((resolve, reject) => {
    signal = init.signal;
    init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });

  assert.deepEqual(await requestTake(instrument, [], { fetchImpl: hang, timeoutMs: 5 }), {
    ok: false,
    kind: "timeout"
  });
  assert.equal(signal.aborted, true, "the transport's signal is aborted at the deadline");
});

test("a transport that ignores the abort signal still times out", async () => {
  const instrument = SOUNDS[0];
  const hang = () => new Promise(() => {});

  assert.deepEqual(await requestTake(instrument, [], { fetchImpl: hang, timeoutMs: 5 }), {
    ok: false,
    kind: "timeout"
  });
});

test("a server that answers with an unusable reply names the parse reason", async () => {
  const instrument = SOUNDS[0];
  const answer = async () => ({
    ok: true,
    json: async () => ({ response: "here is a groove: kick on one" })
  });

  assert.deepEqual(await requestTake(instrument, [], { fetchImpl: answer }), {
    ok: false,
    kind: "unusable",
    reason: "not-json"
  });
});

test("a usable reply arrives as a take", async () => {
  const instrument = SOUNDS[0];
  let seen = null;
  const answer = async (url, init) => {
    seen = { url, body: JSON.parse(init.body) };
    return {
      ok: true,
      json: async () => ({ response: '{"pattern": [0.5, 0, 0, 0.5, 0, 0, 0.5, 0]}' })
    };
  };

  const result = await requestTake(instrument, [], { fetchImpl: answer });

  assert.deepEqual(result, { ok: true, pattern: [0.5, 0, 0, 0.5, 0, 0, 0.5, 0] });
  assert.equal(seen.url, `${MODEL_SERVER}/api/generate`);
  assert.equal(seen.body.model, MODEL_NAME);
  assert.match(seen.body.prompt, /Kick bloom/);
});

test("the request sent to the server carries the take log", async () => {
  const instrument = SOUNDS[0];
  const takes = [
    { pattern: [1, 0, 0, 0, 0, 0, 0, 0], rating: REJECTED },
    { pattern: [0, 0.5, 0, 0, 0, 0.5, 0, 0], rating: ACCEPTED }
  ];
  let seen = null;
  const answer = async (url, init) => {
    seen = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ response: '{"pattern": [0.5, 0, 0, 0, 0, 0, 0, 0]}' })
    };
  };

  await requestTake(instrument, takes, { fetchImpl: answer });

  assert.match(seen.prompt, /Take 1 - rejected: 1, 0, 0, 0, 0, 0, 0, 0/);
  assert.match(seen.prompt, /Take 2 - accepted: 0, 0.5, 0, 0, 0, 0.5, 0, 0/);
});

test("the request sent to the server carries the slot's live pattern", async () => {
  const instrument = SOUNDS.find((sound) => sound.id === "beats-kick");
  const live = [0, 0.3, 0, 0, 0, 0.3, 0, 0];
  let seen = null;
  const answer = async (url, init) => {
    seen = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ response: '{"pattern": [0.5, 0, 0, 0, 0, 0, 0, 0]}' })
    };
  };

  await requestTake(instrument, [], { pattern: live, fetchImpl: answer });

  assert.match(seen.prompt, /Current pattern[^\n]*0, 0\.3, 0, 0, 0, 0\.3, 0, 0/);
});
