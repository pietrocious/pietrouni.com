// Tetris Game for pietrOS
// Vanilla TypeScript implementation using Canvas API

interface Tetromino {
  shape: number[][];
  color: string;
}

interface Piece {
  x: number;
  y: number;
  tetromino: Tetromino;
}

const TETROMINOS: Record<string, Tetromino> = {
  I: { shape: [[1, 1, 1, 1]], color: '#06b6d4' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
  O: { shape: [[1, 1], [1, 1]], color: '#eab308' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BUFFER_ROWS = 2;
const TOTAL_HEIGHT = BOARD_HEIGHT + BUFFER_ROWS;
const CELL_SIZE = 24;
const INITIAL_DROP_TIME = 800;
const SPEED_FACTOR = 0.85;

export class TetrisGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private holdCanvas: HTMLCanvasElement;
  private holdCtx: CanvasRenderingContext2D;
  private nextCanvas: HTMLCanvasElement;
  private nextCtx: CanvasRenderingContext2D;

  private board: (string | 0)[][];
  private currentPiece: Piece | null = null;
  private heldPiece: Tetromino | null = null;
  private canHold = true;
  private nextPieces: Tetromino[] = [];

  private score = 0;
  private highScore = 0;
  private lines = 0;
  private level = 1;
  private dropTime = INITIAL_DROP_TIME;

  private gameOver = false;
  private isPaused = false;
  private dropInterval: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  private scoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private linesEl: HTMLElement;
  private levelEl: HTMLElement;
  private statusEl: HTMLElement;

  constructor(container: HTMLElement) {
    // Get canvas elements
    this.canvas = container.querySelector('#tetris-board') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.holdCanvas = container.querySelector('#tetris-hold') as HTMLCanvasElement;
    this.holdCtx = this.holdCanvas.getContext('2d')!;
    this.nextCanvas = container.querySelector('#tetris-next') as HTMLCanvasElement;
    this.nextCtx = this.nextCanvas.getContext('2d')!;

    // Get stat elements
    this.scoreEl = container.querySelector('#tetris-score')!;
    this.highScoreEl = container.querySelector('#tetris-highscore')!;
    this.linesEl = container.querySelector('#tetris-lines')!;
    this.levelEl = container.querySelector('#tetris-level')!;
    this.statusEl = container.querySelector('#tetris-status')!;

    // Buttons
    container.querySelector('#tetris-pause')?.addEventListener('click', () => this.togglePause());
    container.querySelector('#tetris-reset')?.addEventListener('click', () => this.reset());

    // Initialize
    this.board = this.createEmptyBoard();
    this.nextPieces = this.generateNextPieces(3);
    this.loadHighScore();
    this.setupKeyboard();
    this.spawnPiece();
    this.startGameLoop();
    this.render();
  }

  private createEmptyBoard(): (string | 0)[][] {
    return Array.from({ length: TOTAL_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
  }

  private generateNextPieces(count: number): Tetromino[] {
    const keys = Object.keys(TETROMINOS);
    return Array.from({ length: count }, () => {
      const key = keys[Math.floor(Math.random() * keys.length)];
      return { ...TETROMINOS[key], shape: TETROMINOS[key].shape.map(row => [...row]) };
    });
  }

  private randomTetromino(): Tetromino {
    const keys = Object.keys(TETROMINOS);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return { ...TETROMINOS[key], shape: TETROMINOS[key].shape.map(row => [...row]) };
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('tetris-highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore(): void {
    localStorage.setItem('tetris-highscore', this.highScore.toString());
  }

  private setupKeyboard(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.moveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.rotate();
          break;
        case ' ':
          e.preventDefault();
          this.hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          this.togglePause();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          this.hold();
          break;
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private spawnPiece(): void {
    const tetromino = this.nextPieces.shift()!;
    this.nextPieces.push(this.randomTetromino());

    this.currentPiece = {
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
      y: 0,
      tetromino,
    };

    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.tetromino.shape)) {
      this.gameOver = true;
      this.stopGameLoop();
      this.updateStatus();
    }

    this.canHold = true;
  }

  private checkCollision(x: number, y: number, shape: number[][]): boolean {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= TOTAL_HEIGHT) return true;
          if (newY >= 0 && this.board[newY][newX] !== 0) return true;
        }
      }
    }
    return false;
  }

  private moveLeft(): void {
    if (!this.currentPiece || this.isPaused) return;
    if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.tetromino.shape)) {
      this.currentPiece.x--;
      this.render();
    }
  }

  private moveRight(): void {
    if (!this.currentPiece || this.isPaused) return;
    if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.tetromino.shape)) {
      this.currentPiece.x++;
      this.render();
    }
  }

  private moveDown(): boolean {
    if (!this.currentPiece || this.isPaused) return false;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.tetromino.shape)) {
      this.currentPiece.y++;
      this.render();
      return true;
    } else {
      this.lockPiece();
      return false;
    }
  }

  private rotate(): void {
    if (!this.currentPiece || this.isPaused) return;
    const rotated = this.currentPiece.tetromino.shape[0].map((_, i) =>
      this.currentPiece!.tetromino.shape.map(row => row[i]).reverse()
    );

    // Wall kick offsets
    const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]];
    for (const [dx, dy] of offsets) {
      if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y + dy, rotated)) {
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;
        this.currentPiece.tetromino.shape = rotated;
        this.render();
        return;
      }
    }
  }

  private hardDrop(): void {
    if (!this.currentPiece || this.isPaused) return;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.tetromino.shape)) {
      this.currentPiece.y++;
    }
    this.lockPiece();
  }

  private hold(): void {
    if (!this.currentPiece || !this.canHold || this.isPaused) return;

    const current = this.currentPiece.tetromino;
    if (this.heldPiece) {
      this.currentPiece = {
        x: Math.floor(BOARD_WIDTH / 2) - 1,
        y: 0,
        tetromino: this.heldPiece,
      };
    } else {
      this.spawnPiece();
    }
    this.heldPiece = current;
    this.canHold = false;
    this.render();
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;

    const { x, y, tetromino } = this.currentPiece;
    for (let row = 0; row < tetromino.shape.length; row++) {
      for (let col = 0; col < tetromino.shape[row].length; col++) {
        if (tetromino.shape[row][col]) {
          const boardY = y + row;
          const boardX = x + col;
          if (boardY >= 0 && boardY < TOTAL_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            this.board[boardY][boardX] = tetromino.color;
          }
        }
      }
    }

    // Check for game over (piece locked in buffer zone)
    for (let col = 0; col < BOARD_WIDTH; col++) {
      if (this.board[BUFFER_ROWS][col] !== 0) {
        this.gameOver = true;
        this.stopGameLoop();
        this.updateStatus();
        this.render();
        return;
      }
    }

    this.clearLines();
    this.spawnPiece();
    this.render();
  }

  private clearLines(): void {
    let cleared = 0;
    for (let row = TOTAL_HEIGHT - 1; row >= BUFFER_ROWS; row--) {
      if (this.board[row].every(cell => cell !== 0)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(BOARD_WIDTH).fill(0));
        cleared++;
        row++; // Re-check this row since we shifted
      }
    }

    if (cleared > 0) {
      this.lines += cleared;
      this.score += cleared * 100 * this.level;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }

      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropTime = Math.max(INITIAL_DROP_TIME * Math.pow(SPEED_FACTOR, this.level - 1), 50);
        this.restartGameLoop();
      }
      this.updateStats();
    }
  }

  private togglePause(): void {
    if (this.gameOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.stopGameLoop();
    } else {
      this.startGameLoop();
    }
    this.updateStatus();
    this.render();
  }

  private updateStats(): void {
    this.scoreEl.textContent = this.score.toString();
    this.highScoreEl.textContent = this.highScore.toString();
    this.linesEl.textContent = this.lines.toString();
    this.levelEl.textContent = this.level.toString();
  }

  private updateStatus(): void {
    if (this.gameOver) {
      this.statusEl.textContent = 'GAME OVER';
      this.statusEl.className = 'text-red-500 font-bold text-lg';
    } else if (this.isPaused) {
      this.statusEl.textContent = 'PAUSED';
      this.statusEl.className = 'text-yellow-500 font-bold text-lg';
    } else {
      this.statusEl.textContent = '';
    }
  }

  private startGameLoop(): void {
    this.dropInterval = window.setInterval(() => {
      if (!this.isPaused && !this.gameOver) {
        this.moveDown();
      }
    }, this.dropTime);
  }

  private stopGameLoop(): void {
    if (this.dropInterval) {
      clearInterval(this.dropInterval);
      this.dropInterval = null;
    }
  }

  private restartGameLoop(): void {
    this.stopGameLoop();
    this.startGameLoop();
  }

  private getGhostY(): number {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.tetromino.shape)) {
      ghostY++;
    }
    return ghostY;
  }

  private render(): void {
    // Clear main canvas
    this.ctx.fillStyle = '#1e1e2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.ctx.strokeStyle = '#313244';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CELL_SIZE, 0);
      this.ctx.lineTo(x * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
      this.ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CELL_SIZE);
      this.ctx.lineTo(BOARD_WIDTH * CELL_SIZE, y * CELL_SIZE);
      this.ctx.stroke();
    }

    // Draw locked pieces
    for (let row = BUFFER_ROWS; row < TOTAL_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        if (this.board[row][col] !== 0) {
          this.drawCell(this.ctx, col, row - BUFFER_ROWS, this.board[row][col] as string);
        }
      }
    }

    // Draw ghost piece
    if (this.currentPiece && !this.gameOver) {
      const ghostY = this.getGhostY();
      for (let row = 0; row < this.currentPiece.tetromino.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.tetromino.shape[row].length; col++) {
          if (this.currentPiece.tetromino.shape[row][col]) {
            const drawY = ghostY + row - BUFFER_ROWS;
            if (drawY >= 0) {
              this.ctx.fillStyle = this.currentPiece.tetromino.color + '40';
              this.ctx.fillRect(
                (this.currentPiece.x + col) * CELL_SIZE + 1,
                drawY * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
              );
            }
          }
        }
      }
    }

    // Draw current piece
    if (this.currentPiece && !this.gameOver) {
      for (let row = 0; row < this.currentPiece.tetromino.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.tetromino.shape[row].length; col++) {
          if (this.currentPiece.tetromino.shape[row][col]) {
            const drawY = this.currentPiece.y + row - BUFFER_ROWS;
            if (drawY >= 0) {
              this.drawCell(this.ctx, this.currentPiece.x + col, drawY, this.currentPiece.tetromino.color);
            }
          }
        }
      }
    }

    // Draw hold piece
    this.holdCtx.fillStyle = '#1e1e2e';
    this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (this.heldPiece) {
      this.drawPreviewPiece(this.holdCtx, this.heldPiece, this.holdCanvas.width, this.holdCanvas.height);
    }

    // Draw next pieces
    this.nextCtx.fillStyle = '#1e1e2e';
    this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const previewSize = 60;
    for (let i = 0; i < Math.min(3, this.nextPieces.length); i++) {
      this.drawPreviewPiece(
        this.nextCtx,
        this.nextPieces[i],
        this.nextCanvas.width,
        previewSize,
        i * previewSize
      );
    }

    this.updateStats();
  }

  private drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, 3);
    ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, 3, CELL_SIZE - 2);
  }

  private drawPreviewPiece(
    ctx: CanvasRenderingContext2D,
    tetromino: Tetromino,
    containerWidth: number,
    containerHeight: number,
    offsetY = 0
  ): void {
    const previewCellSize = 14;
    const pieceWidth = tetromino.shape[0].length * previewCellSize;
    const pieceHeight = tetromino.shape.length * previewCellSize;
    const startX = (containerWidth - pieceWidth) / 2;
    const startY = offsetY + (containerHeight - pieceHeight) / 2;

    for (let row = 0; row < tetromino.shape.length; row++) {
      for (let col = 0; col < tetromino.shape[row].length; col++) {
        if (tetromino.shape[row][col]) {
          ctx.fillStyle = tetromino.color;
          ctx.fillRect(
            startX + col * previewCellSize + 1,
            startY + row * previewCellSize + 1,
            previewCellSize - 2,
            previewCellSize - 2
          );
        }
      }
    }
  }

  reset(): void {
    this.stopGameLoop();
    this.board = this.createEmptyBoard();
    this.currentPiece = null;
    this.heldPiece = null;
    this.canHold = true;
    this.nextPieces = this.generateNextPieces(3);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropTime = INITIAL_DROP_TIME;
    this.gameOver = false;
    this.isPaused = false;
    this.statusEl.textContent = '';
    this.spawnPiece();
    this.startGameLoop();
    this.render();
  }

  destroy(): void {
    this.stopGameLoop();
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}

// Global instance tracker for cleanup
let currentGame: TetrisGame | null = null;

export function initTetris(container: HTMLElement): void {
  // Cleanup previous game if exists
  if (currentGame) {
    currentGame.destroy();
  }
  currentGame = new TetrisGame(container);
}

export function destroyTetris(): void {
  if (currentGame) {
    currentGame.destroy();
    currentGame = null;
  }
}
