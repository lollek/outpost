import { circleOverlapsRect } from './los';
import { WALLS, W, H } from './world';
import { TREE_RADIUS, CHOP_RANGE, type Tree } from './tree';

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

  update(input: Input, trees: Tree[], dt: number): void {
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
    this._tryMove(dx * SPEED * dt, 0, trees);
    this._tryMove(0, dy * SPEED * dt, trees);
  }

  private _tryMove(dx: number, dy: number, trees: Tree[]): void {
    const nx = Math.max(RADIUS, Math.min(W - RADIUS, this.x + dx));
    const ny = Math.max(RADIUS, Math.min(H - RADIUS, this.y + dy));

    for (const w of WALLS) {
      if (circleOverlapsRect(nx, ny, RADIUS, w.x, w.y, w.w, w.h)) return;
    }
    for (const t of trees) {
      if (Math.hypot(nx - t.x, ny - t.y) < RADIUS + TREE_RADIUS) return;
    }

    this.x = nx;
    this.y = ny;
  }

  // Hit the tree the player clicked on, if within chop range.
  // Returns true if a tree was hit.
  chop(trees: Tree[], tx: number, ty: number): boolean {
    for (const t of trees) {
      if (Math.hypot(t.x - tx, t.y - ty) > TREE_RADIUS) continue;
      if (Math.hypot(t.x - this.x, t.y - this.y) > CHOP_RANGE) continue;
      t.hp--;
      if (t.hp <= 0) {
        trees.splice(trees.indexOf(t), 1);
        this.wood += 2;
      }
      return true;
    }
    return false;
  }

  // Returns true if a wall rect (wx,wy,ww,wh) is a legal placement.
  canBuildAt(wx: number, wy: number, ww: number, wh: number, trees: Tree[]): boolean {
    if (wx < 0 || wy < 0 || wx + ww > W || wy + wh > H) return false;
    for (const w of WALLS) {
      const ow = Math.max(0, Math.min(wx + ww, w.x + w.w) - Math.max(wx, w.x));
      const oh = Math.max(0, Math.min(wy + wh, w.y + w.h) - Math.max(wy, w.y));
      if (ow * oh > WALL_T * WALL_T) return false;
    }
    for (const t of trees) {
      const nearX = Math.max(wx, Math.min(t.x, wx + ww));
      const nearY = Math.max(wy, Math.min(t.y, wy + wh));
      if (Math.hypot(t.x - nearX, t.y - nearY) < TREE_RADIUS) return false;
    }
    if (circleOverlapsRect(this.x, this.y, RADIUS, wx, wy, ww, wh)) return false;
    return true;
  }

  // Place a wall at (wx,wy,ww,wh) if affordable and legal.
  buildAt(wx: number, wy: number, ww: number, wh: number, trees: Tree[]): void {
    if (this.wood < WALL_COST || !this.canBuildAt(wx, wy, ww, wh, trees)) return;
    WALLS.push({ x: wx, y: wy, w: ww, h: wh });
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
