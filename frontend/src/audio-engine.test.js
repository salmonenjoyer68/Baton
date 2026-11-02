// The scheduler's pending/current split is what makes a landed take enter on
// the next loop boundary while mute and solo apply at once. These tests drive
// `setLayer` directly: no AudioContext is needed to see which map a layer lands
// in, so the boundary rules are testable without a browser.

import { test } from "node:test";
import assert from "node:assert/strict";

import { AudioEngine } from "./audio-engine.js";
import { SOUNDS } from "./sounds.js";

function layer(sound, extra = {}) {
  return { sound, muted: false, solo: false, override: null, ...extra };
}

// Stand in for the flush `schedule()` does at beat 0: promote the pending layer
// and clear the pending map.
function enterLoop(engine, slot, next) {
  engine.layers.set(slot, next);
  engine.pendingLayers.delete(slot);
}

test("a structurally identical pattern does not re-pend the layer", () => {
  const engine = new AudioEngine(() => {});
  const sound = SOUNDS[0];
  const override = [0.25, 0, 0, 0.25, 0, 0, 0.25, 0];
  engine.setLayer(0, layer(sound, { override }));
  enterLoop(engine, 0, layer(sound, { override: [...override] }));

  // A new array with the same velocities is the same pattern: a mute toggled
  // now must not wait a whole loop for the boundary.
  engine.setLayer(0, layer(sound, { override: [...override], muted: true }));

  assert.equal(engine.pendingLayers.has(0), false, "mute is not deferred to a boundary");
  assert.equal(engine.layers.get(0).muted, true, "mute applies immediately");
});

test("a different pattern still waits for the loop boundary", () => {
  const engine = new AudioEngine(() => {});
  const sound = SOUNDS[0];
  const current = [0.25, 0, 0, 0.25, 0, 0, 0.25, 0];
  const take = [0, 0.5, 0, 0, 0.5, 0, 0, 0];
  engine.setLayer(0, layer(sound, { override: current }));
  enterLoop(engine, 0, layer(sound, { override: [...current] }));

  engine.setLayer(0, layer(sound, { override: take, solo: true }));

  assert.deepEqual(engine.pendingLayers.get(0).override, take, "the take enters at the boundary");
  assert.deepEqual(engine.layers.get(0).override, current, "the sounding pattern is unchanged until then");
  assert.equal(engine.layers.get(0).solo, false);
});

test("activeOverride reports the pattern the loop is sounding", () => {
  const engine = new AudioEngine(() => {});
  const sound = SOUNDS[0];
  const override = [0, 0.5, 0, 0, 0.5, 0, 0, 0];

  assert.equal(engine.activeOverride(0), null, "a slot with no layer sounds nothing");
  engine.setLayer(0, layer(sound, { override }));
  assert.equal(engine.activeOverride(0), null, "a pending pattern is not sounding yet");
  enterLoop(engine, 0, layer(sound, { override: [...override] }));
  assert.deepEqual(engine.activeOverride(0), override);
});
