/**
 * Returns true if segments AB and CD cross each other (interior intersection).
 */
export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return false; // parallel / collinear

  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / denom;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Returns true if the line segment (ox,oy)→(tx,ty) is blocked by a wall rect.
 */
function wallBlocksSegment(ox, oy, tx, ty, { x, y, w, h }) {
  return (
    segmentsIntersect(ox, oy, tx, ty, x,     y,     x + w, y    ) ||
    segmentsIntersect(ox, oy, tx, ty, x + w, y,     x + w, y + h) ||
    segmentsIntersect(ox, oy, tx, ty, x + w, y + h, x,     y + h) ||
    segmentsIntersect(ox, oy, tx, ty, x,     y + h, x,     y    )
  );
}

/**
 * Returns true if there is an unobstructed line from (ox,oy) to (tx,ty).
 */
export function hasLineOfSight(ox, oy, tx, ty, walls) {
  for (const wall of walls) {
    if (wallBlocksSegment(ox, oy, tx, ty, wall)) return false;
  }
  return true;
}

/**
 * Returns true if a circle at (cx,cy) with radius r overlaps the AABB rect.
 */
export function circleOverlapsRect(cx, cy, r, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}
