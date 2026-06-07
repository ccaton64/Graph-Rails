import { PuzzleSpec, FailureReason, FunctionFamily } from '../types';
import { ParseResult } from './expressionParser';
import { SampledPath, getAllPoints } from './graphSampler';

export function generateHint(
  puzzle: PuzzleSpec,
  parseResult: ParseResult,
  path: SampledPath,
  reason: FailureReason
): string {
  const points = getAllPoints(path);
  const targetY = puzzle.finishGate.y;
  const startY = puzzle.startGate.y;

  if (reason === 'missed-start') {
    return hintMissedGate(points, startY, 'start', puzzle.family);
  }

  if (reason === 'missed-finish') {
    return hintMissedGate(points, targetY, 'finish', puzzle.family);
  }

  if (reason === 'missed-checkpoint') {
    const cp = puzzle.checkpoints[0];
    if (!cp) return 'Your rail missed a checkpoint gem. Try adjusting the shape.';
    return hintMissedCheckpoint(points, cp.y, puzzle.family, parseResult);
  }

  if (reason === 'hit-hazard') {
    return hintHazard(puzzle.family, parseResult);
  }

  return 'Check your equation and try again.';
}

function hintMissedGate(
  points: Array<{ x: number; y: number }>,
  targetY: number,
  gateName: string,
  family: FunctionFamily
): string {
  if (points.length === 0) return `Your rail doesn't reach the ${gateName} station. Try different values.`;

  const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
  const diff = avgY - targetY;

  if (Math.abs(diff) < 0.5) {
    return `Your rail is very close to the ${gateName} station! Try a tiny adjustment.`;
  }

  if (diff > 1) {
    if (family === 'constant' || family === 'linear') {
      return `Your whole rail is above the ${gateName} station. Try lowering the + b value.`;
    }
    return `Your rail is too high to reach the ${gateName} station. Try decreasing the vertical shift.`;
  }

  if (diff < -1) {
    if (family === 'constant' || family === 'linear') {
      return `Your rail is below the ${gateName} station. Try increasing the + b value.`;
    }
    return `Your rail is too low for the ${gateName} station. Try increasing the vertical shift.`;
  }

  return `Your rail missed the ${gateName} station. Adjust the shape or position.`;
}

function hintMissedCheckpoint(
  points: Array<{ x: number; y: number }>,
  cpY: number,
  family: FunctionFamily,
  parseResult: ParseResult
): string {
  if (points.length === 0) return 'Your rail missed a checkpoint gem. Try different values.';

  const nearestY = points.reduce((best, p) => Math.abs(p.y - cpY) < Math.abs(best - cpY) ? p.y : best, points[0].y);
  const diff = nearestY - cpY;

  if (diff > 1) return familyHintTooHigh(family);
  if (diff < -1) return familyHintTooLow(family);
  return 'Your rail is close! Adjust slightly to hit the checkpoint gem.';
}

function hintHazard(family: FunctionFamily, parseResult: ParseResult): string {
  const hints: Partial<Record<FunctionFamily, string>> = {
    reciprocal: 'This graph has a break near the obstacle. Try shifting the denominator with (x - h).',
    exponential: 'The rail launches upward too quickly. Try a smaller base or multiplier.',
    quadratic: 'The curve is passing through a hazard. Try adjusting a or k to go around it.',
    linear: 'The slope is taking the rail through a hazard. Try adjusting m or b.',
    absoluteValue: 'The V-shape hits a hazard. Try adjusting h or k to move the vertex.',
    cubic: 'The cubic curve hits a hazard. Try scaling a or adjusting k.',
  };
  return hints[family] ?? 'Your rail hits a hazard. Adjust the equation to avoid it.';
}

function familyHintTooHigh(family: FunctionFamily): string {
  const hints: Partial<Record<FunctionFamily, string>> = {
    constant: 'Your flat rail is above the gem. Try a smaller y value.',
    linear: 'The rail is too high. Try lowering the intercept b.',
    quadratic: 'The curve is too high. Try decreasing k.',
    cubic: 'The curve is too high. Try decreasing k.',
    exponential: 'The rail climbs too fast. Try a smaller base or multiplier.',
    reciprocal: 'The graph is too high. Try adjusting k.',
    absoluteValue: 'The V-shape is too high. Try decreasing k.',
  };
  return hints[family] ?? 'Your rail is above the checkpoint. Lower the vertical shift.';
}

function familyHintTooLow(family: FunctionFamily): string {
  const hints: Partial<Record<FunctionFamily, string>> = {
    constant: 'Your flat rail is below the gem. Try a larger y value.',
    linear: 'The rail is too low. Try increasing the intercept b.',
    quadratic: 'The curve is too low. Try increasing k.',
    cubic: 'The curve is too low. Try increasing k.',
    exponential: 'The rail starts too low. Try a larger multiplier or vertical shift.',
    reciprocal: 'The graph is too low. Try increasing k.',
    absoluteValue: 'The V-shape is too low. Try increasing k.',
  };
  return hints[family] ?? 'Your rail is below the checkpoint. Increase the vertical shift.';
}

export function getStagedHint(
  puzzle: PuzzleSpec,
  mistakeCount: number
): string {
  if (mistakeCount <= 1) {
    return `Hint: This is a ${familyName(puzzle.family)} function.`;
  }
  if (mistakeCount === 2) {
    return getParameterHint(puzzle);
  }
  if (mistakeCount === 3) {
    return getDirectionalHint(puzzle);
  }
  return `Answer: y = ${puzzle.targetExpression}`;
}

function familyName(f: FunctionFamily): string {
  const n: Record<FunctionFamily, string> = {
    constant: 'constant',
    linear: 'linear (slope-intercept)',
    quadratic: 'quadratic (parabola)',
    cubic: 'cubic',
    exponential: 'exponential',
    reciprocal: 'reciprocal',
    absoluteValue: 'absolute value (V-shape)',
  };
  return n[f];
}

function getParameterHint(puzzle: PuzzleSpec): string {
  const focus = puzzle.parameterFocus;
  if (focus === 'm') return 'Try adjusting the slope m — it controls how steep the rail is.';
  if (focus === 'b') return 'Try adjusting the b value — it shifts the whole rail up or down.';
  if (focus === 'a') return 'Try adjusting the a value — it changes the width and direction of the curve.';
  if (focus === 'h') return 'Try adjusting h — it shifts the graph left or right.';
  if (focus === 'k') return 'Try adjusting k — it shifts the graph up or down.';
  if (focus === 'base') return 'Try changing the base of the exponent to control growth speed.';
  return `Focus on the parameters in the ${familyName(puzzle.family)} equation.`;
}

function getDirectionalHint(puzzle: PuzzleSpec): string {
  const target = puzzle.targetExpression;
  const focus = puzzle.parameterFocus;
  if (focus === 'b' || focus === 'k') {
    return `Try moving the vertical shift closer to the target height near the stations.`;
  }
  if (focus === 'm') {
    return `The slope needs to be different. Check whether the rail should go up or down across the screen.`;
  }
  if (focus === 'a') {
    return `The curve width or direction (positive/negative a) needs adjustment.`;
  }
  return `Your equation is close. Try small changes until the rail passes through all checkpoints. Target form: y = ${target}`;
}
