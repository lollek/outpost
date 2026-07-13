export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns true if segments AB and CD cross each other (interior intersection).
 */
export function segmentsIntersect(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  dx: number, dy: number,
): boolean {
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
function wallBlocksSegment(
  ox: number, oy: number,
  tx: number, ty: number,
  { x, y, w, h }: Wall,
): boolean {
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
export function hasLineOfSight(
  ox: number, oy: number,
  tx: number, ty: number,
  walls: Wall[],
): boolean {
  for (const wall of walls) {
    if (wallBlocksSegment(ox, oy, tx, ty, wall)) return false;
  }
  return true;
}

/**
 * Returns true if a circle at (cx,cy) with radius r overlaps the AABB rect.
 */
export function circleOverlapsRect(
  cx: number, cy: number, r: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Returns true if the segment (ox,oy)→(tx,ty) passes through the circle
 * centred at (cx,cy) with radius r.
 */
export function segmentIntersectsCircle(
  ox: number, oy: number,
  tx: number, ty: number,
  cx: number, cy: number, r: number,
): boolean {
  const dx = tx - ox, dy = ty - oy;
  const fx = ox - cx, fy = oy - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  if (a < 1e-12) return c <= 0; // degenerate segment: is the point inside?
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / (2 * a);
  const t2 = (-b + s) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}
