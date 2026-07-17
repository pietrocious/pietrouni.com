import { APP_REGISTRY } from '../app-registry';
import type { WindowConfig } from '../types';

const snakeIcon = APP_REGISTRY.snake.icon;
const tictactoeIcon = APP_REGISTRY.tictactoe.icon;
const tetrisIcon = APP_REGISTRY.tetris.icon;
const threesIcon = APP_REGISTRY.threes.icon;
const doomIcon = APP_REGISTRY.doom.icon;

let iacVisualizerModule: typeof import('../apps/iac-visualizer') | null = null;
let networkTopologyModule: typeof import('../apps/network-topology') | null = null;
let subnetPlannerModule: typeof import('../apps/subnet-planner') | null = null;

export const labWindowConfigs: Record<string, WindowConfig> = {
          experiments: {
            title: "Experiments Lab",
            content: `
                    <div class="h-full flex flex-col font-ui window-content">
                        <!-- Header Bar -->
                        <div class="px-6 pt-4 pb-4 flex flex-col gap-1">
                            <h1 class="text-lg font-serif font-extrabold text-her-dark dark:text-her-textLight flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                Experiments Lab
                            </h1>
                            <p class="text-xs opacity-50">Interactive demos and prototypes</p>
                        </div>

                        <!-- Scrollable Content -->
                        <div class="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6 pt-2 space-y-1">
                            <!-- Filter Tabs -->
                            <div class="flex flex-wrap gap-2 mb-4" id="lab-filter-bar">
                                <button data-filter="all" class="lab-filter-btn px-4 py-1.5 text-xs font-bold rounded-full border transition-all bg-her-red text-white border-her-red" onclick="labFilter('all')">All</button>
                                <button data-filter="tools" class="lab-filter-btn px-4 py-1.5 text-xs font-bold rounded-full border transition-all border-her-text/20 text-her-dark/60 dark:text-her-textLight/60 hover:border-her-red/50" onclick="labFilter('tools')">Tools</button>
                                <button data-filter="games" class="lab-filter-btn px-4 py-1.5 text-xs font-bold rounded-full border transition-all border-her-text/20 text-her-dark/60 dark:text-her-textLight/60 hover:border-her-red/50" onclick="labFilter('games')">Games</button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="lab-grid">

                                <!-- ═══ Tools ═══ -->
                                <div class="col-span-full" data-category="tools">
                                    <h2 class="text-xs font-bold uppercase tracking-widest text-her-dark/40 dark:text-her-textLight/40 mb-1">Tools</h2>
                                </div>

                                <!-- IaC Visualizer -->
                                <button type="button" data-category="tools" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 50ms" onclick="window.openWindow('iacvisualizer');" aria-label="Open IaC Visualizer">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight"><img src="assets/icons/org.gaphor.Gaphor.svg" class="inline w-5 h-5 mr-1" alt="" /> IaC Visualizer</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">INTERACTIVE</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Visual dependency graph for Terraform and Kubernetes infrastructure code. Drag nodes to rearrange.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TERRAFORM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">K8S</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Network Topology -->
                                <button type="button" data-category="tools" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 100ms" onclick="window.openWindow('networktopology');" aria-label="Open Network Topology">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight"><img src="assets/icons/network-wired.svg" class="inline w-5 h-5 mr-1" alt="" /> Network Topology</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">INTERACTIVE</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Visualize network topology from LLDP/CDP neighbor output or routing tables.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">LLDP</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CDP</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Subnet Planner -->
                                <button type="button" data-category="tools" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 150ms" onclick="window.openWindow('subnetplanner');" aria-label="Open Subnet Planner">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight"><img src="assets/icons/org.gnome.Calculator.svg" class="inline w-5 h-5 mr-1" alt="" /> Subnet Planner</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">INTERACTIVE</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Visual VLSM address planner. Auto-carve a CIDR block from host requirements, or split/join subnets by hand.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">VLSM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CIDR</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Finder -->
                                <button type="button" data-category="tools" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 200ms" onclick="window.openWindow('finder');" aria-label="Open Finder">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">📁 Finder</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">PROTOTYPE</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Navigate the simulated file system. Browse directories, view files, and explore the virtual environment.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">FILE SYSTEM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">UI</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Monitoring -->
                                <button type="button" data-category="tools" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 250ms" onclick="window.openWindow('monitor');" aria-label="Open Monitoring">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight"><img src="assets/icons/org.gnome.SystemMonitor.svg" class="inline w-5 h-5 mr-1" alt="" /> Monitoring</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">WIP</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Live infrastructure metrics dashboard. Currently under construction.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">METRICS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">MONITORING</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- ═══ Games ═══ -->
                                <div class="col-span-full mt-4" data-category="games">
                                    <h2 class="text-xs font-bold uppercase tracking-widest text-her-dark/40 dark:text-her-textLight/40 mb-1">Games</h2>
                                </div>

                                <!-- DOOM -->
                                <button type="button" data-category="games" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 250ms" onclick="window.openWindow('doom');" aria-label="Open DOOM">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><img src="${doomIcon}" class="w-5 h-5 object-contain" alt="DOOM" />DOOM</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">PLAYABLE</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">The legendary 1993 FPS running via DOSBox WebAssembly. Shareware Episode 1: Knee-Deep in the Dead.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">WASM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">RETRO</span>
                                        </div>
                                    </div>

                                </button>
                                <!-- Threes -->
                                <button type="button" data-category="games" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 500ms" onclick="window.openWindow('threes');" aria-label="Open Threes">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><img src="${threesIcon}" class="w-5 h-5 object-contain" alt="Threes" />Threes!</h3>
                                        <div class="flex items-center gap-2">
                                            <span id="lab-hs-threes" class="text-[10px] font-mono opacity-50 text-her-dark dark:text-her-textLight hidden"></span>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">PLAYABLE</span>
                                        </div>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Combine 1+2 to make 3, then match pairs. Addictive puzzle with smooth tile animations.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TYPESCRIPT</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Snake -->
                                <button type="button" data-category="games" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 300ms" onclick="window.openWindow('snake');" aria-label="Open Snake">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><img src="${snakeIcon}" class="w-5 h-5 object-contain" alt="Snake" />Snake</h3>
                                        <div class="flex items-center gap-2">
                                            <span id="lab-hs-snake" class="text-[10px] font-mono opacity-50 text-her-dark dark:text-her-textLight hidden"></span>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">PLAYABLE</span>
                                        </div>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Classic arcade snake game. Eat food, grow longer, avoid walls and yourself!</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">ARCADE</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Tic Tac Toe -->
                                <button type="button" data-category="games" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 400ms" onclick="window.openWindow('tictactoe');" aria-label="Open Tic Tac Toe">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><img src="${tictactoeIcon}" class="w-5 h-5 object-contain" alt="Tic Tac Toe" />Tic Tac Toe</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">PLAYABLE</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Strategy game with Minimax AI. Choose Easy, Medium, or Hard difficulty. Can you beat the machine?</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">MINIMAX</span>
                                        </div>
                                    </div>
                                </button>

                                <!-- Tetris -->
                                <button type="button" data-category="games" class="lab-card text-left w-full p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 450ms" onclick="window.openWindow('tetris');" aria-label="Open Tetris">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><img src="${tetrisIcon}" class="w-5 h-5 object-contain" alt="Tetris" />Tetris</h3>
                                        <div class="flex items-center gap-2">
                                            <span id="lab-hs-tetris" class="text-[10px] font-mono opacity-50 text-her-dark dark:text-her-textLight hidden"></span>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">PLAYABLE</span>
                                        </div>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Classic falling blocks with DAS movement, ghost pieces, hold queue, particles, and screen shake!</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TYPESCRIPT</span>
                                        </div>
                                    </div>
                                </button>

                            </div>
                        </div>
                    </div>
                `,
            width: 900,
            height: 700,
            onOpen: () => {
              // Populate high score badges from localStorage
              const scores: Record<string, string> = {
                'lab-hs-snake': 'snake-high',
                'lab-hs-2048': '2048-best',
                'lab-hs-tetris': 'tetris-high',    // matches tetris.ts saveHighScore key
                'lab-hs-threes': 'threes-highscore', // matches threes.ts saveHighScore key
              };
              for (const [elId, lsKey] of Object.entries(scores)) {
                const val = localStorage.getItem(lsKey);
                const el = document.getElementById(elId);
                if (el && val && parseInt(val) > 0) {
                  el.textContent = `Best: ${parseInt(val).toLocaleString()}`;
                  el.classList.remove('hidden');
                }
              }
            },
          },
          iacvisualizer: {
            title: "IaC Visualizer",
            content: `
                    <div id="iac-app" class="lab-shell h-full flex select-none font-ui overflow-hidden">
                        <!-- Left Panel: Code Editor -->
                        <div id="iac-sidebar" class="lab-rail flex-shrink-0 flex flex-col">
                            <div class="lab-rail-header px-4 pt-4 pb-3 border-b">
                                <div class="flex items-center justify-between mb-3">
                                    <div><div class="lab-eyebrow mb-1.5">IaC Lab / 01</div><div class="text-sm font-semibold tracking-tight">Source configuration</div></div>
                                    <span id="iac-format" class="lab-badge text-[10px] font-mono px-2 py-1 rounded-full">Terraform HCL</span>
                                </div>
                                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Example configurations">
                                    <button id="iac-terraform" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 3.5l8 4.6v9.2l-8-4.6V3.5zm9 4.6l8-4.6v9.2l-8 4.6V8.1zm0 10.4l5.5-3.2v5.2L11 23.7v-5.2z"/></svg>Terraform</button>
                                    <button id="iac-kubernetes" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l8.8 5.1v10.2L12 22.2l-8.8-5.1V6.9L12 1.8zm0 4.1a6.1 6.1 0 100 12.2 6.1 6.1 0 000-12.2zm0 1.8l1 .3-.2 2 1.7 1 .9-1.8.8.7-1.2 1.6.7 1.8 2-.4.2 1-2 .3-.5 1.8 1.6 1.2-.7.8-1.5-1.4-1.7.8.1 2-1 .2-.4-2-1.9-.3-1 1.7-.9-.5.9-1.8-1.3-1.4-1.8 1-.4-.9 1.8-1.1-.1-1.9-2-.6.3-1 2 .4 1.2-1.5-1.3-1.6.8-.7 1.5 1.4 1.8-.7-.2-2z"/></svg>Kubernetes</button>
                                    <button id="iac-microservices" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 4h6v6H4zM14 4h6v6h-6zM9 14h6v6H9zM7 10v2h5v2m5-4v2h-5"/></svg>Microservices</button>
                                </div>
                            </div>
                            <div class="lab-editor-tabs flex items-end border-b">
                                <div class="lab-file-tab active flex items-center gap-2 px-4 py-2.5 text-xs font-medium"><svg id="iac-file-terraform-icon" class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 3.5l8 4.6v9.2l-8-4.6V3.5zm9 4.6l8-4.6v9.2l-8 4.6V8.1zm0 10.4l5.5-3.2v5.2L11 23.7v-5.2z"/></svg><svg id="iac-file-kubernetes-icon" class="hidden w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l8.8 5.1v10.2L12 22.2l-8.8-5.1V6.9L12 1.8zm0 4.1a6.1 6.1 0 100 12.2 6.1 6.1 0 000-12.2zm0 1.8l1 .3-.2 2 1.7 1 .9-1.8.8.7-1.2 1.6.7 1.8 2-.4.2 1-2 .3-.5 1.8 1.6 1.2-.7.8-1.5-1.4-1.7.8.1 2-1 .2-.4-2-1.9-.3-1 1.7-.9-.5.9-1.8-1.3-1.4-1.8 1-.4-.9 1.8-1.1-.1-1.9-2-.6.3-1 2 .4 1.2-1.5-1.3-1.6.8-.7 1.5 1.4 1.8-.7-.2-2z"/></svg><span id="iac-filename">main.tf</span></div>
                                <div class="lab-editor-status ml-auto px-3 py-2.5 text-[9px] font-mono">AUTO-PARSE</div>
                            </div>
                            <div class="lab-code-shell flex-1 min-h-0 flex">
                                <pre id="iac-line-numbers" class="lab-line-numbers" aria-hidden="true">1</pre>
                                <div class="lab-code-viewport flex-1 min-w-0 relative">
                                    <pre id="iac-highlight" class="lab-code-highlight" aria-hidden="true"><code></code></pre>
                                    <textarea id="iac-code" aria-label="Infrastructure source code" class="lab-code-input" spellcheck="false" wrap="off" placeholder="Paste your Terraform or Kubernetes code here..."></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="lab-rail-resizer" role="separator" aria-label="Resize source editor" aria-orientation="vertical" tabindex="0"></div>
                        
                        <!-- Right Panel: Graph + Details -->
                        <div class="lab-workspace min-w-0 flex-1 flex flex-col">
                            <div class="lab-toolbar min-h-14 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
                                <div class="flex items-center gap-2">
                                    <button class="lab-action lab-sidebar-toggle p-1.5 rounded-md" aria-controls="iac-sidebar" aria-expanded="true" title="Hide source editor"><svg class="w-3.5 h-3.5" viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M3 4h14v12H3zM7 4v12m4-8l-2 2 2 2"/></svg></button>
                                    <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-her-red opacity-40"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-her-red"></span></span>
                                    <div><div class="lab-eyebrow">Live model</div><div id="iac-count" class="lab-muted text-[11px] mt-1">0 resources</div></div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button id="iac-zoom" class="lab-action text-[10px] font-mono px-2 py-1.5 rounded-md" title="Reset zoom to 100% (0)">100%</button>
                                    <button id="iac-fit" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" title="Fit to View (F)">FIT VIEW</button>
                                    <button id="iac-export" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" title="Export PNG (Ctrl+E)">EXPORT PNG</button>
                                    <button class="lab-action lab-inspector-toggle text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" aria-controls="iac-details" aria-expanded="true" title="Hide inspector">INSPECTOR</button>
                                    <span class="lab-shortcuts lab-muted text-[10px] font-mono ml-1">F · 0 · ESC</span>
                                </div>
                            </div>
                            <div class="lab-stage flex-1 relative min-h-0">
                                <canvas id="iac-canvas" class="absolute inset-0 w-full h-full"></canvas>
                            </div>
                            <div class="lab-inspector-resizer" role="separator" aria-label="Resize resource inspector" aria-orientation="horizontal" tabindex="0"></div>
                            <div id="iac-details" class="lab-inspector px-4 py-3 overflow-y-auto text-sm">
                                <div class="lab-eyebrow mb-2">Inspector</div><div class="lab-muted text-xs">Select a resource to inspect its properties and dependencies.</div>
                            </div>
                            <div id="iac-errors" class="hidden bg-red-500/20 text-red-400 text-xs p-2 border-t border-red-500/30"></div>
                        </div>
                    </div>
                `,
            width: 1200,
            height: 740,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById('iac-app');
                if (!container) return;
                iacVisualizerModule = await import('../apps/iac-visualizer');
                if (container.isConnected) iacVisualizerModule.initIaCVisualizer(container);
              }, 100);
            },
            onClose: () => {
              iacVisualizerModule?.destroyIaCVisualizer();
            },
          },
          networktopology: {
            title: "Network Topology Mapper",
            content: `
                    <div id="netmap-app" class="lab-shell h-full flex select-none font-ui overflow-hidden">
                        <!-- Left Panel: Data Input -->
                        <div id="netmap-sidebar" class="lab-rail flex-shrink-0 flex flex-col">
                            <div class="lab-rail-header px-4 pt-4 pb-3 border-b">
                                <div class="flex items-center justify-between mb-3">
                                    <div><div class="lab-eyebrow mb-1.5">Network Lab / 02</div><div class="text-sm font-semibold tracking-tight">Discovery data</div></div>
                                    <span id="netmap-format" class="lab-badge text-[10px] font-mono px-2 py-1 rounded-full">LLDP Neighbors</span>
                                </div>
                                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Example discovery formats">
                                    <button id="netmap-lldp" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 6h16v8H4zM8 18h8M12 14v4M7 10h.01M10 10h.01M14 10h3"/></svg>LLDP</button>
                                    <button id="netmap-cdp" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M8 12h8M12 8v8M6.5 9.5l2 1M17.5 9.5l-2 1"/></svg>CDP</button>
                                    <button id="netmap-routing" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M5 18V7m0 0l-2 2m2-2l2 2M5 13h9m0 0l-2-2m2 2l-2 2M14 6h5v12h-5"/></svg>Routing</button>
                                </div>
                            </div>
                            <div class="lab-editor-tabs flex items-end border-b">
                                <div class="lab-file-tab active flex items-center gap-2 px-4 py-2.5 text-xs font-medium"><svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 6h16v8H4zM8 18h8M12 14v4M7 10h.01M10 10h.01M14 10h3"/></svg><span id="netmap-filename">lldp-neighbors.log</span></div>
                                <div class="lab-editor-status ml-auto px-3 py-2.5 text-[9px] font-mono">AUTO-PARSE</div>
                            </div>
                            <div class="lab-code-shell flex-1 min-h-0 flex">
                                <pre id="netmap-line-numbers" class="lab-line-numbers" aria-hidden="true">1</pre>
                                <div class="lab-code-viewport flex-1 min-w-0 relative">
                                    <pre id="netmap-highlight" class="lab-code-highlight" aria-hidden="true"><code></code></pre>
                                    <textarea id="netmap-code" aria-label="Network discovery data" class="lab-code-input" spellcheck="false" wrap="off" placeholder="Paste LLDP/CDP neighbors or routing table output..."></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="lab-rail-resizer" role="separator" aria-label="Resize discovery editor" aria-orientation="vertical" tabindex="0"></div>
                        
                        <!-- Right Panel: Topology Graph + Details -->
                        <div class="lab-workspace min-w-0 flex-1 flex flex-col">
                            <div class="lab-toolbar min-h-14 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
                                <div class="flex items-center gap-2">
                                    <button class="lab-action lab-sidebar-toggle p-1.5 rounded-md" aria-controls="netmap-sidebar" aria-expanded="true" title="Hide discovery editor"><svg class="w-3.5 h-3.5" viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M3 4h14v12H3zM7 4v12m4-8l-2 2 2 2"/></svg></button>
                                    <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-her-red opacity-40"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-her-red"></span></span>
                                    <div><div class="lab-eyebrow">Live topology</div><div id="netmap-count" class="lab-muted text-[11px] mt-1">0 devices, 0 links</div></div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button id="netmap-zoom" class="lab-action text-[10px] font-mono px-2 py-1.5 rounded-md" title="Reset zoom to 100% (0)">100%</button>
                                    <button id="netmap-fit" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" title="Fit to View (F)">FIT VIEW</button>
                                    <button id="netmap-export" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" title="Export PNG (Ctrl+E)">EXPORT PNG</button>
                                    <button class="lab-action lab-inspector-toggle text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" aria-controls="netmap-details" aria-expanded="true" title="Hide inspector">INSPECTOR</button>
                                    <span class="lab-shortcuts lab-muted text-[10px] font-mono ml-1">F · 0 · ESC</span>
                                </div>
                            </div>
                            <div class="lab-stage flex-1 relative min-h-0">
                                <canvas id="netmap-canvas" class="absolute inset-0 w-full h-full"></canvas>
                            </div>
                            <div class="lab-inspector-resizer" role="separator" aria-label="Resize device inspector" aria-orientation="horizontal" tabindex="0"></div>
                            <div id="netmap-details" class="lab-inspector px-4 py-3 overflow-y-auto text-sm">
                                <div class="lab-eyebrow mb-2">Inspector</div><div class="lab-muted text-xs">Select a device to inspect its interfaces and connections.</div>
                            </div>
                            <div id="netmap-errors" class="hidden bg-red-500/20 text-red-400 text-xs p-2 border-t border-red-500/30"></div>
                        </div>
                    </div>
                `,
            width: 1200,
            height: 740,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById('netmap-app');
                if (!container) return;
                networkTopologyModule = await import('../apps/network-topology');
                if (container.isConnected) networkTopologyModule.initNetworkTopology(container);
              }, 100);
            },
            onClose: () => {
              networkTopologyModule?.destroyNetworkTopology();
            },
          },
          subnetplanner: {
            title: "Subnet Planner",
            content: `
                    <div id="subnet-app" class="lab-shell h-full flex select-none font-ui overflow-hidden">
                        <!-- Left Panel: Plan Input -->
                        <div id="subnet-sidebar" class="lab-rail flex-shrink-0 flex flex-col">
                            <div class="lab-rail-header px-4 pt-4 pb-3 border-b">
                                <div class="flex items-center justify-between mb-3">
                                    <div><div class="lab-eyebrow mb-1.5">Network Lab / 03</div><div class="text-sm font-semibold tracking-tight">Address plan</div></div>
                                    <span id="subnet-mode" class="lab-badge text-[10px] font-mono px-2 py-1 rounded-full">VLSM · 6 requested</span>
                                </div>
                                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Example address plans">
                                    <button id="subnet-manual" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 6h16v12H4zM12 6v12"/></svg>Manual</button>
                                    <button id="subnet-vlsm" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 5h16v4H4zM4 11h9v4H4zM4 17h5v2H4z"/></svg>VLSM Plan</button>
                                    <button id="subnet-vpc" class="lab-tab text-[11px] px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 3l8 4v10l-8 4-8-4V7z"/></svg>Cloud VPC</button>
                                </div>
                            </div>
                            <div class="lab-editor-tabs flex items-end border-b">
                                <div class="lab-file-tab active flex items-center gap-2 px-4 py-2.5 text-xs font-medium"><svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 5h16v4H4zM4 11h9v4H4zM4 17h5v2H4z"/></svg><span id="subnet-filename">vlsm-plan.txt</span></div>
                                <div class="lab-editor-status ml-auto px-3 py-2.5 text-[9px] font-mono">AUTO-PARSE</div>
                            </div>
                            <div class="lab-code-shell flex-1 min-h-0 flex">
                                <pre id="subnet-line-numbers" class="lab-line-numbers" aria-hidden="true">1</pre>
                                <div class="lab-code-viewport flex-1 min-w-0 relative">
                                    <pre id="subnet-highlight" class="lab-code-highlight" aria-hidden="true"><code></code></pre>
                                    <textarea id="subnet-code" aria-label="Subnet plan input" class="lab-code-input" spellcheck="false" wrap="off" placeholder="10.0.0.0/16&#10;Engineering  500&#10;Sales        220"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="lab-rail-resizer" role="separator" aria-label="Resize plan editor" aria-orientation="vertical" tabindex="0"></div>

                        <!-- Right Panel: Address Space Map + Inspector -->
                        <div class="lab-workspace min-w-0 flex-1 flex flex-col">
                            <div class="lab-toolbar min-h-14 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
                                <div class="flex items-center gap-2">
                                    <button class="lab-action lab-sidebar-toggle p-1.5 rounded-md" aria-controls="subnet-sidebar" aria-expanded="true" title="Hide plan editor"><svg class="w-3.5 h-3.5" viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M3 4h14v12H3zM7 4v12m4-8l-2 2 2 2"/></svg></button>
                                    <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-her-red opacity-40"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-her-red"></span></span>
                                    <div><div class="lab-eyebrow">Address space</div><div id="subnet-count" class="lab-muted text-[11px] mt-1">0 blocks, 0 allocated</div></div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button id="subnet-export-csv" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" title="Export allocation table as CSV">EXPORT CSV</button>
                                    <button id="subnet-export-png" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" title="Export PNG">EXPORT PNG</button>
                                    <button class="lab-action lab-inspector-toggle text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md transition-colors" aria-controls="subnet-details" aria-expanded="true" title="Hide inspector">INSPECTOR</button>
                                    <span class="lab-shortcuts lab-muted text-[10px] font-mono ml-1">S · J · ESC</span>
                                </div>
                            </div>
                            <div class="lab-stage flex-1 relative min-h-0">
                                <canvas id="subnet-canvas" class="absolute inset-0 w-full h-full"></canvas>
                            </div>
                            <div class="lab-inspector-resizer" role="separator" aria-label="Resize inspector" aria-orientation="horizontal" tabindex="0"></div>
                            <div id="subnet-details" class="lab-inspector px-4 py-3 overflow-y-auto text-sm">
                                <div class="lab-eyebrow mb-2">Inspector</div><div class="lab-muted text-xs">Click a block to inspect, split, or allocate it.</div>
                            </div>
                            <div id="subnet-errors" class="hidden bg-red-500/20 text-red-400 text-xs p-2 border-t border-red-500/30"></div>
                        </div>
                    </div>
                `,
            width: 1200,
            height: 740,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById('subnet-app');
                if (!container) return;
                subnetPlannerModule = await import('../apps/subnet-planner');
                if (container.isConnected) subnetPlannerModule.initSubnetPlanner(container);
              }, 100);
            },
            onClose: () => {
              subnetPlannerModule?.destroySubnetPlanner();
            },
          },
};
