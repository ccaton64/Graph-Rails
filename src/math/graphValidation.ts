import { PuzzleSpec, AttemptResult, GraphZone, HazardSpec, FunctionFamily } from '../types';
import { ParseResult } from './expressionParser';
import { SampledPath, getAllPoints } from './graphSampler';
import { generateHint } from './hintEngine';

/** Rectangle collision — hazards are solid grid-aligned blocks */
function pointInRect(px: number, py: number, zone: GraphZone | HazardSpec): boolean {
  return Math.abs(px - zone.x) <= zone.radiusX && Math.abs(py - zone.y) <= zone.radiusY;
}

function pathHitsZone(
  points: Array<{ x: number; y: number }>,
  zone: GraphZone | HazardSpec
): boolean {
  for (const p of points) {
    if (pointInRect(p.x, p.y, zone)) return true;
  }
  return false;
}

export function validateAttempt(
  puzzle: PuzzleSpec,
  parseResult: ParseResult,
  path: SampledPath
): AttemptResult {
  if (!parseResult.valid || !parseResult.evalFn) {
    return {
      validSyntax: false,
      accepted: false,
      hint: parseResult.error ?? 'Invalid equation.',
      failureReason: 'syntax',
    };
  }

  const family = parseResult.family!;

  // Check family restriction (if any)
  if (puzzle.allowedFamilies.length > 0 && !puzzle.allowedFamilies.includes(family)) {
    return {
      validSyntax: true,
      accepted: false,
      family,
      hint: `This puzzle needs a ${formatFamily(puzzle.family)} function. Try using ${getFamilyHint(puzzle.family)}.`,
      failureReason: 'unsupported-family',
    };
  }

  const allPoints = getAllPoints(path);

  if (allPoints.length === 0) {
    return {
      validSyntax: true,
      accepted: false,
      family,
      hint: 'Your graph is outside the visible area. Try different values.',
      failureReason: 'out-of-bounds',
    };
  }

  // Check hazards first (rectangular collision)
  for (const hz of puzzle.hazards) {
    if (pathHitsZone(allPoints, hz)) {
      const hint = generateHint(puzzle, parseResult, path, 'hit-hazard');
      return { validSyntax: true, accepted: false, family, hint, failureReason: 'hit-hazard' };
    }
  }

  // Check all required gems are collected
  for (const cp of puzzle.checkpoints) {
    if (cp.required && !pathHitsZone(allPoints, cp)) {
      const hint = generateHint(puzzle, parseResult, path, 'missed-checkpoint');
      return { validSyntax: true, accepted: false, family, hint, failureReason: 'missed-checkpoint' };
    }
  }

  return {
    validSyntax: true,
    accepted: true,
    family,
    normalizedExpression: parseResult.normalized,
    hint: 'All gems collected!',
    sampledPoints: allPoints,
    segments: path.segments,
  };
}

function formatFamily(f: FunctionFamily): string {
  const names: Record<FunctionFamily, string> = {
    constant: 'constant (y = b)',
    linear: 'linear (y = mx + b)',
    quadratic: 'quadratic (y = ax² + k)',
    cubic: 'cubic (y = ax³ + k)',
    exponential: 'exponential (y = aˣ)',
    reciprocal: 'reciprocal (y = 1/x)',
    absoluteValue: 'absolute value (y = |x|)',
  };
  return names[f] ?? f;
}

function getFamilyHint(f: FunctionFamily): string {
  const hints: Record<FunctionFamily, string> = {
    constant: 'y = 5',
    linear: 'y = 2x + 1',
    quadratic: 'y = x^2 + k',
    cubic: 'y = 0.1*x^3 + k',
    exponential: 'y = 2^x',
    reciprocal: 'y = 1/x',
    absoluteValue: 'y = abs(x)',
  };
  return hints[f] ?? f;
}
