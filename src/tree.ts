export interface Tree {
  x: number;
  y: number;
  hp: number;
}

export const TREE_RADIUS = 14;
export const TREE_MAX_HP = 3;
export const CHOP_RANGE  = 40; // center-to-center px

export function makeTrees(): Tree[] {
  return [
    { x: 300, y:  80 },
    { x: 370, y: 100 },
    { x: 480, y:  80 },
    { x: 560, y:  80 },
    { x: 160, y: 220 },
    { x: 280, y: 240 },
    { x: 130, y: 480 },
    { x: 200, y: 500 },
    { x: 330, y: 440 },
    { x: 430, y: 430 },
    { x: 640, y: 280 },
    { x: 690, y: 350 },
    { x: 620, y: 510 },
    { x: 700, y: 530 },
  ].map(p => ({ ...p, hp: TREE_MAX_HP }));
}

// Returns true if the segment (ox,oy)→(tx,ty) passes through this tree's circle.
export function treeBlocksSegment(
  ox: number, oy: number,
  tx: number, ty: number,
  tree: Tree,
): boolean {
  const r  = TREE_RADIUS;
  const dx = tx - ox, dy = ty - oy;
  const fx = ox - tree.x, fy = oy - tree.y;
  const a  = dx * dx + dy * dy;
  const b  = 2 * (fx * dx + fy * dy);
  const c  = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  const s  = Math.sqrt(disc);
  const t1 = (-b - s) / (2 * a);
  const t2 = (-b + s) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

export function drawTrees(ctx: CanvasRenderingContext2D, trees: Tree[]): void {
  for (const tree of trees) {
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
}
