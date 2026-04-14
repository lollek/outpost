import { circleOverlapsRect } from './los.js';
import { WALLS, W, H } from './world.js';

const SPEED = 180; // px/s
export const RADIUS = 10;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  update(input, dt) {
    let dx = 0, dy = 0;
    if (input.left)  dx -= 1;
    if (input.right) dx += 1;
    if (input.up)    dy -= 1;
    if (input.down)  dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    // Separate X and Y so the player can slide along walls
    this._tryMove(dx * SPEED * dt, 0);
    this._tryMove(0, dy * SPEED * dt);
  }

  _tryMove(dx, dy) {
    const nx = Math.max(RADIUS, Math.min(W - RADIUS, this.x + dx));
    const ny = Math.max(RADIUS, Math.min(H - RADIUS, this.y + dy));

    for (const w of WALLS) {
      if (circleOverlapsRect(nx, ny, RADIUS, w.x, w.y, w.w, w.h)) return;
    }

    this.x = nx;
    this.y = ny;
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
