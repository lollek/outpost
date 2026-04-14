import { drawWorld } from './world.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width  = 800;
canvas.height = 600;

// ── Input ──────────────────────────────────────────────────────────────────

const input = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault(); // block page scroll
  }
  mapKey(e.key, true);
});
window.addEventListener('keyup', e => mapKey(e.key, false));

function mapKey(key, val) {
  if (key === 'w' || key === 'ArrowUp')    input.up    = val;
  if (key === 's' || key === 'ArrowDown')  input.down  = val;
  if (key === 'a' || key === 'ArrowLeft')  input.left  = val;
  if (key === 'd' || key === 'ArrowRight') input.right = val;
}

// ── Entities ───────────────────────────────────────────────────────────────

const player = new Player(90, 90);

// Patrol path: a wide loop around the map
const enemy = new Enemy(650, 130, [
  { x: 650, y: 130 },
  { x: 700, y: 450 },
  { x: 340, y: 510 },
  { x:  95, y: 310 },
  { x: 295, y:  95 },
]);

// ── Game loop ──────────────────────────────────────────────────────────────

let prev = 0;

function loop(ts) {
  const dt = Math.min((ts - prev) / 1000, 0.05); // cap spike frames at 50 ms
  prev = ts;

  player.update(input, dt);
  enemy.update(player, dt);

  drawWorld(ctx);
  player.draw(ctx);
  enemy.draw(ctx);
  drawHUD(ctx);

  requestAnimationFrame(loop);
}

function drawHUD(ctx) {
  const chasing = enemy.state === 'chase';
  const msg = chasing
    ? '! SPOTTED — break line-of-sight to lose the enemy'
    : 'Stay out of the cone  ·  WASD / arrow keys to move';

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 800, 30);
  ctx.font = '13px monospace';
  ctx.fillStyle = chasing ? '#ff5252' : '#ccc';
  ctx.fillText(msg, 12, 20);
}

// Kick off
requestAnimationFrame(ts => { prev = ts; requestAnimationFrame(loop); });
