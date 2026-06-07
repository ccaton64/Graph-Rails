import Phaser from 'phaser';
import { FunctionFamily } from '../types';
import { getAccuracy } from '../GameState';

interface GameOverData {
  mode: 'learning' | 'freeplay';
  score: number;
  totalSolved: number;
  totalAttempts: number;
  bestStreak: number;
  familyStats: Record<FunctionFamily, { attempts: number; solved: number }>;
  levelsCompleted: number;
}

const FAMILY_NAMES: Record<FunctionFamily, string> = {
  constant: 'Constant (y = b)',
  linear: 'Linear (y = mx + b)',
  quadratic: 'Quadratic (y = ax²)',
  cubic: 'Cubic (y = ax³)',
  exponential: 'Exponential (y = aˣ)',
  reciprocal: 'Reciprocal (y = 1/x)',
  absoluteValue: 'Absolute Value (y = |x|)',
};

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(data: GameOverData) {
    const { width, height } = this.cameras.main;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1F2A44, 0x1F2A44, 0x0D1422, 0x0D1422, 1);
    bg.fillRect(0, 0, width, height);

    const isLearning = data.mode === 'learning';

    this.add.text(width / 2, 50, isLearning ? '🎉 Level Complete!' : '⏱ Time\'s Up!', {
      fontSize: '52px', fontFamily: '"Courier New", monospace',
      color: '#D8A83A', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    if (!isLearning) {
      // Freeplay results
      const accuracy = data.totalAttempts > 0
        ? Math.round((data.totalSolved / data.totalAttempts) * 100)
        : 0;

      const stats = [
        ['Final Score', String(data.score)],
        ['Problems Solved', String(data.totalSolved)],
        ['Problems Attempted', String(data.totalAttempts)],
        ['Accuracy', `${accuracy}%`],
        ['Best Streak', String(data.bestStreak)],
      ];

      let y = 130;
      for (const [label, val] of stats) {
        this.add.text(width / 2 - 200, y, label + ':', {
          fontSize: '22px', fontFamily: '"Courier New", monospace', color: '#AADDFF',
        });
        this.add.text(width / 2 + 200, y, val, {
          fontSize: '22px', fontFamily: '"Courier New", monospace', color: '#FFFFFF',
        }).setOrigin(1, 0);
        y += 38;
      }

      // Skill breakdown
      y += 10;
      this.add.text(width / 2, y, '— Function Family Stats —', {
        fontSize: '18px', fontFamily: '"Courier New", monospace', color: '#75C7F2',
      }).setOrigin(0.5);
      y += 30;

      for (const [f, s] of Object.entries(data.familyStats) as [FunctionFamily, { attempts: number; solved: number }][]) {
        if (s.attempts === 0) continue;
        const pct = Math.round((s.solved / s.attempts) * 100);
        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
        const color = pct >= 70 ? '#45D66B' : pct >= 40 ? '#D8A83A' : '#E94B4B';
        this.add.text(width / 2, y, `${FAMILY_NAMES[f]}  ${bar}  ${pct}%`, {
          fontSize: '14px', fontFamily: '"Courier New", monospace', color,
        }).setOrigin(0.5);
        y += 24;
      }
    } else {
      // Learning results
      this.add.text(width / 2, 140, `You completed ${data.levelsCompleted} levels!`, {
        fontSize: '28px', fontFamily: '"Courier New", monospace', color: '#FFFFFF',
      }).setOrigin(0.5);

      this.add.text(width / 2, 200,
        'You\'ve unlocked Freeplay Mode!\nTry the 5-minute challenge from the title screen.',
        {
          fontSize: '20px', fontFamily: '"Courier New", monospace',
          color: '#75C7F2', align: 'center',
        }).setOrigin(0.5);
    }

    // Buttons
    const btnY = height - 100;

    this.makeButton(width / 2 - 160, btnY, '🔄 Play Again', 0x45D66B, () => {
      this.scene.start('PlayScene', { mode: data.mode, levelIndex: 0 });
    });

    this.makeButton(width / 2 + 160, btnY, '🏠 Main Menu', 0x6E727A, () => {
      this.scene.start('TitleScene');
    });
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void): void {
    const g = this.add.graphics();
    g.fillStyle(color);
    g.fillRoundedRect(x - 130, y - 28, 260, 56, 10);

    this.add.text(x, y, label, {
      fontSize: '22px', fontFamily: '"Courier New", monospace',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 260, 56).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', cb);
    zone.on('pointerover', () => g.setAlpha(0.8));
    zone.on('pointerout', () => g.setAlpha(1));
  }
}
