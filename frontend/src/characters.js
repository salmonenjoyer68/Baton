// Character model: one entry per stage slot. `color` is the blob fill,
// `accessory` selects the SVG accessory drawn next to the face.
export const CHARACTERS = [
  { id: "sol", name: "Sol", color: "#FF6B5B", accessory: "sunglasses" },
  { id: "pip", name: "Pip", color: "#1FC8C3", accessory: "sunhat" },
  { id: "momo", name: "Momo", color: "#FF4D8D", accessory: "flower" },
  { id: "bubbles", name: "Bubbles", color: "#FF9F1C", accessory: "snorkel" },
  { id: "nilla", name: "Nilla", color: "#7BDFF2", accessory: "cone" },
  { id: "cove", name: "Cove", color: "#B8E986", accessory: "ball" },
  { id: "sunny", name: "Sunny", color: "#FFD23F", accessory: "straw" }
];

export const SLOT_COUNT = CHARACTERS.length;
