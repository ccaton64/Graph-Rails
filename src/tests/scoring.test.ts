import { describe, it, expect, beforeEach } from 'vitest';
import { gameState, resetForMode, recordAttempt } from '../GameState';

describe('Freeplay Scoring', () => {
  beforeEach(() => resetForMode('freeplay'));

  it('correct answer adds 100', () => {
    recordAttempt('linear', true);
    expect(gameState.score).toBe(100);
  });

  it('first wrong answer subtracts 25', () => {
    recordAttempt('linear', false);
    expect(gameState.score).toBe(-25);
  });

  it('four wrong answers subtract 100 total', () => {
    recordAttempt('linear', false);
    recordAttempt('linear', false);
    recordAttempt('linear', false);
    recordAttempt('linear', false);
    expect(gameState.score).toBe(-100);
  });

  it('fifth wrong answer does not subtract more (cap at -100 per puzzle)', () => {
    for (let i = 0; i < 4; i++) recordAttempt('linear', false);
    const scoreAfter4 = gameState.score;
    recordAttempt('linear', false);
    // The 5th should not subtract (cap reached)
    expect(gameState.score).toBe(scoreAfter4);
  });

  it('streak increments on correct, resets on wrong', () => {
    recordAttempt('linear', true);
    recordAttempt('linear', true);
    expect(gameState.streak).toBe(2);
    recordAttempt('linear', false);
    expect(gameState.streak).toBe(0);
  });

  it('best streak is preserved', () => {
    recordAttempt('linear', true);
    recordAttempt('linear', true);
    recordAttempt('linear', true);
    recordAttempt('linear', false);
    expect(gameState.bestStreak).toBe(3);
    expect(gameState.streak).toBe(0);
  });

  it('timer starts at 300 for freeplay', () => {
    expect(gameState.timeRemaining).toBe(300);
  });
});
