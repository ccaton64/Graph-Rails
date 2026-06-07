import { PuzzleSpec, GraphZone, HazardSpec, CoordinateWindow } from '../types';

const W: CoordinateWindow = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

function gate(id: string, x: number, y: number): GraphZone {
  return { id, x, y, radiusX: 1.5, radiusY: 1.5, required: true };
}

function cp(id: string, x: number, y: number, r = 1.5): GraphZone {
  return { id, x, y, radiusX: r, radiusY: r, required: true };
}

function hz(id: string, type: HazardSpec['type'], x: number, y: number, rx = 1.2, ry = 1.2): HazardSpec {
  return { id, type, x, y, radiusX: rx, radiusY: ry };
}

export interface LearningLevel {
  levelNumber: number;
  title: string;
  puzzles: PuzzleSpec[];
}

export const LEARNING_LEVELS: LearningLevel[] = [
  // ── Level 1: Flat Rails y = b ──────────────────────────────────────
  {
    levelNumber: 1,
    title: 'Level 1 — Flat Rails',
    puzzles: [
      {
        id: 'l1p1', seed: 'l1p1', family: 'constant',
        allowedFamilies: [],
        targetExpression: '5',
        displayPrompt: 'Press Play to see a flat rail at height 5',
        coordinateWindow: W,
        startGate: gate('start', -9, 5),
        finishGate: gate('finish', 9, 5),
        checkpoints: [cp('cp1', -6, 5), cp('cp2', 0, 5), cp('cp3', 6, 5)],
        hazards: [],
        maxMistakesBeforeReveal: 10,
        prefillExpression: '5',
        learningText: 'The number after y = sets the height of the whole rail. Press Play!',
        parameterFocus: 'b',
      },
      {
        id: 'l1p2', seed: 'l1p2', family: 'constant',
        allowedFamilies: ['constant'],
        targetExpression: '3',
        displayPrompt: 'Place a flat rail through the gem at height 3',
        coordinateWindow: W,
        startGate: gate('start', -9, 3),
        finishGate: gate('finish', 9, 3),
        checkpoints: [cp('cp1', -6, 3), cp('cp2', 0, 3), cp('cp3', 6, 3)],
        hazards: [hz('h1', 'rock', 0, 6, 2, 1), hz('h2', 'hole', 0, -1, 2, 1)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Change the number so the rail goes through the gem. Try y = 3.',
        parameterFocus: 'b',
      },
      {
        id: 'l1p3', seed: 'l1p3', family: 'constant',
        allowedFamilies: ['constant'],
        targetExpression: '-2',
        displayPrompt: 'Collect all 3 gems at height -2',
        coordinateWindow: W,
        startGate: gate('start', -9, -2),
        finishGate: gate('finish', 9, -2),
        checkpoints: [cp('cp1', -6, -2), cp('cp2', 0, -2), cp('cp3', 6, -2)],
        hazards: [hz('h1', 'lava', 0, 2, 2, 1)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Negative numbers move the rail below the center line.',
        parameterFocus: 'b',
      },
    ],
  },

  // ── Level 2: Moving Flat Rails ─────────────────────────────────────
  {
    levelNumber: 2,
    title: 'Level 2 — Moving Flat Rails',
    puzzles: [
      {
        id: 'l2p1', seed: 'l2p1', family: 'constant',
        allowedFamilies: ['constant'],
        targetExpression: '6',
        displayPrompt: 'Move the flat rail to pass through height 6',
        coordinateWindow: W,
        startGate: gate('start', -9, 6),
        finishGate: gate('finish', 9, 6),
        checkpoints: [cp('cp1', -6, 6), cp('cp2', 0, 6), cp('cp3', 6, 6)],
        hazards: [hz('h1', 'rock', -3, 3, 1.5, 1.5), hz('h2', 'rock', 3, 3, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Change the number to move the rail to the right height.',
        parameterFocus: 'b',
      },
      {
        id: 'l2p2', seed: 'l2p2', family: 'constant',
        allowedFamilies: ['constant'],
        targetExpression: '-4',
        displayPrompt: 'Rail at height -4',
        coordinateWindow: W,
        startGate: gate('start', -9, -4),
        finishGate: gate('finish', 9, -4),
        checkpoints: [cp('cp1', -6, -4), cp('cp2', 0, -4), cp('cp3', 6, -4)],
        hazards: [hz('h1', 'lava', 0, -1, 2, 1)],
        maxMistakesBeforeReveal: 4,
        learningText: 'More negative means lower. Try y = -4.',
        parameterFocus: 'b',
      },
    ],
  },

  // ── Level 3: Sloped Rails y = mx ───────────────────────────────────
  {
    levelNumber: 3,
    title: 'Level 3 — Sloped Rails',
    puzzles: [
      {
        id: 'l3p1', seed: 'l3p1', family: 'linear',
        allowedFamilies: [],
        targetExpression: 'x',
        displayPrompt: 'Press Play to see a diagonal rail',
        coordinateWindow: W,
        startGate: gate('start', -8, -8),
        finishGate: gate('finish', 8, 8),
        checkpoints: [cp('cp1', -4, -4), cp('cp2', 0, 0), cp('cp3', 4, 4)],
        hazards: [],
        maxMistakesBeforeReveal: 10,
        prefillExpression: 'x',
        learningText: 'The number before x controls how steep the rail is. This is y = x (slope 1).',
        parameterFocus: 'm',
      },
      {
        id: 'l3p2', seed: 'l3p2', family: 'linear',
        allowedFamilies: ['linear'],
        targetExpression: '2*x',
        displayPrompt: 'Build a steeper rail — slope 2',
        coordinateWindow: W,
        startGate: gate('start', -3, -6),
        finishGate: gate('finish', 3, 6),
        checkpoints: [cp('cp1', -2, -4), cp('cp2', 0, 0), cp('cp3', 2, 4)],
        hazards: [hz('h1', 'rock', -1, 4, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Try y = 2x. The 2 makes the rail twice as steep.',
        parameterFocus: 'm',
      },
      {
        id: 'l3p3', seed: 'l3p3', family: 'linear',
        allowedFamilies: ['linear'],
        targetExpression: '-x',
        displayPrompt: 'Build a rail that goes downhill (negative slope)',
        coordinateWindow: W,
        startGate: gate('start', -8, 8),
        finishGate: gate('finish', 8, -8),
        checkpoints: [cp('cp1', -4, 4), cp('cp2', 0, 0), cp('cp3', 4, -4)],
        hazards: [hz('h1', 'monster', 0, 4, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'A negative slope makes the rail go downhill. Try y = -x.',
        parameterFocus: 'm',
      },
    ],
  },

  // ── Level 4: Linear Slope and Intercept ───────────────────────────
  {
    levelNumber: 4,
    title: 'Level 4 — Slope and Intercept',
    puzzles: [
      {
        id: 'l4p1', seed: 'l4p1', family: 'linear',
        allowedFamilies: ['linear'],
        targetExpression: 'x+3',
        displayPrompt: 'Build a rail through both gems',
        coordinateWindow: W,
        startGate: gate('start', -8, -5),
        finishGate: gate('finish', 8, 11),
        checkpoints: [cp('cp1', -4, -1), cp('cp2', 0, 3), cp('cp3', 4, 7)],
        hazards: [hz('h1', 'rock', -1, 6, 1.5, 1.5), hz('h2', 'lava', 3, 0, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Use m for tilt and b for height. Try y = x + 3.',
        parameterFocus: 'b',
      },
      {
        id: 'l4p2', seed: 'l4p2', family: 'linear',
        allowedFamilies: ['linear'],
        targetExpression: '2*x-1',
        displayPrompt: 'Connect both checkpoints with a line',
        coordinateWindow: W,
        startGate: gate('start', -4, -9),
        finishGate: gate('finish', 4, 7),
        checkpoints: [cp('cp1', -2, -5), cp('cp2', 0, -1), cp('cp3', 2, 3)],
        hazards: [hz('h1', 'hole', -3, 4, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Find the slope (rise/run) between the gems, then find b.',
        parameterFocus: 'b',
      },
    ],
  },

  // ── Level 5: Parabola Rails y = x^2 ───────────────────────────────
  {
    levelNumber: 5,
    title: 'Level 5 — Parabola Rails',
    puzzles: [
      {
        id: 'l5p1', seed: 'l5p1', family: 'quadratic',
        allowedFamilies: [],
        targetExpression: 'x^2',
        displayPrompt: 'Press Play to see a U-shaped rail',
        coordinateWindow: W,
        startGate: gate('start', -2.5, 6.25),
        finishGate: gate('finish', 2.5, 6.25),
        checkpoints: [cp('cp1', -2, 4), cp('cp2', 0, 0), cp('cp3', 2, 4)],
        hazards: [],
        maxMistakesBeforeReveal: 10,
        prefillExpression: 'x^2',
        learningText: 'x² creates a U-shaped curve. The bottom is at y = 0.',
        parameterFocus: 'a',
      },
      {
        id: 'l5p2', seed: 'l5p2', family: 'quadratic',
        allowedFamilies: ['quadratic'],
        targetExpression: 'x^2-3',
        displayPrompt: 'Shift the parabola down to cross the checkpoints',
        coordinateWindow: W,
        startGate: gate('start', -3, 6),
        finishGate: gate('finish', 3, 6),
        checkpoints: [cp('cp1', -2, 1), cp('cp2', 0, -3), cp('cp3', 2, 1)],
        hazards: [hz('h1', 'rock', 0, 2, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Adding a number after x² shifts the parabola up or down.',
        parameterFocus: 'k',
      },
    ],
  },

  // ── Level 6: Parabola Width and Direction ─────────────────────────
  {
    levelNumber: 6,
    title: 'Level 6 — Parabola Width',
    puzzles: [
      {
        id: 'l6p1', seed: 'l6p1', family: 'quadratic',
        allowedFamilies: ['quadratic'],
        targetExpression: '0.5*x^2-2',
        displayPrompt: 'Use a wider parabola to avoid the rocks',
        coordinateWindow: W,
        startGate: gate('start', -4, 6),
        finishGate: gate('finish', 4, 6),
        checkpoints: [cp('cp1', -3, 2.5), cp('cp2', 0, -2), cp('cp3', 3, 2.5)],
        hazards: [hz('h1', 'lava', 0, 5, 1.5, 1.5), hz('h2', 'hole', 0, -6, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Making a smaller (e.g. 0.5), the parabola becomes wider.',
        parameterFocus: 'a',
      },
      {
        id: 'l6p2', seed: 'l6p2', family: 'quadratic',
        allowedFamilies: ['quadratic'],
        targetExpression: '-x^2+5',
        displayPrompt: 'Build an arch — flipped parabola',
        coordinateWindow: W,
        startGate: gate('start', -2, 1),
        finishGate: gate('finish', 2, 1),
        checkpoints: [cp('cp1', -1, 4), cp('cp2', 0, 5), cp('cp3', 1, 4)],
        hazards: [hz('h1', 'hole', 0, -3, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Negative a flips the parabola upside down, creating an arch.',
        parameterFocus: 'a',
      },
    ],
  },

  // ── Level 7: Cubic Rails ───────────────────────────────────────────
  {
    levelNumber: 7,
    title: 'Level 7 — Cubic Rails',
    puzzles: [
      {
        id: 'l7p1', seed: 'l7p1', family: 'cubic',
        allowedFamilies: [],
        targetExpression: '0.1*x^3',
        displayPrompt: 'Press Play to see an S-shaped cubic rail',
        coordinateWindow: W,
        startGate: gate('start', -4, -6.4),
        finishGate: gate('finish', 4, 6.4),
        checkpoints: [cp('cp1', -3, -2.7), cp('cp2', 0, 0), cp('cp3', 3, 2.7)],
        hazards: [],
        maxMistakesBeforeReveal: 10,
        prefillExpression: '0.1*x^3',
        learningText: 'x³ makes an S-like curve — down on the left, up on the right.',
        parameterFocus: 'a',
      },
      {
        id: 'l7p2', seed: 'l7p2', family: 'cubic',
        allowedFamilies: ['cubic'],
        targetExpression: '0.1*x^3+2',
        displayPrompt: 'Shift the cubic rail up to hit the checkpoint',
        coordinateWindow: W,
        startGate: gate('start', -3.5, -2.29),
        finishGate: gate('finish', 3.5, 6.29),
        checkpoints: [cp('cp1', -4.5, -7.1, 1.8), cp('cp2', 0, 2, 1.8), cp('cp3', 3.7, 7.1, 1.5)],
        hazards: [hz('h1', 'rock', 0, -2, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'The S-curve goes from bottom-left to top-right. Add + 2 to shift it up.',
        parameterFocus: 'k',
      },
    ],
  },

  // ── Level 8: Shifting Cubic Rails ─────────────────────────────────
  {
    levelNumber: 8,
    title: 'Level 8 — Shifting Cubic Rails',
    puzzles: [
      {
        id: 'l8p1', seed: 'l8p1', family: 'cubic',
        allowedFamilies: [],
        targetExpression: '0.1*(x-2)^3',
        displayPrompt: 'This is 0.1x³ — shift it 2 right so the middle gem moves to x=2',
        coordinateWindow: W,
        startGate: gate('start', -4, -6.4),
        finishGate: gate('finish', 6, 6.4),
        checkpoints: [cp('cp1', 0, -0.8, 1.8), cp('cp2', 2, 0, 1.8), cp('cp3', 5, 2.7, 1.5)],
        hazards: [hz('h1', 'monster', -1, 3, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        prefillExpression: '0.1*x^3',
        learningText: 'Replace x with (x-2) to shift right: y = 0.1*(x-2)^3. The gem at x=0 is now a hole!',
        parameterFocus: 'h',
      },
    ],
  },

  // ── Level 9: Exponential Rails ────────────────────────────────────
  {
    levelNumber: 9,
    title: 'Level 9 — Exponential Rails',
    puzzles: [
      {
        id: 'l9p1', seed: 'l9p1', family: 'exponential',
        allowedFamilies: [],
        targetExpression: '2^x',
        displayPrompt: 'Press Play to see exponential growth',
        coordinateWindow: { xMin: -6, xMax: 6, yMin: -2, yMax: 10 },
        startGate: gate('start', -4, 0.0625),
        finishGate: gate('finish', 3, 8),
        checkpoints: [cp('cp1', -2, 0.25), cp('cp2', 0, 1), cp('cp3', 2, 4)],
        hazards: [],
        maxMistakesBeforeReveal: 10,
        prefillExpression: '2^x',
        learningText: 'In 2^x, x is the exponent. The rail grows faster and faster!',
        parameterFocus: 'base',
      },
      {
        id: 'l9p2', seed: 'l9p2', family: 'exponential',
        allowedFamilies: ['exponential'],
        targetExpression: '3^x',
        displayPrompt: 'Use a steeper exponential',
        coordinateWindow: { xMin: -6, xMax: 6, yMin: -2, yMax: 10 },
        startGate: gate('start', -3, 0.037),
        finishGate: gate('finish', 2, 9),
        checkpoints: [cp('cp1', -1, 0.33, 1.2), cp('cp2', 0, 1, 1.2), cp('cp3', 1.8, 7.22, 1.0)],
        hazards: [hz('h1', 'rock', -2, 6, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'A larger base makes the rail climb faster. Try y = 3^x.',
        parameterFocus: 'base',
      },
    ],
  },

  // ── Level 10: Moving Exponential Rails ────────────────────────────
  {
    levelNumber: 10,
    title: 'Level 10 — Moving Exponential Rails',
    puzzles: [
      {
        id: 'l10p1', seed: 'l10p1', family: 'exponential',
        allowedFamilies: ['exponential'],
        targetExpression: '2^x-3',
        displayPrompt: 'Shift the exponential down',
        coordinateWindow: { xMin: -6, xMax: 6, yMin: -5, yMax: 10 },
        startGate: gate('start', -4, -2.94),
        finishGate: gate('finish', 3, 5),
        checkpoints: [cp('cp1', -2, -2.75), cp('cp2', 0, -2), cp('cp3', 2, 1)],
        hazards: [hz('h1', 'lava', 0, 2, 1.5, 1.5)],
        maxMistakesBeforeReveal: 4,
        learningText: 'Add + k to shift the whole exponential curve up or down.',
        parameterFocus: 'k',
      },
    ],
  },

];
