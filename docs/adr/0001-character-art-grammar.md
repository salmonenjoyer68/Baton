# Character art uses stepped pixel silhouettes, not flat blobs

Baton's shipped visual system is 8-bit stepped pixel art, while
`frontend/frontend.md` still describes "simple, flat, chunky blob-style"
characters. We keep the shipped grammar: each character is one inline-SVG pixel
drawing with a distinct silhouette and a shared face language, shown with an
idle expression and a performing expression (mouth open on beats the sounding
pattern plays). Accessories may change the silhouette (hats, snorkels,
protrusions); eyewear overlays the face; held props sit beside the body. Colour
comes from the palette tokens and is never the thing that tells characters
apart. The full 118 px art box is available; card height, grid and surrounding
spacing stay fixed.

**Status**: proposed — accepted once all seven characters ship in this grammar.

## Considered Options

- Redraw as flat blob characters per the old product spec: rejects the 8-bit
  chrome the header, buttons, icons and frames are built from.
- Keep one recoloured sprite with different accessories: the shipped state, and
  the reason every character reads the same.
- Fully bespoke anatomy per character: risks seven inconsistent visual
  languages instead of one.

## Consequences

- `CharacterArt` stays one shared renderer over per-character geometry and a
  shared face.
- The performing expression needs the sounding pattern's velocity for the
  current beat, not just a generic "playing" flag.
- No external art assets and no new dependencies; everything stays inline SVG
  using the palette tokens.
