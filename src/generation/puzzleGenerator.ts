import { PuzzleSpec, FunctionFamily, GraphZone, HazardSpec, CoordinateWindow } from '../types';
import { parseExpression } from '../math/expressionParser';
import { sampleFunction } from '../math/graphSampler';

// Seeded random
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const DEFAULT_WINDOW: CoordinateWindow = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

function makeGate(id: string, x: number, y: number, required = true): GraphZone {
  return { id, x, y, radiusX: 1.5, radiusY: 1.5, required };
}

/** Find x in [xMin,xMax] where fn(x) is within yMin..yMax, scanning inward from preferX.
 *  direction=1 means preferX is near xMin → scan rightward (increasing x toward center)
 *  direction=-1 means preferX is near xMax → scan leftward (decreasing x toward center)
 */
function findInBoundsX(
  fn: (x: number) => number,
  window: CoordinateWindow,
  preferX: number,
  direction: 1 | -1
): { x: number; y: number } {
  let x = preferX;
  const step = 0.5; // always positive; direction controls sign
  for (let i = 0; i < 60; i++) {
    const y = fn(x);
    if (isFinite(y) && y >= window.yMin + 0.5 && y <= window.yMax - 0.5) {
      return { x, y };
    }
    x += direction * step; // direction=1: move right; direction=-1: move left
    if (x < window.xMin || x > window.xMax) break;
  }
  // Fallback: scan from the appropriate edge
  const scanStart = direction === 1 ? window.xMin : window.xMax;
  const scanEnd = direction === 1 ? window.xMax : window.xMin;
  const scanStep = direction * 0.25;
  for (let xi = scanStart; direction === 1 ? xi <= scanEnd : xi >= scanEnd; xi += scanStep) {
    const y = fn(xi);
    if (isFinite(y) && y >= window.yMin + 0.5 && y <= window.yMax - 0.5) return { x: xi, y };
  }
  return { x: 0, y: fn(0) };
}

function makeHazard(id: string, type: HazardSpec['type'], x: number, y: number): HazardSpec {
  return { id, type, x, y, radiusX: 1.2, radiusY: 1.2 };
}

export function generatePuzzle(family: FunctionFamily, seed: number, difficulty = 1): PuzzleSpec {
  const rng = new SeededRandom(seed);
  const id = `${family}-${seed}`;
  const window = { ...DEFAULT_WINDOW };

  switch (family) {
    case 'constant': return genConstant(id, seed, rng, window);
    case 'linear': return genLinear(id, seed, rng, window, difficulty);
    case 'quadratic': return genQuadratic(id, seed, rng, window, difficulty);
    case 'cubic': return genCubic(id, seed, rng, window, difficulty);
    case 'exponential': return genExponential(id, seed, rng, window, difficulty);
    case 'reciprocal': return genReciprocal(id, seed, rng, window, difficulty);
    case 'absoluteValue': return genAbsoluteValue(id, seed, rng, window, difficulty);
  }
}

function genConstant(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow): PuzzleSpec {
  const b = rng.int(-6, 6);
  const expr = b === 0 ? '0' : `${b}`;
  const startX = window.xMin + 1;
  const endX = window.xMax - 1;

  const hazardY = b + rng.pick([-3, 3]);
  const hazards: HazardSpec[] = [];
  if (Math.abs(hazardY - b) >= 2 && Math.abs(hazardY) <= 7) {
    hazards.push(makeHazard('h1', 'rock', 0, hazardY));
  }

  return {
    id, seed: String(seed), family: 'constant',
    allowedFamilies: ['constant'],
    targetExpression: expr,
    displayPrompt: `Build a flat rail at height ${b}`,
    coordinateWindow: window,
    startGate: makeGate('start', startX, b),
    finishGate: makeGate('finish', endX, b),
    checkpoints: [{ id: 'cp1', x: 0, y: b, radiusX: 1.5, radiusY: 1.5, required: true }],
    hazards,
    maxMistakesBeforeReveal: 4,
    parameterFocus: 'b',
    learningText: `A flat rail has the form y = b. The number sets the height of the whole rail.`,
  };
}

function genLinear(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow, difficulty: number): PuzzleSpec {
  const mChoices = difficulty <= 1 ? [1, -1, 2] : [-3, -2, -1, -0.5, 0.5, 1, 2, 3];
  const m = rng.pick(mChoices);
  const b = rng.int(-4, 4);
  const expr = formatLinear(m, b);
  const fn = (x: number) => m * x + b;

  const start = findInBoundsX(fn, window, window.xMin + 1, 1);
  const end = findInBoundsX(fn, window, window.xMax - 1, -1);
  const cpX = 0;
  const cpY = fn(cpX);

  let hazards: HazardSpec[] = [];
  if (Math.abs(cpY + 3) < 8) hazards.push(makeHazard('h1', 'rock', -3, cpY + 3));
  if (Math.abs(cpY - 3) < 8) hazards.push(makeHazard('h2', 'lava', 3, cpY - 3));
  hazards = sanitizeHazards(hazards, fn, window);

  return {
    id, seed: String(seed), family: 'linear',
    allowedFamilies: ['linear'],
    targetExpression: expr,
    displayPrompt: 'Build a sloped rail through the checkpoints',
    coordinateWindow: window,
    startGate: makeGate('start', start.x, start.y),
    finishGate: makeGate('finish', end.x, end.y),
    checkpoints: [{ id: 'cp1', x: cpX, y: cpY, radiusX: 1.5, radiusY: 1.5, required: true }],
    hazards,
    maxMistakesBeforeReveal: 4,
    parameterFocus: difficulty <= 1 ? 'm' : 'b',
    learningText: `A sloped rail uses y = mx + b. m controls the tilt, b controls the height.`,
  };
}

function genQuadratic(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow, difficulty: number): PuzzleSpec {
  const aChoices = difficulty <= 2 ? [1, -1] : [-2, -1, -0.5, 0.5, 1, 2];
  const a = rng.pick(aChoices);
  const h = difficulty <= 2 ? 0 : rng.int(-3, 3);
  const k = rng.int(-4, 4);

  let expr = '';
  if (h === 0) {
    expr = a === 1 ? `x^2${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}` : `${a}*x^2${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  } else {
    const hStr = h > 0 ? `(x-${h})` : `(x+${Math.abs(h)})`;
    expr = a === 1 ? `${hStr}^2${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}` : `${a}*${hStr}^2${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  }

  const fn = (x: number) => a * Math.pow(x - h, 2) + k;
  const start = findInBoundsX(fn, window, window.xMin + 1, 1);
  const end = findInBoundsX(fn, window, window.xMax - 1, -1);

  const checkpoints: GraphZone[] = [];
  // Only add vertex checkpoint if vertex is in bounds
  if (k >= window.yMin + 0.5 && k <= window.yMax - 0.5) {
    checkpoints.push({ id: 'vertex', x: h, y: k, radiusX: 1.8, radiusY: 1.8, required: true });
  }

  let hazards: HazardSpec[] = [];
  const hazardX = h + (a > 0 ? 2 : -2);
  const hazardY = fn(hazardX) + (a > 0 ? -3 : 3);
  if (Math.abs(hazardY) < 7) hazards.push(makeHazard('h1', 'rock', hazardX, hazardY));
  hazards = sanitizeHazards(hazards, fn, window);

  return {
    id, seed: String(seed), family: 'quadratic',
    allowedFamilies: ['quadratic'],
    targetExpression: expr,
    displayPrompt: a > 0 ? 'Build a U-shaped rail through the valley' : 'Build a curved rail over the hill',
    coordinateWindow: window,
    startGate: makeGate('start', start.x, start.y),
    finishGate: makeGate('finish', end.x, end.y),
    checkpoints,
    hazards,
    maxMistakesBeforeReveal: 4,
    parameterFocus: difficulty <= 2 ? 'k' : 'a',
    learningText: `A parabola uses y = ax² + k. a controls width/direction, k shifts it up/down.`,
  };
}

function genCubic(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow, difficulty: number): PuzzleSpec {
  const aChoices = [-0.25, -0.1, 0.1, 0.25];
  const a = rng.pick(aChoices);
  const h = difficulty <= 4 ? 0 : rng.int(-2, 2);
  const k = rng.int(-3, 3);

  let expr = '';
  if (h === 0) {
    expr = `${a}*x^3${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  } else {
    const hStr = h > 0 ? `(x-${h})` : `(x+${Math.abs(h)})`;
    expr = `${a}*${hStr}^3${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  }

  const fn = (x: number) => a * Math.pow(x - h, 3) + k;
  const start = findInBoundsX(fn, window, window.xMin + 1, 1);
  const end = findInBoundsX(fn, window, window.xMax - 1, -1);

  const checkpoints: GraphZone[] = [];
  if (k >= window.yMin + 0.5 && k <= window.yMax - 0.5) {
    checkpoints.push({ id: 'mid', x: h, y: k, radiusX: 1.8, radiusY: 1.8, required: true });
  }

  return {
    id, seed: String(seed), family: 'cubic',
    allowedFamilies: ['cubic'],
    targetExpression: expr,
    displayPrompt: 'Build an S-shaped cubic rail',
    coordinateWindow: window,
    startGate: makeGate('start', start.x, start.y),
    finishGate: makeGate('finish', end.x, end.y),
    checkpoints,
    hazards: [],
    maxMistakesBeforeReveal: 4,
    parameterFocus: 'k',
    learningText: `A cubic curve uses y = ax³ + k. x³ makes an S-shape that goes from low to high.`,
  };
}

function genExponential(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow, difficulty: number): PuzzleSpec {
  const bases = [1.5, 2, 3];
  const base = rng.pick(bases);
  const c = difficulty <= 4 ? 1 : rng.pick([0.5, 1, 2]);
  const h = difficulty <= 4 ? 0 : rng.int(-2, 2);
  const k = rng.int(-3, 2);

  let expr = '';
  if (c === 1 && h === 0) {
    expr = `${base}^x${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  } else if (c !== 1 && h === 0) {
    expr = `${c}*${base}^x${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  } else {
    const hStr = h > 0 ? `x-${h}` : `x+${Math.abs(h)}`;
    expr = `${c}*${base}^(${hStr})${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  }

  const fn = (x: number) => c * Math.pow(base, x - h) + k;
  const expWindow = { ...window, xMin: -6, xMax: 6 };
  const start = findInBoundsX(fn, expWindow, expWindow.xMin + 1, 1);
  const end = findInBoundsX(fn, expWindow, expWindow.xMax - 1, -1);
  const midY = fn(0);
  const midInBounds = isFinite(midY) && midY >= expWindow.yMin + 0.5 && midY <= expWindow.yMax - 0.5;

  return {
    id, seed: String(seed), family: 'exponential',
    allowedFamilies: ['exponential'],
    targetExpression: expr,
    displayPrompt: 'Build a rail that grows exponentially',
    coordinateWindow: expWindow,
    startGate: makeGate('start', start.x, start.y),
    finishGate: makeGate('finish', end.x, end.y),
    checkpoints: midInBounds ? [{ id: 'cp1', x: 0, y: midY, radiusX: 1.8, radiusY: 1.8, required: true }] : [],
    hazards: [],
    maxMistakesBeforeReveal: 4,
    parameterFocus: 'base',
    learningText: `In y = aˣ, the x is in the exponent, so the rail grows faster and faster.`,
  };
}

function genReciprocal(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow, difficulty: number): PuzzleSpec {
  const a = rng.pick([-2, -1, 1, 2]);
  const h = difficulty <= 5 ? 0 : rng.int(-3, 3);
  const k = difficulty <= 5 ? 0 : rng.int(-3, 3);

  let expr = '';
  if (h === 0 && k === 0) {
    expr = a === 1 ? `1/x` : `${a}/x`;
  } else if (h !== 0 && k === 0) {
    const hStr = h > 0 ? `x-${h}` : `x+${Math.abs(h)}`;
    expr = a === 1 ? `1/(${hStr})` : `${a}/(${hStr})`;
  } else {
    const hStr = h > 0 ? `x-${h}` : `x+${Math.abs(h)}`;
    expr = a === 1 ? `1/(${hStr})${k > 0 ? `+${k}` : `${k}`}` : `${a}/(${hStr})${k > 0 ? `+${k}` : `${k}`}`;
  }

  // Use right branch (x > h+1)
  const fn = (x: number) => a / (x - h) + k;
  const rightWindow = { ...window, xMin: h + 0.5 };
  const start = findInBoundsX(fn, rightWindow, h + 1.5, 1);
  const end = findInBoundsX(fn, rightWindow, window.xMax - 1, -1);

  return {
    id, seed: String(seed), family: 'reciprocal',
    allowedFamilies: ['reciprocal'],
    targetExpression: expr,
    displayPrompt: 'Build a reciprocal rail — watch out for the break!',
    coordinateWindow: window,
    startGate: makeGate('start', start.x, start.y),
    finishGate: makeGate('finish', end.x, end.y),
    checkpoints: [],
    hazards: [makeHazard('asymptote', 'hole', h, 0)],
    maxMistakesBeforeReveal: 4,
    parameterFocus: 'h',
    learningText: `y = 1/x has a break where x would make the bottom zero — that's a ravine!`,
  };
}

function genAbsoluteValue(id: string, seed: number, rng: SeededRandom, window: CoordinateWindow, difficulty: number): PuzzleSpec {
  const a = rng.pick([-2, -1, -0.5, 0.5, 1, 2]);
  const h = difficulty <= 3 ? 0 : rng.int(-4, 4);
  const k = rng.int(-4, 4);

  let expr = '';
  if (h === 0) {
    expr = a === 1 ? `abs(x)${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`
      : `${a}*abs(x)${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  } else {
    const hStr = h > 0 ? `x-${h}` : `x+${Math.abs(h)}`;
    expr = a === 1 ? `abs(${hStr})${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`
      : `${a}*abs(${hStr})${k !== 0 ? (k > 0 ? `+${k}` : `${k}`) : ''}`;
  }

  const fn = (x: number) => a * Math.abs(x - h) + k;
  const start = findInBoundsX(fn, window, window.xMin + 1, 1);
  const end = findInBoundsX(fn, window, window.xMax - 1, -1);

  const checkpoints: GraphZone[] = [];
  if (k >= window.yMin + 0.5 && k <= window.yMax - 0.5) {
    checkpoints.push({ id: 'vertex', x: h, y: k, radiusX: 1.8, radiusY: 1.8, required: true });
  }

  return {
    id, seed: String(seed), family: 'absoluteValue',
    allowedFamilies: ['absoluteValue'],
    targetExpression: expr,
    displayPrompt: a > 0 ? 'Build a V-shaped rail' : 'Build an inverted-V rail',
    coordinateWindow: window,
    startGate: makeGate('start', start.x, start.y),
    finishGate: makeGate('finish', end.x, end.y),
    checkpoints,
    hazards: [],
    maxMistakesBeforeReveal: 4,
    parameterFocus: 'k',
    learningText: `Absolute value makes a V-shape. y = |x| + k shifts it up or down.`,
  };
}

function formatLinear(m: number, b: number): string {
  let s = '';
  if (m === 1) s = 'x';
  else if (m === -1) s = '-x';
  else s = `${m}*x`;
  if (b > 0) s += `+${b}`;
  if (b < 0) s += `${b}`;
  return s || '0';
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Remove any hazards that the target fn actually passes through */
function sanitizeHazards(hazards: HazardSpec[], fn: (x: number) => number, window: CoordinateWindow): HazardSpec[] {
  const step = (window.xMax - window.xMin) / 200;
  return hazards.filter(hz => {
    for (let x = window.xMin; x <= window.xMax; x += step) {
      const y = fn(x);
      if (!isFinite(y)) continue;
      const dx = (x - hz.x) / hz.radiusX;
      const dy = (y - hz.y) / hz.radiusY;
      if (dx * dx + dy * dy <= 1.1) return false; // overlaps target path
    }
    return true;
  });
}

// Difficulty tier → family
const TIER_FAMILIES: Record<number, FunctionFamily[]> = {
  1: ['constant', 'linear'],
  2: ['linear'],
  3: ['quadratic', 'absoluteValue'],
  4: ['quadratic', 'absoluteValue'],
  5: ['cubic', 'exponential'],
  6: ['reciprocal', 'constant', 'linear', 'quadratic', 'cubic', 'exponential', 'absoluteValue'],
};

export function generateFreeplayPuzzle(tier: number, seed: number): PuzzleSpec {
  const rng = new SeededRandom(seed);
  const families = TIER_FAMILIES[Math.min(tier, 6)] ?? TIER_FAMILIES[6];
  const family = rng.pick(families);
  return generatePuzzle(family, seed, tier);
}
