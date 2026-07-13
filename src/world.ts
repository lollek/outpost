import { circleOverlapsWall, wallBounds, type Wall } from './los';
import { drawTree, TREE_RADIUS, type Tree } from './tree';
import { drawRock, type Rock } from './rock';
import { generateChunk, biomeAt } from './worldgen';

// ── World layout ─────────────────────────────────────────────────────────────
// The world is a grid of square chunks. Generation, storage, spatial queries and
// rendering are all chunk-local, so this scales toward a much larger, biome-
// driven world: chunks can later be generated lazily and streamed in/out around
// the player without changing gameplay code. For now every chunk is resident.

export const CHUNK      = 400;              // px per chunk (square)
export const WORLD_COLS = 20;               // 20 * 400 = 8000 (10 screens wide)
export const WORLD_ROWS = 15;               // 15 * 400 = 6000 (10 screens tall)
export const W = CHUNK * WORLD_COLS;
export const H = CHUNK * WORLD_ROWS;

export const spawnPoint = { x: W / 2, y: H / 2 };

export interface View { x: number; y: number; w: number; h: number; }

interface Chunk {
  cx: number;
  cy: number;
  trees: Tree[];
  rocks: Rock[];
  walls: Wall[];
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function drawWall(ctx: CanvasRenderingContext2D, wall: Wall): void {
  ctx.save();
  ctx.translate(wall.cx, wall.cy);
  ctx.rotate(wall.a);
  const x = -wall.hw, y = -wall.hh, w = wall.hw * 2, h = wall.hh * 2;
  ctx.fillStyle = '#8a7560';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#a08c74';
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y, 3, h);
  ctx.fillStyle = '#6b5c4a';
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.restore();
}

export class World {
  readonly seed: number;
  private chunks: Chunk[] = [];

  constructor(seed: number) {
    this.seed = seed >>> 0;
    for (let cy = 0; cy < WORLD_ROWS; cy++) {
      for (let cx = 0; cx < WORLD_COLS; cx++) {
        const c = generateChunk(this.seed, cx, cy, CHUNK);
        this.chunks.push({ cx, cy, trees: c.trees, rocks: c.rocks, walls: c.walls });
      }
    }
    // Keep the spawn clearing free so the player never wakes up inside a rock
    // cluster or a ruin wall.
    this.clearArea(spawnPoint.x, spawnPoint.y, 130);
  }

  private chunkAt(cx: number, cy: number): Chunk | undefined {
    if (cx < 0 || cy < 0 || cx >= WORLD_COLS || cy >= WORLD_ROWS) return undefined;
    return this.chunks[cy * WORLD_COLS + cx];
  }

  private forChunksInRect(
    x: number, y: number, w: number, h: number,
    fn: (chunk: Chunk) => void,
  ): void {
    const c0 = Math.max(0, Math.floor(x / CHUNK));
    const r0 = Math.max(0, Math.floor(y / CHUNK));
    const c1 = Math.min(WORLD_COLS - 1, Math.floor((x + w) / CHUNK));
    const r1 = Math.min(WORLD_ROWS - 1, Math.floor((y + h) / CHUNK));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const chunk = this.chunkAt(c, r);
        if (chunk) fn(chunk);
      }
    }
  }

  // ── Spatial queries ────────────────────────────────────────────────────────
  // Callers work against a small region (a body's neighbourhood, or a segment's
  // bounding box) rather than the whole world, so cost stays local no matter how
  // large the world grows.

  wallsInRect(x: number, y: number, w: number, h: number): Wall[] {
    const out: Wall[] = [];
    this.forChunksInRect(x, y, w, h, ch => {
      for (const wall of ch.walls) {
        const b = wallBounds(wall);
        if (rectsOverlap(x, y, w, h, b.x, b.y, b.w, b.h)) out.push(wall);
      }
    });
    return out;
  }

  treesInRect(x: number, y: number, w: number, h: number): Tree[] {
    const out: Tree[] = [];
    const pad = TREE_RADIUS;
    this.forChunksInRect(x - pad, y - pad, w + 2 * pad, h + 2 * pad, ch => {
      for (const t of ch.trees) {
        if (rectsOverlap(x, y, w, h, t.x - pad, t.y - pad, 2 * pad, 2 * pad)) out.push(t);
      }
    });
    return out;
  }

  rocksInRect(x: number, y: number, w: number, h: number): Rock[] {
    const out: Rock[] = [];
    this.forChunksInRect(x - 32, y - 32, w + 64, h + 64, ch => {
      for (const rk of ch.rocks) {
        if (rectsOverlap(x, y, w, h, rk.x - rk.r, rk.y - rk.r, 2 * rk.r, 2 * rk.r)) out.push(rk);
      }
    });
    return out;
  }

  private static segRect(ox: number, oy: number, tx: number, ty: number): View {
    return {
      x: Math.min(ox, tx),
      y: Math.min(oy, ty),
      w: Math.abs(tx - ox),
      h: Math.abs(ty - oy),
    };
  }

  wallsForSegment(ox: number, oy: number, tx: number, ty: number): Wall[] {
    const r = World.segRect(ox, oy, tx, ty);
    return this.wallsInRect(r.x, r.y, r.w, r.h);
  }

  treesForSegment(ox: number, oy: number, tx: number, ty: number): Tree[] {
    const r = World.segRect(ox, oy, tx, ty);
    return this.treesInRect(r.x, r.y, r.w, r.h);
  }

  rocksForSegment(ox: number, oy: number, tx: number, ty: number): Rock[] {
    const r = World.segRect(ox, oy, tx, ty);
    return this.rocksInRect(r.x, r.y, r.w, r.h);
  }

  removeTree(tree: Tree): void {
    const ch = this.chunkAt(Math.floor(tree.x / CHUNK), Math.floor(tree.y / CHUNK));
    if (!ch) return;
    const i = ch.trees.indexOf(tree);
    if (i >= 0) ch.trees.splice(i, 1);
  }

  addWall(wall: Wall): void {
    const ch = this.chunkAt(Math.floor(wall.cx / CHUNK), Math.floor(wall.cy / CHUNK));
    if (ch) ch.walls.push(wall);
  }

  private clearArea(cx: number, cy: number, r: number): void {
    this.forChunksInRect(cx - r, cy - r, 2 * r, 2 * r, ch => {
      ch.trees = ch.trees.filter(t => Math.hypot(t.x - cx, t.y - cy) > r);
      ch.rocks = ch.rocks.filter(rk => Math.hypot(rk.x - cx, rk.y - cy) > r + rk.r);
      ch.walls = ch.walls.filter(w => !circleOverlapsWall(cx, cy, r, w));
    });
  }

  draw(ctx: CanvasRenderingContext2D, view: View): void {
    // Ground per visible chunk (biome-tinted — a single biome for now).
    this.forChunksInRect(view.x, view.y, view.w, view.h, ch => {
      ctx.fillStyle = biomeAt(ch.cx, ch.cy, this.seed).ground;
      ctx.fillRect(ch.cx * CHUNK, ch.cy * CHUNK, CHUNK, CHUNK);
    });
    // Walls, then rocks, then trees (trees drawn last read as an overhead canopy).
    this.forChunksInRect(view.x, view.y, view.w, view.h, ch => {
      for (const w of ch.walls) drawWall(ctx, w);
    });
    this.forChunksInRect(view.x, view.y, view.w, view.h, ch => {
      for (const rk of ch.rocks) drawRock(ctx, rk);
    });
    this.forChunksInRect(view.x, view.y, view.w, view.h, ch => {
      for (const t of ch.trees) drawTree(ctx, t);
    });
  }
}
