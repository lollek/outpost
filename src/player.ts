import { circleOverlapsWall, wallBounds, wallsOverlap, WALL_T, type Wall } from './los';
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
export { WALL_T };
export const WALL_LEN  = 46;  // length of a freshly placed wall segment
export const WALL_COST   = 3; // wood per wall
export const HAMMER_COST = 5; // wood to craft the building hammer

export class Player {
  x: number;
  y: number;
  wood   = 0;
  hasHammer = false;
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
      if (circleOverlapsWall(nx, ny, RADIUS, w)) return;
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

  craftHammer(): boolean {
    if (this.hasHammer || this.wood < HAMMER_COST) return false;
    this.wood -= HAMMER_COST;
    this.hasHammer = true;
    return true;
  }

  // Returns true if `wall` is affordable and a legal placement: inside the
  // world, not overlapping any wall (touching is fine), tree, rock or player.
  // `anchor` is the wall being snapped/locked onto — it is allowed to overlap
  // so corners and joints can meet.
  canBuildAt(world: World, wall: Wall, anchor?: Wall): boolean {
    if (!this.hasHammer || this.wood < WALL_COST) return false;
    const b = wallBounds(wall);
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) return false;
    for (const w of world.wallsInRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2)) {
      if (w === anchor) continue;
      if (wallsOverlap(wall, w)) return false;
    }
    for (const t of world.treesInRect(b.x, b.y, b.w, b.h)) {
      if (circleOverlapsWall(t.x, t.y, TREE_RADIUS, wall)) return false;
    }
    for (const r of world.rocksInRect(b.x, b.y, b.w, b.h)) {
      if (circleOverlapsWall(r.x, r.y, r.r, wall)) return false;
    }
    if (circleOverlapsWall(this.x, this.y, RADIUS, wall)) return false;
    return true;
  }

  // Place `wall` if affordable and legal.
  buildAt(world: World, wall: Wall, anchor?: Wall): void {
    if (!this.canBuildAt(world, wall, anchor)) return;
    world.addWall(wall);
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
