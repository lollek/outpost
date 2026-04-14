export const W = 800;
export const H = 600;

// Each wall: { x, y, w, h } in pixels.
// Arranged to give several hiding spots the player can duck into.
export const WALLS = [
  // Top-left L-shape — cover near player spawn
  { x: 185, y: 115, w: 155, h: 22 },
  { x: 185, y: 115, w: 22,  h: 115 },

  // Mid-right vertical divider with a ledge
  { x: 445, y: 175, w: 22,  h: 155 },
  { x: 445, y: 175, w: 105, h: 22  },

  // Bottom-left cover
  { x: 115, y: 390, w: 155, h: 22 },
  { x: 115, y: 330, w: 22,  h: 60 },

  // Bottom-right block
  { x: 550, y: 345, w: 22,  h: 155 },
  { x: 550, y: 345, w: 105, h: 22  },

  // Centre island
  { x: 325, y: 285, w: 110, h: 22 },
];

export function drawWorld(ctx) {
  // Ground
  ctx.fillStyle = '#2e4a1e';
  ctx.fillRect(0, 0, W, H);

  for (const w of WALLS) {
    // Base stone colour
    ctx.fillStyle = '#8a7560';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    // Top / left highlight
    ctx.fillStyle = '#a08c74';
    ctx.fillRect(w.x, w.y, w.w, 3);
    ctx.fillRect(w.x, w.y, 3, w.h);
    // Bottom / right shadow
    ctx.fillStyle = '#6b5c4a';
    ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
    ctx.fillRect(w.x + w.w - 3, w.y, 3, w.h);
  }
}
