import Phaser from 'phaser';
import { LEARNING_LEVELS } from '../generation/learningLevels';
import { loadProgress, resetProgress } from '../LevelProgress';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    const { width, height } = this.cameras.main;
    const progress = loadProgress();

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1F2A44, 0x1F2A44, 0x0D1422, 0x0D1422, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, 44, '🗺️ Choose a Level', {
      fontSize: '38px',
      fontFamily: '"Courier New", monospace',
      color: '#D8A83A',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Level grid — 7 per row, 2 rows for 14 levels
    const cols = 7;
    const btnW = 140;
    const btnH = 100;
    const padX = 16;
    const padY = 20;
    const totalW = cols * btnW + (cols - 1) * padX;
    const startX = (width - totalW) / 2 + btnW / 2;
    const startY = 130;

    LEARNING_LEVELS.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + padX);
      const y = startY + row * (btnH + padY);
      const rec = progress[i];
      const locked = !rec?.unlocked;

      this.drawLevelButton(x, y, btnW, btnH, level.levelNumber, level.title, locked, rec?.stars ?? 0, i);
    });

    // Reset progress button (small, bottom right)
    const resetBg = this.add.graphics();
    resetBg.fillStyle(0x333355, 1);
    resetBg.fillRoundedRect(width - 160, height - 46, 144, 32, 6);
    const resetTxt = this.add.text(width - 88, height - 30, 'Reset Progress', {
      fontSize: '12px', fontFamily: '"Courier New", monospace', color: '#888888',
    }).setOrigin(0.5);
    const resetZone = this.add.zone(width - 88, height - 30, 144, 32).setInteractive({ cursor: 'pointer' });
    resetZone.on('pointerdown', () => {
      resetProgress();
      this.scene.restart();
    });

    // Back button
    this.makeBackButton();
  }

  private drawLevelButton(
    x: number, y: number, w: number, h: number,
    levelNum: number, title: string, locked: boolean, stars: number, index: number
  ) {
    const g = this.add.graphics();

    if (locked) {
      // Locked — dark gray with padlock
      g.fillStyle(0x2A2D3A, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      g.lineStyle(2, 0x444466, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

      this.add.text(x, y - 8, '🔒', { fontSize: '28px' }).setOrigin(0.5);
      this.add.text(x, y + 22, `Level ${levelNum}`, {
        fontSize: '14px', fontFamily: '"Courier New", monospace', color: '#555577',
      }).setOrigin(0.5);
    } else {
      // Unlocked — colored with stars
      const fillColor = stars > 0 ? 0x2A6A2A : 0x355A35;
      g.fillStyle(fillColor, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      g.lineStyle(2, stars > 0 ? 0x45D66B : 0x5FAE45, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

      // Level number
      this.add.text(x, y - 26, `Level ${levelNum}`, {
        fontSize: '16px', fontFamily: '"Courier New", monospace',
        color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);

      // Short title
      const shortTitle = title.replace(/Level \d+ — /, '');
      const display = shortTitle.length > 14 ? shortTitle.slice(0, 13) + '…' : shortTitle;
      this.add.text(x, y + 2, display, {
        fontSize: '11px', fontFamily: '"Courier New", monospace', color: '#CCFFCC',
      }).setOrigin(0.5);

      // Stars
      const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      this.add.text(x, y + 26, starStr, {
        fontSize: '18px',
        color: stars > 0 ? '#D8A83A' : '#444466',
      }).setOrigin(0.5);

      // Click zone
      const zone = this.add.zone(x, y, w, h).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => {
        g.clear();
        g.fillStyle(0x45D66B, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
        g.lineStyle(2, 0xFFFFFF, 0.6);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      });
      zone.on('pointerout', () => {
        g.clear();
        g.fillStyle(fillColor, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
        g.lineStyle(2, stars > 0 ? 0x45D66B : 0x5FAE45, 1);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      });
      zone.on('pointerdown', () => {
        this.scene.start('PlayScene', { mode: 'learning', levelIndex: index, puzzleIndex: 0 });
      });
    }
  }

  private makeBackButton(): void {
    const g = this.add.graphics();
    g.fillStyle(0x6E727A, 1);
    g.fillRoundedRect(20, 16, 120, 44, 8);
    this.add.text(80, 38, '← Back', {
      fontSize: '20px', fontFamily: '"Courier New", monospace', color: '#FFFFFF',
    }).setOrigin(0.5);
    const zone = this.add.zone(80, 38, 120, 44).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => this.scene.start('TitleScene'));
    zone.on('pointerover', () => g.setAlpha(0.7));
    zone.on('pointerout', () => g.setAlpha(1));
  }
}
