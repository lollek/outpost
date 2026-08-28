import { World, W, H, spawnPoint, type View } from './world';
import { Player, HAMMER_COST, WALL_LEN, WALL_T } from './player';
import type { Input } from './player';
import { Enemy } from './enemy';
import { wallEndpoints, type Wall } from './los';

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
  if ((e.key === 'c' || e.key === 'C') && !e.repeat) toggleCrafting();
  if ((e.key === 'b' || e.key === 'B') && player.hasHammer && !craftingOpen) buildMode = !buildMode;
  if (e.key === 'Escape') { buildMode = false; craftingOpen = false; hammerSelected = false; }
  if (craftingOpen && e.key === '1') hammerSelected = true;
  if (craftingOpen && e.key === 'Enter' && !e.repeat) craftSelectedRecipe();
  if (e.key === 'q' || e.key === 'Q') { rotQ = true; if (shiftHeld && !e.repeat) snapSteps--; }
  if (e.key === 'e' || e.key === 'E') { rotE = true; if (shiftHeld && !e.repeat) snapSteps++; }
  if (e.key === 'Shift' && !shiftHeld) { shiftHeld = true; snapSteps = 0; }
});
window.addEventListener('keyup', e => {
  mapKey(e.key, false);
  if (e.key === 'q' || e.key === 'Q') rotQ = false;
  if (e.key === 'e' || e.key === 'E') rotE = false;
  if (e.key === 'Shift') shiftHeld = false;
});

function mapKey(key: string, val: boolean): void {
  if (key === 'w' || key === 'ArrowUp')    input.up    = val;
  if (key === 's' || key === 'ArrowDown')  input.down  = val;
  if (key === 'a' || key === 'ArrowLeft')  input.left  = val;
  if (key === 'd' || key === 'ArrowRight') input.right = val;
}

// ── Mouse ──────────────────────────────────────────────────────────────────

let mouseX = 0, mouseY = 0;
let buildMode = false;
let craftingOpen = false;
let hammerSelected = false;
let wallAngle = 0;      // free-build orientation (radians)
let shiftHeld = false;  // snap ghost to existing walls while held
let snapSteps = 0;      // 45° increments applied while snapping
let rotQ = false, rotE = false;
let camX = 0, camY = 0;

const ROT_SPEED = 2.4;          // rad/s for gradual Q/E rotation
const SNAP_STEP = Math.PI / 4;  // 45° steps when snapping
const CRAFT_BUTTON = { x: 756, y: 4, w: 28, h: 22 };
const CRAFT_PANEL = { x: 210, y: 185, w: 380, h: 230 };
const HAMMER_RECIPE = { x: 234, y: 254, w: 332, h: 92 };
const CRAFT_ACTION = { x: 442, y: 302, w: 100, h: 30 };

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
  if (craftingOpen) {
    if (inRect(sx, sy, HAMMER_RECIPE)) hammerSelected = true;
    if (hammerSelected && inRect(sx, sy, CRAFT_ACTION)) craftSelectedRecipe();
    return;
  }
  if (inRect(sx, sy, CRAFT_BUTTON)) {
    toggleCrafting();
    return;
  }
  const { x: mx, y: my } = toWorldCoords(sx, sy);
  if (buildMode) {
    const { wall, anchor } = ghostWall(mx, my);
    player.buildAt(world, wall, anchor);
  } else {
    player.chop(world, mx, my);
  }
});

function inRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function toggleCrafting(): void {
  craftingOpen = !craftingOpen;
  hammerSelected = false;
  if (craftingOpen) buildMode = false;
}

function craftSelectedRecipe(): void {
  if (player.craftHammer()) {
    craftingOpen = false;
    hammerSelected = false;
  }
}

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

// Nearest existing-wall endpoint within snap range, plus the outward direction
// so a snapped ghost extends collinearly away from that wall.
function nearestSnap(mx: number, my: number): { x: number; y: number; angle: number; wall: Wall } | null {
  const R = 34;
  let best: { x: number; y: number; angle: number; wall: Wall } | null = null;
  let bestD = R;
  for (const w of world.wallsInRect(mx - R, my - R, R * 2, R * 2)) {
    for (const e of wallEndpoints(w)) {
      const d = Math.hypot(e.x - mx, e.y - my);
      if (d < bestD) {
        bestD = d;
        best = { x: e.x, y: e.y, angle: Math.atan2(e.y - w.cy, e.x - w.cx), wall: w };
      }
    }
  }
  return best;
}

// The wall the player would place: a fixed-length segment following the cursor,
// or — while Shift is held near a wall — locked to that wall's endpoint and
// angle (Q/E then swing it in 45° steps around the connected end). `anchor` is
// the wall it locked onto, which the joint is allowed to overlap.
function ghostWall(mx: number, my: number): { wall: Wall; anchor?: Wall } {
  const hw = WALL_LEN / 2, hh = WALL_T / 2;
  if (shiftHeld) {
    const snap = nearestSnap(mx, my);
    if (snap) {
      const a = snap.angle + snapSteps * SNAP_STEP;
      return {
        wall: { cx: snap.x + hw * Math.cos(a), cy: snap.y + hw * Math.sin(a), hw, hh, a },
        anchor: snap.wall,
      };
    }
  }
  return { wall: { cx: mx, cy: my, hw, hh, a: wallAngle } };
}

// ── Game loop ──────────────────────────────────────────────────────────────

let prev = 0;

function loop(ts: number): void {
  const dt = Math.min((ts - prev) / 1000, 0.05);
  prev = ts;

  if (!craftingOpen) {
    player.update(input, world, dt);
    enemy.update(player, world, dt);
  }

  // Gradual wall rotation while building (Shift instead uses discrete 45° snaps).
  if (buildMode && !shiftHeld && !craftingOpen) {
    wallAngle += ((rotE ? 1 : 0) - (rotQ ? 1 : 0)) * ROT_SPEED * dt;
  }

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
    const { wall, anchor } = ghostWall(wmx, wmy);
    drawGhostWall(ctx, wall, player.canBuildAt(world, wall, anchor));
  }

  player.draw(ctx);
  enemy.draw(ctx);

  ctx.restore();

  drawHUD(ctx);
  if (craftingOpen) drawCraftingPanel(ctx);

  requestAnimationFrame(loop);
}

function drawGhostWall(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  valid: boolean,
): void {
  const x = -wall.hw, y = -wall.hh, w = wall.hw * 2, h = wall.hh * 2;
  ctx.save();
  ctx.translate(wall.cx, wall.cy);
  ctx.rotate(wall.a);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = valid ? '#8a7560' : '#c62828';
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = valid ? '#a08c74' : '#ef9a9a';
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = valid ? '#ccc' : '#ef5350';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D): void {
  const chasing = enemy.state === 'chase';
  const msg = chasing
    ? '! SPOTTED — break line-of-sight to lose the enemy'
    : buildMode
      ? '[B/Esc] exit  ·  [Q/E] rotate  ·  hold [Shift] to snap to walls  ·  click to place (3 wood)'
      : player.hasHammer
        ? 'WASD to move  ·  click tree to chop  ·  [B] build mode'
        : 'WASD to move  ·  click tree to chop  ·  craft a hammer to build';

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 800, 30);
  ctx.font = '13px monospace';
  ctx.fillStyle = chasing ? '#ff5252' : '#ccc';
  ctx.fillText(msg, 12, 20);

  ctx.fillStyle = '#a5d6a7';
  ctx.textAlign = 'right';
  ctx.fillText(`wood: ${player.wood}`, 746, 20);
  ctx.textAlign = 'left';

  ctx.fillStyle = craftingOpen ? '#5d4037' : '#8a7560';
  ctx.fillRect(CRAFT_BUTTON.x, CRAFT_BUTTON.y, CRAFT_BUTTON.w, CRAFT_BUTTON.h);
  ctx.strokeStyle = '#d7ccc8';
  ctx.lineWidth = 1;
  ctx.strokeRect(CRAFT_BUTTON.x + 0.5, CRAFT_BUTTON.y + 0.5, CRAFT_BUTTON.w - 1, CRAFT_BUTTON.h - 1);
  drawHammerIcon(ctx, CRAFT_BUTTON.x + 14, CRAFT_BUTTON.y + 11, '#f5f1e8');
}

function drawHammerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-2, -8, 4, 16);
  ctx.fillRect(-7, -9, 14, 5);
  ctx.restore();
}

function drawCraftingPanel(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2d2721';
  ctx.fillRect(CRAFT_PANEL.x, CRAFT_PANEL.y, CRAFT_PANEL.w, CRAFT_PANEL.h);
  ctx.strokeStyle = '#9d8a73';
  ctx.lineWidth = 2;
  ctx.strokeRect(CRAFT_PANEL.x + 1, CRAFT_PANEL.y + 1, CRAFT_PANEL.w - 2, CRAFT_PANEL.h - 2);

  ctx.fillStyle = '#f5f1e8';
  ctx.font = '18px monospace';
  ctx.fillText('CRAFTING', CRAFT_PANEL.x + 24, CRAFT_PANEL.y + 38);
  ctx.fillStyle = '#8a7560';
  ctx.fillRect(CRAFT_PANEL.x + 24, CRAFT_PANEL.y + 52, CRAFT_PANEL.w - 48, 1);

  ctx.fillStyle = hammerSelected ? '#4d4033' : '#40362d';
  ctx.fillRect(HAMMER_RECIPE.x, HAMMER_RECIPE.y, HAMMER_RECIPE.w, HAMMER_RECIPE.h);
  ctx.strokeStyle = hammerSelected ? '#d7b86a' : '#6b5c4a';
  ctx.lineWidth = hammerSelected ? 2 : 1;
  ctx.strokeRect(HAMMER_RECIPE.x + 0.5, HAMMER_RECIPE.y + 0.5, HAMMER_RECIPE.w - 1, HAMMER_RECIPE.h - 1);
  drawHammerIcon(ctx, HAMMER_RECIPE.x + 34, HAMMER_RECIPE.y + 46, '#d7ccc8');
  ctx.fillStyle = '#f5f1e8';
  ctx.font = '16px monospace';
  ctx.fillText('Hammer', HAMMER_RECIPE.x + 65, HAMMER_RECIPE.y + 36);
  ctx.fillStyle = player.wood >= HAMMER_COST ? '#a5d6a7' : '#ef9a9a';
  ctx.font = '13px monospace';
  ctx.fillText(`${HAMMER_COST} wood`, HAMMER_RECIPE.x + 65, HAMMER_RECIPE.y + 59);

  const canCraft = hammerSelected && !player.hasHammer && player.wood >= HAMMER_COST;
  ctx.fillStyle = canCraft ? '#6d8a54' : '#544b42';
  ctx.fillRect(CRAFT_ACTION.x, CRAFT_ACTION.y, CRAFT_ACTION.w, CRAFT_ACTION.h);
  ctx.fillStyle = canCraft ? '#f5f1e8' : '#b0a69b';
  ctx.textAlign = 'center';
  ctx.fillText(player.hasHammer ? 'OWNED' : 'CRAFT', CRAFT_ACTION.x + CRAFT_ACTION.w / 2, CRAFT_ACTION.y + 20);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#b0a69b';
  ctx.font = '12px monospace';
  ctx.fillText('1 select hammer  ·  Enter craft  ·  Esc close', CRAFT_PANEL.x + 24, CRAFT_PANEL.y + CRAFT_PANEL.h - 20);
}

requestAnimationFrame(ts => { prev = ts; requestAnimationFrame(loop); });
