/**
 * Persistent level progress — stored in localStorage.
 * Tracks which levels are unlocked and the star rating earned.
 */

const STORAGE_KEY = 'graph-rails-progress';

export interface LevelRecord {
  unlocked: boolean;
  stars: number; // 0 = not attempted, 1-3
  bestMistakes: number; // lowest mistakes on a successful run
}

function defaultProgress(): LevelRecord[] {
  // Level 0 starts unlocked; rest locked
  return Array.from({ length: 14 }, (_, i) => ({
    unlocked: i === 0,
    stars: 0,
    bestMistakes: 99,
  }));
}

export function loadProgress(): LevelRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as LevelRecord[];
    // Ensure array length matches (in case we added levels later)
    while (parsed.length < 14) {
      parsed.push({ unlocked: false, stars: 0, bestMistakes: 99 });
    }
    return parsed;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: LevelRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

export function unlockNextLevel(levelIndex: number, mistakeCount: number): void {
  const progress = loadProgress();

  // Award stars based on mistakes across the whole level
  const stars = mistakeCount === 0 ? 3 : mistakeCount <= 2 ? 2 : 1;
  if (progress[levelIndex]) {
    progress[levelIndex].stars = Math.max(progress[levelIndex].stars, stars);
    progress[levelIndex].bestMistakes = Math.min(progress[levelIndex].bestMistakes, mistakeCount);
  }

  // Unlock next level
  const next = levelIndex + 1;
  if (next < 14 && progress[next]) {
    progress[next].unlocked = true;
  }

  saveProgress(progress);
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStars(levelIndex: number): number {
  return loadProgress()[levelIndex]?.stars ?? 0;
}

export function isUnlocked(levelIndex: number): boolean {
  return loadProgress()[levelIndex]?.unlocked ?? false;
}
