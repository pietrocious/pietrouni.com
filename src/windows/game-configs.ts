import { APP_REGISTRY } from '../app-registry';
import type { WindowConfig } from '../types';

const tictactoeIcon = APP_REGISTRY.tictactoe.icon;
const snakeIcon = APP_REGISTRY.snake.icon;
const doomIcon = APP_REGISTRY.doom.icon;
const tetrisIcon = APP_REGISTRY.tetris.icon;
const threesIcon = APP_REGISTRY.threes.icon;

let tttModule: typeof import('../games/tic-tac-toe') | null = null;
let snakeModule: typeof import('../games/snake') | null = null;
let doomModule: typeof import('../games/doom') | null = null;
let gymRoutineModule: typeof import('../apps/gym-routine') | null = null;
let tetrisModule: typeof import('../games/tetris') | null = null;
let threesModule: typeof import('../games/threes') | null = null;

export const gameWindowConfigs: Record<string, WindowConfig> = {
          tictactoe: {
            title: "Tic Tac Toe",
            content: `
                    <div id="ttt-container" class="h-full flex flex-col items-center justify-center bg-gray-50 select-none p-4 w-full">
                        <!-- Canvas injected by TS -->
                    </div>
                `,
            width: 560,
            height: 680,
            onOpen: () => {
              // slight delay to ensure DOM is ready
              setTimeout(async () => {
                const container = document.getElementById("ttt-container");
                if (!container) return;
                tttModule = await import('../games/tic-tac-toe');
                if (container.isConnected) tttModule.initTicTacToe(container);
              }, 50);
            },
            onClose: () => {
              tttModule?.destroyTicTacToe();
            },
          },

          snake: {
            title: "Snake",
            content: `
                    <div id="snake-container" class="h-full flex flex-col items-center justify-center bg-[#578a34] select-none p-4 w-full">
                        <!-- Canvas injected by TS -->
                    </div>
                `,
            width: 560,
            height: 680,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById("snake-container");
                if (!container) return;
                snakeModule = await import('../games/snake');
                if (container.isConnected) snakeModule.initSnake(container);
              }, 50);
            },
            onClose: () => {
              snakeModule?.destroySnake();
            },
          },

          doom: {
            title: "DOOM",
            content: `
                    <div id="doom-container" class="h-full w-full bg-black"></div>
                `,
            width: 960,
            height: 720,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById("doom-container");
                if (!container) return;
                doomModule = await import('../games/doom');
                if (container.isConnected) doomModule.initDoom(container);
              }, 100);
            },
            onClose: () => {
              doomModule?.destroyDoom();
            },
          },

          gymroutine: {
            title: "Gym Routine",
            content: `
                    <div id="gym-routine-container" class="h-full w-full bg-her-paper dark:bg-her-darker"></div>
                `,
            width: 1100,
            height: 820,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById("gym-routine-container");
                if (!container) return;
                gymRoutineModule = await import('../apps/gym-routine');
                if (container.isConnected) gymRoutineModule.initGymRoutine(container);
              }, 50);
            },
            onClose: () => {
              gymRoutineModule?.destroyGymRoutine();
            },
          },

          tetris: {
            title: "Tetris",
            content: `
                    <div id="tetris-app" class="h-full flex bg-[#1e1e2e] text-white select-none font-ui p-4 gap-4">
                        <!-- Left Panel: Hold & Stats -->
                        <div class="flex flex-col gap-3 w-24">
                            <div class="bg-[#313244] rounded-lg p-2">
                                <div class="text-[10px] uppercase font-bold opacity-60 mb-2 text-center">Hold</div>
                                <canvas id="tetris-hold" width="80" height="60" class="w-full rounded"></canvas>
                            </div>
                            <div class="bg-[#313244] rounded-lg p-2 space-y-2 text-xs">
                                <div><span class="opacity-60">High:</span> <span id="tetris-highscore" class="font-bold">0</span></div>
                                <div><span class="opacity-60">Level:</span> <span id="tetris-level" class="font-bold">1</span></div>
                                <div><span class="opacity-60">Score:</span> <span id="tetris-score" class="font-bold">0</span></div>
                                <div><span class="opacity-60">Lines:</span> <span id="tetris-lines" class="font-bold">0</span></div>
                            </div>
                        </div>
                        
                        <!-- Center: Game Board -->
                        <div class="flex flex-col items-center">
                            <canvas id="tetris-board" width="280" height="560" class="rounded-lg border border-[#313244]"></canvas>
                            <div id="tetris-status" class="h-8 flex items-center justify-center mt-2"></div>
                        </div>
                        
                        <!-- Right Panel: Next & Controls -->
                        <div class="flex flex-col gap-3 w-24">
                            <div class="bg-[#313244] rounded-lg p-2">
                                <div class="text-[10px] uppercase font-bold opacity-60 mb-2 text-center">Next</div>
                                <canvas id="tetris-next" width="80" height="180" class="w-full rounded"></canvas>
                            </div>
                            <div class="flex flex-col gap-2">
                                <button id="tetris-pause" class="w-full py-1.5 bg-[#313244] hover:bg-[#45475a] rounded text-xs font-bold transition-colors">Pause</button>
                                <button id="tetris-reset" class="w-full py-1.5 bg-[#313244] hover:bg-[#45475a] rounded text-xs font-bold transition-colors">Reset</button>
                            </div>
                            <div class="bg-[#313244] rounded-lg p-2 text-[9px] opacity-70 space-y-1">
                                <div>← → Move</div>
                                <div>↑ Rotate</div>
                                <div>↓ Soft drop</div>
                                <div>Space Hard drop</div>
                                <div>H Hold</div>
                                <div>P Pause</div>
                            </div>
                        </div>
                    </div>
                `,
            width: 520,
            height: 640,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById('tetris-app');
                if (!container) return;
                tetrisModule = await import('../games/tetris');
                if (container.isConnected) tetrisModule.initTetris(container);
              }, 100);
            },
            onClose: () => {
              tetrisModule?.destroyTetris();
            },
          },
          threes: {
            title: "Threes!",
            content: `
                    <div id="threes-app" class="h-full flex flex-col items-center justify-center bg-[#faf8ef] select-none p-4 w-full">
                        <!-- Header / UI -->
                        <div class="flex justify-between items-center mb-4 w-full max-w-md mx-auto">
                            <div class="flex gap-4">
                                <div class="bg-[#bbada0] p-2 rounded text-center min-w-[70px]">
                                    <div class="text-[#eee4da] text-[10px] font-bold uppercase">Next</div>
                                    <div id="threes-next" class="text-white font-bold text-lg leading-tight h-7 flex items-center justify-center">1</div>
                                    <div id="threes-next-hint" class="text-[9px] text-[#eee4da] opacity-70 font-mono">+2→3</div>
                                </div>
                                <div class="bg-[#bbada0] p-2 rounded text-center min-w-[80px]">
                                    <div class="text-[#eee4da] text-[10px] font-bold uppercase">Score</div>
                                    <div id="threes-score" class="text-white font-bold text-lg">0</div>
                                </div>
                                <div class="bg-[#bbada0] p-2 rounded text-center min-w-[80px]">
                                    <div class="text-[#eee4da] text-[10px] font-bold uppercase">Best</div>
                                    <div id="threes-highscore" class="text-white font-bold text-lg">0</div>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button id="threes-undo" class="bg-[#8f7a66] text-white px-3 py-2 rounded font-bold hover:bg-[#9c8470] text-sm shadow-sm transition-colors">Undo</button>
                                <button id="threes-reset" class="bg-[#8f7a66] text-white px-3 py-2 rounded font-bold hover:bg-[#9c8470] text-sm shadow-sm transition-colors">New Game</button>
                            </div>
                        </div>

                        <!-- Game Board -->
                        <div class="relative w-full max-w-md mx-auto aspect-square bg-[#bbada0] rounded-lg p-2 shadow-inner">
                            <canvas id="threes-board" width="410" height="410" class="w-full h-full rounded-md shadow-lg"></canvas>
                        </div>
                        
                        <div id="threes-status" class="h-6 flex items-center justify-center mt-2 font-bold uppercase tracking-widest text-[#776e65]"></div>

                        <!-- Controls Help -->
                        <div class="mt-2 text-center text-[#776e65] text-xs opacity-70">
                            <p>Arrows / WASD to move · Ctrl+Z or U to undo</p>
                        </div>
                    </div>
                `,
            width: 580,
            height: 720,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById('threes-app');
                if (!container) return;
                threesModule = await import('../games/threes');
                if (container.isConnected) threesModule.initThrees(container);
              }, 100);
            },
            onClose: () => {
              threesModule?.destroyThrees();
            },
          },
};
