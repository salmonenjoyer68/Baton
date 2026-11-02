import React from "react";

// Shared character renderer: every character is this one drawing routine over
// its own geometry from the character model, plus the face all characters
// share. `expression` is an explicit `"idle"` or `"performing"` input; the
// renderer never infers it from animation, audio or slot state.
function AccessoryLayer({ layer }) {
  return <g fill={layer.fill}>{layer.rects.map((rect, index) =>
    <rect
      key={index}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={rect.fill}
    />
  )}</g>;
}

export function CharacterArt({ color, art, expression = "idle" }) {
  const performing = expression === "performing";
  return <svg className="character-art pixel-art" viewBox="0 0 150 150" aria-hidden="true">
    <rect x="44" y="134" width="62" height="6" fill="var(--muted)" />
    <path
      d={art.silhouette}
      style={{ fill: color }}
      stroke="var(--bg)"
      strokeWidth="8"
      strokeLinejoin="miter"
      paintOrder="stroke"
    />
    <rect x="56" y="66" width="10" height="12" fill="var(--bg)" />
    <rect x="84" y="66" width="10" height="12" fill="var(--bg)" />
    {performing
      ? <>
          <rect x="58" y="94" width="34" height="20" fill="var(--bg)" />
          <rect x="70" y="106" width="10" height="6" fill="var(--danger)" />
        </>
      : <rect x="62" y="100" width="26" height="5" fill="var(--bg)" />}
    {art.accessory.map((layer, index) => <AccessoryLayer key={index} layer={layer} />)}
  </svg>;
}
