// Character model: one entry per stage slot. `color` is any CSS color value,
// so the 8-bit palette variables in style.css stay the single source of truth.
// `accessory` selects the pixel accessory drawn beside the face.
//
// `art` is the character's drawing as data, not a renderer branch: the stepped
// silhouette for this identity plus the accessory geometry selected by its
// accessory key. The shared renderer in character-art.jsx draws that geometry
// and the shared face, so changing a character is an edit here.
const SILHOUETTES = {
  sol: "M38 26H112V34H120V110H112V118H38V110H30V34H38Z M42 118H108V134H42Z M70 8H80V24H70Z M64 3H86V10H64Z M20 58H30V68H20Z M120 58H130V68H120Z",
  pip: "M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z",
  momo: "M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z",
  bubbles: "M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z",
  nilla: "M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z",
  cove: "M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z",
  sunny: "M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z"
};

// Geometry is drawn in the accessory's order. A layer's `fill` is inherited by
// its rectangles; a rectangle may set its own fill instead.
const ACCESSORIES = {
  sunglasses: [
    { fill: "var(--bg)", rects: [
      { x: 44, y: 60, width: 28, height: 18 },
      { x: 78, y: 60, width: 28, height: 18 },
      { x: 72, y: 66, width: 6, height: 5 }
    ] },
    { fill: "var(--accent-2)", rects: [
      { x: 72, y: 10, width: 6, height: 6 }
    ] }
  ],
  sunhat: [{ rects: [
    { x: 50, y: 22, width: 50, height: 20, fill: "var(--bg)" },
    { x: 50, y: 36, width: 50, height: 5, fill: "var(--danger)" },
    { x: 28, y: 42, width: 94, height: 10, fill: "var(--bg)" }
  ] }],
  flower: [{ rects: [
    { x: 104, y: 28, width: 10, height: 10, fill: "var(--bg)" },
    { x: 114, y: 38, width: 10, height: 10, fill: "var(--bg)" },
    { x: 94, y: 38, width: 10, height: 10, fill: "var(--bg)" },
    { x: 104, y: 48, width: 10, height: 10, fill: "var(--bg)" },
    { x: 104, y: 38, width: 10, height: 10, fill: "var(--accent)" }
  ] }],
  snorkel: [{ rects: [
    { x: 112, y: 52, width: 8, height: 46, fill: "var(--bg)" },
    { x: 120, y: 52, width: 10, height: 8, fill: "var(--bg)" },
    { x: 96, y: 94, width: 24, height: 8, fill: "var(--bg)" },
    { x: 112, y: 60, width: 8, height: 8, fill: "var(--accent-2)" }
  ] }],
  cone: [{ rects: [
    { x: 104, y: 12, width: 20, height: 8, fill: "var(--danger)" },
    { x: 100, y: 20, width: 28, height: 8, fill: "var(--bg)" },
    { x: 96, y: 28, width: 36, height: 8, fill: "var(--bg)" },
    { x: 92, y: 36, width: 44, height: 8, fill: "var(--bg)" }
  ] }],
  ball: [{ rects: [
    { x: 108, y: 96, width: 16, height: 4, fill: "var(--bg)" },
    { x: 104, y: 100, width: 24, height: 4, fill: "var(--bg)" },
    { x: 100, y: 104, width: 32, height: 16, fill: "var(--bg)" },
    { x: 104, y: 120, width: 24, height: 4, fill: "var(--bg)" },
    { x: 108, y: 124, width: 16, height: 4, fill: "var(--bg)" },
    { x: 104, y: 104, width: 24, height: 16, fill: "var(--accent-2)" },
    { x: 108, y: 108, width: 16, height: 4, fill: "var(--bg)" }
  ] }],
  straw: [{ fill: "var(--bg)", rects: [
    { x: 96, y: 40, width: 8, height: 26 },
    { x: 104, y: 32, width: 8, height: 8 },
    { x: 112, y: 24, width: 8, height: 8 },
    { x: 120, y: 16, width: 6, height: 8 }
  ] }]
};

export const CHARACTERS = [
  {
    id: "sol",
    name: "Sol",
    color: "var(--accent)",
    accessory: "sunglasses",
    art: { silhouette: SILHOUETTES.sol, accessory: ACCESSORIES.sunglasses }
  },
  {
    id: "pip",
    name: "Pip",
    color: "var(--accent-2)",
    accessory: "sunhat",
    art: { silhouette: SILHOUETTES.pip, accessory: ACCESSORIES.sunhat }
  },
  {
    id: "momo",
    name: "Momo",
    color: "var(--danger)",
    accessory: "flower",
    art: { silhouette: SILHOUETTES.momo, accessory: ACCESSORIES.flower }
  },
  {
    id: "bubbles",
    name: "Bubbles",
    color: "var(--success)",
    accessory: "snorkel",
    art: { silhouette: SILHOUETTES.bubbles, accessory: ACCESSORIES.snorkel }
  },
  {
    id: "nilla",
    name: "Nilla",
    color: "color-mix(in srgb, var(--accent) 55%, var(--text))",
    accessory: "cone",
    art: { silhouette: SILHOUETTES.nilla, accessory: ACCESSORIES.cone }
  },
  {
    id: "cove",
    name: "Cove",
    color: "color-mix(in srgb, var(--accent-2) 45%, var(--success))",
    accessory: "ball",
    art: { silhouette: SILHOUETTES.cove, accessory: ACCESSORIES.ball }
  },
  {
    id: "sunny",
    name: "Sunny",
    color: "color-mix(in srgb, var(--accent) 50%, var(--danger))",
    accessory: "straw",
    art: { silhouette: SILHOUETTES.sunny, accessory: ACCESSORIES.straw }
  }
];

export const SLOT_COUNT = CHARACTERS.length;
