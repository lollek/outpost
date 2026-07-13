import { segmentIntersectsCircle } from './los';

// Rocks are circular cover — they block movement and line-of-sight but (unlike
// trees) can't be harvested. Radius varies so clusters read as natural.
export interface Rock {
  x: number;
  y: number;
  r: number;
}

export function rockBlocksSegment(
  ox: number, oy: number,
  tx: number, ty: number,
  rock: Rock,
): boolean {
  return segmentIntersectsCircle(ox, oy, tx, ty, rock.x, rock.y, rock.r);
}

export function drawRock(ctx: CanvasRenderingContext2D, rock: Rock): void {
  ctx.beginPath();
  ctx.ellipse(rock.x + 2, rock.y + 3, rock.r + 1, rock.r - 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
  ctx.fillStyle = '#7a7d82';
  ctx.fill();
  ctx.strokeStyle = '#4a4d52';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rock.x - rock.r * 0.3, rock.y - rock.r * 0.3, rock.r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
}
