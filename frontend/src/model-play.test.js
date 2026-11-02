// Pure slot transitions for handoff. Tested at the seam the parent spec names:
// a slot list goes in, a new slot list comes out, and no instrument is mutated.

import { test } from "node:test";
import assert from "node:assert/strict";

import { handoff, takeBack } from "./model-play.js";
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
