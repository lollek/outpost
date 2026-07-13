import { World, W, H, spawnPoint, type View } from './world';
import { Player, TILE, WALL_W, WALL_T } from './player';
import type { Input } from './player';
import { Enemy } from './enemy';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width  = 800;
canvas.height = 600;

// Deterministic world — change SEED (or make it user-supplied) for a fresh map.
const SEED = 1337;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ── Input ──────────────────────────────────────────────────────────────────

const input: Input = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  mapKey(e.key, true);
  if (e.key === 'b' || e.key === 'B') buildMode = !buildMode;
  if (e.key === 'r' || e.key === 'R') wallHorizontal = !wallHorizontal;
  if (e.key === 'Escape') buildMode = false;
});
window.addEventListener('keyup', e => mapKey(e.key, false));

function mapKey(key: string, val: boolean): void {
  if (key === 'w' || key === 'ArrowUp')    input.up    = val;
  if (key === 's' || key === 'ArrowDown')  input.down  = val;
  if (key === 'a' || key === 'ArrowLeft')  input.left  = val;
  if (key === 'd' || key === 'ArrowRight') input.right = val;
}

// ── Mouse ──────────────────────────────────────────────────────────────────

let mouseX = 0, mouseY = 0;
let buildMode = false;
let wallHorizontal = true;
let camX = 0, camY = 0;

function toCanvasCoords(e: MouseEvent): {x: number; y: number} {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

function toWorldCoords(sx: number, sy: number): {x: number; y: number} {
  return { x: sx - camX, y: sy - camY };
}

canvas.addEventListener('mousemove', e => {
  ({ x: mouseX, y: mouseY } = toCanvasCoords(e));
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const { x: sx, y: sy } = toCanvasCoords(e);
  const { x: mx, y: my } = toWorldCoords(sx, sy);
  if (buildMode) {
    const { wx, wy, ww, wh } = ghostRect(mx, my);
    player.buildAt(world, wx, wy, ww, wh);
  } else {
    player.chop(world, mx, my);
  }
});

// ── Entities ───────────────────────────────────────────────────────────────

const world  = new World(SEED);
const player = new Player(spawnPoint.x, spawnPoint.y);

// Patrol path: a loop around the spawn area, kept local so the enemy stays
// near the player early on.
const s = spawnPoint;
const enemy = new Enemy(s.x + 260, s.y - 180, [
  { x: s.x + 260, y: s.y - 180 },
  { x: s.x + 320, y: s.y + 240 },
  { x: s.x - 260, y: s.y + 300 },
  { x: s.x - 320, y: s.y - 140 },
]);

// ── Helpers ────────────────────────────────────────────────────────────────

// Snap cursor to grid and compute wall rect for current orientation.
function ghostRect(mx: number, my: number): {wx: number; wy: number; ww: number; wh: number} {
  const sx = Math.round(mx / TILE) * TILE;
  const sy = Math.round(my / TILE) * TILE;
  // Wall starts at the grid corner and extends right/down.
  // The extra WALL_T length fills the corner square where two walls meet.
  return wallHorizontal
    ? { wx: sx, wy: sy, ww: WALL_W, wh: WALL_T }
    : { wx: sx, wy: sy, ww: WALL_T, wh: WALL_W };
}

// ── Game loop ──────────────────────────────────────────────────────────────

let prev = 0;

function loop(ts: number): void {
  const dt = Math.min((ts - prev) / 1000, 0.05);
  prev = ts;

  player.update(input, world, dt);
  enemy.update(player, world, dt);

  // Camera centres on the player, clamped so it never scrolls past the edges.
  camX = clamp(canvas.width  / 2 - player.x, canvas.width  - W, 0);
  camY = clamp(canvas.height / 2 - player.y, canvas.height - H, 0);

  const view: View = { x: -camX, y: -camY, w: canvas.width, h: canvas.height };

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(camX, camY);

  world.draw(ctx, view);

  if (buildMode) {
    const { x: wmx, y: wmy } = toWorldCoords(mouseX, mouseY);
    const { wx, wy, ww, wh } = ghostRect(wmx, wmy);
    drawGhostWall(ctx, wx, wy, ww, wh, player.canBuildAt(world, wx, wy, ww, wh));
  }

  player.draw(ctx);
  enemy.draw(ctx);

  ctx.restore();

  drawHUD(ctx);

  requestAnimationFrame(loop);
}

function drawGhostWall(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number, ww: number, wh: number,
  valid: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = valid ? '#8a7560' : '#c62828';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = valid ? '#a08c74' : '#ef9a9a';
  ctx.fillRect(wx, wy, ww, 2);
  ctx.fillRect(wx, wy, 2, wh);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = valid ? '#ccc' : '#ef5350';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wx + 0.75, wy + 0.75, ww - 1.5, wh - 1.5);
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D): void {
  const chasing = enemy.state === 'chase';
  const msg = chasing
    ? '! SPOTTED — break line-of-sight to lose the enemy'
    : buildMode
      ? `[B/Esc] exit  ·  [R] rotate (${wallHorizontal ? '─' : '│'})  ·  click to place (costs 3 wood)`
      : 'WASD to move  ·  click tree to chop  ·  [B] build mode';

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 800, 30);
  ctx.font = '13px monospace';
  ctx.fillStyle = chasing ? '#ff5252' : '#ccc';
  ctx.fillText(msg, 12, 20);

  ctx.fillStyle = '#a5d6a7';
  ctx.textAlign = 'right';
  ctx.fillText(`wood: ${player.wood}`, 788, 20);
  ctx.textAlign = 'left';
}

requestAnimationFrame(ts => { prev = ts; requestAnimationFrame(loop); });
