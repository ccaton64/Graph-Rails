import Phaser from 'phaser';
import { PuzzleSpec, CoordinateWindow, COLORS } from '../types';
import { parseExpression } from '../math/expressionParser';
import { sampleFunction } from '../math/graphSampler';
import { validateAttempt } from '../math/graphValidation';
import { getStagedHint } from '../math/hintEngine';
import { LEARNING_LEVELS } from '../generation/learningLevels';
import { generateFreeplayPuzzle } from '../generation/puzzleGenerator';
import { gameState, resetForMode, recordAttempt } from '../GameState';
import { unlockNextLevel } from '../LevelProgress';

// Canvas layout constants
const CANVAS_X = 80;
const CANVAS_Y = 80;
const CANVAS_W = 1120;
const CANVAS_H = 520;

interface PlaySceneData {
  mode: 'learning' | 'freeplay';
  levelIndex?: number;
  puzzleIndex?: number;
  freeplaySeed?: number;
  freeTier?: number;
  levelMistakesTotal?: number;
}

export class PlayScene extends Phaser.Scene {
  private puzzle!: PuzzleSpec;
  private mode!: 'learning' | 'freeplay';
  private levelIndex = 0;
  private puzzleIndex = 0;
  private freeplaySeed = 1;
  private freeTier = 1;

  // Graphics layers
  private bgLayer!: Phaser.GameObjects.Graphics;
  private gridLayer!: Phaser.GameObjects.Graphics;
  private railLayer!: Phaser.GameObjects.Graphics;
  private objectLayer!: Phaser.GameObjects.Graphics;
  private cartLayer!: Phaser.GameObjects.Graphics;
  private uiLayer!: Phaser.GameObjects.Graphics;

  // DOM HUD elements
  private hudContainer!: HTMLDivElement;
  private equationInput!: HTMLInputElement;
  private feedbackText!: HTMLDivElement;
  private instructionText!: HTMLDivElement;
  private scoreText!: HTMLDivElement;
  private timerText!: HTMLDivElement;
  private teachBox!: HTMLDivElement;
  private hintBtn!: HTMLButtonElement;
  private playBtn!: HTMLButtonElement;

  // Minecart animation
  private cartImage!: Phaser.GameObjects.Image;
  private isRiding = false;
  private ridePath: Array<{ x: number; y: number }> = [];
  private rideIndex = 0;
  private rideTimer?: Phaser.Time.TimerEvent;

  // Timer
  private timerEvent?: Phaser.Time.TimerEvent;

  // Level progress
  private levelMistakesTotal = 0;
  private levelComplete = false;

  // Gem tracking for collection animation
  private gemObjects: Array<{
    obj: Phaser.GameObjects.GameObject;
    cx: number; cy: number;
    rx: number; ry: number;
    collected: boolean;
  }> = [];
  private hazardHitDuringRide = false;
  private hitHazardType: string = '';
  // Math-space ride path (for hazard checking)
  private rideMathPath: Array<{ x: number; y: number }> = [];

  constructor() { super('PlayScene'); }

  init(data: PlaySceneData) {
    this.mode = data.mode ?? 'learning';
    this.levelIndex = data.levelIndex ?? 0;
    this.puzzleIndex = data.puzzleIndex ?? 0;
    this.freeplaySeed = data.freeplaySeed ?? Math.floor(Math.random() * 100000);
    this.freeTier = data.freeTier ?? 1;
    // Carry over level mistakes across puzzle restarts
    this.levelMistakesTotal = data.levelMistakesTotal ?? 0;
    this.levelComplete = false;

    // Only reset state when starting fresh (no carried-over seed / puzzle index)
    if (!data.freeplaySeed && !data.puzzleIndex) {
      resetForMode(this.mode);
      this.levelMistakesTotal = 0;
      this.freeplayPool = [];
      this.freeplayPoolIdx = 0;
    }
  }

  create() {
    // Graphics layers
    this.bgLayer = this.add.graphics();
    this.gridLayer = this.add.graphics();
    this.objectLayer = this.add.graphics();
    this.railLayer = this.add.graphics();
    this.cartLayer = this.add.graphics();
    this.uiLayer = this.add.graphics();

    // Static top-down minecart — no rotation, no scale tweens (they override setDisplaySize)
    this.cartImage = this.add.image(0, 0, 'minecart');
    this.cartImage.setDisplaySize(56, 56).setVisible(false).setDepth(10);

    // Start background music
    this.startMusic();

    this.createHUD();
    this.loadPuzzle();

    if (this.mode === 'freeplay' && !this.scene.settings.data?.freeplaySeed) {
      this.startTimer();
    } else if (this.mode === 'freeplay') {
      // Reconnect timer display from persisted gameState
      this.reconnectTimer();
    }
  }

  private createHUD(): void {
    // Remove any existing HUD
    const existing = document.getElementById('graph-rails-hud');
    if (existing) existing.remove();

    const hud = document.createElement('div');
    hud.id = 'graph-rails-hud';
    hud.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      pointer-events:none; font-family:'Courier New',monospace; color:#fff;
      overflow:hidden;
    `;

    // Top bar
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position:absolute; top:0; left:0; right:0; height:76px;
      background:rgba(31,42,68,0.95);
      border-bottom:3px solid #D8A83A;
      display:flex; align-items:center; justify-content:space-between;
      padding:0 20px; pointer-events:auto;
    `;

    // Mode + level indicator (top-left)
    const modeLabel = document.createElement('div');
    modeLabel.style.cssText = 'font-size:16px; color:#75C7F2; min-width:200px;';
    modeLabel.id = 'gr-mode-label';
    modeLabel.textContent = this.mode === 'freeplay' ? '⚡ FREEPLAY' : `📚 Learning — Level ${this.levelIndex + 1}`;

    // Instruction (top-center)
    this.instructionText = document.createElement('div');
    this.instructionText.style.cssText = 'font-size:18px; color:#FFFFFF; text-align:center; flex:1; padding:0 20px;';
    this.instructionText.id = 'gr-instruction';

    // Score + timer (top-right)
    const scoreArea = document.createElement('div');
    scoreArea.style.cssText = 'min-width:200px; text-align:right;';
    this.scoreText = document.createElement('div');
    this.scoreText.style.cssText = 'font-size:20px; color:#D8A83A;';
    this.scoreText.id = 'gr-score';
    this.timerText = document.createElement('div');
    this.timerText.style.cssText = 'font-size:18px; color:#F26B2E;';
    this.timerText.id = 'gr-timer';
    this.timerText.style.display = this.mode === 'freeplay' ? 'block' : 'none';
    scoreArea.appendChild(this.scoreText);
    scoreArea.appendChild(this.timerText);

    topBar.appendChild(modeLabel);
    topBar.appendChild(this.instructionText);
    topBar.appendChild(scoreArea);

    // Bottom bar — equation input
    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
      position:absolute; bottom:0; left:0; right:0; height:160px;
      background:rgba(31,42,68,0.97);
      border-top:3px solid #D8A83A;
      display:flex; flex-direction:column; justify-content:center;
      padding:8px 20px; gap:6px;
      pointer-events:auto;
    `;

    // Quick-insert character buttons row (above the input row)
    const quickRow = document.createElement('div');
    quickRow.style.cssText = `
      display:flex; gap:6px; align-items:center; margin-bottom:4px;
      padding: 0 0 0 4px;
    `;
    const quickBtns: [string, string][] = [
      ['x²', 'x^2'], ['x³', 'x^3'], ['aˣ', '^x'],
      ['(', '('], [')', ')'], ['^', '^'],
    ];
    for (const [label, insert] of quickBtns) {
      const qb = document.createElement('button');
      qb.textContent = label;
      qb.title = `Insert "${insert}"`;
      qb.style.cssText = `
        padding:4px 10px; font-family:'Courier New',monospace;
        font-size:16px; background:#2A3A5A; color:#AADDFF;
        border:1px solid #5599FF; border-radius:6px; cursor:pointer;
        white-space:nowrap;
      `;
      qb.addEventListener('mousedown', (e) => {
        e.preventDefault(); // don't steal focus from input
        const inp = this.equationInput;
        if (!inp) return;
        const start = inp.selectionStart ?? inp.value.length;
        const end = inp.selectionEnd ?? inp.value.length;
        inp.value = inp.value.slice(0, start) + insert + inp.value.slice(end);
        inp.selectionStart = inp.selectionEnd = start + insert.length;
        inp.focus();
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      quickRow.appendChild(qb);
    }
    bottomBar.appendChild(quickRow);

    // Divider line
    const divLine = document.createElement('div');
    divLine.style.cssText = 'width:100%; height:1px; background:rgba(255,255,255,0.1); margin-bottom:2px;';

    // y = label
    const yLabel = document.createElement('div');
    yLabel.style.cssText = 'font-size:28px; color:#D8A83A; white-space:nowrap;';
    yLabel.textContent = 'y =';

    this.equationInput = document.createElement('input');
    this.equationInput.id = 'gr-equation-input';
    this.equationInput.type = 'text';
    this.equationInput.placeholder = 'type equation...';
    this.equationInput.style.cssText = `
      flex:1; font-size:28px; font-family:'Courier New',monospace;
      background:#0D1422; color:#FFFFFF; border:2px solid #D8A83A;
      border-radius:8px; padding:8px 16px; outline:none;
    `;
    this.equationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.doPlay();
    });
    this.equationInput.addEventListener('input', () => this.doLivePreview());

    // Buttons
    this.playBtn = this.makeBtn('▶ Play', '#45D66B', () => this.doPlay());
    const previewBtn = this.makeBtn('Preview', '#5599FF', () => this.doPreviewAndPlay());
    const resetBtn = this.makeBtn('Reset', '#6E727A', () => this.doReset());
    this.hintBtn = this.makeBtn('💡 Hint', '#F26B2E', () => this.showHint());

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex; align-items:center; gap:10px; width:100%;';
    inputRow.appendChild(yLabel);
    inputRow.appendChild(this.equationInput);
    inputRow.appendChild(previewBtn);
    inputRow.appendChild(this.playBtn);
    inputRow.appendChild(resetBtn);
    inputRow.appendChild(this.hintBtn);
    bottomBar.appendChild(inputRow);

    // Feedback text (above bottom bar)
    this.feedbackText = document.createElement('div');
    this.feedbackText.id = 'gr-feedback';
    this.feedbackText.style.cssText = `
      position:absolute; bottom:164px; left:0; right:0;
      text-align:center; font-size:20px; padding:8px;
      background:rgba(31,42,68,0.85); min-height:44px;
      border-top:1px solid #333355;
    `;

    // Teaching box (left side)
    this.teachBox = document.createElement('div');
    this.teachBox.id = 'gr-teach-box';
    this.teachBox.style.cssText = `
      position:absolute; left:10px; top:86px;
      width:240px; padding:10px; font-size:13px;
      background:rgba(21,32,58,0.95);
      border:2px solid #5599FF; border-radius:8px; line-height:1.5;
      pointer-events:none; display:${this.mode === 'learning' ? 'block' : 'none'};
    `;

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = `
      position:absolute; top:86px; right:10px;
      padding:6px 16px; font-family:'Courier New',monospace;
      font-size:14px; background:#6E727A; color:#fff;
      border:none; border-radius:6px; cursor:pointer; pointer-events:auto;
    `;
    backBtn.addEventListener('click', () => {
      this.cleanupHUD();
      this.scene.start(this.mode === 'learning' ? 'LevelSelectScene' : 'TitleScene');
    });

    // Next Level button — hidden until level complete
    const nextLevelBtn = document.createElement('button');
    nextLevelBtn.id = 'gr-next-level-btn';
    nextLevelBtn.textContent = '🎉 Next Level →';
    nextLevelBtn.style.cssText = `
      position:absolute; right:10px; bottom:172px;
      padding:14px 28px; font-family:'Courier New',monospace;
      font-size:22px; background:#D8A83A; color:#fff;
      border:none; border-radius:10px; cursor:pointer; pointer-events:auto;
      display:none; box-shadow:0 4px 18px rgba(216,168,58,0.6);
      animation: pulse-btn 1s ease-in-out infinite alternate;
    `;
    nextLevelBtn.addEventListener('click', () => {
      this.cleanupHUD();
      const nextIdx = this.levelIndex + 1;
      if (nextIdx < LEARNING_LEVELS.length) {
        this.scene.start('PlayScene', { mode: 'learning', levelIndex: nextIdx, puzzleIndex: 0 });
      } else {
        this.scene.start('GameOverScene', {
          mode: this.mode,
          score: gameState.score,
          totalSolved: gameState.totalSolved,
          totalAttempts: gameState.totalAttempts,
          bestStreak: gameState.bestStreak,
          familyStats: gameState.familyStats,
          levelsCompleted: this.levelIndex + 1,
        });
      }
    });

    // CSS animation for pulsing button
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes pulse-btn {
        from { transform: scale(1); box-shadow: 0 4px 18px rgba(216,168,58,0.6); }
        to   { transform: scale(1.05); box-shadow: 0 6px 28px rgba(216,168,58,0.9); }
      }
    `;
    document.head.appendChild(styleTag);

    hud.appendChild(topBar);
    hud.appendChild(this.feedbackText);
    hud.appendChild(this.teachBox);
    hud.appendChild(backBtn);
    hud.appendChild(nextLevelBtn);
    hud.appendChild(bottomBar);

    const container = document.getElementById('game-container') ?? document.body;
    container.appendChild(hud);
    this.hudContainer = hud;

    // Focus input
    setTimeout(() => this.equationInput?.focus(), 100);
  }

  private makeBtn(label: string, bg: string, cb: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      padding:10px 20px; font-family:'Courier New',monospace;
      font-size:18px; background:${bg}; color:#fff;
      border:none; border-radius:8px; cursor:pointer; white-space:nowrap;
    `;
    btn.addEventListener('click', cb);
    return btn;
  }

  private loadPuzzle(): void {
    if (this.mode === 'learning') {
      const level = LEARNING_LEVELS[this.levelIndex];
      if (!level) { this.endGame(); return; }
      this.puzzle = level.puzzles[this.puzzleIndex];
      if (!this.puzzle) {
        // Move to next level
        this.levelIndex++;
        this.puzzleIndex = 0;
        if (this.levelIndex >= LEARNING_LEVELS.length) { this.endGame(); return; }
        this.puzzle = LEARNING_LEVELS[this.levelIndex].puzzles[0];
      }
    } else {
      this.puzzle = this.pickFreeplayPuzzle();
      this.freeplaySeed++;
    }

    gameState.mistakesOnPuzzle = 0;
    this.isRiding = false;
    this.levelComplete = false;
    this.gemObjects = [];
    this.hazardHitDuringRide = false;
    this.hitHazardType = '';
    this.rideMathPath = [];
    this.cartImage.setVisible(false);

    // Hide next-level button when loading a new puzzle
    const nlb = document.getElementById('gr-next-level-btn');
    if (nlb) nlb.style.display = 'none';

    this.renderScene();
    this.updateHUD();

    // Prefill
    if (this.puzzle.prefillExpression) {
      this.equationInput.value = this.puzzle.prefillExpression;
      this.doLivePreview();
    } else {
      this.equationInput.value = '';
      this.railLayer.clear();
    }
  }

  private renderScene(): void {
    this.bgLayer.clear();
    this.objectLayer.clear();

    const { width, height } = this.cameras.main;

    // Choose background image based on level
    const bgKey = this.chooseBgKey();
    if (this.textures.exists(bgKey)) {
      // Stretch Ludo background to fill canvas
      this.add.image(width / 2, height / 2, bgKey)
        .setDisplaySize(width, height)
        .setDepth(-1)
        .setAlpha(0.92);
    } else {
      // Fallback gradient
      this.bgLayer.fillGradientStyle(0x75C7F2, 0x75C7F2, 0x1F2A44, 0x1F2A44, 1);
      this.bgLayer.fillRect(0, 0, width, height);
    }

    // Semi-transparent overlay over the grid area so grid lines are readable
    this.bgLayer.fillStyle(0x000000, 0.25);
    this.bgLayer.fillRect(CANVAS_X, CANVAS_Y, CANVAS_W, CANVAS_H);

    // Draw coordinate grid
    this.drawGrid();

    // Draw hazards and checkpoints
    this.drawObjects();
  }

  private chooseBgKey(): string {
    // All levels are underground minecart tunnels
    const idx = this.levelIndex;
    if (idx >= 11) return 'bg_rail_yard';      // levels 12-14: busy rail yard
    if (idx >= 9)  return 'bg_lava_cavern';    // levels 10-11: lava cavern
    if (idx >= 5)  return 'bg_cave';           // levels 6-9: torch-lit cave
    if (this.mode === 'freeplay') return 'bg_rail_yard';
    return 'bg_cave';                          // levels 1-5: cave (never overworld)
  }

  private mathToScreen(mx: number, my: number): { sx: number; sy: number } {
    const win = this.puzzle.coordinateWindow;
    const sx = CANVAS_X + ((mx - win.xMin) / (win.xMax - win.xMin)) * CANVAS_W;
    const sy = CANVAS_Y + CANVAS_H - ((my - win.yMin) / (win.yMax - win.yMin)) * CANVAS_H;
    return { sx, sy };
  }

  private drawGrid(): void {
    this.gridLayer.clear();
    const win = this.puzzle.coordinateWindow;
    const g = this.gridLayer;

    // Grid lines
    for (let x = Math.ceil(win.xMin); x <= win.xMax; x++) {
      const { sx } = this.mathToScreen(x, 0);
      g.lineStyle(x === 0 ? 2 : 0.5, x === 0 ? 0xAAAAAA : 0x333355, x === 0 ? 1 : 0.8);
      g.beginPath();
      g.moveTo(sx, CANVAS_Y);
      g.lineTo(sx, CANVAS_Y + CANVAS_H);
      g.strokePath();

      // Tick label
      if (x !== 0 && x % 2 === 0) {
        this.add.text(sx, CANVAS_Y + CANVAS_H - 20, String(x), {
          fontSize: '11px', color: '#888888', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setDepth(1);
      }
    }

    for (let y = Math.ceil(win.yMin); y <= win.yMax; y++) {
      const { sy } = this.mathToScreen(0, y);
      g.lineStyle(y === 0 ? 2 : 0.5, y === 0 ? 0xAAAAAA : 0x333355, y === 0 ? 1 : 0.8);
      g.beginPath();
      g.moveTo(CANVAS_X, sy);
      g.lineTo(CANVAS_X + CANVAS_W, sy);
      g.strokePath();

      if (y !== 0 && y % 2 === 0) {
        this.add.text(CANVAS_X + 8, sy, String(y), {
          fontSize: '11px', color: '#888888', fontFamily: 'monospace',
        }).setOrigin(0, 0.5).setDepth(1);
      }
    }

    // Axis labels
    this.add.text(CANVAS_X + CANVAS_W - 16, CANVAS_Y + CANVAS_H / 2 - 10, 'x', {
      fontSize: '16px', color: '#AAAAAA', fontFamily: 'monospace',
    }).setDepth(1);
    this.add.text(CANVAS_X + CANVAS_W / 2 + 8, CANVAS_Y + 8, 'y', {
      fontSize: '16px', color: '#AAAAAA', fontFamily: 'monospace',
    }).setDepth(1);
  }

  private drawObjects(): void {
    const g = this.objectLayer;
    g.clear();

    const win = this.puzzle.coordinateWindow;
    const xRange = win.xMax - win.xMin;
    const yRange = win.yMax - win.yMin;

    // ── Hazards — Ludo image fills + thin Phaser glow border ──────────
    for (const hz of this.puzzle.hazards) {
      const { sx, sy } = this.mathToScreen(hz.x, hz.y);
      const rw = (hz.radiusX / xRange) * CANVAS_W * 2;
      const rh = (hz.radiusY / yRange) * CANVAS_H * 2;
      const left = sx - rw / 2;
      const top  = sy - rh / 2;

      const imgKey = `hazard_${hz.type}`;
      const glowColor: Record<string, number> = {
        rock: 0xBBBBBB, lava: 0xFF6600, hole: 0x4455FF, monster: 0xBB44FF,
      };
      const glow = glowColor[hz.type] ?? 0xFF4444;

      // Ludo image stretched to fill the danger rectangle
      if (this.textures.exists(imgKey)) {
        this.add.image(sx, sy, imgKey)
          .setDisplaySize(rw, rh)
          .setDepth(3);
      } else {
        // Pure fallback: solid colored rect until image loads
        g.fillStyle(glow, 0.4);
        g.fillRect(left, top, rw, rh);
      }

      // Outer soft glow (Phaser graphics only for the border)
      g.lineStyle(8, glow, 0.35);
      g.strokeRect(left - 3, top - 3, rw + 6, rh + 6);
      // Crisp inner border
      g.lineStyle(3, glow, 0.9);
      g.strokeRect(left, top, rw, rh);

      // Label
      const labels: Record<string, string> = {
        rock: '🪨 ROCKS', lava: '🔥 LAVA', hole: '🕳 HOLE', monster: '👾 DANGER',
      };
      const fs = Math.max(11, Math.min(16, rw / 7));
      this.add.text(sx, sy + rh / 2 + 4, labels[hz.type] ?? '⛔', {
        fontSize: `${fs}px`, fontFamily: '"Courier New",monospace',
        color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(6);
    }

    // ── Gems (checkpoints) — tracked for collection ────────────────────
    this.gemObjects = [];
    for (const cp of this.puzzle.checkpoints) {
      const { sx, sy } = this.mathToScreen(cp.x, cp.y);
      const rw = (cp.radiusX / xRange) * CANVAS_W;
      const size = Math.max(40, rw * 1.8);
      let gemObj: Phaser.GameObjects.GameObject;
      if (this.anims.exists('gem_spinning')) {
        const spr = this.add.sprite(sx, sy, 'gem_spin').setDisplaySize(size, size).setDepth(5);
        spr.play('gem_spinning');
        gemObj = spr;
      } else {
        const img = this.add.image(sx, sy, 'gem').setDisplaySize(size, size).setDepth(5);
        this.tweens.add({ targets: img, scaleX: {from:0.85,to:1.15}, scaleY:{from:0.85,to:1.15}, duration:700, yoyo:true, repeat:-1 });
        gemObj = img;
      }
      this.gemObjects.push({ obj: gemObj, cx: cp.x, cy: cp.y, rx: cp.radiusX, ry: cp.radiusY, collected: false });
    }

    // ── Gem count indicator (top-left of canvas) ──────────────────────
    if (this.puzzle.checkpoints.length > 0) {
      this.add.text(CANVAS_X + 8, CANVAS_Y + 6,
        `💎 × ${this.puzzle.checkpoints.filter(c => c.required).length}  — collect all gems!`, {
        fontSize: '15px', fontFamily: '"Courier New",monospace',
        color: '#FFE044', stroke: '#000', strokeThickness: 3,
      }).setDepth(6);
    }

    // ── Cart starts at left edge of path ─────────────────────────────
    const startSx = CANVAS_X + ((win.xMin - win.xMin) / xRange) * CANVAS_W; // leftmost
    const midSy = this.mathToScreen(0, 0).sy;
    this.cartImage.setPosition(CANVAS_X + 20, midSy).setVisible(true);
  }

  private doLivePreview(): void {
    if (this.isRiding) return;
    const raw = this.equationInput.value.trim();
    if (!raw) { this.railLayer.clear(); return; }
    this.renderPreviewRail(raw, false);
  }

  private doPreviewAndPlay(): void {
    if (this.isRiding) return;
    const raw = this.equationInput.value.trim();
    if (!raw) { this.setFeedback('Please enter an equation first.', '#E94B4B'); return; }
    this.renderPreviewRail(raw, true);
  }

  private renderPreviewRail(raw: string, withFeedback: boolean): void {
    const parse = parseExpression(raw);
    this.railLayer.clear();

    if (!parse.valid) {
      if (withFeedback) this.setFeedback(parse.error ?? 'Invalid equation.', '#E94B4B');
      return;
    }

    const path = sampleFunction(parse.evalFn!, this.puzzle.coordinateWindow);
    this.drawRailPath(path.segments, 0x88AAFF, 3);
    if (withFeedback && path.hasDiscontinuity) {
      this.setFeedback('⚠ This graph has a break (asymptote) — the rail will split there.', '#F26B2E');
    }
  }

  private doPlay(): void {
    if (this.isRiding) return;
    const raw = this.equationInput.value.trim();
    if (!raw) { this.setFeedback('Enter an equation first.', '#E94B4B'); return; }

    // Disable input during ride
    this.equationInput.disabled = true;
    this.playBtn.disabled = true;

    const parse = parseExpression(raw);
    if (!parse.valid) {
      this.equationInput.disabled = false;
      this.playBtn.disabled = false;
      this.setFeedback(parse.error ?? 'Invalid equation.', '#E94B4B');
      return;
    }

    const path = sampleFunction(parse.evalFn!, this.puzzle.coordinateWindow);

    // Draw confirmed gold rail
    this.railLayer.clear();
    this.drawRailPath(path.segments, COLORS.railColor, 4);

    // Validate
    const result = validateAttempt(this.puzzle, parse, path);

    // Ride along first segment
    const rideSegment = path.segments[0] ?? [];
    if (rideSegment.length < 2) {
      this.finishRide(result);
      return;
    }

    // Convert to screen coords for riding; keep math path for hazard checking
    this.rideMathPath = rideSegment;
    this.ridePath = rideSegment.map(p => this.mathToScreen(p.x, p.y));
    this.rideIndex = 0;
    this.isRiding = true;
    this.hazardHitDuringRide = false;
    this.hitHazardType = '';
    // Restore all gems to full size and visibility for this attempt
    const win = this.puzzle.coordinateWindow;
    const xRange = win.xMax - win.xMin;
    for (const g of this.gemObjects) {
      g.collected = false;
      const rw = (g.rx / xRange) * CANVAS_W;
      const size = Math.max(40, rw * 1.8);
      const obj = g.obj as Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      obj.setVisible(true).setAlpha(1).setDisplaySize(size, size);
    }

    // Start cart sound (no spinning animation)
    this.playSound('cart_roll', true);

    const totalSteps = this.ridePath.length - 1;
    this.rideTimer = this.time.addEvent({
      delay: 8, // ~1.6s total ride at 200 points
      repeat: totalSteps,
      callback: () => {
        this.rideIndex++;
        if (this.rideIndex >= this.ridePath.length) {
          this.rideTimer?.remove();
          this.finishRide(result);
          return;
        }
        const pt = this.ridePath[this.rideIndex];
        const prev = this.ridePath[this.rideIndex - 1];
        this.cartImage.setPosition(pt.sx, pt.sy);

        // Check gem collection + hazard hit in real time (no early stop)
        this.checkGemCollection(pt.sx, pt.sy);
        this.checkHazardRide(this.ridePath[this.rideIndex]);
      },
    });
  }

  private finishRide(result: ReturnType<typeof validateAttempt>): void {
    this.isRiding = false;
    this.equationInput.disabled = false;
    this.playBtn.disabled = false;
    this.stopSound('cart_roll');

    // Judge by real-time tracking + family restriction
    const allGemsCollected = this.gemObjects.length === 0 || this.gemObjects.every(g => g.collected);
    const familyAllowed = this.puzzle.allowedFamilies.length === 0 ||
      (result.family !== undefined && this.puzzle.allowedFamilies.includes(result.family));
    const accepted = result.validSyntax && familyAllowed && allGemsCollected && !this.hazardHitDuringRide;

    recordAttempt(result.family, accepted);

    if (accepted) {
      this.railLayer.clear();
      if (result.segments) this.drawRailPath(result.segments, COLORS.correctGreen, 5);
      this.updateHUD();
      this.levelMistakesTotal += gameState.mistakesOnPuzzle;

      const level = LEARNING_LEVELS[this.levelIndex];
      const isLastPuzzle = this.mode === 'learning' &&
        level && this.puzzleIndex >= level.puzzles.length - 1;

      if (isLastPuzzle && !this.levelComplete) {
        this.levelComplete = true;
        unlockNextLevel(this.levelIndex, this.levelMistakesTotal);
        const stars = this.levelMistakesTotal === 0 ? 3 : this.levelMistakesTotal <= 2 ? 2 : 1;
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        this.setFeedback(`🎉 Level Complete!  ${starStr}  — Next level unlocked!`, '#D8A83A');
        const nlb = document.getElementById('gr-next-level-btn');
        if (nlb) nlb.style.display = 'block';
        this.playSound('level_complete');
        this.cameras.main.shake(400, 0.008);
      } else {
        this.setFeedback('✅ All gems collected! Great work!', '#45D66B');
        this.time.delayedCall(1000, () => this.nextPuzzle());
      }

    } else {
      this.cameras.main.shake(300, 0.006);
      let feedback = '', color = '#F26B2E';

      if (!result.validSyntax) {
        feedback = `⚠ ${result.hint}`; color = '#E94B4B';
        this.playSound('wrong_answer');
      } else if (!familyAllowed) {
        const needed = this.puzzle.allowedFamilies.join(' or ');
        feedback = `📐 This puzzle needs a ${needed} function — try a different equation type.`;
        this.playSound('wrong_answer');
      } else if (this.hazardHitDuringRide) {
        const msgs: Record<string, string> = {
          rock: 'Your path hit a rock — adjust the curve to go around it.',
          lava: 'Your path crossed lava — shift the curve to avoid those squares.',
          hole: 'Your path fell into a hole — steer clear of the dark blocks.',
          monster: 'A monster blocked the path — curve around it.',
        };
        feedback = `💥 ${msgs[this.hitHazardType] ?? 'Hit a hazard!'}`;
        color = '#E94B4B';
        this.playSound('cart_crash');
      } else {
        const missed = this.gemObjects.filter(g => !g.collected).length;
        feedback = `💎 ${missed} gem${missed !== 1 ? 's' : ''} missed — ${result.hint}`;
        this.playSound('wrong_answer');
      }

      this.setFeedback(feedback, color);
      this.levelMistakesTotal++;
      this.updateHUD();

      if (gameState.mistakesOnPuzzle >= this.puzzle.maxMistakesBeforeReveal) {
        this.time.delayedCall(800, () => this.revealAnswer());
      }
    }
  }

  private revealAnswer(): void {
    const target = this.puzzle.targetExpression;
    const parse = parseExpression(target);
    if (parse.valid && parse.evalFn) {
      const path = sampleFunction(parse.evalFn, this.puzzle.coordinateWindow);
      this.railLayer.clear();
      this.drawRailPath(path.segments, COLORS.correctGreen, 4);
    }
    this.setFeedback(
      `💡 Answer: y = ${target}  —  ${this.puzzle.learningText ?? ''}`,
      '#D8A83A'
    );
    this.equationInput.value = target;

    const level = LEARNING_LEVELS[this.levelIndex];
    const isLastPuzzle = this.mode === 'learning' &&
      level && this.puzzleIndex >= level.puzzles.length - 1;

    if (isLastPuzzle && !this.levelComplete) {
      this.levelComplete = true;
      unlockNextLevel(this.levelIndex, this.levelMistakesTotal + 5); // penalize for reveal

      this.time.delayedCall(3000, () => {
        const nlb = document.getElementById('gr-next-level-btn');
        if (nlb) nlb.style.display = 'block';
      });
    } else {
      this.time.delayedCall(3000, () => this.nextPuzzle());
    }
  }

  private drawRailPath(
    segments: Array<Array<{ x: number; y: number }>>,
    railColor: number,
    _unused: number
  ): void {
    const g = this.railLayer;
    const HALF        = 6;   // half-gap between the two rails (screen px)
    const TIE_HALF    = 9;   // half-length of each wooden tie (extends beyond rails)
    const TIE_THICK   = 4;   // tie thickness (px)
    const RAIL_THICK  = 3;   // each rail line thickness (px)
    const TIE_SPACING = 22;  // screen-px between ties
    const TIE_COLOR   = 0x5E3A10; // dark wood brown

    for (const seg of segments) {
      if (seg.length < 2) continue;

      // Convert math-space segment → screen-space points
      const pts = seg.map(p => this.mathToScreen(p.x, p.y));

      // Precompute perpendicular unit vector at each point
      const perps = pts.map((pt, i) => {
        let dx: number, dy: number;
        if (i === 0) {
          dx = pts[1].sx - pts[0].sx; dy = pts[1].sy - pts[0].sy;
        } else if (i === pts.length - 1) {
          dx = pts[i].sx - pts[i - 1].sx; dy = pts[i].sy - pts[i - 1].sy;
        } else {
          dx = pts[i + 1].sx - pts[i - 1].sx; dy = pts[i + 1].sy - pts[i - 1].sy;
        }
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { px: -dy / len, py: dx / len };
      });

      // ── 1. Wooden sleeper ties (drawn first, behind the rails) ──────
      g.lineStyle(TIE_THICK, TIE_COLOR, 1);
      let distAccum = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].sx - pts[i - 1].sx;
        const dy = pts[i].sy - pts[i - 1].sy;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        distAccum += segLen;
        while (distAccum >= TIE_SPACING) {
          distAccum -= TIE_SPACING;
          // Position of this tie along the segment
          const t = 1 - distAccum / segLen;
          const tx = pts[i - 1].sx + dx * t;
          const ty = pts[i - 1].sy + dy * t;
          // Perpendicular direction at this point (interpolate)
          const lam = i / pts.length;
          const px = perps[Math.floor(lam * perps.length)].px;
          const py = perps[Math.floor(lam * perps.length)].py;
          // Draw tie
          g.beginPath();
          g.moveTo(tx + px * TIE_HALF, ty + py * TIE_HALF);
          g.lineTo(tx - px * TIE_HALF, ty - py * TIE_HALF);
          g.strokePath();
        }
      }

      // ── 2. Left rail ──────────────────────────────────────────────
      g.lineStyle(RAIL_THICK, railColor, 1);
      g.beginPath();
      perps.forEach((p, i) => {
        const lx = pts[i].sx + p.px * HALF;
        const ly = pts[i].sy + p.py * HALF;
        i === 0 ? g.moveTo(lx, ly) : g.lineTo(lx, ly);
      });
      g.strokePath();

      // ── 3. Right rail ─────────────────────────────────────────────
      g.beginPath();
      perps.forEach((p, i) => {
        const rx = pts[i].sx - p.px * HALF;
        const ry = pts[i].sy - p.py * HALF;
        i === 0 ? g.moveTo(rx, ry) : g.lineTo(rx, ry);
      });
      g.strokePath();
    }
  }

  private showHint(): void {
    const hint = getStagedHint(this.puzzle, gameState.mistakesOnPuzzle);
    this.setFeedback(`💡 ${hint}`, '#F26B2E');
  }

  private doReset(): void {
    this.equationInput.value = '';
    this.railLayer.clear();
    this.setFeedback('', '');
    this.equationInput.focus();
  }

  private setFeedback(msg: string, color: string): void {
    if (!this.feedbackText) return;
    this.feedbackText.style.color = color || '#FFFFFF';
    this.feedbackText.textContent = msg;
  }

  private updateHUD(): void {
    if (this.scoreText) {
      if (this.mode === 'freeplay') {
        this.scoreText.textContent = `Score: ${gameState.score}  Streak: ${gameState.streak}`;
      } else {
        this.scoreText.textContent = `Level ${this.levelIndex + 1}  Puzzle ${this.puzzleIndex + 1}`;
      }
    }

    if (this.instructionText) {
      this.instructionText.textContent = this.puzzle.displayPrompt;
    }

    if (this.teachBox && this.mode === 'learning') {
      this.teachBox.innerHTML = this.puzzle.learningText
        ? `<b style="color:#75C7F2">📖 Tip:</b><br>${this.puzzle.learningText}`
        : '';
    }

    const modeLabel = document.getElementById('gr-mode-label');
    if (modeLabel) {
      modeLabel.textContent = this.mode === 'freeplay'
        ? `⚡ FREEPLAY  ${gameState.totalSolved} solved  (${this.freeplayPoolIdx}/${this.freeplayPool.length || '?'} puzzles)`
        : `📚 Level ${this.levelIndex + 1} — ${LEARNING_LEVELS[this.levelIndex]?.title.replace(/Level \d+ — /, '') ?? ''}`;
    }
  }

  private nextPuzzle(): void {
    let nextLevel = this.levelIndex;
    let nextPuzzle = this.puzzleIndex;

    if (this.mode === 'learning') {
      const level = LEARNING_LEVELS[this.levelIndex];
      if (this.puzzleIndex + 1 < level.puzzles.length) {
        nextPuzzle = this.puzzleIndex + 1;
      } else {
        nextLevel = this.levelIndex + 1;
        nextPuzzle = 0;
        if (nextLevel >= LEARNING_LEVELS.length) {
          this.endGame();
          return;
        }
      }
    }

    this.cleanupHUD();
    this.scene.restart({
      mode: this.mode,
      levelIndex: nextLevel,
      puzzleIndex: nextPuzzle,
      freeplaySeed: this.mode === 'freeplay' ? this.freeplaySeed : undefined,
      freeTier: this.freeTier,
      levelMistakesTotal: this.levelMistakesTotal,
    });
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        gameState.timeRemaining--;
        this.updateTimerDisplay();
        if (gameState.timeRemaining <= 0) {
          this.timerEvent?.remove();
          this.endGame();
        }
      },
    });
  }

  private reconnectTimer(): void {
    // Restore the timer for persisted freeplay sessions
    this.updateTimerDisplay();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        gameState.timeRemaining--;
        this.updateTimerDisplay();
        if (gameState.timeRemaining <= 0) {
          this.timerEvent?.remove();
          this.endGame();
        }
      },
    });
  }

  private updateTimerDisplay(): void {
    if (!this.timerText) return;
    const m = Math.floor(gameState.timeRemaining / 60);
    const s = gameState.timeRemaining % 60;
    this.timerText.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    this.timerText.style.color = gameState.timeRemaining <= 30 ? '#E94B4B' : '#F26B2E';
  }

  private endGame(): void {
    this.cleanupHUD();
    this.scene.start('GameOverScene', {
      mode: this.mode,
      score: gameState.score,
      totalSolved: gameState.totalSolved,
      totalAttempts: gameState.totalAttempts,
      bestStreak: gameState.bestStreak,
      familyStats: gameState.familyStats,
      levelsCompleted: this.levelIndex,
    });
  }

  // (hazard drawing now handled inline in drawObjects via Ludo images)

  // ── Hazard collision during ride ──────────────────────────────────────────
  private checkHazardRide(screenPt: { sx: number; sy: number }): void {
    if (this.hazardHitDuringRide) return; // already flagged
    // Convert screen pt back to math coords
    const win = this.puzzle.coordinateWindow;
    const mx = win.xMin + ((screenPt.sx - CANVAS_X) / CANVAS_W) * (win.xMax - win.xMin);
    const my = win.yMin + ((CANVAS_Y + CANVAS_H - screenPt.sy) / CANVAS_H) * (win.yMax - win.yMin);

    for (const hz of this.puzzle.hazards) {
      if (Math.abs(mx - hz.x) <= hz.radiusX && Math.abs(my - hz.y) <= hz.radiusY) {
        this.hazardHitDuringRide = true;
        this.hitHazardType = hz.type;
        // Flash the hazard red
        this.cameras.main.flash(200, 255, 50, 50, false);
        break;
      }
    }
  }

  // ── Gem collection ────────────────────────────────────────────────────────
  private checkGemCollection(cartSx: number, cartSy: number): void {
    for (const gem of this.gemObjects) {
      if (gem.collected) continue;
      // Convert gem math coords to screen
      const { sx, sy } = this.mathToScreen(gem.cx, gem.cy);
      // Check proximity in screen pixels
      const dx = cartSx - sx;
      const dy = cartSy - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = 48; // px
      if (dist < threshold) {
        gem.collected = true;
        this.playSound('gem_collect');
        // Pop and fade — hide (not destroy) so it can be restored on retry
        this.tweens.add({
          targets: gem.obj,
          scaleX: 2.5, scaleY: 2.5,
          alpha: 0,
          duration: 300,
          ease: 'Back.easeOut',
          onComplete: () => {
            (gem.obj as Phaser.GameObjects.Image | Phaser.GameObjects.Sprite).setVisible(false);
          },
        });
      }
    }
  }

  // ── Freeplay puzzle pool ──────────────────────────────────────────────────
  private freeplayPool: PuzzleSpec[] = [];
  private freeplayPoolIdx = 0;

  private buildFreeplayPool(): void {
    // Collect every puzzle from every learning level
    const all: PuzzleSpec[] = LEARNING_LEVELS.flatMap(l => l.puzzles);

    // Seeded shuffle (deterministic per run)
    const pool = [...all];
    let seed = this.freeplaySeed * 1664525 + 1013904223;
    for (let i = pool.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      const j = (seed >>> 0) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Strip prefill (students must work it out in freeplay)
    this.freeplayPool = pool.map(p => ({ ...p, prefillExpression: undefined, allowedFamilies: [] }));
    this.freeplayPoolIdx = 0;
  }

  private pickFreeplayPuzzle(): PuzzleSpec {
    if (this.freeplayPool.length === 0) this.buildFreeplayPool();
    const puzzle = this.freeplayPool[this.freeplayPoolIdx % this.freeplayPool.length];
    this.freeplayPoolIdx++;
    // Reshuffle when we've gone through the whole pool
    if (this.freeplayPoolIdx >= this.freeplayPool.length) {
      this.freeplaySeed++;
      this.buildFreeplayPool();
    }
    return puzzle;
  }

  // ── Audio helpers ─────────────────────────────────────────────────────────
  private activeSounds: Map<string, Phaser.Sound.BaseSound> = new Map();

  private startMusic(): void {
    if (!this.cache.audio.exists('music_cave')) return;
    this.sound.stopAll();
    const music = this.sound.add('music_cave', { loop: true, volume: 0.12 });
    music.play();
    this.activeSounds.set('music', music);
  }

  private playSound(key: string, loop = false): void {
    if (!this.cache.audio.exists(key)) return;
    if (loop) {
      if (this.activeSounds.has(key)) return; // already playing
      const snd = this.sound.add(key, { loop: true, volume: 0.5 });
      snd.play();
      this.activeSounds.set(key, snd);
    } else {
      this.sound.play(key, { volume: 0.7 });
    }
  }

  private stopSound(key: string): void {
    const snd = this.activeSounds.get(key);
    if (snd) { snd.stop(); this.activeSounds.delete(key); }
  }

  private cleanupHUD(): void {
    this.timerEvent?.remove();
    this.rideTimer?.remove();
    this.sound.stopAll();
    const hud = document.getElementById('graph-rails-hud');
    if (hud) hud.remove();
  }

  shutdown() {
    this.cleanupHUD();
  }
}
