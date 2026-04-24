import type { Wall } from './los';
import type { Tree } from './tree';
import { TREE_RADIUS } from './tree';

export const CELL = 20;                        // grid resolution in px
const COLS = Math.ceil(800 / CELL);            // 40
const ROWS = Math.ceil(600 / CELL);            // 30
const AGENT_RADIUS = 10;
const CLEARANCE    = AGENT_RADIUS + CELL / 2; // pad by half a cell so the enemy never grazes edges

const DIRS: [number, number, number][] = [
  [ 0, -1, 1], [ 0,  1, 1], [-1,  0, 1], [ 1,  0, 1],
  [-1, -1, Math.SQRT2], [ 1, -1, Math.SQRT2],
  [-1,  1, Math.SQRT2], [ 1,  1, Math.SQRT2],
];

function cellBlocked(col: number, row: number, walls: Wall[], trees: Tree[]): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;
  for (const w of walls) {
    const nearX = Math.max(w.x, Math.min(cx, w.x + w.w));
    const nearY = Math.max(w.y, Math.min(cy, w.y + w.h));
    if (Math.hypot(cx - nearX, cy - nearY) < CLEARANCE) return true;
  }
  for (const t of trees) {
    if (Math.hypot(cx - t.x, cy - t.y) < CLEARANCE + TREE_RADIUS) return true;
  }
  return false;
}

// Returns a list of world positions leading from (sx,sy) to (tx,ty),
// or [{x:tx,y:ty}] as a fallback if no path exists.
export function findPath(
  sx: number, sy: number,
  tx: number, ty: number,
  walls: Wall[], trees: Tree[],
): Array<{x: number; y: number}> {
  const sc = Math.floor(sx / CELL), sr = Math.floor(sy / CELL);
  const ec = Math.floor(tx / CELL), er = Math.floor(ty / CELL);

  const n = COLS * ROWS;
  const gScore  = new Float32Array(n).fill(Infinity);
  const fScore  = new Float32Array(n).fill(Infinity);
  const parent  = new Int32Array(n).fill(-1);
  const visited = new Uint8Array(n);
  const inOpen  = new Uint8Array(n);
  const idx     = (c: number, r: number) => r * COLS + c;

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
      const path: Array<{x: number; y: number}> = [];
      let k = endI;
      while (k !== startI) {
        path.unshift({
          x: (k % COLS) * CELL + CELL / 2,
          y: Math.floor(k / COLS) * CELL + CELL / 2,
        });
        k = parent[k];
      }
      // Snap final node to exact target
      if (path.length === 0) path.push({ x: tx, y: ty });
      else path[path.length - 1] = { x: tx, y: ty };
      return path;
    }

    visited[cur] = 1;
    const cc = cur % COLS, cr = Math.floor(cur / COLS);

    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc, nr = cr + dr;
      // Don't clip through wall corners on diagonal moves
      if (dc !== 0 && dr !== 0) {
        if (cellBlocked(cc + dc, cr, walls, trees)) continue;
        if (cellBlocked(cc, cr + dr, walls, trees)) continue;
      }
      if (cellBlocked(nc, nr, walls, trees)) continue;
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
