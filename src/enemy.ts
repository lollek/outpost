import { hasLineOfSight, circleOverlapsWall } from './los';
import { W, H, type World } from './world';
import { TREE_RADIUS, treeBlocksSegment } from './tree';
import { rockBlocksSegment } from './rock';
import { findPath, CELL } from './pathfinding';
import type { Player } from './player';

type Vec2 = { x: number; y: number };

const State = {
  Patrol: 'patrol',
  Chase:  'chase',
} as const;
type State = typeof State[keyof typeof State];

const ENEMY_RADIUS  = 10;          // px
const PATROL_SPEED  = 70;          // px/s
const CHASE_SPEED   = 130;         // px/s
const VISION_DIST   = 190;         // px
const VISION_HALF   = Math.PI / 3; // 60° each side → 120° total cone
const LOSE_LOS_SECS = 2.5;         // seconds of no LOS before returning to patrol

export class Enemy {
  x: number;
  y: number;
  state: State;
  seesPlayer: boolean;
  facing: number; // radians

  private waypoints: Vec2[];
  private wpIndex: number;
  private losTimer: number;
  private lastKnown: Vec2;
  private world!: World;
  private path: Array<{x: number; y: number}> = [];
  private lastWpIndex = -1;

  constructor(x: number, y: number, waypoints: Vec2[]) {
    this.x = x;
    this.y = y;
    this.waypoints = waypoints;
    this.wpIndex = 0;
    this.facing = 0;
    this.state = State.Patrol;
    this.seesPlayer = false;
    this.losTimer = 0;
    this.lastKnown = { x, y };
  }

  update(player: Player, world: World, dt: number): void {
    this.world = world;
    this.seesPlayer = this._checkLOS(player);

    if (this.state === State.Patrol) {
      this._doPatrol(dt);
      if (this.seesPlayer) {
        this.state = State.Chase;
        this.losTimer = 0;
      }
    } else {
      // Chase — pursue last known position; give up after losing LOS too long
      if (this.seesPlayer) {
        this.lastKnown.x = player.x;
        this.lastKnown.y = player.y;
        this.losTimer = 0;
      } else {
        this.losTimer += dt;
        if (this.losTimer >= LOSE_LOS_SECS) {
          this.state = State.Patrol;
          this.lastWpIndex = -1; // force path replan from current position
        }
      }
      this._moveTo(this.lastKnown.x, this.lastKnown.y, CHASE_SPEED, dt);
    }
  }

  private _doPatrol(dt: number): void {
    const wp = this.waypoints[this.wpIndex];

    // Replan when waypoint changes (also handles initial planning on first call)
    if (this.lastWpIndex !== this.wpIndex) {
      this.path = findPath(this.x, this.y, wp.x, wp.y, this.world);
      this.lastWpIndex = this.wpIndex;
    }

    // Advance waypoint once path is fully followed
    if (this.path.length === 0) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      return;
    }

    const node = this.path[0];
    if (Math.hypot(node.x - this.x, node.y - this.y) < CELL / 2) {
      this.path.shift();
      return;
    }

    this._moveTo(node.x, node.y, PATROL_SPEED, dt);
  }

  private _moveTo(tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = Math.min(speed * dt, dist);
    this.facing = Math.atan2(dy, dx);
    this._applyStep((dx / dist) * step, 0);
    this._applyStep(0, (dy / dist) * step);
  }

  private _applyStep(dx: number, dy: number): void {
    let nx = Math.max(ENEMY_RADIUS, Math.min(W - ENEMY_RADIUS, this.x + dx));
    let ny = Math.max(ENEMY_RADIUS, Math.min(H - ENEMY_RADIUS, this.y + dy));

    const near = ENEMY_RADIUS + 20;
    for (const w of this.world.wallsInRect(nx - near, ny - near, near * 2, near * 2)) {
      if (circleOverlapsWall(nx, ny, ENEMY_RADIUS, w)) return;
    }

    // Trees and rocks use a separation push rather than a hard block so the
    // enemy slides around them instead of freezing when a waypoint is behind one.
    for (const t of this.world.treesInRect(nx - near, ny - near, near * 2, near * 2)) {
      const d    = Math.hypot(nx - t.x, ny - t.y);
      const minD = ENEMY_RADIUS + TREE_RADIUS;
      if (d < minD && d > 0.001) {
        nx += (nx - t.x) / d * (minD - d);
        ny += (ny - t.y) / d * (minD - d);
      }
    }
    for (const rk of this.world.rocksInRect(nx - near, ny - near, near * 2, near * 2)) {
      const d    = Math.hypot(nx - rk.x, ny - rk.y);
      const minD = ENEMY_RADIUS + rk.r;
      if (d < minD && d > 0.001) {
        nx += (nx - rk.x) / d * (minD - d);
        ny += (ny - rk.y) / d * (minD - d);
      }
    }

    this.x = Math.max(ENEMY_RADIUS, Math.min(W - ENEMY_RADIUS, nx));
    this.y = Math.max(ENEMY_RADIUS, Math.min(H - ENEMY_RADIUS, ny));
  }

  private _checkLOS(player: Player): boolean {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.hypot(dx, dy) > VISION_DIST) return false;

    let diff = Math.atan2(dy, dx) - this.facing;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > VISION_HALF) return false;

    const walls = this.world.wallsForSegment(this.x, this.y, player.x, player.y);
    if (!hasLineOfSight(this.x, this.y, player.x, player.y, walls)) return false;
    if (this.world.treesForSegment(this.x, this.y, player.x, player.y)
      .some(t => treeBlocksSegment(this.x, this.y, player.x, player.y, t))) return false;
    if (this.world.rocksForSegment(this.x, this.y, player.x, player.y)
      .some(r => rockBlocksSegment(this.x, this.y, player.x, player.y, r))) return false;

    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this._drawCone(ctx);
    this._drawBody(ctx);
    if (this.state === State.Chase) this._drawAlert(ctx);
  }

  private _drawCone(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, VISION_DIST,
      this.facing - VISION_HALF,
      this.facing + VISION_HALF);
    ctx.closePath();
    ctx.fillStyle = this.seesPlayer ? '#ff1744' : '#ffee58';
    ctx.fill();
    ctx.restore();
  }

  private _drawBody(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = this.state === State.Chase ? '#e53935' : '#ff8f00';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.facing) * 15,
      this.y + Math.sin(this.facing) * 15,
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private _drawAlert(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ff1744';
    ctx.textAlign = 'center';
    ctx.fillText('!', this.x, this.y - 16);
    ctx.textAlign = 'left';
  }
}
