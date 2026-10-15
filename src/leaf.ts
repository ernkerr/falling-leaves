/** A fixed value, or a `[min, max]` range that each leaf picks a value from. */
export type Range = number | [number, number];

/** The options that shape how each leaf moves. All ranges are per leaf. */
export interface MotionOptions {
  /** Leaf size in CSS pixels. */
  size: Range;
  /** Fall speed in pixels per frame (at 60fps). */
  speed: Range;
  /** Steady sideways drift in pixels per frame. Negative blows left. */
  wind: Range;
  /** How far leaves swing side to side, in pixels per frame. */
  sway: Range;
  /** Spin speed in degrees per frame. */
  rotationSpeed: Range;
}

/**
 * One leaf. Each leaf keeps random factors between 0 and 1 rather than
 * final values, so changing options takes effect immediately for every leaf.
 */
export interface Leaf {
  x: number;
  y: number;
  rotation: number;
  /** Where the leaf is in its side-to-side swing, in radians. */
  swayPhase: number;
  /** Where the leaf is in its tumble (3D flip), in radians. */
  flipPhase: number;
  /** Which color sprite or image this leaf uses. */
  variant: number;
  rSize: number;
  rSpeed: number;
  rWind: number;
  rSway: number;
  rRotation: number;
  rSwayFreq: number;
  rFlipFreq: number;
}

/**
 * How a kind of leaf moves, relative to the options. Light, flat leaves
 * like ginkgo and birch drift side to side instead of spinning.
 */
export interface MotionProfile {
  /** Multiplies how far the leaf swings side to side. */
  sway: number;
  /** Multiplies how fast the side-to-side swing is. */
  swayFreq: number;
  /** Multiplies spin speed. */
  spin: number;
  /** Multiplies how fast the leaf tumbles over. */
  flip: number;
  /** Degrees the leaf tilts back and forth as it swings, like a pendulum. */
  rock: number;
}

export const DEFAULT_PROFILE: MotionProfile = { sway: 1, swayFreq: 1, spin: 1, flip: 1, rock: 0 };

export type Random = () => number;

/** Picks the value at `t` (0–1) between a range's ends. */
export function pick(range: Range, t: number): number {
  if (typeof range === 'number') return range;
  const [min, max] = range;
  return min + (max - min) * t;
}

/** The largest size a leaf can be. Used to decide when a leaf is off screen. */
export function maxSize(range: Range): number {
  return typeof range === 'number' ? range : Math.max(range[0], range[1]);
}

/**
 * Makes a leaf. With `anywhere`, it starts at a random height so the screen
 * is already full on the first frame; otherwise it starts just above the top.
 */
export function createLeaf(
  opts: MotionOptions,
  width: number,
  height: number,
  variants: number,
  random: Random,
  anywhere: boolean,
): Leaf {
  const rSize = random();
  const size = pick(opts.size, rSize);
  return {
    x: random() * width,
    y: anywhere ? random() * height : -size - random() * height * 0.2,
    rotation: random() * 360,
    swayPhase: random() * Math.PI * 2,
    flipPhase: random() * Math.PI * 2,
    variant: Math.floor(random() * Math.max(1, variants)),
    rSize,
    rSpeed: random(),
    rWind: random(),
    rSway: random(),
    rRotation: random(),
    rSwayFreq: random(),
    rFlipFreq: random(),
  };
}

/**
 * Moves a leaf forward by `dt` frames (1 = one frame at 60fps). A leaf
 * that falls off the bottom goes back to the top as a new leaf. A leaf that
 * drifts off the side comes back on the other side.
 */
export function stepLeaf(
  leaf: Leaf,
  dt: number,
  opts: MotionOptions,
  width: number,
  height: number,
  variants: number,
  random: Random,
  profile: MotionProfile = DEFAULT_PROFILE,
): void {
  const size = pick(opts.size, leaf.rSize);
  const swayFreq = (0.01 + leaf.rSwayFreq * 0.02) * profile.swayFreq;
  const flipFreq = (0.02 + leaf.rFlipFreq * 0.04) * profile.flip;

  leaf.swayPhase += swayFreq * dt;
  leaf.flipPhase += flipFreq * dt;

  const sway = Math.sin(leaf.swayPhase) * pick(opts.sway, leaf.rSway) * profile.sway;
  leaf.x += (pick(opts.wind, leaf.rWind) + sway) * dt;
  // Leaves slow down at the ends of each swing, like a real leaf rocking as it falls.
  const flutter = 0.6 + 0.4 * Math.abs(Math.cos(leaf.swayPhase));
  leaf.y += pick(opts.speed, leaf.rSpeed) * flutter * dt;
  leaf.rotation += pick(opts.rotationSpeed, leaf.rRotation) * profile.spin * dt;

  if (leaf.y - size > height) {
    Object.assign(leaf, createLeaf(opts, width, height, variants, random, false));
    return;
  }
  const margin = size;
  if (leaf.x > width + margin) leaf.x = -margin;
  else if (leaf.x < -margin) leaf.x = width + margin;
}
