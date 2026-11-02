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
  // Tall rectangular head on stepped shoulders; the sunhat breaks the top.
  pip: "M50 30H100V38H108V110H100V118H50V110H42V38H50ZM42 118H108V134H42Z",
  // Rounded blocky head; the flower sprouts from the crown.
  momo: "M46 34H104V42H112V50H118V102H112V110H104V118H46V110H38V102H32V50H38V42H46ZM42 118H108V134H42Z",
  // Widest blocky head; the snorkel crosses its right edge.
  bubbles: "M38 44H112V50H120V56H126V106H120V112H112V118H38V112H30V106H24V56H30V50H38ZM38 118H112V134H38Z",
  // Tapered stepped head, wide at the crown and small at the base.
  nilla: "M28 38H122V50H116V62H110V74H104V86H100V98H96V118H54V98H50V86H46V74H40V62H34V50H28ZM46 118H104V134H46Z",
  // Rounded blocky head, an arm to the right, and the ball beside it.
  cove: "M52 36H98V44H106V52H110V102H106V110H98V118H52V110H44V102H40V52H44V44H52ZM42 118H108V134H42ZM102 112H118V120H102Z",
  // Lopsided stepped head, raised at the top right under the straw.
  sunny: "M40 60H88V52H96V40H124V60H116V72H120V100H112V108H104V118H48V110H38V100H34V84H40ZM42 118H108V134H42Z"
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
  sunhat: [
    { fill: "var(--bg)", rects: [
      { x: 22, y: 24, width: 106, height: 16 },
      { x: 52, y: 6, width: 46, height: 20 }
    ] },
    { fill: "var(--accent)", rects: [
      { x: 26, y: 28, width: 98, height: 12 },
      { x: 56, y: 10, width: 38, height: 12 }
    ] },
    { fill: "var(--danger)", rects: [
      { x: 56, y: 18, width: 38, height: 4 }
    ] }
  ],
  flower: [
    { fill: "var(--success)", rects: [
      { x: 71, y: 42, width: 8, height: 8 },
      { x: 61, y: 46, width: 10, height: 4 },
      { x: 79, y: 46, width: 10, height: 4 }
    ] },
    { fill: "var(--accent)", rects: [
      { x: 68, y: 6, width: 12, height: 12 },
      { x: 56, y: 18, width: 12, height: 12 },
      { x: 80, y: 18, width: 12, height: 12 },
      { x: 68, y: 30, width: 12, height: 12 }
    ] },
    { fill: "var(--accent-2)", rects: [
      { x: 68, y: 18, width: 12, height: 12 }
    ] }
  ],
  snorkel: [
    { fill: "var(--bg)", rects: [
      { x: 116, y: 16, width: 8, height: 80 },
      { x: 104, y: 16, width: 12, height: 8 },
      { x: 96, y: 88, width: 28, height: 8 }
    ] },
    { fill: "var(--accent-2)", rects: [
      { x: 118, y: 28, width: 4, height: 52 },
      { x: 96, y: 88, width: 8, height: 8 }
    ] }
  ],
  cone: [
    { fill: "var(--bg)", rects: [
      { x: 56, y: 30, width: 38, height: 12 },
      { x: 64, y: 14, width: 22, height: 8 }
    ] },
    { fill: "var(--danger)", rects: [
      { x: 68, y: 6, width: 14, height: 8 },
      { x: 60, y: 22, width: 30, height: 8 }
    ] }
  ],
  ball: [
    { fill: "var(--bg)", rects: [
      { x: 126, y: 94, width: 8, height: 4 },
      { x: 122, y: 98, width: 16, height: 4 },
      { x: 118, y: 102, width: 24, height: 4 },
      { x: 112, y: 106, width: 36, height: 20 },
      { x: 118, y: 126, width: 24, height: 4 },
      { x: 122, y: 130, width: 16, height: 4 }
    ] },
    { fill: "var(--accent)", rects: [
      { x: 126, y: 98, width: 8, height: 4 },
      { x: 122, y: 102, width: 16, height: 4 },
      { x: 118, y: 106, width: 24, height: 4 },
      { x: 116, y: 110, width: 28, height: 12 },
      { x: 118, y: 122, width: 24, height: 4 },
      { x: 122, y: 126, width: 16, height: 4 },
      { x: 126, y: 130, width: 8, height: 4 }
    ] },
    { fill: "var(--bg)", rects: [
      { x: 120, y: 114, width: 20, height: 4 },
      { x: 130, y: 110, width: 4, height: 12 }
    ] }
  ],
  straw: [
    { fill: "var(--accent)", rects: [
      { x: 96, y: 38, width: 40, height: 8 },
      { x: 120, y: 30, width: 8, height: 8 },
      { x: 124, y: 22, width: 8, height: 8 },
      { x: 128, y: 14, width: 8, height: 8 },
      { x: 132, y: 8, width: 6, height: 8 }
    ] },
    { fill: "var(--bg)", rects: [
      { x: 112, y: 38, width: 8, height: 8 },
      { x: 124, y: 26, width: 8, height: 4 },
      { x: 132, y: 12, width: 6, height: 4 }
    ] }
  ]
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
