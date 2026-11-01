// Character model: one entry per stage slot. `color` is any CSS color value,
// so the 8-bit palette variables in style.css stay the single source of truth.
// `accessory` selects the pixel accessory drawn beside the face.
export const CHARACTERS = [
  { id: "sol", name: "Sol", color: "var(--accent)", accessory: "sunglasses" },
  { id: "pip", name: "Pip", color: "var(--accent-2)", accessory: "sunhat" },
  { id: "momo", name: "Momo", color: "var(--danger)", accessory: "flower" },
  { id: "bubbles", name: "Bubbles", color: "var(--success)", accessory: "snorkel" },
  { id: "nilla", name: "Nilla", color: "color-mix(in srgb, var(--accent) 55%, var(--text))", accessory: "cone" },
  { id: "cove", name: "Cove", color: "color-mix(in srgb, var(--accent-2) 45%, var(--success))", accessory: "ball" },
  { id: "sunny", name: "Sunny", color: "color-mix(in srgb, var(--accent) 50%, var(--danger))", accessory: "straw" }
];

export const SLOT_COUNT = CHARACTERS.length;
