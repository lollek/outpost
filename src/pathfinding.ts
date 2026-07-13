import type { World } from './world';
import { circleOverlapsWall } from './los';
import { TREE_RADIUS } from './tree';

export const CELL = 20;                          // grid resolution in px
const AGENT_RADIUS = 10;
const CLEARANCE    = AGENT_RADIUS + CELL / 2;   // pad so the agent never grazes edges
const PAD          = 6 * CELL;                  // window padding around start/target

const DIRS: [number, number, number][] = [
  [ 0, -1, 1], [ 0,  1, 1], [-1,  0, 1], [ 1,  0, 1],
  [-1, -1, Math.SQRT2], [ 1, -1, Math.SQRT2],
  [-1,  1, Math.SQRT2], [ 1,  1, Math.SQRT2],
];

// A* over a local grid window covering start + target (plus padding), clamped to
// the world. Sizing the grid to the query — not the whole world — keeps
// pathfinding cheap as the world scales, and the obstacle lists are fetched from
// the world once per call for just that window.
export function findPath(
  sx: number, sy: number,
  tx: number, ty: number,
  world: World,
): Array<{ x: number; y: number }> {
  const originX = Math.floor((Math.min(sx, tx) - PAD) / CELL) * CELL;
  const originY = Math.floor((Math.min(sy, ty) - PAD) / CELL) * CELL;
  const cols = Math.max(1, Math.ceil((Math.max(sx, tx) + PAD - originX) / CELL));
  const rows = Math.max(1, Math.ceil((Math.max(sy, ty) + PAD - originY) / CELL));

  const walls = world.wallsInRect(originX, originY, cols * CELL, rows * CELL);
  const trees = world.treesInRect(originX, originY, cols * CELL, rows * CELL);
  const rocks = world.rocksInRect(originX, originY, cols * CELL, rows * CELL);

  const idx = (c: number, r: number): number => r * cols + c;

  const cellBlocked = (col: number, row: number): boolean => {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return true;
    const cx = originX + col * CELL + CELL / 2;
    const cy = originY + row * CELL + CELL / 2;
    for (const w of walls) {
      if (circleOverlapsWall(cx, cy, CLEARANCE, w)) return true;
    }
    for (const t of trees) {
      if (Math.hypot(cx - t.x, cy - t.y) < CLEARANCE + TREE_RADIUS) return true;
    }
    for (const rk of rocks) {
      if (Math.hypot(cx - rk.x, cy - rk.y) < CLEARANCE + rk.r) return true;
    }
    return false;
  };

  const sc = Math.floor((sx - originX) / CELL), sr = Math.floor((sy - originY) / CELL);
  const ec = Math.floor((tx - originX) / CELL), er = Math.floor((ty - originY) / CELL);

  const n = cols * rows;
  const gScore  = new Float32Array(n).fill(Infinity);
  const fScore  = new Float32Array(n).fill(Infinity);
  const parent  = new Int32Array(n).fill(-1);
  const visited = new Uint8Array(n);
  const inOpen  = new Uint8Array(n);

  const startI = idx(sc, sr);
  const endI   = idx(ec, er);
  gScore[startI] = 0;
  fScore[startI] = Math.hypot(sc - ec, sr - er);
  const open = [startI];
  inOpen[startI] = 1;

  while (open.length > 0) {
    let bestAt = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestAt]]) bestAt = i;
    }
    const cur = open[bestAt];
    open.splice(bestAt, 1);
    inOpen[cur] = 0;

    if (cur === endI) {
      const path: Array<{ x: number; y: number }> = [];
      let k = endI;
      while (k !== startI) {
        path.unshift({
          x: originX + (k % cols) * CELL + CELL / 2,
          y: originY + Math.floor(k / cols) * CELL + CELL / 2,
        });
        k = parent[k];
      }
      // Snap final node to the exact target.
      if (path.length === 0) path.push({ x: tx, y: ty });
      else path[path.length - 1] = { x: tx, y: ty };
      return path;
    }

    visited[cur] = 1;
    const cc = cur % cols, cr = Math.floor(cur / cols);

    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc, nr = cr + dr;
      // Don't clip through wall corners on diagonal moves.
      if (dc !== 0 && dr !== 0) {
        if (cellBlocked(cc + dc, cr)) continue;
        if (cellBlocked(cc, cr + dr)) continue;
      }
      if (cellBlocked(nc, nr)) continue;
      const ni = idx(nc, nr);
      if (visited[ni]) continue;
      const tentG = gScore[cur] + cost;
      if (tentG < gScore[ni]) {
        parent[ni] = cur;
        gScore[ni] = tentG;
        fScore[ni] = tentG + Math.hypot(nc - ec, nr - er);
        if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; }
      }
    }
  }

  return [{ x: tx, y: ty }]; // fallback: straight line
}
