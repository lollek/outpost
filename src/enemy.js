import { hasLineOfSight } from './los.js';
import { WALLS } from './world.js';

const PATROL_SPEED  = 70;   // px/s
const CHASE_SPEED   = 130;  // px/s
const VISION_DIST   = 190;  // px
const VISION_HALF   = Math.PI / 3;  // 60° each side → 120° total cone
const LOSE_LOS_SECS = 2.5;          // seconds of no LOS before returning to patrol

const STATE = { PATROL: 'patrol', CHASE: 'chase' };

export class Enemy {
  constructor(x, y, waypoints) {
    this.x = x;
    this.y = y;
    this.waypoints = waypoints;
    this.wpIndex = 0;
    this.facing = 0; // radians; updated each frame when moving
    this.state = STATE.PATROL;
    this.seesPlayer = false;
    this._losTimer = 0;
    this._lastKnown = { x, y };
  }

  update(player, dt) {
    this.seesPlayer = this._checkLOS(player);

    if (this.state === STATE.PATROL) {
      this._doPatrol(dt);
      if (this.seesPlayer) {
        this.state = STATE.CHASE;
        this._losTimer = 0;
      }
    } else {
      // CHASE — pursue last known position; give up after losing LOS too long
      if (this.seesPlayer) {
        this._lastKnown.x = player.x;
        this._lastKnown.y = player.y;
        this._losTimer = 0;
      } else {
        this._losTimer += dt;
        if (this._losTimer >= LOSE_LOS_SECS) {
          this.state = STATE.PATROL;
        }
      }
      this._moveTo(this._lastKnown.x, this._lastKnown.y, CHASE_SPEED, dt);
    }
  }

  _doPatrol(dt) {
    const wp = this.waypoints[this.wpIndex];
    if (Math.hypot(wp.x - this.x, wp.y - this.y) < 5) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
    } else {
      this._moveTo(wp.x, wp.y, PATROL_SPEED, dt);
    }
  }

  _moveTo(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = Math.min(speed * dt, dist);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
  }

  _checkLOS(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.hypot(dx, dy) > VISION_DIST) return false;

    // Angle difference between facing direction and direction to player
    let diff = Math.atan2(dy, dx) - this.facing;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > VISION_HALF) return false;

    return hasLineOfSight(this.x, this.y, player.x, player.y, WALLS);
  }

  draw(ctx) {
    this._drawCone(ctx);
    this._drawBody(ctx);
    if (this.state === STATE.CHASE) this._drawAlert(ctx);
  }

  _drawCone(ctx) {
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

  _drawBody(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = this.state === STATE.CHASE ? '#e53935' : '#ff8f00';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Facing nub
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

  _drawAlert(ctx) {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ff1744';
    ctx.textAlign = 'center';
    ctx.fillText('!', this.x, this.y - 16);
    ctx.textAlign = 'left';
  }
}
