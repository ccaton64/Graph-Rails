export type FunctionFamily =
  | 'constant'
  | 'linear'
  | 'quadratic'
  | 'cubic'
  | 'exponential'
  | 'reciprocal'
  | 'absoluteValue';

export interface CoordinateWindow {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GraphZone {
  id: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  required: boolean;
}

export interface HazardSpec {
  id: string;
  type: 'rock' | 'hole' | 'lava' | 'monster';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export interface PuzzleSpec {
  id: string;
  seed: string;
  family: FunctionFamily;
  allowedFamilies: FunctionFamily[];
  targetExpression: string;
  displayPrompt: string;
  coordinateWindow: CoordinateWindow;
  startGate: GraphZone;
  finishGate: GraphZone;
  checkpoints: GraphZone[];
  hazards: HazardSpec[];
  maxMistakesBeforeReveal: number;
  learningText?: string;
  parameterFocus?: 'm' | 'b' | 'a' | 'h' | 'k' | 'base' | 'family';
  prefillExpression?: string;
}

export type FailureReason =
  | 'syntax'
  | 'unsupported-family'
  | 'missed-start'
  | 'missed-finish'
  | 'missed-checkpoint'
  | 'hit-hazard'
  | 'out-of-bounds'
  | 'discontinuity'
  | 'wrong-transformation';

export interface AttemptResult {
  validSyntax: boolean;
  accepted: boolean;
  family?: FunctionFamily;
  normalizedExpression?: string;
  failureReason?: FailureReason;
  hint: string;
  sampledPoints?: Array<{ x: number; y: number }>;
  segments?: Array<Array<{ x: number; y: number }>>;
}

export interface GameState {
  mode: 'learning' | 'freeplay' | 'diagnostic';
  score: number;
  streak: number;
  bestStreak: number;
  currentLevel: number;
  mistakesOnPuzzle: number;
  totalAttempts: number;
  totalSolved: number;
  timeRemaining: number;
  familyStats: Record<FunctionFamily, { attempts: number; solved: number }>;
}

export const COLORS = {
  grassGreen: 0x5FAE45,
  dirtBrown: 0x7A4B2A,
  stoneGray: 0x6E727A,
  railGold: 0xD8A83A,
  skyBlue: 0x75C7F2,
  caveNavy: 0x1F2A44,
  lavaOrange: 0xF26B2E,
  correctGreen: 0x45D66B,
  wrongRed: 0xE94B4B,
  white: 0xFFFFFF,
  black: 0x000000,
  axisColor: 0x888888,
  gridColor: 0x333355,
  railColor: 0xD8A83A,
  railPreviewColor: 0x88AAFF,
  checkpointColor: 0xFFDD44,
};
