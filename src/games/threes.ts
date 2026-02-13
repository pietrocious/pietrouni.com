// Threes! Game for pietrOS
// Vanilla TypeScript implementation using Canvas API with smooth animations

interface AnimatedTile {
  id: number;
  value: number;
  row: number;
  col: number;
  // Animation state
  displayX: number;
  displayY: number;
  targetX: number;
  targetY: number;
  scale: number;
  targetScale: number;
  opacity: number;
  merged: boolean;
  isNew: boolean;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const GRID_SIZE = 4;
const CELL_SIZE = 80;
const CELL_GAP = 8;
const ANIMATION_DURATION = 120; // ms
const MERGE_POP_SCALE = 1.15;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#38bdf8', text: '#ffffff' },
  2: { bg: '#fb7185', text: '#ffffff' },
  3: { bg: '#ffffff', text: '#27272a' },
  6: { bg: '#ffffff', text: '#27272a' },
  12: { bg: '#ffffff', text: '#27272a' },
  24: { bg: '#fde047', text: '#27272a' },
  48: { bg: '#facc15', text: '#27272a' },
  96: { bg: '#fb923c', text: '#27272a' },
  192: { bg: '#f97316', text: '#ffffff' },
  384: { bg: '#ef4444', text: '#ffffff' },
  768: { bg: '#dc2626', text: '#ffffff' },
  1536: { bg: '#a855f7', text: '#ffffff' },
  3072: { bg: '#9333ea', text: '#ffffff' },
  6144: { bg: '#7c3aed', text: '#ffffff' },
};

let tileIdCounter = 0;

function generateTileId(): number {
  return ++tileIdCounter;
}

function getRandomValue(): number {
  const rand = Math.random();
  if (rand < 0.4) return 1;
  if (rand < 0.8) return 2;
  return 3;
}

function canMerge(a: number, b: number): boolean {
  if ((a === 1 && b === 2) || (a === 2 && b === 1)) return true;
  if (a >= 3 && b >= 3 && a === b) return true;
  return false;
}

function mergeValue(a: number, b: number): number {
  if ((a === 1 && b === 2) || (a === 2 && b === 1)) return 3;
  if (a >= 3 && a === b) return a + b;
  return a;
}

function calculateScore(tiles: AnimatedTile[]): number {
  return tiles.reduce((sum, t) => {
    if (t.value < 3) return sum;
    const power = Math.log2(t.value / 3) + 1;
    return sum + Math.pow(3, power);
  }, 0);
}

// Easing function for smooth animation
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function gridToPixel(gridPos: number): number {
  return CELL_GAP + gridPos * (CELL_SIZE + CELL_GAP);
}

export class ThreesGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private tiles: AnimatedTile[] = [];
  private score = 0;
  private highScore = 0;
  private nextTile = 1;
  private gameOver = false;

  private scoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private statusEl: HTMLElement;
  private nextTileEl: HTMLElement;

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  private animating = false;
  private animationStartTime = 0;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.canvas = container.querySelector('#threes-board') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.scoreEl = container.querySelector('#threes-score')!;
    this.highScoreEl = container.querySelector('#threes-highscore')!;
    this.statusEl = container.querySelector('#threes-status')!;
    this.nextTileEl = container.querySelector('#threes-next')!;

    // Buttons
    container.querySelector('#threes-reset')?.addEventListener('click', () => this.reset());

    // Touch controls
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Mobile buttons
    container.querySelector('#threes-up')?.addEventListener('click', () => this.move('up'));
    container.querySelector('#threes-down')?.addEventListener('click', () => this.move('down'));
    container.querySelector('#threes-left')?.addEventListener('click', () => this.move('left'));
    container.querySelector('#threes-right')?.addEventListener('click', () => this.move('right'));

    this.loadHighScore();
    this.setupKeyboard();
    this.initializeGrid();
    this.render();
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('threes-highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore(): void {
    localStorage.setItem('threes-highscore', this.highScore.toString());
  }

  private setupKeyboard(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.gameOver || this.animating) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.move('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.move('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.move('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.move('right');
          break;
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private handleTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.gameOver || this.animating) return;

    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) {
        this.move(dx > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(dy) > minSwipe) {
        this.move(dy > 0 ? 'down' : 'up');
      }
    }
  }

  private createTile(row: number, col: number, value: number, isNew = false): AnimatedTile {
    const x = gridToPixel(col);
    const y = gridToPixel(row);
    return {
      id: generateTileId(),
      value,
      row,
      col,
      displayX: x,
      displayY: y,
      targetX: x,
      targetY: y,
      scale: isNew ? 0 : 1,
      targetScale: 1,
      opacity: isNew ? 0 : 1,
      merged: false,
      isNew,
    };
  }

  private initializeGrid(): void {
    tileIdCounter = 0;
    this.tiles = [];
    this.gameOver = false;
    this.nextTile = getRandomValue();

    const positions: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        positions.push([r, c]);
      }
    }

    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Pick 9 initial tiles
    for (let i = 0; i < 9; i++) {
      const [row, col] = positions[i];
      this.tiles.push(this.createTile(row, col, getRandomValue()));
    }

    this.updateScore();
  }

  private getEmptyPositions(direction: Direction): [number, number][] {
    const occupied = new Set(this.tiles.map(t => `${t.row},${t.col}`));
    const empty: [number, number][] = [];

    if (direction === 'up') {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!occupied.has(`${GRID_SIZE - 1},${c}`)) {
          empty.push([GRID_SIZE - 1, c]);
        }
      }
    } else if (direction === 'down') {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!occupied.has(`0,${c}`)) {
          empty.push([0, c]);
        }
      }
    } else if (direction === 'left') {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!occupied.has(`${r},${GRID_SIZE - 1}`)) {
          empty.push([r, GRID_SIZE - 1]);
        }
      }
    } else if (direction === 'right') {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!occupied.has(`${r},0`)) {
          empty.push([r, 0]);
        }
      }
    }

    return empty;
  }

  private move(direction: Direction): void {
    if (this.gameOver || this.animating) return;

    const { newTiles, moved, mergedIds } = this.moveTiles(direction);

    if (!moved) return;

    // Update tiles with new positions and animation targets
    this.tiles = newTiles.map(t => {
      const targetX = gridToPixel(t.col);
      const targetY = gridToPixel(t.row);
      const wasMerged = mergedIds.has(t.id);
      return {
        ...t,
        targetX,
        targetY,
        targetScale: wasMerged ? MERGE_POP_SCALE : 1,
        merged: wasMerged,
      };
    });

    // Add new tile from the opposite edge
    const emptyPositions = this.getEmptyPositions(direction);
    if (emptyPositions.length > 0) {
      const [row, col] = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
      const newTile = this.createTile(row, col, this.nextTile, true);
      
      // Set slide-in start position based on direction
      if (direction === 'up') newTile.displayY = gridToPixel(GRID_SIZE);
      else if (direction === 'down') newTile.displayY = gridToPixel(-1);
      else if (direction === 'left') newTile.displayX = gridToPixel(GRID_SIZE);
      else if (direction === 'right') newTile.displayX = gridToPixel(-1);
      
      this.tiles.push(newTile);
      this.nextTile = getRandomValue();
    }

    // Start animation
    this.animating = true;
    this.animationStartTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    const elapsed = performance.now() - this.animationStartTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const eased = easeOutQuart(progress);

    // Update tile positions
    for (const tile of this.tiles) {
      // Position animation
      tile.displayX = tile.displayX + (tile.targetX - tile.displayX) * eased;
      tile.displayY = tile.displayY + (tile.targetY - tile.displayY) * eased;
      
      // Scale animation for merged tiles
      if (tile.merged) {
        if (progress < 0.5) {
          tile.scale = 1 + (MERGE_POP_SCALE - 1) * easeOutBack(progress * 2);
        } else {
          tile.scale = MERGE_POP_SCALE - (MERGE_POP_SCALE - 1) * ((progress - 0.5) * 2);
        }
      }
      
      // New tile fade + scale in
      if (tile.isNew) {
        tile.opacity = eased;
        tile.scale = eased;
      }
    }

    this.render();

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      // Animation complete
      this.animating = false;
      
      // Finalize tile states
      for (const tile of this.tiles) {
        tile.displayX = tile.targetX;
        tile.displayY = tile.targetY;
        tile.scale = 1;
        tile.opacity = 1;
        tile.merged = false;
        tile.isNew = false;
      }

      this.updateScore();

      if (!this.canMove()) {
        this.gameOver = true;
        this.statusEl.textContent = 'GAME OVER';
        this.statusEl.className = 'text-red-500 font-bold text-lg';
      }

      this.render();
    }
  };

  private moveTiles(direction: Direction): { newTiles: AnimatedTile[]; moved: boolean; mergedIds: Set<number> } {
    let moved = false;
    const mergedIds = new Set<number>();
    const newTiles = this.tiles.map(t => ({ ...t }));

    const processLine = (line: AnimatedTile[], reverse: boolean): AnimatedTile[] => {
      if (reverse) line = [...line].reverse();

      const result: AnimatedTile[] = [];
      let i = 0;

      while (i < line.length) {
        const current = line[i];

        if (result.length === 0) {
          result.push(current);
          i++;
          continue;
        }

        const last = result[result.length - 1];

        if (canMerge(last.value, current.value)) {
          last.value = mergeValue(last.value, current.value);
          mergedIds.add(last.id);
          moved = true;
          i++;
        } else {
          result.push(current);
          i++;
        }
      }

      if (reverse) result.reverse();
      return result;
    };

    if (direction === 'up' || direction === 'down') {
      for (let c = 0; c < GRID_SIZE; c++) {
        let column = newTiles.filter(t => t.col === c).sort((a, b) => a.row - b.row);
        column = processLine(column, direction === 'down');

        if (direction === 'up') {
          column.forEach((t, idx) => {
            if (t.row !== idx) moved = true;
            t.row = idx;
          });
        } else {
          column.forEach((t, idx) => {
            const newRow = GRID_SIZE - column.length + idx;
            if (t.row !== newRow) moved = true;
            t.row = newRow;
          });
        }
      }
    } else {
      for (let r = 0; r < GRID_SIZE; r++) {
        let row = newTiles.filter(t => t.row === r).sort((a, b) => a.col - b.col);
        row = processLine(row, direction === 'right');

        if (direction === 'left') {
          row.forEach((t, idx) => {
            if (t.col !== idx) moved = true;
            t.col = idx;
          });
        } else {
          row.forEach((t, idx) => {
            const newCol = GRID_SIZE - row.length + idx;
            if (t.col !== newCol) moved = true;
            t.col = newCol;
          });
        }
      }
    }

    // Remove duplicates at same position
    const finalTiles: AnimatedTile[] = [];
    const seen = new Set<string>();

    for (const t of newTiles) {
      const key = `${t.row},${t.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        finalTiles.push(t);
      }
    }

    return { newTiles: finalTiles, moved, mergedIds };
  }

  private canMove(): boolean {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    for (const dir of directions) {
      const { moved } = this.moveTiles(dir);
      if (moved) return true;
    }
    return false;
  }

  private updateScore(): void {
    this.score = calculateScore(this.tiles);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.scoreEl.textContent = this.score.toString();
    this.highScoreEl.textContent = this.highScore.toString();
    this.updateNextTilePreview();
  }

  private updateNextTilePreview(): void {
    const colors = TILE_COLORS[this.nextTile] || { bg: '#ffffff', text: '#27272a' };
    this.nextTileEl.style.backgroundColor = colors.bg;
    this.nextTileEl.style.color = colors.text;
    this.nextTileEl.textContent = this.nextTile.toString();
  }

  private render(): void {
    const canvasSize = GRID_SIZE * (CELL_SIZE + CELL_GAP) + CELL_GAP;
    
    // Clear canvas
    this.ctx.fillStyle = '#a1a1aa';
    this.ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = CELL_GAP + c * (CELL_SIZE + CELL_GAP);
        const y = CELL_GAP + r * (CELL_SIZE + CELL_GAP);
        this.ctx.fillStyle = '#d4d4d8';
        this.roundRect(x, y, CELL_SIZE, CELL_SIZE, 8);
      }
    }

    // Draw tiles (sorted by merge state so merged tiles render on top)
    const sortedTiles = [...this.tiles].sort((a, b) => {
      if (a.merged && !b.merged) return 1;
      if (!a.merged && b.merged) return -1;
      return 0;
    });

    for (const tile of sortedTiles) {
      this.drawTile(tile);
    }

    // Game over overlay
    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(24, 24, 27, 0.85)';
      this.ctx.fillRect(0, 0, canvasSize, canvasSize);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 28px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('Game Over!', canvasSize / 2, canvasSize / 2 - 20);

      this.ctx.font = '18px Inter, sans-serif';
      this.ctx.fillStyle = '#a1a1aa';
      this.ctx.fillText(`Final Score: ${this.score}`, canvasSize / 2, canvasSize / 2 + 15);
    }
  }

  private drawTile(tile: AnimatedTile): void {
    const colors = TILE_COLORS[tile.value] || { bg: '#ffffff', text: '#27272a' };
    const centerX = tile.displayX + CELL_SIZE / 2;
    const centerY = tile.displayY + CELL_SIZE / 2;
    const scaledSize = CELL_SIZE * tile.scale;
    const x = centerX - scaledSize / 2;
    const y = centerY - scaledSize / 2;

    this.ctx.save();
    this.ctx.globalAlpha = tile.opacity;

    // Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetY = 3;

    // Tile background
    this.ctx.fillStyle = colors.bg;
    this.roundRect(x, y, scaledSize, scaledSize, 8 * tile.scale);

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // Tile value
    const fontSize = tile.value >= 1000 ? 20 : tile.value >= 100 ? 24 : 28;
    this.ctx.fillStyle = colors.text;
    this.ctx.font = `bold ${fontSize * tile.scale}px Inter, system-ui, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(tile.value.toString(), centerX, centerY);

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  reset(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.animating = false;
    this.initializeGrid();
    this.statusEl.textContent = '';
    this.statusEl.className = '';
    this.render();
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}

// Global instance tracker for cleanup
let currentGame: ThreesGame | null = null;

export function initThrees(container: HTMLElement): void {
  if (currentGame) {
    currentGame.destroy();
  }
  currentGame = new ThreesGame(container);
}

export function destroyThrees(): void {
  if (currentGame) {
    currentGame.destroy();
    currentGame = null;
  }
}
