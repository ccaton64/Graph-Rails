import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // ── Ludo-generated art ──────────────────────────────────────────────
    this.load.image('minecart',        'assets/sprites/minecart.png');
    this.load.image('gem',             'assets/sprites/gem.png');
    this.load.image('start_station',   'assets/sprites/start_station.png');
    this.load.image('finish_station',  'assets/sprites/finish_station.png');
    this.load.image('rock',            'assets/sprites/rock.png');
    this.load.image('lava',            'assets/sprites/lava.png');
    this.load.image('hole',            'assets/sprites/hole.png');
    this.load.image('monster',         'assets/sprites/monster.png');

    // Hazard fill tiles (tileable textures for rectangle hazards)
    this.load.image('hazard_rock',    'assets/sprites/hazard_rock.png');
    this.load.image('hazard_lava',    'assets/sprites/hazard_lava.png');
    this.load.image('hazard_hole',    'assets/sprites/hazard_hole.png');
    this.load.image('hazard_monster', 'assets/sprites/hazard_monster.png');

    // Animated sprite sheets (16 frames in 4×4 grid, 512px per frame → 2048×2048)
    this.load.spritesheet('minecart_ride',  'assets/sheets/minecart_ride.png',  { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('minecart_crash', 'assets/sheets/minecart_crash.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('gem_spin',       'assets/sheets/gem_spin.png',       { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('monster_idle',   'assets/sheets/monster_idle.png',   { frameWidth: 512, frameHeight: 512 });

    // Backgrounds (all top-down underground views)
    this.load.image('bg_cave',        'assets/bg/bg_cave.png');
    this.load.image('bg_lava_cavern', 'assets/bg/bg_lava_cavern.png');
    this.load.image('bg_rail_yard',   'assets/bg/bg_rail_yard.png');

    // Audio
    this.load.audio('cart_roll',      'assets/audio/cart_roll.mp3');
    this.load.audio('gem_collect',    'assets/audio/gem_collect.mp3');
    this.load.audio('cart_crash',     'assets/audio/cart_crash.mp3');
    this.load.audio('level_complete', 'assets/audio/level_complete.mp3');
    this.load.audio('wrong_answer',   'assets/audio/wrong_answer.mp3');
    this.load.audio('button_click',   'assets/audio/button_click.mp3');
    this.load.audio('music_cave', 'assets/audio/music_learning.mp3');

    // Loading bar
    const bar = this.add.graphics();
    const label = this.add.text(640, 310, '🚂 Loading Graph Rails…', {
      fontSize: '28px', fontFamily: '"Courier New", monospace', color: '#FFFFFF'
    }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x1F2A44); bar.fillRect(0, 0, 1280, 720);
      bar.fillStyle(0xD8A83A); bar.fillRect(340, 340, 600 * v, 40);
      bar.lineStyle(2, 0xFFFFFF, 0.6); bar.strokeRect(340, 340, 600, 40);
    });
  }

  create() {
    // All assets are Ludo-generated — no fallback textures needed.
    // (If assets are missing, add them via: node tools/gen-assets.mjs)

    // ── Register sprite animations ───────────────────────────────────────
    const addAnim = (key: string, sheet: string, frameRate = 12, frameCount = 16) => {
      if (!this.textures.exists(sheet)) return;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: frameCount - 1 }),
        frameRate,
        repeat: -1,
      });
    };

    // 16 real frames (indices 0-15) in a 5×5 grid → only first 16 cells used
    addAnim('cart_rolling', 'minecart_ride',  14, 16);
    addAnim('cart_crash',   'minecart_crash', 10, 16);
    addAnim('gem_spinning', 'gem_spin',       12, 16);
    addAnim('monster_bob',  'monster_idle',    8, 16);

    this.scene.start('TitleScene');
  }
}
