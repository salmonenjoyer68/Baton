// Character model: one entry per stage slot. `color` is any CSS color value,
// so the 8-bit palette variables in style.css stay the single source of truth.
// `accessory` selects the character's accessory layer.
//
// `art` is the character's drawing as data, not a renderer branch: the stepped
// silhouette and face for this identity, its own details, and the accessory
// geometry selected by its `accessory` key. The shared renderer in
// character-art.jsx draws that geometry, so changing a character is an edit
// here.
const SILHOUETTES = {
  sol: "M38 26H112V34H120V110H112V118H38V110H30V34H38Z M42 118H108V134H42Z M70 12H80V28H70Z M64 7H86V14H64Z M20 58H30V68H20Z M120 58H130V68H120Z",
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

// Geometry is drawn in the accessory's order. A layer's `fill` applies to all
// of its rectangles.
const ACCESSORIES = {
  sunglasses: [
    { fill: "var(--bg)", rects: [
      { x: 44, y: 60, width: 28, height: 18 },
      { x: 78, y: 60, width: 28, height: 18 },
      { x: 72, y: 66, width: 6, height: 5 }
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
    { fill: "var(--danger)", rects: [
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
    { fill: "var(--bg)", rects: [
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
    { fill: "var(--accent-2)", rects: [
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

// Per-character face data. Every character uses the same rect vocabulary;
// variation is limited to eye placement, eye size and mouth width.
const FACES = {
  sol: {
    eyes: [
      { x: 48, y: 64, width: 10, height: 12 },
      { x: 86, y: 64, width: 10, height: 12 }
    ],
    idleMouth: { x: 63, y: 100, width: 24, height: 5 },
    performingMouth: { x: 58, y: 94, width: 34, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  },
  pip: {
    eyes: [
      { x: 54, y: 62, width: 8, height: 10 },
      { x: 88, y: 62, width: 8, height: 10 }
    ],
    idleMouth: { x: 60, y: 100, width: 30, height: 5 },
    performingMouth: { x: 57, y: 94, width: 36, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  },
  momo: {
    eyes: [
      { x: 52, y: 62, width: 12, height: 12 },
      { x: 84, y: 62, width: 12, height: 12 }
    ],
    idleMouth: { x: 65, y: 100, width: 20, height: 5 },
    performingMouth: { x: 61, y: 94, width: 28, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  },
  bubbles: {
    eyes: [
      { x: 48, y: 60, width: 10, height: 14 },
      { x: 92, y: 60, width: 10, height: 14 }
    ],
    idleMouth: { x: 58, y: 100, width: 34, height: 5 },
    performingMouth: { x: 56, y: 94, width: 38, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  },
  nilla: {
    eyes: [
      { x: 56, y: 64, width: 8, height: 12 },
      { x: 86, y: 64, width: 8, height: 12 }
    ],
    idleMouth: { x: 66, y: 100, width: 18, height: 5 },
    performingMouth: { x: 62, y: 94, width: 26, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  },
  cove: {
    eyes: [
      { x: 58, y: 66, width: 10, height: 10 },
      { x: 82, y: 66, width: 10, height: 10 }
    ],
    idleMouth: { x: 62, y: 100, width: 26, height: 5 },
    performingMouth: { x: 59, y: 94, width: 32, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  },
  sunny: {
    eyes: [
      { x: 54, y: 66, width: 12, height: 10 },
      { x: 82, y: 66, width: 12, height: 10 }
    ],
    idleMouth: { x: 61, y: 100, width: 28, height: 5 },
    performingMouth: { x: 58, y: 94, width: 34, height: 20 },
    tongue: { x: 70, y: 106, width: 10, height: 6 }
  }
};

// Details belong to the character rather than an accessory, so layers that are
// not worn or held (Sol's antenna light) draw between the silhouette and face.
const DETAILS = {
  sol: [
    { fill: "var(--accent-2)", rects: [
      { x: 72, y: 14, width: 6, height: 6 }
    ] }
  ]
};

function artFor(character) {
  return {
    silhouette: SILHOUETTES[character.id],
    face: FACES[character.id],
    details: DETAILS[character.id] ?? [],
    accessory: ACCESSORIES[character.accessory]
  };
}

export const CHARACTERS = [
  { id: "sol", name: "Sol", color: "var(--accent)", accessory: "sunglasses" },
  { id: "pip", name: "Pip", color: "var(--accent-2)", accessory: "sunhat" },
  { id: "momo", name: "Momo", color: "var(--danger)", accessory: "flower" },
  { id: "bubbles", name: "Bubbles", color: "var(--success)", accessory: "snorkel" },
  { id: "nilla", name: "Nilla", color: "color-mix(in srgb, var(--accent) 55%, var(--text))", accessory: "cone" },
  { id: "cove", name: "Cove", color: "color-mix(in srgb, var(--accent-2) 45%, var(--success))", accessory: "ball" },
  { id: "sunny", name: "Sunny", color: "color-mix(in srgb, var(--accent) 50%, var(--danger))", accessory: "straw" }
].map((character) => ({ ...character, art: artFor(character) }));

export const SLOT_COUNT = CHARACTERS.length;
