import { circleOverlapsRect } from './los';
import { W, H, type World } from './world';
import { TREE_RADIUS, CHOP_RANGE } from './tree';

export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const SPEED          = 180; // px/s
export const RADIUS    = 10;
export const TILE      = 32;  // snap grid size
export const WALL_T    = 8;   // wall thickness
export const WALL_W    = TILE + WALL_T;  // long dimension: one tile + one corner fill
const WALL_COST        = 3;   // wood per wall

export class Player {
  x: number;
  y: number;
  wood   = 0;
  facing = 0; // radians, updated from movement direction

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(input: Input, world: World, dt: number): void {
    let dx = 0, dy = 0;
    if (input.left)  dx -= 1;
    if (input.right) dx += 1;
    if (input.up)    dy -= 1;
    if (input.down)  dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    if (dx !== 0 || dy !== 0) this.facing = Math.atan2(dy, dx);

    // Separate X and Y so the player can slide along walls
    this._tryMove(dx * SPEED * dt, 0, world);
    this._tryMove(0, dy * SPEED * dt, world);
  }

  private _tryMove(dx: number, dy: number, world: World): void {
    const nx = Math.max(RADIUS, Math.min(W - RADIUS, this.x + dx));
    const ny = Math.max(RADIUS, Math.min(H - RADIUS, this.y + dy));

    const near = RADIUS + 2;
    for (const w of world.wallsInRect(nx - near, ny - near, near * 2, near * 2)) {
      if (circleOverlapsRect(nx, ny, RADIUS, w.x, w.y, w.w, w.h)) return;
    }
    for (const t of world.treesInRect(nx - near, ny - near, near * 2, near * 2)) {
      if (Math.hypot(nx - t.x, ny - t.y) < RADIUS + TREE_RADIUS) return;
    }
    for (const r of world.rocksInRect(nx - near, ny - near, near * 2, near * 2)) {
      if (Math.hypot(nx - r.x, ny - r.y) < RADIUS + r.r) return;
    }

    this.x = nx;
    this.y = ny;
  }

  // Hit the tree the player clicked on, if within chop range.
  // Returns true if a tree was hit.
  chop(world: World, tx: number, ty: number): boolean {
    for (const t of world.treesInRect(tx - TREE_RADIUS, ty - TREE_RADIUS, TREE_RADIUS * 2, TREE_RADIUS * 2)) {
      if (Math.hypot(t.x - tx, t.y - ty) > TREE_RADIUS) continue;
      if (Math.hypot(t.x - this.x, t.y - this.y) > CHOP_RANGE) continue;
      t.hp--;
      if (t.hp <= 0) {
        world.removeTree(t);
        this.wood += 2;
      }
      return true;
    }
    return false;
  }

  // Returns true if a wall rect (wx,wy,ww,wh) is a legal placement.
  canBuildAt(world: World, wx: number, wy: number, ww: number, wh: number): boolean {
    if (wx < 0 || wy < 0 || wx + ww > W || wy + wh > H) return false;
    for (const w of world.wallsInRect(wx - 1, wy - 1, ww + 2, wh + 2)) {
      const ow = Math.max(0, Math.min(wx + ww, w.x + w.w) - Math.max(wx, w.x));
      const oh = Math.max(0, Math.min(wy + wh, w.y + w.h) - Math.max(wy, w.y));
      if (ow * oh > WALL_T * WALL_T) return false;
    }
    for (const t of world.treesInRect(wx, wy, ww, wh)) {
      const nearX = Math.max(wx, Math.min(t.x, wx + ww));
      const nearY = Math.max(wy, Math.min(t.y, wy + wh));
      if (Math.hypot(t.x - nearX, t.y - nearY) < TREE_RADIUS) return false;
    }
    for (const r of world.rocksInRect(wx, wy, ww, wh)) {
      const nearX = Math.max(wx, Math.min(r.x, wx + ww));
      const nearY = Math.max(wy, Math.min(r.y, wy + wh));
      if (Math.hypot(r.x - nearX, r.y - nearY) < r.r) return false;
    }
    if (circleOverlapsRect(this.x, this.y, RADIUS, wx, wy, ww, wh)) return false;
    return true;
  }

  // Place a wall at (wx,wy,ww,wh) if affordable and legal.
  buildAt(world: World, wx: number, wy: number, ww: number, wh: number): void {
    if (this.wood < WALL_COST || !this.canBuildAt(world, wx, wy, ww, wh)) return;
    world.addWall({ x: wx, y: wy, w: ww, h: wh });
    this.wood -= WALL_COST;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc3f7';
    ctx.fill();
    ctx.strokeStyle = '#0277bd';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
