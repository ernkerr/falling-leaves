export type LeafShape = 'maple' | 'oak' | 'ginkgo' | 'birch' | 'oval';

/** All built-in shapes. */
export const LEAF_SHAPES: LeafShape[] = ['maple', 'oak', 'ginkgo', 'birch', 'oval'];

/** Shapes used when no `shapes` option is given. */
export const DEFAULT_SHAPES: LeafShape[] = ['maple', 'oak', 'ginkgo', 'birch'];

/**
 * Colors a shape uses when no `colors` option is given. Ginkgo leaves turn
 * gold in autumn, so they don't take the reds from the main palette.
 */
export const SHAPE_COLORS: Partial<Record<LeafShape, string[]>> = {
  ginkgo: ['#e0a800', '#f2c12e', '#d99a00', '#c9a227'],
};

/** Where each shape's stem joins the leaf. */
const STEM_BASE: Record<LeafShape, number> = { maple: 0.45, oak: 0.6, ginkgo: 0.45, birch: 0.65, oval: 0.8 };

/** Sprites are drawn once at this size and scaled down for each leaf. */
const SPRITE_SIZE = 128;

type Ctx = CanvasRenderingContext2D;

// Every shape is drawn in a -1..1 box with the tip at the top and the stem at the bottom.

// Maple outline: the right half from the tip down to the stem. The left half is mirrored.
const MAPLE_RIGHT: Array<[number, number]> = [
  [0, -1], [0.15, -0.6], [0.35, -0.75], [0.3, -0.35], [0.75, -0.55],
  [0.62, -0.25], [0.95, -0.1], [0.55, 0.1], [0.62, 0.3], [0.25, 0.25],
  [0.08, 0.45],
];

/** Draws a closed outline from the right half's points, mirrored for the left. */
function traceMirrored(ctx: Ctx, right: Array<[number, number]>): void {
  ctx.beginPath();
  right.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--) {
    const [x, y] = right[i]!;
    ctx.lineTo(-x, y);
  }
  ctx.closePath();
}

/**
 * Builds the right half of a leaf from its half-width at each point
 * (t = 0 at the tip, 1 at the base).
 */
function sampleOutline(top: number, bottom: number, halfWidth: (t: number) => number, steps = 60) {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([Math.max(0, halfWidth(t)), top + (bottom - top) * t]);
  }
  return points;
}

/** Saw-tooth wave between 0 and 1. */
function sawtooth(x: number): number {
  return x - Math.floor(x);
}

// Oak: an oblong leaf with deep rounded lobes on each side.
const OAK_RIGHT = sampleOutline(-0.95, 0.6, (t) => {
  const body = 0.85 * Math.pow(Math.sin(Math.PI * t), 0.6);
  const lobes = 0.45 + 0.55 * Math.abs(Math.sin(t * Math.PI * 4.5));
  return body * lobes;
}, 90);

// Birch: a pointed oval, widest near the base, with a fine saw-tooth edge.
const BIRCH_RIGHT = sampleOutline(-1, 0.65, (t) => {
  const body = 0.72 * Math.pow(Math.sin(Math.PI * t), 0.85) * (0.75 + 0.25 * t);
  return body > 0.06 ? body - sawtooth(t * 22) * 0.05 : body;
}, 88);

function traceGinkgo(ctx: Ctx): void {
  // A fan with a notch in the middle of its top edge.
  ctx.beginPath();
  ctx.moveTo(0, 0.45);
  ctx.quadraticCurveTo(-0.35, 0.2, -0.95, -0.4);
  ctx.quadraticCurveTo(-0.6, -0.95, -0.12, -0.85);
  ctx.lineTo(0, -0.55);
  ctx.lineTo(0.12, -0.85);
  ctx.quadraticCurveTo(0.6, -0.95, 0.95, -0.4);
  ctx.quadraticCurveTo(0.35, 0.2, 0, 0.45);
  ctx.closePath();
}

function traceOval(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(0.75, -0.55, 0.6, 0.5, 0, 0.8);
  ctx.bezierCurveTo(-0.6, 0.5, -0.75, -0.55, 0, -1);
  ctx.closePath();
}

function traceShape(ctx: Ctx, shape: LeafShape): void {
  switch (shape) {
    case 'maple': return traceMirrored(ctx, MAPLE_RIGHT);
    case 'oak': return traceMirrored(ctx, OAK_RIGHT);
    case 'birch': return traceMirrored(ctx, BIRCH_RIGHT);
    case 'ginkgo': return traceGinkgo(ctx);
    default: return traceOval(ctx);
  }
}

/** Stem and midrib, plus a pair of side veins at each height, angled up toward the edge. */
function sideVeins(ctx: Ctx, stemEnd: number, tip: number, heights: number[], reach: number): void {
  ctx.moveTo(0, stemEnd);
  ctx.lineTo(0, tip);
  for (const y of heights) {
    for (const side of [1, -1]) {
      ctx.moveTo(0, y + 0.15);
      ctx.lineTo(reach * side, y - 0.1);
    }
  }
}

function drawVeins(ctx: Ctx, shape: LeafShape): void {
  ctx.beginPath();
  switch (shape) {
    case 'maple':
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
      break;
    case 'oak':
      sideVeins(ctx, 0.95, -0.85, [-0.6, -0.3, 0, 0.3], 0.45);
      break;
    case 'birch':
      sideVeins(ctx, 0.95, -0.9, [-0.55, -0.3, -0.05, 0.2, 0.42], 0.4);
      break;
    case 'ginkgo':
      // Fine veins fanning out from the stem to the top edge.
      ctx.moveTo(0, 1);
      ctx.lineTo(0, 0.45);
      for (let k = -4; k <= 4; k++) {
        if (k === 0) continue;
        const a = (k / 4) * 0.95;
        ctx.moveTo(0, 0.45);
        ctx.lineTo(Math.sin(a) * 1.05, 0.45 - Math.cos(a) * 1.2);
      }
      break;
    default:
      sideVeins(ctx, 1, -0.85, [-0.4, 0, 0.35], 0.38);
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

  traceShape(ctx, shape);
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
  ctx.lineCap = 'round';

  // Veins stay inside the leaf.
  ctx.save();
  traceShape(ctx, shape);
  ctx.clip();
  ctx.lineWidth = 0.045;
  drawVeins(ctx, shape);
  ctx.restore();

  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0, STEM_BASE[shape]);
  ctx.lineTo(0, 1);
  ctx.stroke();
  return canvas;
}
