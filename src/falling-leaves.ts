import { createLeaf, DEFAULT_PROFILE, maxSize, pick, stepLeaf, type Leaf, type MotionOptions, type MotionProfile } from './leaf';
import { createLeafSprite, DEFAULT_SHAPES, SHAPE_COLORS, SHAPE_MOTION, type LeafShape } from './sprites';

export interface FallingLeavesOptions extends Partial<MotionOptions> {
  /**
   * Element to fill with leaves. Leave it out to cover the whole page
   * (a fixed full-screen layer that clicks pass through).
   */
  container?: HTMLElement;
  /** How many leaves are on screen at once. Default 30. */
  count?: number;
  /**
   * Leaf colors. Each leaf is drawn in one of these. By default ginkgo
   * leaves are gold and the others use a red-orange autumn palette.
   */
  colors?: string[];
  /**
   * Built-in leaf shapes to mix: `'maple'`, `'oak'`, `'ginkgo'`, `'birch'`
   * and `'oval'`. Default `['maple']`.
   */
  shapes?: LeafShape[];
  /**
   * Your own leaf pictures. When set, these are drawn instead of the
   * built-in shapes, and `colors` and `shapes` are ignored.
   */
  images?: CanvasImageSource[];
  /** Leaf opacity, 0–1. Default 1. */
  opacity?: number;
  /** z-index of the canvas. Default 9999 for full page, 0 inside a container. */
  zIndex?: number;
  /**
   * Don't animate for people whose system asks for reduced motion.
   * Default true.
   */
  respectReducedMotion?: boolean;
  /** Start animating straight away. Default true. */
  autoStart?: boolean;
}

export const DEFAULT_COLORS = ['#d9480f', '#e8590c', '#f08c00', '#c92a2a', '#a61e4d', '#b5651d', '#e0a800'];

const DEFAULTS: Required<MotionOptions> & { count: number; opacity: number } = {
  count: 30,
  size: [14, 30],
  speed: [0.6, 1.5],
  wind: [-0.3, 0.8],
  sway: [0.4, 1.4],
  rotationSpeed: [-1.5, 1.5],
  opacity: 1,
};

/** Frames longer than this (e.g. after switching tabs) are capped so leaves don't jump. */
const MAX_FRAME_STEP = 3;

export class FallingLeaves {
  private options: FallingLeavesOptions;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly container: HTMLElement;
  private readonly fullPage: boolean;
  private leaves: Leaf[] = [];
  private drawables: CanvasImageSource[] = [];
  /** How each drawable's leaves move, in the same order as `drawables`. */
  private profiles: MotionProfile[] = [];
  private spriteKey = '';
  private width = 0;
  private height = 0;
  private frame = 0;
  private lastTime = 0;
  private running = false;
  private resizeObserver?: ResizeObserver;
  private reducedMotion?: MediaQueryList;

  constructor(options: FallingLeavesOptions = {}) {
    this.options = { ...options };
    this.fullPage = !options.container;
    this.container = options.container ?? document.body;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.fallingLeaves = '';
    Object.assign(this.canvas.style, {
      position: this.fullPage ? 'fixed' : 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: String(options.zIndex ?? (this.fullPage ? 9999 : 0)),
    });
    this.ctx = this.canvas.getContext('2d');

    // The canvas sits on top of the container, so the container needs to be positioned.
    if (!this.fullPage && getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    this.container.appendChild(this.canvas);

    this.resize();
    if (typeof ResizeObserver !== 'undefined' && !this.fullPage) {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', this.resize);
    }

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion?.addEventListener?.('change', this.onReducedMotionChange);

    this.refreshDrawables();
    this.syncCount(true);
    if (options.autoStart !== false) this.start();
  }

  /** Starts (or resumes) the animation. */
  start(): void {
    if (this.running || this.prefersStill()) return;
    this.running = true;
    this.lastTime = 0;
    this.frame = requestAnimationFrame(this.tick);
  }

  /** Pauses the animation and leaves the leaves where they are. */
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  /** Changes options while running. Leaves pick up the new values straight away. */
  update(options: Partial<Omit<FallingLeavesOptions, 'container'>>): void {
    this.options = { ...this.options, ...options };
    if (options.zIndex !== undefined) this.canvas.style.zIndex = String(options.zIndex);
    this.refreshDrawables();
    this.syncCount(false);
    if (!this.running) this.draw();
  }

  /** Stops the animation and removes the canvas from the page. */
  destroy(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.resize);
    this.reducedMotion?.removeEventListener?.('change', this.onReducedMotionChange);
    this.canvas.remove();
    this.leaves = [];
  }

  private get motion(): MotionOptions {
    const o = this.options;
    return {
      size: o.size ?? DEFAULTS.size,
      speed: o.speed ?? DEFAULTS.speed,
      wind: o.wind ?? DEFAULTS.wind,
      sway: o.sway ?? DEFAULTS.sway,
      rotationSpeed: o.rotationSpeed ?? DEFAULTS.rotationSpeed,
    };
  }

  private prefersStill(): boolean {
    return this.options.respectReducedMotion !== false && !!this.reducedMotion?.matches;
  }

  private onReducedMotionChange = (): void => {
    if (this.prefersStill()) {
      this.stop();
      this.ctx?.clearRect(0, 0, this.width, this.height);
    } else if (this.options.autoStart !== false) {
      this.start();
    }
  };

  private resize = (): void => {
    const rect = this.fullPage
      ? { width: window.innerWidth, height: window.innerHeight }
      : this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /** Rebuilds the leaf pictures, but only when colors, shapes or images changed. */
  private refreshDrawables(): void {
    const { images, colors, shapes = DEFAULT_SHAPES } = this.options;
    if (images && images.length > 0) {
      this.drawables = images;
      this.profiles = images.map(() => DEFAULT_PROFILE);
      this.spriteKey = '';
      return;
    }
    const key = `${colors?.join(',') ?? ''}|${shapes.join(',')}`;
    if (key === this.spriteKey) return;
    this.spriteKey = key;
    this.drawables = [];
    this.profiles = [];
    for (const shape of shapes) {
      for (const color of colors ?? SHAPE_COLORS[shape] ?? DEFAULT_COLORS) {
        this.drawables.push(createLeafSprite(color, shape));
        this.profiles.push(SHAPE_MOTION[shape] ?? DEFAULT_PROFILE);
      }
    }
  }

  private syncCount(anywhere: boolean): void {
    const count = Math.max(0, Math.floor(this.options.count ?? DEFAULTS.count));
    const n = this.drawables.length;
    while (this.leaves.length < count) {
      const leaf = createLeaf(this.motion, this.width, this.height, n, Math.random, true);
      // Leaves added later start spread out above the screen, so they don't all arrive at once.
      if (!anywhere) leaf.y -= this.height + maxSize(this.motion.size);
      this.leaves.push(leaf);
    }
    this.leaves.length = count;
    // If there are now fewer pictures, point leaves at ones that still exist.
    for (const leaf of this.leaves) if (leaf.variant >= n) leaf.variant = leaf.variant % Math.max(1, n);
  }

  private tick = (time: number): void => {
    if (!this.running) return;
    const dt = this.lastTime ? Math.min((time - this.lastTime) / (1000 / 60), MAX_FRAME_STEP) : 1;
    this.lastTime = time;

    const motion = this.motion;
    const n = this.drawables.length;
    for (const leaf of this.leaves) {
      stepLeaf(leaf, dt, motion, this.width, this.height, n, Math.random, this.profiles[leaf.variant]);
    }
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalAlpha = this.options.opacity ?? DEFAULTS.opacity;

    const sizeRange = this.motion.size;
    const biggest = maxSize(sizeRange);
    for (const leaf of this.leaves) {
      const img = this.drawables[leaf.variant];
      if (!img) continue;
      const size = pick(sizeRange, leaf.rSize);
      if (leaf.y < -biggest || leaf.y > this.height + biggest) continue;

      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      const rock = (this.profiles[leaf.variant] ?? DEFAULT_PROFILE).rock * Math.cos(leaf.swayPhase);
      ctx.rotate(((leaf.rotation + rock) * Math.PI) / 180);
      // Squash one way to fake the leaf tumbling over in 3D.
      ctx.scale(Math.cos(leaf.flipPhase), 1);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
