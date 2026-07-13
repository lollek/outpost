import { segmentIntersectsCircle } from './los';

export interface Tree {
  x: number;
  y: number;
  hp: number;
}

export const TREE_RADIUS = 14;
export const TREE_MAX_HP = 3;
export const CHOP_RANGE  = 40; // center-to-center px

// Returns true if the segment (ox,oy)→(tx,ty) passes through this tree's circle.
export function treeBlocksSegment(
  ox: number, oy: number,
  tx: number, ty: number,
  tree: Tree,
): boolean {
  return segmentIntersectsCircle(ox, oy, tx, ty, tree.x, tree.y, TREE_RADIUS);
}

export function drawTree(ctx: CanvasRenderingContext2D, tree: Tree): void {
  ctx.beginPath();
  ctx.ellipse(tree.x + 3, tree.y + 5, TREE_RADIUS + 1, TREE_RADIUS - 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(tree.x, tree.y, TREE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = tree.hp < TREE_MAX_HP ? '#558b2f' : '#2e7d32';
  ctx.fill();
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 2;
  ctx.stroke();

  const missing = TREE_MAX_HP - tree.hp;
  for (let i = 0; i < missing; i++) {
    ctx.beginPath();
    ctx.arc(tree.x + i * 8 - (missing - 1) * 4, tree.y - TREE_RADIUS - 7, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8f00';
    ctx.fill();
  }
}
