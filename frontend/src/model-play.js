// Slot transitions for model performers. Every function is pure: it takes the
// slot list and returns a new one, never mutating a slot, an instrument, or a
// neighbouring slot. The instrument is shared, so its authored pattern is the
// one thing these transitions must leave alone.

export const CONDUCTOR = "conductor";
export const MODEL = "model";

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
