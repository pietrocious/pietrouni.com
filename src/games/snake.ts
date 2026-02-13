// Snake Game for pietrOS
// Vanilla TypeScript implementation using Canvas API

import { playClick, playNotification, isSoundEnabled } from '../audio';

const GRID = 20;        // number of cells per row/col
const CELL = 24;        // pixel size of each cell
const BOARD = GRID * CELL; // total canvas size (480)

type Dir = { x: number; y: number };
type Point = { x: number; y: number };

const DIRS: Record<string, Dir> = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

export class SnakeGame {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private uiLayer: HTMLElement;

  private snake: Point[] = [];
  private food: Point = { x: 0, y: 0 };
  private dir: Dir = DIRS.RIGHT;
  private nextDir: Dir = DIRS.RIGHT;
  private score = 0;
  private highScore: number;
  private speed = 120;           // ms per tick
  private tickTimer: number | null = null;
  private animFrameId: number | null = null;
  private gameOver = false;
  private paused = false;
  private started = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.highScore = parseInt(localStorage.getItem('snake-high') || '0');

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = BOARD;
    this.canvas.height = BOARD;
    this.canvas.className = "rounded-lg shadow-lg";
    this.canvas.style.imageRendering = "pixelated";
    this.ctx = this.canvas.getContext('2d')!;

    // UI overlay
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = "absolute inset-0 flex items-center justify-center pointer-events-none";

    // Header
    const header = document.createElement('div');
    header.className = "flex justify-between items-center mb-4 w-full max-w-md mx-auto";
    header.innerHTML = `
      <div class="flex gap-4">
        <div class="bg-[#4a752c] p-2 rounded text-center min-w-[80px]">
          <div class="text-green-200 text-xs font-bold uppercase">Score</div>
          <div id="snake-score" class="text-white font-bold text-lg">0</div>
        </div>
        <div class="bg-[#4a752c] p-2 rounded text-center min-w-[80px]">
          <div class="text-green-200 text-xs font-bold uppercase">Best</div>
          <div id="snake-best" class="text-white font-bold text-lg">${this.highScore}</div>
        </div>
      </div>
      <button id="snake-restart" class="bg-[#4a752c] text-white px-4 py-2 rounded font-bold hover:bg-[#5a8a3c]">New Game</button>
    `;

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = "relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden";
    wrapper.appendChild(this.canvas);
    wrapper.appendChild(this.uiLayer);

    this.container.innerHTML = '';
    this.container.appendChild(header);
    this.container.appendChild(wrapper);

    // Hint
    const hint = document.createElement('p');
    hint.className = "text-center mt-3 text-green-800 dark:text-green-300 text-xs opacity-70";
    hint.textContent = "Arrow keys or WASD to move. Press any key to start.";
    this.container.appendChild(hint);

    // Events
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    header.querySelector('#snake-restart')?.addEventListener('click', () => this.restart());

    this.restart();
    this.renderLoop();
  }

  // ── Game loop ─────────────────────────────────────────────

  private restart(): void {
    // Reset state
    const mid = Math.floor(GRID / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    this.dir = DIRS.RIGHT;
    this.nextDir = DIRS.RIGHT;
    this.score = 0;
    this.gameOver = false;
    this.paused = false;
    this.started = false;
    this.speed = 120;
    this.uiLayer.innerHTML = '';
    this.uiLayer.style.pointerEvents = 'none';
    this.spawnFood();
    this.updateScoreUI();

    // Show "press key" overlay
    this.showMessage('Press any key to start');

    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  private startGame(): void {
    if (this.started) return;
    this.started = true;
    this.uiLayer.innerHTML = '';
    this.uiLayer.style.pointerEvents = 'none';
    this.tickTimer = window.setInterval(() => this.tick(), this.speed);
  }

  private tick(): void {
    if (this.gameOver || this.paused) return;

    this.dir = this.nextDir;

    // Compute new head
    const head = this.snake[0];
    const newHead: Point = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y,
    };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      this.endGame();
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      this.endGame();
      return;
    }

    this.snake.unshift(newHead);

    // Eat food?
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      if (isSoundEnabled()) playClick();
      this.updateScoreUI();
      this.spawnFood();

      // Speed up slightly every 5 foods
      if (this.score % 50 === 0 && this.speed > 60) {
        this.speed -= 10;
        if (this.tickTimer !== null) clearInterval(this.tickTimer);
        this.tickTimer = window.setInterval(() => this.tick(), this.speed);
      }
    } else {
      this.snake.pop(); // remove tail
    }
  }

  private endGame(): void {
    this.gameOver = true;
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snake-high', this.highScore.toString());
      this.updateScoreUI();
    }

    if (isSoundEnabled()) playNotification();
    this.showGameOver();
  }

  // ── Food ──────────────────────────────────────────────────

  private spawnFood(): void {
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    this.food = pos;
  }

  // ── Rendering ─────────────────────────────────────────────

  private renderLoop(): void {
    this.draw();
    this.animFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background — checkered grass pattern
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#aad751' : '#a2d149';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Food — red apple
    const fx = this.food.x * CELL;
    const fy = this.food.y * CELL;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(fx + CELL / 2, fy + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(fx + CELL / 2 - 1, fy + 2, 2, 5);

    // Snake
    this.snake.forEach((seg, i) => {
      const sx = seg.x * CELL;
      const sy = seg.y * CELL;

      if (i === 0) {
        // Head — darker green with eyes
        ctx.fillStyle = '#4a752c';
        this.roundedRect(sx + 1, sy + 1, CELL - 2, CELL - 2, 5);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        const eyeSize = 3;
        let ex1: number, ey1: number, ex2: number, ey2: number;
        if (this.dir === DIRS.RIGHT) {
          ex1 = sx + CELL - 6; ey1 = sy + 4;
          ex2 = sx + CELL - 6; ey2 = sy + CELL - 7;
        } else if (this.dir === DIRS.LEFT) {
          ex1 = sx + 4; ey1 = sy + 4;
          ex2 = sx + 4; ey2 = sy + CELL - 7;
        } else if (this.dir === DIRS.UP) {
          ex1 = sx + 4; ey1 = sy + 4;
          ex2 = sx + CELL - 7; ey2 = sy + 4;
        } else {
          ex1 = sx + 4; ey1 = sy + CELL - 7;
          ex2 = sx + CELL - 7; ey2 = sy + CELL - 7;
        }
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex1, ey1, 1.5, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body
        ctx.fillStyle = i % 2 === 0 ? '#5b8c2a' : '#63982e';
        this.roundedRect(sx + 1, sy + 1, CELL - 2, CELL - 2, 4);
        ctx.fill();
      }
    });
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── UI ────────────────────────────────────────────────────

  private updateScoreUI(): void {
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    if (scoreEl) scoreEl.textContent = this.score.toString();
    if (bestEl) bestEl.textContent = this.highScore.toString();
  }

  private showMessage(text: string): void {
    this.uiLayer.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = "bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg px-6 py-4 shadow-lg text-center";
    msg.innerHTML = `<p class="text-lg font-bold text-gray-700 dark:text-gray-200">${text}</p>`;
    this.uiLayer.appendChild(msg);
  }

  private showGameOver(): void {
    this.uiLayer.innerHTML = '';
    this.uiLayer.style.pointerEvents = 'auto';
    const msg = document.createElement('div');
    msg.className = "bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg p-6 shadow-lg text-center";
    msg.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Game Over!</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">Score: <strong>${this.score}</strong></p>
      <button id="snake-retry" class="bg-[#4a752c] text-white px-6 py-2 rounded font-bold hover:bg-[#5a8a3c]">Try Again</button>
    `;
    this.uiLayer.appendChild(msg);
    msg.querySelector('#snake-retry')?.addEventListener('click', () => this.restart());
  }

  // ── Input ─────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (document.activeElement !== document.body && !this.container.contains(document.activeElement)) return;

    const keyMap: Record<string, Dir> = {
      ArrowUp: DIRS.UP, w: DIRS.UP, W: DIRS.UP,
      ArrowDown: DIRS.DOWN, s: DIRS.DOWN, S: DIRS.DOWN,
      ArrowLeft: DIRS.LEFT, a: DIRS.LEFT, A: DIRS.LEFT,
      ArrowRight: DIRS.RIGHT, d: DIRS.RIGHT, D: DIRS.RIGHT,
    };

    const newDir = keyMap[e.key];

    // Start the game on first keypress
    if (!this.started && !this.gameOver) {
      if (newDir) this.nextDir = newDir;
      this.startGame();
      e.preventDefault();
      return;
    }

    if (newDir && !this.gameOver) {
      // Prevent 180° reversal
      if (newDir.x + this.dir.x !== 0 || newDir.y + this.dir.y !== 0) {
        this.nextDir = newDir;
      }
      e.preventDefault();
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────

  public destroy(): void {
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

let activeGame: SnakeGame | null = null;

export function initSnake(container: HTMLElement): void {
  if (activeGame) activeGame.destroy();
  activeGame = new SnakeGame(container);
}

export function destroySnake(): void {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }
}
