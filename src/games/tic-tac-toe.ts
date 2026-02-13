// Tic-Tac-Toe Game for pietrOS
// Vanilla TypeScript implementation using Canvas API

import { playKeyTick, playNotification, isSoundEnabled } from '../audio';

type Player = "X" | "O" | null;
type GameMode = "human" | "ai";
type Difficulty = "easy" | "medium" | "hard";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 200;

export class TicTacToeGame {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private uiLayer: HTMLElement;

  private board: Player[];
  private currentPlayer: Player;
  private winner: Player | "tie" | null;
  private gameMode: GameMode;
  private difficulty: Difficulty;
  private scores: { X: number; O: number; ties: number };
  private isThinking: boolean;
  private themeColor: string;
  
  private animationId: number | null = null;
  private winLine: number[] | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.board = Array(9).fill(null);
    this.currentPlayer = "X";
    this.winner = null;
    this.gameMode = "ai";
    this.difficulty = (localStorage.getItem('ttt-difficulty') as Difficulty) || "hard";
    this.scores = { X: 0, O: 0, ties: 0 };
    this.isThinking = false;
    this.themeColor = "#ef4444"; // Default red theme

    // Create Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.className = "w-full h-auto cursor-pointer touch-none";
    this.ctx = this.canvas.getContext('2d')!;

    // Create UI Overlay Layer
    this.uiLayer = document.createElement('div');
    this.uiLayer.className = "absolute inset-0 flex items-center justify-center p-4 pointer-events-none";

    // Append to container
    const wrapper = document.createElement('div');
    wrapper.className = "relative w-full max-w-md mx-auto aspect-square bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden";
    wrapper.appendChild(this.canvas);
    wrapper.appendChild(this.uiLayer);
    
    // Stats container
    const stats = document.createElement('div');
    stats.id = "ttt-stats";
    stats.className = "mt-4 text-center text-gray-600 font-mono text-sm";
    
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    this.container.appendChild(stats);

    // Event Listeners
    this.handleClick = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this.handleClick);

    // Initial render
    this.showMenu();
    this.renderLoop();
  }

  private renderLoop(): void {
    this.draw();
    this.animationId = requestAnimationFrame(() => this.renderLoop());
  }

  private draw(): void {
    // Clear
    this.ctx.fillStyle = "#fafafa";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid Lines
    this.ctx.strokeStyle = "#e5e7eb"; // light gray
    this.ctx.lineWidth = 1;

    // Background Grid
    for (let i = 0; i <= this.canvas.width; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }
    for (let i = 0; i <= this.canvas.height; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }

    // Main Game Grid
    this.ctx.strokeStyle = "#171717";
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = "round";

    // Verticals
    this.ctx.beginPath(); this.ctx.moveTo(GRID_SIZE, 0); this.ctx.lineTo(GRID_SIZE, CANVAS_HEIGHT); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.moveTo(GRID_SIZE * 2, 0); this.ctx.lineTo(GRID_SIZE * 2, CANVAS_HEIGHT); this.ctx.stroke();

    // Horizontals
    this.ctx.beginPath(); this.ctx.moveTo(0, GRID_SIZE); this.ctx.lineTo(CANVAS_WIDTH, GRID_SIZE); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.moveTo(0, GRID_SIZE * 2); this.ctx.lineTo(CANVAS_WIDTH, GRID_SIZE * 2); this.ctx.stroke();

    // Draw Marks
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = col * GRID_SIZE + GRID_SIZE / 2;
      const y = row * GRID_SIZE + GRID_SIZE / 2;
      const player = this.board[i];

      if (player === "X") {
        this.ctx.strokeStyle = this.themeColor;
        this.ctx.lineWidth = 8;
        const size = 60;
        this.ctx.beginPath();
        this.ctx.moveTo(x - size, y - size);
        this.ctx.lineTo(x + size, y + size);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x + size, y - size);
        this.ctx.lineTo(x - size, y + size);
        this.ctx.stroke();
      } else if (player === "O") {
        this.ctx.strokeStyle = "#171717";
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 60, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    // Winning Line
    if (this.winLine) {
      const [a, , c] = this.winLine;
      const startX = (a % 3) * GRID_SIZE + GRID_SIZE / 2;
      const startY = Math.floor(a / 3) * GRID_SIZE + GRID_SIZE / 2;
      const endX = (c % 3) * GRID_SIZE + GRID_SIZE / 2;
      const endY = Math.floor(c / 3) * GRID_SIZE + GRID_SIZE / 2;

      this.ctx.strokeStyle = "#ef4444"; // Red for win
      this.ctx.lineWidth = 12;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  private updateStats(): void {
    const el = document.getElementById("ttt-stats");
    if (el) {
      if (this.winner) {
         el.textContent = "Game Over - Press Play Again";
      } else if (this.isThinking) {
        el.textContent = "AI is thinking...";
      } else {
        el.textContent = `Score - X: ${this.scores.X} | O: ${this.scores.O} | Ties: ${this.scores.ties}`;
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.winner || this.isThinking || this.uiLayer.children.length > 0) return;

    const useAI = this.gameMode === "ai";
    if (useAI && this.currentPlayer === "O") return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(x / GRID_SIZE);
    const row = Math.floor(y / GRID_SIZE);
    const index = row * 3 + col;

    if (index >= 0 && index < 9 && !this.board[index]) {
      this.makeMove(index);
    }
  }

  private makeMove(index: number): void {
    if (this.board[index]) return;

    this.board[index] = this.currentPlayer;
    if (isSoundEnabled()) playKeyTick();

    // Check win/tie
    const winInfo = this.checkWinner(this.board);
    if (winInfo.winner) {
      this.winLine = winInfo.line;
      this.winner = winInfo.winner;
      if (winInfo.winner === "X") this.scores.X++;
      else if (winInfo.winner === "O") this.scores.O++;
      else this.scores.ties++;

      if (isSoundEnabled()) playNotification();
      this.updateStats();
      setTimeout(() => this.showGameOver(winInfo.winner as string), 1000);
      return;
    }

    // Switch player
    this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
    this.updateStats();

    // AI Turn
    if (this.gameMode === "ai" && this.currentPlayer === "O") {
      this.isThinking = true;
      this.updateStats();
      setTimeout(() => {
        const bestMove = this.getBestMove(this.board);
        if (bestMove !== -1) {
          this.isThinking = false;
          this.makeMove(bestMove);
        }
      }, 500);
    }
  }

  // --- AI Logic (Minimax) ---
  
  private checkWinner(board: Player[]): { winner: Player | "tie" | null; line: number[] | null } {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diags
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }

    if (board.every(cell => cell !== null)) {
      return { winner: "tie", line: null };
    }

    return { winner: null, line: null };
  }

  private minimax(board: Player[], depth: number, isMaximizing: boolean): number {
    const { winner } = this.checkWinner(board);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (winner === "tie") return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = "O";
          const score = this.minimax(board, depth + 1, false);
          board[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = "X";
          const score = this.minimax(board, depth + 1, true);
          board[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  private getBestMove(board: Player[]): number {
    const empty = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
    if (empty.length === 0) return -1;

    // Easy: 80% random, 20% minimax
    // Medium: 50% random, 50% minimax
    // Hard: always minimax
    const randomChance = this.difficulty === 'easy' ? 0.8 : this.difficulty === 'medium' ? 0.5 : 0;
    if (Math.random() < randomChance) {
      return empty[Math.floor(Math.random() * empty.length)];
    }

    // First move optimization: take center if available (only on Hard)
    if (this.difficulty === 'hard') {
      if (board.filter(c => c !== null).length === 0 || (board.filter(c => c !== null).length === 1 && !board[4])) {
        if (!board[4]) return 4;
      }
    }

    let bestScore = -Infinity;
    let bestMove = empty[0];

    for (const i of empty) {
      board[i] = "O";
      const score = this.minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
    return bestMove;
  }

  // --- UI Methods ---

  private showMenu(): void {
    this.uiLayer.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = "bg-white/95 backdrop-blur rounded-lg p-6 shadow-lg border border-gray-200 text-center pointer-events-auto w-64 animate-in fade-in zoom-in duration-300";
    menu.innerHTML = `
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Tic Tac Toe</h1>
      <p class="text-sm text-gray-500 mb-4">Challenge the AI</p>
      <div class="mb-4">
        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Difficulty</p>
        <div class="flex gap-1 justify-center">
          <button data-diff="easy" class="ttt-diff-btn flex-1 py-1 text-xs rounded font-medium border transition-colors">Easy</button>
          <button data-diff="medium" class="ttt-diff-btn flex-1 py-1 text-xs rounded font-medium border transition-colors">Medium</button>
          <button data-diff="hard" class="ttt-diff-btn flex-1 py-1 text-xs rounded font-medium border transition-colors">Hard</button>
        </div>
      </div>
      <div class="space-y-3">
        <button id="btn-ai" class="w-full py-2 px-4 bg-her-red text-white rounded font-medium hover:bg-red-600 transition-colors">Play vs AI</button>
        <button id="btn-human" class="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded font-medium hover:bg-gray-200 transition-colors">Play vs Human</button>
      </div>
    `;
    this.uiLayer.appendChild(menu);

    // Highlight current difficulty
    const updateDiffBtns = () => {
      menu.querySelectorAll<HTMLElement>('.ttt-diff-btn').forEach(btn => {
        const active = btn.dataset.diff === this.difficulty;
        btn.className = `ttt-diff-btn flex-1 py-1 text-xs rounded font-medium border transition-colors ${active ? 'bg-her-red text-white border-her-red' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`;
      });
    };
    updateDiffBtns();

    menu.querySelectorAll<HTMLElement>('.ttt-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.difficulty = btn.dataset.diff as Difficulty;
        localStorage.setItem('ttt-difficulty', this.difficulty);
        updateDiffBtns();
      });
    });

    menu.querySelector('#btn-ai')?.addEventListener('click', () => this.startGame("ai"));
    menu.querySelector('#btn-human')?.addEventListener('click', () => this.startGame("human"));
  }

  private showGameOver(result: string): void {
    this.uiLayer.innerHTML = '';
    
    let title = "";
    if (result === "tie") title = "It's a Tie!";
    else if (this.gameMode === "ai") title = result === "O" ? "AI Wins!" : "You Win!";
    else title = `${result} Wins!`;

    const card = document.createElement('div');
    card.className = "bg-white/95 backdrop-blur rounded-lg p-6 shadow-lg border border-gray-200 text-center pointer-events-auto w-64 animate-in fade-in zoom-in duration-300";
    card.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-2">${title}</h2>
      <div class="flex justify-center gap-4 text-sm text-gray-600 mb-6 font-mono">
        <div>X: ${this.scores.X}</div>
        <div>Ties: ${this.scores.ties}</div>
        <div>O: ${this.scores.O}</div>
      </div>
      <div class="flex gap-2">
        <button id="btn-again" class="flex-1 py-2 px-3 bg-her-red text-white rounded text-sm hover:bg-red-600">Play Again</button>
        <button id="btn-menu" class="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">Menu</button>
      </div>
    `;
    this.uiLayer.appendChild(card);

    card.querySelector('#btn-again')?.addEventListener('click', () => this.resetGame());
    card.querySelector('#btn-menu')?.addEventListener('click', () => {
      this.winner = null;
      this.winLine = null;
      this.uiLayer.innerHTML = '';
      this.showMenu();
    });
  }

  private startGame(mode: GameMode): void {
    this.gameMode = mode;
    this.uiLayer.innerHTML = ''; // Clear menu
    this.resetGame();
  }

  private resetGame(): void {
    this.board = Array(9).fill(null);
    this.currentPlayer = "X";
    this.winner = null;
    this.winLine = null;
    this.isThinking = false;
    this.uiLayer.innerHTML = '';
    this.updateStats();
  }

  public destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('click', this.handleClick);
  }
}

// Global instance management
let activeGame: TicTacToeGame | null = null;

export function initTicTacToe(container: HTMLElement): void {
  if (activeGame) activeGame.destroy();
  activeGame = new TicTacToeGame(container);
}

export function destroyTicTacToe(): void {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }
}
