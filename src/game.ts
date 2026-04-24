import { drawWorld } from './world';
import { Player, TILE, WALL_W, WALL_T } from './player';
import type { Input } from './player';
import { Enemy } from './enemy';
import { makeTrees, drawTrees } from './tree';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width  = 800;
canvas.height = 600;

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

function toCanvasCoords(e: MouseEvent): {x: number; y: number} {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

canvas.addEventListener('mousemove', e => {
  ({ x: mouseX, y: mouseY } = toCanvasCoords(e));
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const { x: mx, y: my } = toCanvasCoords(e);
  if (buildMode) {
    const { wx, wy, ww, wh } = ghostRect(mx, my);
    player.buildAt(wx, wy, ww, wh, trees);
  } else {
    player.chop(trees, mx, my);
  }
});

// ── Entities ───────────────────────────────────────────────────────────────

const player = new Player(90, 90);
const trees  = makeTrees();

// Patrol path: a wide loop around the map
const enemy = new Enemy(650, 130, [
  { x: 650, y: 130 },
  { x: 700, y: 450 },
  { x: 340, y: 510 },
  { x:  95, y: 310 },
  { x: 295, y:  95 },
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

  player.update(input, trees, dt);
  enemy.update(player, trees, dt);

  drawWorld(ctx);

  if (buildMode) {
    const { wx, wy, ww, wh } = ghostRect(mouseX, mouseY);
    drawGhostWall(ctx, wx, wy, ww, wh, player.canBuildAt(wx, wy, ww, wh, trees));
  }

  drawTrees(ctx, trees);
  player.draw(ctx);
  enemy.draw(ctx);
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
