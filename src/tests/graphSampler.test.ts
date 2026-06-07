import { describe, it, expect } from 'vitest';
import { sampleFunction } from '../math/graphSampler';

const W = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

describe('Graph Sampler', () => {
  it('constant path has same y for all x', () => {
    const pts = sampleFunction(() => 5, W);
    const all = pts.segments.flat();
    expect(all.length).toBeGreaterThan(0);
    for (const p of all) expect(p.y).toBeCloseTo(5);
  });

  it('linear path passes expected sample points', () => {
    const fn = (x: number) => 2 * x + 1;
    const path = sampleFunction(fn, W);
    const all = path.segments.flat();
    for (const p of all) expect(p.y).toBeCloseTo(fn(p.x), 3);
  });

  it('quadratic vertex appears at expected h/k', () => {
    const h = 2, k = -3;
    const fn = (x: number) => (x - h) ** 2 + k;
    const path = sampleFunction(fn, W);
    const all = path.segments.flat();
    const near = all.find(p => Math.abs(p.x - h) < 0.2);
    expect(near).toBeTruthy();
    expect(near!.y).toBeCloseTo(k, 0);
  });

  it('cubic stays finite for safe parameter range', () => {
    const fn = (x: number) => 0.1 * x ** 3;
    const path = sampleFunction(fn, W);
    const all = path.segments.flat();
    for (const p of all) expect(isFinite(p.y)).toBe(true);
  });

  it('reciprocal path splits at vertical asymptote', () => {
    const fn = (x: number) => 1 / x;
    const path = sampleFunction(fn, W);
    expect(path.hasDiscontinuity).toBe(true);
    expect(path.segments.length).toBeGreaterThan(1);
  });

  it('absolute value creates V-shape with correct vertex', () => {
    const h = 1, k = 2;
    const fn = (x: number) => Math.abs(x - h) + k;
    const path = sampleFunction(fn, W);
    const all = path.segments.flat();
    const vertex = all.find(p => Math.abs(p.x - h) < 0.1);
    expect(vertex).toBeTruthy();
    expect(vertex!.y).toBeCloseTo(k, 0);
  });
});
