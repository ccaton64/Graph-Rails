import { FunctionFamily, GameState } from './types';

const defaultFamilyStats = (): GameState['familyStats'] => ({
  constant: { attempts: 0, solved: 0 },
  linear: { attempts: 0, solved: 0 },
  quadratic: { attempts: 0, solved: 0 },
  cubic: { attempts: 0, solved: 0 },
  exponential: { attempts: 0, solved: 0 },
  reciprocal: { attempts: 0, solved: 0 },
  absoluteValue: { attempts: 0, solved: 0 },
});

export const gameState: GameState = {
  mode: 'learning',
  score: 0,
  streak: 0,
  bestStreak: 0,
  currentLevel: 0,
  mistakesOnPuzzle: 0,
  totalAttempts: 0,
  totalSolved: 0,
  timeRemaining: 120,
  familyStats: defaultFamilyStats(),
};

export function resetForMode(mode: GameState['mode']): void {
  gameState.mode = mode;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.bestStreak = 0;
  gameState.currentLevel = 0;
  gameState.mistakesOnPuzzle = 0;
  gameState.totalAttempts = 0;
  gameState.totalSolved = 0;
  gameState.timeRemaining = mode === 'freeplay' ? 120 : 9999;
  gameState.familyStats = defaultFamilyStats();
}

export function recordAttempt(family: FunctionFamily | undefined, correct: boolean): void {
  gameState.totalAttempts++;
  if (family) {
    gameState.familyStats[family].attempts++;
  }

  if (correct) {
    if (gameState.mode === 'freeplay') gameState.score += 100;
    gameState.totalSolved++;
    gameState.streak++;
    if (gameState.streak > gameState.bestStreak) gameState.bestStreak = gameState.streak;
    if (family) gameState.familyStats[family].solved++;
    gameState.mistakesOnPuzzle = 0;
  } else {
    gameState.streak = 0;
    gameState.mistakesOnPuzzle++;
    if (gameState.mode === 'freeplay') {
      const alreadyLost = (gameState.mistakesOnPuzzle - 1) * 25;
      if (alreadyLost < 100) {
        gameState.score -= 25;
      }
    }
  }
}

export function getAccuracy(): number {
  if (gameState.totalAttempts === 0) return 0;
  return Math.round((gameState.totalSolved / gameState.totalAttempts) * 100);
}

export function getBestFamily(): FunctionFamily | null {
  let best: FunctionFamily | null = null;
  let bestRate = -1;
  for (const [f, s] of Object.entries(gameState.familyStats) as [FunctionFamily, { attempts: number; solved: number }][]) {
    if (s.attempts === 0) continue;
    const rate = s.solved / s.attempts;
    if (rate > bestRate) { bestRate = rate; best = f; }
  }
  return best;
}

export function getWeakestFamily(): FunctionFamily | null {
  let worst: FunctionFamily | null = null;
  let worstRate = 2;
  for (const [f, s] of Object.entries(gameState.familyStats) as [FunctionFamily, { attempts: number; solved: number }][]) {
    if (s.attempts < 2) continue;
    const rate = s.solved / s.attempts;
    if (rate < worstRate) { worstRate = rate; worst = f; }
  }
  return worst;
}
