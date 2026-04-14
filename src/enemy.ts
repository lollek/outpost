import { hasLineOfSight } from './los';
import { WALLS } from './world';
import type { Player } from './player';

type Vec2 = { x: number; y: number };

const State = {
  Patrol: 'patrol',
  Chase:  'chase',
} as const;
type State = typeof State[keyof typeof State];

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

  update(player: Player, dt: number): void {
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
        }
      }
      this._moveTo(this.lastKnown.x, this.lastKnown.y, CHASE_SPEED, dt);
    }
  }

  private _doPatrol(dt: number): void {
    const wp = this.waypoints[this.wpIndex];
    if (Math.hypot(wp.x - this.x, wp.y - this.y) < 5) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
    } else {
      this._moveTo(wp.x, wp.y, PATROL_SPEED, dt);
    }
  }

  private _moveTo(tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = Math.min(speed * dt, dist);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
  }

  private _checkLOS(player: Player): boolean {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.hypot(dx, dy) > VISION_DIST) return false;

    let diff = Math.atan2(dy, dx) - this.facing;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > VISION_HALF) return false;

    return hasLineOfSight(this.x, this.y, player.x, player.y, WALLS);
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
