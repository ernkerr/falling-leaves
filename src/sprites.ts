export type LeafShape = 'maple' | 'oval';

/** Sprites are drawn once at this size and scaled down for each leaf. */
const SPRITE_SIZE = 128;

// Maple outline in a -1..1 box: the right half from the tip down to the stem.
// The left half is the same points mirrored.
const MAPLE_RIGHT: Array<[number, number]> = [
  [0, -1], [0.15, -0.6], [0.35, -0.75], [0.3, -0.35], [0.75, -0.55],
  [0.62, -0.25], [0.95, -0.1], [0.55, 0.1], [0.62, 0.3], [0.25, 0.25],
  [0.08, 0.45],
];

function traceMaple(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  MAPLE_RIGHT.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = MAPLE_RIGHT.length - 1; i > 0; i--) {
    const [x, y] = MAPLE_RIGHT[i]!;
    ctx.lineTo(-x, y);
  }
  ctx.closePath();
}

function traceOval(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(0.75, -0.55, 0.6, 0.5, 0, 0.8);
  ctx.bezierCurveTo(-0.6, 0.5, -0.75, -0.55, 0, -1);
  ctx.closePath();
}

function drawVeins(ctx: CanvasRenderingContext2D, shape: LeafShape): void {
  ctx.beginPath();
  if (shape === 'maple') {
    // Stem, then veins out to the five main points.
    ctx.moveTo(0, 0.95);
    ctx.lineTo(0, 0.4);
    ctx.lineTo(0, -0.85);
    for (const side of [1, -1]) {
      ctx.moveTo(0, 0.4);
      ctx.lineTo(0.82 * side, -0.1);
      ctx.moveTo(0, 0.4);
      ctx.lineTo(0.62 * side, -0.48);
    }
  } else {
    ctx.moveTo(0, 1);
    ctx.lineTo(0, -0.85);
    for (const y of [-0.4, 0, 0.35]) {
      for (const side of [1, -1]) {
        ctx.moveTo(0, y + 0.15);
        ctx.lineTo(0.38 * side, y - 0.1);
      }
    }
  }
  ctx.stroke();
}

/** Draws one leaf in a solid color onto its own small canvas. */
export function createLeafSprite(color: string, shape: LeafShape): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  ctx.scale(SPRITE_SIZE * 0.47, SPRITE_SIZE * 0.47);

  if (shape === 'maple') traceMaple(ctx);
  else traceOval(ctx);
  ctx.fillStyle = color;
  ctx.fill();

  // A soft highlight on one side so the leaf doesn't look flat.
  ctx.globalCompositeOperation = 'source-atop';
  const shine = ctx.createLinearGradient(-1, -1, 1, 1);
  shine.addColorStop(0, 'rgba(255,255,255,0.25)');
  shine.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = shine;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.globalCompositeOperation = 'source-over';

  ctx.strokeStyle = 'rgba(60,25,0,0.35)';
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  drawVeins(ctx, shape);
  return canvas;
}
