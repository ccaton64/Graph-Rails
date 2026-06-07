import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { PlayScene } from './scenes/PlayScene';
import { GameOverScene } from './scenes/GameOverScene';

// Destroy any previous game instance (e.g., from Vite HMR)
const existingGame = (window as any).__phaserGame as Phaser.Game | undefined;
if (existingGame) {
  existingGame.destroy(true);
  delete (window as any).__phaserGame;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1F2A44',
  scene: [BootScene, TitleScene, LevelSelectScene, PlayScene, GameOverScene],
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
};

const game = new Phaser.Game(config);
(window as any).__phaserGame = game;
