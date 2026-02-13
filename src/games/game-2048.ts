// 2048 Game for pietrOS
// Vanilla TypeScript implementation using Canvas API

import { playClick, playNotification, isSoundEnabled } from '../audio';

const GRID_SIZE = 4;
const CELL_SIZE = 100;
const GAP = 15;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * GAP;
const LERP_SPEED = 0.25; // fraction per frame
const MERGE_SCALE_START = 1.2;
const MERGE_SCALE_DECAY = 0.08;

interface Tile {
  id: number;
  value: number;
  x: number; // grid coordinates (0-3)
  y: number;
  renderX: number; // visual position (grid units, for lerp)
  renderY: number;
  mergeScale: number; // pop animation (1.0 = normal)
  mergedFrom: Tile[] | null;
}

interface HistoryEntry {
  tiles: string; // JSON snapshot
  score: number;
}

export class Game2048 {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private uiLayer: HTMLElement;

  private board: (Tile | null)[][];
  private score: number;
  private bestScore: number;
  private gameOver: boolean;
  private won: boolean;
  private animationId: number | null = null;
  private history: HistoryEntry | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('2048-best') || '0');
    this.gameOver = false;
    this.won = false;
    this.board = this.createEmptyBoard();

    // Create Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = BOARD_SIZE;
    this.canvas.height = BOARD_SIZE;
    this.canvas.className = "w-full h-auto touch-none rounded-lg shadow-lg";
    this.ctx = this.canvas.getContext('2d')!;

    // UI Layer
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = "absolute inset-0 flex items-center justify-center p-4 pointer-events-none";

    // Layout
    const wrapper = document.createElement('div');
    wrapper.className = "relative w-full max-w-md mx-auto aspect-square bg-[#bbada0] rounded-lg overflow-hidden";
    wrapper.appendChild(this.canvas);
    wrapper.appendChild(this.uiLayer);

    // Header / Score
    const header = document.createElement('div');
    header.className = "flex justify-between items-center mb-4 w-full max-w-md mx-auto";
    header.innerHTML = `
      <div class="flex gap-4">
        <div class="bg-[#bbada0] p-2 rounded text-center min-w-[80px]">
          <div class="text-[#eee4da] text-xs font-bold uppercase">Score</div>
          <div id="score-val" class="text-white font-bold text-lg">0</div>
        </div>
        <div class="bg-[#bbada0] p-2 rounded text-center min-w-[80px]">
          <div class="text-[#eee4da] text-xs font-bold uppercase">Best</div>
          <div id="best-val" class="text-white font-bold text-lg">${this.bestScore}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button id="undo-btn" class="bg-[#8f7a66] text-white px-3 py-2 rounded font-bold hover:bg-[#9c8470] text-sm">Undo</button>
        <button id="restart-btn" class="bg-[#8f7a66] text-white px-4 py-2 rounded font-bold hover:bg-[#9c8470]">New Game</button>
      </div>
    `;

    this.container.innerHTML = '';
    this.container.appendChild(header);
    this.container.appendChild(wrapper);

    // Hint
    const hint = document.createElement('p');
    hint.className = "text-center mt-2 text-[#776e65] text-xs opacity-70";
    hint.textContent = "Arrows / WASD to move · Ctrl+Z or U to undo";
    this.container.appendChild(hint);

    // Bind events
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);

    header.querySelector('#restart-btn')?.addEventListener('click', () => this.restart());
    header.querySelector('#undo-btn')?.addEventListener('click', () => this.undo());

    // Start
    this.restart();
    this.renderLoop();
  }

  private createEmptyBoard(): (Tile | null)[][] {
    return Array(4).fill(null).map(() => Array(4).fill(null));
  }

  private restart(): void {
    this.history = null;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.gameOver = false;
    this.won = false;
    this.uiLayer.innerHTML = '';
    this.uiLayer.style.pointerEvents = 'none';

    this.addRandomTile();
    this.addRandomTile();
    this.updateScore();
    this.draw();
  }

  private addRandomTile(): void {
    const emptyCells: {x: number, y: number}[] = [];
    for(let x=0; x<4; x++) {
      for(let y=0; y<4; y++) {
        if(!this.board[x][y]) emptyCells.push({x, y});
      }
    }

    if(emptyCells.length > 0) {
      const {x, y} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.board[x][y] = {
        id: Date.now() + Math.random(),
        value: Math.random() < 0.9 ? 2 : 4,
        x,
        y,
        renderX: x,
        renderY: y,
        mergeScale: 1,
        mergedFrom: null
      };
    }
  }

  private snapshotBoard(): HistoryEntry {
    // Deep clone tiles (exclude renderX/Y for snapshot, we'll restore grid positions)
    const snapshot = this.board.map(col => col.map(tile => {
      if (!tile) return null;
      return { id: tile.id, value: tile.value, x: tile.x, y: tile.y };
    }));
    return { tiles: JSON.stringify(snapshot), score: this.score };
  }

  private undo(): void {
    if (!this.history) return;
    const snap = JSON.parse(this.history.tiles) as (({id: number, value: number, x: number, y: number} | null)[])[];
    this.board = snap.map(col => col.map(t => {
      if (!t) return null;
      return { ...t, renderX: t.x, renderY: t.y, mergeScale: 1, mergedFrom: null };
    }));
    this.score = this.history.score;
    this.history = null;
    this.gameOver = false;
    this.won = false;
    this.uiLayer.innerHTML = '';
    this.uiLayer.style.pointerEvents = 'none';
    this.updateScore();
  }

  private renderLoop(): void {
    this.draw();
    this.animationId = requestAnimationFrame(() => this.renderLoop());
  }

  private draw(): void {
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = "#bbada0";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw empty grid
    for(let x=0; x<4; x++) {
      for(let y=0; y<4; y++) {
        this.drawTileBackground(x, y);
      }
    }

    // Lerp all tiles toward target and draw
    for(let x=0; x<4; x++) {
      for(let y=0; y<4; y++) {
        const tile = this.board[x][y];
        if(tile) {
          // Lerp visual position
          tile.renderX += (tile.x - tile.renderX) * (1 - Math.pow(1 - LERP_SPEED, 1));
          tile.renderY += (tile.y - tile.renderY) * (1 - Math.pow(1 - LERP_SPEED, 1));
          // Lerp merge scale back to 1
          if (tile.mergeScale > 1) {
            tile.mergeScale -= MERGE_SCALE_DECAY;
            if (tile.mergeScale < 1) tile.mergeScale = 1;
          }
          this.drawTile(tile);
        }
      }
    }
  }

  private drawTileBackground(x: number, y: number): void {
    const xPos = GAP + x * (CELL_SIZE + GAP);
    const yPos = GAP + y * (CELL_SIZE + GAP);

    this.ctx.fillStyle = "rgba(238, 228, 218, 0.35)";
    this.roundRect(xPos, yPos, CELL_SIZE, CELL_SIZE, 6);
    this.ctx.fill();
  }

  private drawTile(tile: Tile): void {
    const xPos = GAP + tile.renderX * (CELL_SIZE + GAP);
    const yPos = GAP + tile.renderY * (CELL_SIZE + GAP);

    const scale = tile.mergeScale;
    const cx = xPos + CELL_SIZE / 2;
    const cy = yPos + CELL_SIZE / 2;
    const w = CELL_SIZE * scale;
    const h = CELL_SIZE * scale;

    this.ctx.fillStyle = this.getTileColor(tile.value);
    this.roundRect(cx - w/2, cy - h/2, w, h, 6);
    this.ctx.fill();

    this.ctx.fillStyle = tile.value <= 4 ? "#776e65" : "#f9f6f2";
    this.ctx.font = `bold ${tile.value < 100 ? 55 : tile.value < 1000 ? 45 : 35}px "Clear Sans", "Helvetica Neue", Arial, sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(tile.value.toString(), cx, cy);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  private getTileColor(value: number): string {
    const colors: {[key: number]: string} = {
      2: "#eee4da",
      4: "#ede0c8",
      8: "#f2b179",
      16: "#f59563",
      32: "#f67c5f",
      64: "#f65e3b",
      128: "#edcf72",
      256: "#edcc61",
      512: "#edc850",
      1024: "#edc53f",
      2048: "#edc22e"
    };
    return colors[value] || "#3c3a32";
  }

  private move(direction: {x: number, y: number}): void {
    if(this.gameOver) return;

    // Snapshot for undo before moving
    this.history = this.snapshotBoard();

    const vector = direction;
    const traversals = this.buildTraversals(vector);
    let moved = false;
    let merged = false;

    // Reset merge flags
    this.prepareTiles();

    traversals.x.forEach(x => {
      traversals.y.forEach(y => {
        const cell = {x, y};
        const tile = this.board[x][y];

        if(tile) {
          const positions = this.findFarthestPosition(cell, vector);
          const next = positions.next;

          // Check merge
          const nextTile = this.board[next.x]?.[next.y];
          if(nextTile && nextTile.value === tile.value && !nextTile.mergedFrom) {
             const mergedTile: Tile = {
                id: Date.now() + Math.random(),
                value: tile.value * 2,
                x: next.x,
                y: next.y,
                renderX: tile.renderX, // start from the source position visually
                renderY: tile.renderY,
                mergeScale: MERGE_SCALE_START,
                mergedFrom: [tile, nextTile]
             };

             this.board[x][y] = null;
             this.board[next.x][next.y] = mergedTile;

             this.score += mergedTile.value;
             if(mergedTile.value === 2048) this.won = true;
             moved = true;
             merged = true;
          } else {
             this.moveTile(tile, positions.farthest);
             if(x !== positions.farthest.x || y !== positions.farthest.y) {
               moved = true;
             }
          }
        }
      });
    });

    if(moved) {
      if (isSoundEnabled()) {
        if (merged) playClick();
      }
      this.addRandomTile();
      this.updateScore();

      if(!this.movesAvailable()) {
        this.gameOver = true;
        setTimeout(() => this.showGameOver(false), 400);
        if (isSoundEnabled()) playNotification();
      } else if (this.won && !this.uiLayer.querySelector('.won-message')) {
        setTimeout(() => this.showGameOver(true), 400);
        if (isSoundEnabled()) playNotification();
      }
    } else {
      // No move happened — discard snapshot
      this.history = null;
    }
  }

  private prepareTiles() {
    for(let x=0; x<4; x++) {
      for(let y=0; y<4; y++) {
         if(this.board[x][y]) {
           this.board[x][y]!.mergedFrom = null;
         }
      }
    }
  }

  private moveTile(tile: Tile, cell: {x: number, y: number}) {
    this.board[tile.x][tile.y] = null;
    this.board[cell.x][cell.y] = tile;
    tile.x = cell.x;
    tile.y = cell.y;
    // renderX/Y stay at old position and lerp toward new x/y
  }

  private buildTraversals(vector: {x: number, y: number}) {
    const traversals: {x: number[], y: number[]} = { x: [], y: [] };

    for (let pos = 0; pos < 4; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  }

  private findFarthestPosition(cell: {x: number, y: number}, vector: {x: number, y: number}) {
    let previous;

    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.withinBounds(cell) && !this.board[cell.x][cell.y]);

    return {
      farthest: previous,
      next: cell
    };
  }

  private withinBounds(position: {x: number, y: number}) {
    return position.x >= 0 && position.x < 4 && position.y >= 0 && position.y < 4;
  }

  private movesAvailable() {
    return this.cellsAvailable() || this.tileMatchesAvailable();
  }

  private cellsAvailable() {
    for(let x=0; x<4; x++) {
      for(let y=0; y<4; y++) {
        if(!this.board[x][y]) return true;
      }
    }
    return false;
  }

  private tileMatchesAvailable() {
    for(let x=0; x<4; x++) {
      for(let y=0; y<4; y++) {
        const tile = this.board[x][y];
        if(tile) {
           for(let direction of [{x:0, y:-1}, {x:1, y:0}, {x:0, y:1}, {x:-1, y:0}]) {
             const other = this.board[x + direction.x]?.[y + direction.y];
             if(other && other.value === tile.value) return true;
           }
        }
      }
    }
    return false;
  }

  private updateScore() {
    const scoreVal = document.getElementById('score-val');
    const bestVal = document.getElementById('best-val');

    if(scoreVal) scoreVal.textContent = this.score.toString();

    if(this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('2048-best', this.bestScore.toString());
    }

    if(bestVal) bestVal.textContent = this.bestScore.toString();
  }

  private showGameOver(won: boolean) {
    this.uiLayer.innerHTML = '';
    const message = document.createElement('div');
    message.className = `bg-white/90 backdrop-blur rounded-lg p-6 shadow-lg text-center animate-in fade-in zoom-in ${won ? 'won-message' : ''}`;
    message.innerHTML = `
      <h2 class="text-3xl font-bold text-[#776e65] mb-2">${won ? 'You Win!' : 'Game Over!'}</h2>
      <p class="text-[#776e65] mb-6">${won ? '2048 tile reached!' : 'No more moves!'}</p>
      <button id="try-again-btn" class="bg-[#8f7a66] text-white px-6 py-2 rounded font-bold hover:bg-[#9c8470]">Try Again</button>
    `;

    if(won) {
       const keepBtn = document.createElement('button');
       keepBtn.className = "bg-transparent text-[#776e65] underline text-sm mt-4 block mx-auto";
       keepBtn.textContent = "Keep Playing";
       keepBtn.onclick = () => {
         this.uiLayer.innerHTML = '';
         this.uiLayer.style.pointerEvents = 'none';
         this.won = false;
       };
       message.appendChild(keepBtn);
    }

    this.uiLayer.appendChild(message);
    this.uiLayer.style.pointerEvents = "auto";
    this.uiLayer.querySelector('#try-again-btn')?.addEventListener('click', () => this.restart());
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (document.activeElement !== document.body && !this.container.contains(document.activeElement)) return;

    // Undo
    if ((e.ctrlKey && e.key === 'z') || e.key === 'u' || e.key === 'U') {
      e.preventDefault();
      this.undo();
      return;
    }

    const map: {[key: string]: {x: number, y: number}} = {
      'ArrowUp': { x: 0, y: -1 },
      'ArrowRight': { x: 1, y: 0 },
      'ArrowDown': { x: 0, y: 1 },
      'ArrowLeft': { x: -1, y: 0 },
      'w': { x: 0, y: -1 },
      'd': { x: 1, y: 0 },
      's': { x: 0, y: 1 },
      'a': { x: -1, y: 0 }
    };

    const direction = map[e.key];
    if(direction) {
      e.preventDefault();
      this.move(direction);
    }
  }

  public destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

let activeGame: Game2048 | null = null;

export function initGame2048(container: HTMLElement): void {
  if (activeGame) activeGame.destroy();
  activeGame = new Game2048(container);
}

export function destroyGame2048(): void {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }
}
