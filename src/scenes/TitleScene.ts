import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const { width, height } = this.cameras.main;

    // Cave ambient music
    if (this.cache.audio.exists('music_cave') && !this.sound.get('music_cave')?.isPlaying) {
      this.sound.stopAll();
      this.sound.add('music_cave', { loop: true, volume: 0.12 }).play();
    }

    // Underground cave background
    if (this.textures.exists('bg_cave')) {
      this.add.image(width / 2, height / 2, 'bg_cave')
        .setDisplaySize(width, height)
        .setDepth(0);
    } else {
      // Fallback dark cave gradient
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x1F2A44, 0x1F2A44, 0x0D1422, 0x0D1422, 1);
      bg.fillRect(0, 0, width, height);
    }

    // Dark overlay so text pops
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, width, height);

    // Draw a rail line at the very bottom — below all text
    const railY = height - 55;
    const railG = this.add.graphics();
    railG.lineStyle(5, 0xD8A83A, 0.9);
    railG.beginPath();
    railG.moveTo(0, railY);
    railG.lineTo(width, railY);
    railG.strokePath();
    // Sleeper ties
    railG.lineStyle(8, 0x8B6914, 0.7);
    for (let x = 20; x < width; x += 48) {
      railG.beginPath();
      railG.moveTo(x, railY - 8);
      railG.lineTo(x, railY + 8);
      railG.strokePath();
    }

    // Title
    this.add.text(width / 2, 110, '🚃 GRAPH RAILS', {
      fontSize: '72px',
      fontFamily: '"Courier New", monospace',
      color: '#D8A83A',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, 195, 'Build minecart rails by writing equations!', {
      fontSize: '24px',
      fontFamily: '"Courier New", monospace',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 228, 'Made by Charles Caton', {
      fontSize: '19px',
      fontFamily: '"Courier New", monospace',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Buttons
    this.makeButton(width / 2, 320, '📚 Learning Mode', 0x45D66B, () => {
      this.scene.start('LevelSelectScene');
    });

    this.makeButton(width / 2, 415, '⚡ Freeplay (2 min)', 0xF26B2E, () => {
      this.scene.start('PlayScene', { mode: 'freeplay' });
    });

    // Instructions
    this.add.text(width / 2, height - 130, 'Type equations like  y = x²  or  y = 2x + 1  to lay rails underground', {
      fontSize: '17px',
      fontFamily: '"Courier New", monospace',
      color: '#AADDFF',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 105, 'Press ▶ Play to ride the minecart along your graph!', {
      fontSize: '17px',
      fontFamily: '"Courier New", monospace',
      color: '#AADDFF',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Animated minecart sitting ON the rail (centered on rail line)
    const cartObj = this.add.image(120, railY, 'minecart').setDisplaySize(56, 56).setDepth(5);

    this.tweens.add({
      targets: cartObj,
      x: width - 120,
      duration: 4500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  shutdown() {
    this.tweens.killAll();
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void): void {
    const btn = this.add.graphics();
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(x - 180, y - 32, 360, 64, 12);
    btn.lineStyle(3, 0xFFFFFF, 0.4);
    btn.strokeRoundedRect(x - 180, y - 32, 360, 64, 12);

    const txt = this.add.text(x, y, label, {
      fontSize: '30px',
      fontFamily: '"Courier New", monospace',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 360, 64).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', cb);
    zone.on('pointerover', () => { btn.setAlpha(0.75); txt.setAlpha(0.75); });
    zone.on('pointerout',  () => { btn.setAlpha(1);    txt.setAlpha(1);    });
  }
}
