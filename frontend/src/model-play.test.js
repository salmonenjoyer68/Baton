// Pure slot transitions for handoff. Tested at the seam the parent spec names:
// a slot list goes in, a new slot list comes out, and no instrument is mutated.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyTake,
  buildRequest,
  handoff,
  MODEL_NAME,
  MODEL_SERVER,
  parseTake,
  requestTake,
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

// Transport classification: a server that never answered, a reply that broke
// the contract, and an accepted take each come back as a different shape.
test("a model server that cannot be reached is reported as unreachable", async () => {
  const instrument = SOUNDS[0];
  const offline = async () => { throw new TypeError("Failed to fetch"); };

  assert.deepEqual(await requestTake(instrument, offline), { ok: false, kind: "unreachable" });
});

test("a server that answers with an unusable reply names the parse reason", async () => {
  const instrument = SOUNDS[0];
  const answer = async () => ({
    ok: true,
    json: async () => ({ response: "here is a groove: kick on one" })
  });

  assert.deepEqual(await requestTake(instrument, answer), {
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

  const result = await requestTake(instrument, answer);

  assert.deepEqual(result, { ok: true, pattern: [0.5, 0, 0, 0.5, 0, 0, 0.5, 0] });
  assert.equal(seen.url, `${MODEL_SERVER}/api/generate`);
  assert.equal(seen.body.model, MODEL_NAME);
  assert.match(seen.body.prompt, /Kick bloom/);
});
