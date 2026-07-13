// A wall is an oriented box: centre (cx,cy), half-extents (hw,hh) along its own
// local axes, rotated by `a` radians. Axis-aligned generated walls are simply
// boxes with a = 0 (see `aabbWall`), so one representation covers both the
// procedural structures and freely-rotated player builds.
export interface Wall {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  a: number;
}

export interface Point { x: number; y: number; }

// Thickness shared by every wall in the world — generated structures and
// player-built segments alike — so they read as the same material.
export const WALL_T = 14;

// Build an axis-aligned wall from an AABB rect (left/top/width/height).
export function aabbWall(x: number, y: number, w: number, h: number): Wall {
  return { cx: x + w / 2, cy: y + h / 2, hw: w / 2, hh: h / 2, a: 0 };
}

// The four corners of a wall in world space, ordered around the box.
export function wallCorners(wall: Wall): Point[] {
  const cos = Math.cos(wall.a), sin = Math.sin(wall.a);
  const { cx, cy, hw, hh } = wall;
  return [
    { x: cx - hw * cos + hh * sin, y: cy - hw * sin - hh * cos },
    { x: cx + hw * cos + hh * sin, y: cy + hw * sin - hh * cos },
    { x: cx + hw * cos - hh * sin, y: cy + hw * sin + hh * cos },
    { x: cx - hw * cos - hh * sin, y: cy - hw * sin + hh * cos },
  ];
}

// Axis-aligned bounding box of a wall — used for cheap broad-phase queries.
export function wallBounds(wall: Wall): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of wallCorners(wall)) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Orientation of a wall's long axis — the line player builds snap along.
export function wallLineAngle(wall: Wall): number {
  return wall.hw >= wall.hh ? wall.a : wall.a + Math.PI / 2;
}

// The two centre-line endpoints of a wall's long axis (the snap anchors).
export function wallEndpoints(wall: Wall): [Point, Point] {
  const half = Math.max(wall.hw, wall.hh);
  const ang = wallLineAngle(wall);
  const dx = Math.cos(ang) * half, dy = Math.sin(ang) * half;
  return [
    { x: wall.cx - dx, y: wall.cy - dy },
    { x: wall.cx + dx, y: wall.cy + dy },
  ];
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
 * Returns true if the line segment (ox,oy)→(tx,ty) crosses any edge of the wall.
 */
function wallBlocksSegment(
  ox: number, oy: number,
  tx: number, ty: number,
  wall: Wall,
): boolean {
  const c = wallCorners(wall);
  for (let i = 0; i < 4; i++) {
    const p = c[i], q = c[(i + 1) % 4];
    if (segmentsIntersect(ox, oy, tx, ty, p.x, p.y, q.x, q.y)) return true;
  }
  return false;
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
 * Returns true if a circle at (px,py) with radius r overlaps the oriented wall.
 */
export function circleOverlapsWall(
  px: number, py: number, r: number, wall: Wall,
): boolean {
  const cos = Math.cos(wall.a), sin = Math.sin(wall.a);
  const dx = px - wall.cx, dy = py - wall.cy;
  // Rotate the circle centre into the wall's local frame (inverse rotation).
  const lx =  dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;
  const nearX = Math.max(-wall.hw, Math.min(lx, wall.hw));
  const nearY = Math.max(-wall.hh, Math.min(ly, wall.hh));
  const ddx = lx - nearX, ddy = ly - nearY;
  return ddx * ddx + ddy * ddy < r * r;
}

/**
 * Returns true if two walls overlap with positive area (separating-axis test).
 * Walls that merely touch along an edge or corner do NOT count, so freshly
 * built segments may lock flush against existing ones.
 */
export function wallsOverlap(a: Wall, b: Wall): boolean {
  const ca = wallCorners(a), cb = wallCorners(b);
  const axes = [
    { x: Math.cos(a.a),  y: Math.sin(a.a) },
    { x: -Math.sin(a.a), y: Math.cos(a.a) },
    { x: Math.cos(b.a),  y: Math.sin(b.a) },
    { x: -Math.sin(b.a), y: Math.cos(b.a) },
  ];
  const EPS = 0.01;
  for (const ax of axes) {
    let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
    for (const p of ca) { const d = p.x * ax.x + p.y * ax.y; if (d < amin) amin = d; if (d > amax) amax = d; }
    for (const p of cb) { const d = p.x * ax.x + p.y * ax.y; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
    if (amax <= bmin + EPS || bmax <= amin + EPS) return false; // separated or just touching
  }
  return true;
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
