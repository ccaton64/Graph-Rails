import { CoordinateWindow } from '../types';

export interface SampledPath {
  segments: Array<Array<{ x: number; y: number }>>;
  hasDiscontinuity: boolean;
}

const SAMPLE_COUNT = 200;
const DISCONTINUITY_THRESHOLD = 15; // jump larger than this in y = discontinuity

export function sampleFunction(
  fn: (x: number) => number,
  window: CoordinateWindow
): SampledPath {
  const { xMin, xMax, yMin, yMax } = window;
  const step = (xMax - xMin) / SAMPLE_COUNT;
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let currentSegment: Array<{ x: number; y: number }> = [];
  let hasDiscontinuity = false;

  let prevY: number | null = null;

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const x = xMin + i * step;
    let y: number;
    try {
      y = fn(x);
    } catch {
      y = NaN;
    }

    const inBounds = isFinite(y) && y >= yMin - 2 && y <= yMax + 2;
    const jump = prevY !== null && isFinite(y) && Math.abs(y - prevY) > DISCONTINUITY_THRESHOLD;

    if (!inBounds || jump) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
        // A gap after a valid segment = discontinuity
        hasDiscontinuity = true;
      }
      currentSegment = [];
      if (jump) hasDiscontinuity = true;
    } else {
      currentSegment.push({ x, y });
    }

    prevY = isFinite(y) ? y : null;
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return { segments, hasDiscontinuity };
}

export function getAllPoints(path: SampledPath): Array<{ x: number; y: number }> {
  return path.segments.flat();
}
