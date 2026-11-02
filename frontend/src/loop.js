// The shared loop grid. Both the audio scheduler and the pure model seam need
// these numbers, so they live here rather than in the Web Audio module: a
// model-play test never has to import anything that touches an AudioContext.

export const BPM = 110;
export const LOOP_BEATS = 8;
export const BEAT_SECONDS = 60 / BPM;

// Patterns are eight velocity arrays. Two arrays that hold the same velocities
// are the same pattern even when they are different objects; the scheduler
// compares them by value so a mute pressed while a take is pending applies now.
export function samePattern(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((velocity, index) => velocity === b[index]);
}
