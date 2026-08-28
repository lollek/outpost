import { circleOverlapsWall, wallBounds, wallsOverlap, WALL_T } from './los';
import { W, H } from './world';
import { TREE_RADIUS, CHOP_RANGE } from './tree';
const SPEED = 180; // px/s
export const RADIUS = 10;
export { WALL_T };
export const WALL_LEN = 46; // length of a freshly placed wall segment
export const WALL_COST = 3; // wood per wall
export const HAMMER_COST = 5; // wood to craft the building hammer
export class Player {
    constructor(x, y) {
        this.wood = 0;
        this.hasHammer = false;
        this.facing = 0; // radians, updated from movement direction
        this.x = x;
        this.y = y;
    }
    update(input, world, dt) {
        let dx = 0, dy = 0;
        if (input.left)
            dx -= 1;
        if (input.right)
            dx += 1;
        if (input.up)
            dy -= 1;
        if (input.down)
            dy += 1;
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }
        if (dx !== 0 || dy !== 0)
            this.facing = Math.atan2(dy, dx);
        // Separate X and Y so the player can slide along walls
        this._tryMove(dx * SPEED * dt, 0, world);
        this._tryMove(0, dy * SPEED * dt, world);
    }
    _tryMove(dx, dy, world) {
        const nx = Math.max(RADIUS, Math.min(W - RADIUS, this.x + dx));
        const ny = Math.max(RADIUS, Math.min(H - RADIUS, this.y + dy));
        const near = RADIUS + 2;
        for (const w of world.wallsInRect(nx - near, ny - near, near * 2, near * 2)) {
            if (circleOverlapsWall(nx, ny, RADIUS, w))
                return;
        }
        for (const t of world.treesInRect(nx - near, ny - near, near * 2, near * 2)) {
            if (Math.hypot(nx - t.x, ny - t.y) < RADIUS + TREE_RADIUS)
                return;
        }
        for (const r of world.rocksInRect(nx - near, ny - near, near * 2, near * 2)) {
            if (Math.hypot(nx - r.x, ny - r.y) < RADIUS + r.r)
                return;
        }
        this.x = nx;
        this.y = ny;
    }
    // Hit the tree the player clicked on, if within chop range.
    // Returns true if a tree was hit.
    chop(world, tx, ty) {
        for (const t of world.treesInRect(tx - TREE_RADIUS, ty - TREE_RADIUS, TREE_RADIUS * 2, TREE_RADIUS * 2)) {
            if (Math.hypot(t.x - tx, t.y - ty) > TREE_RADIUS)
                continue;
            if (Math.hypot(t.x - this.x, t.y - this.y) > CHOP_RANGE)
                continue;
            t.hp--;
            if (t.hp <= 0) {
                world.removeTree(t);
                this.wood += 2;
            }
            return true;
        }
        return false;
    }
    craftHammer() {
        if (this.hasHammer || this.wood < HAMMER_COST)
            return false;
        this.wood -= HAMMER_COST;
        this.hasHammer = true;
        return true;
    }
    // Returns true if `wall` is affordable and a legal placement: inside the
    // world, not overlapping any wall (touching is fine), tree, rock or player.
    // `anchor` is the wall being snapped/locked onto — it is allowed to overlap
    // so corners and joints can meet.
    canBuildAt(world, wall, anchor) {
        if (!this.hasHammer || this.wood < WALL_COST)
            return false;
        const b = wallBounds(wall);
        if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H)
            return false;
        for (const w of world.wallsInRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2)) {
            if (w === anchor)
                continue;
            if (wallsOverlap(wall, w))
                return false;
        }
        for (const t of world.treesInRect(b.x, b.y, b.w, b.h)) {
            if (circleOverlapsWall(t.x, t.y, TREE_RADIUS, wall))
                return false;
        }
        for (const r of world.rocksInRect(b.x, b.y, b.w, b.h)) {
            if (circleOverlapsWall(r.x, r.y, r.r, wall))
                return false;
        }
        if (circleOverlapsWall(this.x, this.y, RADIUS, wall))
            return false;
        return true;
    }
    // Place `wall` if affordable and legal.
    buildAt(world, wall, anchor) {
        if (!this.canBuildAt(world, wall, anchor))
            return;
        world.addWall(wall);
        this.wood -= WALL_COST;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
        ctx.strokeStyle = '#0277bd';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
