import { describe, it, expect } from 'vitest';
import { parseExpression } from '../math/expressionParser';

describe('Expression Parser', () => {
  it('accepts y=5 as constant', () => {
    const r = parseExpression('y=5');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('constant');
    expect(r.evalFn!(0)).toBe(5);
  });

  it('accepts bare number', () => {
    const r = parseExpression('3');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('constant');
  });

  it('accepts y = 2x + 1 as linear', () => {
    const r = parseExpression('y = 2x + 1');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('linear');
    expect(r.evalFn!(0)).toBe(1);
    expect(r.evalFn!(2)).toBe(5);
  });

  it('accepts y=-x+4 as linear', () => {
    const r = parseExpression('y=-x+4');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('linear');
    expect(r.evalFn!(0)).toBe(4);
    expect(r.evalFn!(1)).toBe(3);
  });

  it('accepts y=x^2 as quadratic', () => {
    const r = parseExpression('y=x^2');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('quadratic');
    expect(r.evalFn!(3)).toBe(9);
  });

  it('accepts (x-2)^2+1 as quadratic', () => {
    const r = parseExpression('y=(x-2)^2+1');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('quadratic');
    expect(r.evalFn!(2)).toBeCloseTo(1);
    expect(r.evalFn!(3)).toBeCloseTo(2);
  });

  it('accepts 0.25x^3-2 as cubic', () => {
    const r = parseExpression('y=0.25x^3-2');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('cubic');
    expect(r.evalFn!(0)).toBeCloseTo(-2);
    expect(r.evalFn!(2)).toBeCloseTo(0);
  });

  it('accepts 2^x as exponential', () => {
    const r = parseExpression('y=2^x');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('exponential');
    expect(r.evalFn!(0)).toBe(1);
    expect(r.evalFn!(3)).toBe(8);
  });

  it('accepts 1/x as reciprocal', () => {
    const r = parseExpression('y=1/x');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('reciprocal');
    expect(r.evalFn!(2)).toBe(0.5);
    expect(isNaN(r.evalFn!(0))).toBe(true);
  });

  it('accepts abs(x-2)+3 as absoluteValue', () => {
    const r = parseExpression('y=abs(x-2)+3');
    expect(r.valid).toBe(true);
    expect(r.family).toBe('absoluteValue');
    expect(r.evalFn!(2)).toBe(3);
    expect(r.evalFn!(0)).toBe(5);
  });

  it('rejects sin(x)', () => {
    const r = parseExpression('y=sin(x)');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('sin');
  });

  it('rejects log(x)', () => {
    const r = parseExpression('y=log(x)');
    expect(r.valid).toBe(false);
  });

  it('rejects y on right side', () => {
    const r = parseExpression('y=x/y');
    expect(r.valid).toBe(false);
  });

  it('handles negative constants', () => {
    const r = parseExpression('-4');
    expect(r.valid).toBe(true);
    expect(r.evalFn!(0)).toBe(-4);
  });

  it('handles implied multiplication 2x', () => {
    const r = parseExpression('2x');
    expect(r.valid).toBe(true);
    expect(r.evalFn!(3)).toBe(6);
  });
});
