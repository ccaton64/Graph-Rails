import { describe, it, expect } from 'vitest';
import { parseExpression } from '../math/expressionParser';
import { sampleFunction } from '../math/graphSampler';
import { validateAttempt } from '../math/graphValidation';
import { generatePuzzle } from '../generation/puzzleGenerator';

const W = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

function validate(expr: string, puzzleSeed: number, family: Parameters<typeof generatePuzzle>[0]) {
  const puzzle = generatePuzzle(family, puzzleSeed, 1);
  const parse = parseExpression(expr);
  if (!parse.valid || !parse.evalFn) return { accepted: false, hint: parse.error };
  const path = sampleFunction(parse.evalFn, puzzle.coordinateWindow);
  return validateAttempt(puzzle, parse, path);
}

describe('Puzzle Validation', () => {
  it('target answer passes its own puzzle', () => {
    const puzzle = generatePuzzle('constant', 42, 1);
    const parse = parseExpression(puzzle.targetExpression);
    expect(parse.valid).toBe(true);
    const path = sampleFunction(parse.evalFn!, puzzle.coordinateWindow);
    const result = validateAttempt(puzzle, parse, path);
    expect(result.accepted).toBe(true);
  });

  it('target linear answer passes its puzzle', () => {
    const puzzle = generatePuzzle('linear', 77, 2);
    const parse = parseExpression(puzzle.targetExpression);
    expect(parse.valid).toBe(true);
    const path = sampleFunction(parse.evalFn!, puzzle.coordinateWindow);
    const result = validateAttempt(puzzle, parse, path);
    expect(result.accepted).toBe(true);
  });

  it('target quadratic answer passes its puzzle', () => {
    const puzzle = generatePuzzle('quadratic', 123, 3);
    const parse = parseExpression(puzzle.targetExpression);
    expect(parse.valid).toBe(true);
    const path = sampleFunction(parse.evalFn!, puzzle.coordinateWindow);
    const result = validateAttempt(puzzle, parse, path);
    expect(result.accepted).toBe(true);
  });

  it('wrong vertical shift fails checkpoint', () => {
    const puzzle = generatePuzzle('constant', 42, 1);
    // Target is some b; offset by 5 should fail
    const target = parseInt(puzzle.targetExpression);
    const wrong = String(target + 5);
    const parse = parseExpression(wrong);
    const path = sampleFunction(parse.evalFn!, puzzle.coordinateWindow);
    const result = validateAttempt(puzzle, parse, path);
    expect(result.accepted).toBe(false);
  });

  it('syntax error fails with syntax reason', () => {
    const puzzle = generatePuzzle('linear', 77, 2);
    const parse = parseExpression('sin(x)');
    const path = sampleFunction(() => 0, puzzle.coordinateWindow);
    const result = validateAttempt(puzzle, parse, path);
    expect(result.accepted).toBe(false);
    expect(result.validSyntax).toBe(false);
  });

  it('wrong family fails when family is locked', () => {
    const puzzle = generatePuzzle('linear', 77, 2);
    // constant function won't satisfy a linear puzzle's checkpoints
    const parse = parseExpression('3');
    const path = sampleFunction(parse.evalFn!, puzzle.coordinateWindow);
    const result = validateAttempt(puzzle, parse, path);
    // Should fail — either wrong family or missed checkpoints
    expect(result.accepted).toBe(false);
  });
});
