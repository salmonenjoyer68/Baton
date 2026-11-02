// The sound model is a data contract: every later ticket (model performers
// included) reads `SOUNDS` and relies on these invariants without re-checking
// them. Assert them here so a bad recipe edit fails before the browser does.

import { test } from "node:test";
import assert from "node:assert/strict";

import { CATEGORIES, CATEGORY_GROUPS, SOUNDS } from "./sounds.js";

// Independent source of truth: frontend/frontend.md — the shelf lists twenty
// instruments, and they all loop on one shared eight-beat grid.
const SHELF_SIZE = 20;
const LOOP_BEATS = 8;

test("the shelf holds twenty instruments", () => {
  assert.equal(SOUNDS.length, SHELF_SIZE);
});

test("every instrument's pattern covers each beat of the loop exactly once", () => {
  for (const sound of SOUNDS) {
    assert.equal(sound.steps.length, LOOP_BEATS, `${sound.id} pattern length`);
  }
});

test("every instrument is filed under one of the four categories", () => {
  const categoryIds = CATEGORIES.map((category) => category.id);
  for (const sound of SOUNDS) {
    assert.ok(categoryIds.includes(sound.category), `${sound.id} category`);
  }
});

test("the grouped shelf loses no instruments", () => {
  const grouped = CATEGORY_GROUPS.flatMap((group) => group.sounds);
  assert.equal(grouped.length, SOUNDS.length);
});

test("instrument ids are unique", () => {
  const ids = SOUNDS.map((sound) => sound.id);
  assert.equal(new Set(ids).size, ids.length);
});
