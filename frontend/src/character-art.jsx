import React from "react";

// Shared character renderer: every character is this one drawing routine over
// its own geometry from the character model, plus the shared face language
// with per-character eye and mouth placement. `expression` is an explicit
// `"idle"` or `"performing"` input; the renderer never infers it from
// animation, audio or slot state.
function ArtLayer({ layer }) {
  return <g fill={layer.fill}>{layer.rects.map((rect, index) =>
    <rect
      key={index}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
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
    {art.details.map((layer, index) => <ArtLayer key={index} layer={layer} />)}
    {art.face.eyes.map((eye, index) => <rect
      key={index}
      x={eye.x}
      y={eye.y}
      width={eye.width}
      height={eye.height}
      fill="var(--bg)"
    />)}
    {performing
      ? <>
          <rect {...art.face.performingMouth} fill="var(--bg)" />
          <rect {...art.face.tongue} fill="var(--danger)" />
        </>
      : <rect {...art.face.idleMouth} fill="var(--bg)" />}
    {art.accessory.map((layer, index) => <ArtLayer key={index} layer={layer} />)}
  </svg>;
}
