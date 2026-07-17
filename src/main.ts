
// config - static data
import { fileSystem, asciiAlpha, PIETROS_COMMANDS, CYBERPUNK_COMMANDS, FALLOUT_COMMANDS } from './config';
import { vaultData } from './vault';
import { initDock, dockBounce, refreshDockItems } from './dock';
import { animateWindowContent } from './animations';
import { initAudio, playClick, playWindowOpen, isSoundEnabled, toggleSound } from './audio';
import { initSpotlight, trapFocusInSpotlight } from './spotlight';
import { registerServiceWorker } from './sw-register';
import { initClock } from './clock';
import { initMonitor, startMonitor } from './monitor';
import { initLaunchpadModule } from './launchpad';
import { initMarkdownViewer } from './markdown-viewer';
import { initTheme, updateThemeUI } from './theme';
import { shouldOpenFirstVisitIntro } from './first-visit';
import {
  APP_REGISTRY,
  buildAppUrl,
  getAppMetadata,
  getDeepLinkedApp,
  isDeepLinkableApp,
} from './app-registry';

const snakeIcon = APP_REGISTRY.snake.icon;
const tictactoeIcon = APP_REGISTRY.tictactoe.icon;
const tetrisIcon = APP_REGISTRY.tetris.icon;
const threesIcon = APP_REGISTRY.threes.icon;
const doomIcon = APP_REGISTRY.doom.icon;

// Vercel Web Analytics
import { inject } from '@vercel/analytics';

// Lazy-loaded games and apps — split into separate Vite chunks
const loadTetris = () => import('./games/tetris');
const loadIaC = () => import('./apps/iac-visualizer');
const loadNetwork = () => import('./apps/network-topology');
const loadThrees = () => import('./games/threes');
const loadTicTacToe = () => import('./games/tic-tac-toe');
const loadSnake = () => import('./games/snake');
const loadDoom = () => import('./games/doom');
const loadGym = () => import('./apps/gym-routine');

const initTetris = (c: HTMLElement) => loadTetris().then(m => m.initTetris(c));
const destroyTetris = () => loadTetris().then(m => m.destroyTetris());
const initIaCVisualizer = (c: HTMLElement) => loadIaC().then(m => m.initIaCVisualizer(c));
const destroyIaCVisualizer = () => loadIaC().then(m => m.destroyIaCVisualizer());
const initNetworkTopology = (c: HTMLElement) => loadNetwork().then(m => m.initNetworkTopology(c));
const destroyNetworkTopology = () => loadNetwork().then(m => m.destroyNetworkTopology());
const initThrees = (c: HTMLElement) => loadThrees().then(m => m.initThrees(c));
const destroyThrees = () => loadThrees().then(m => m.destroyThrees());
const initTicTacToe = (c: HTMLElement) => loadTicTacToe().then(m => m.initTicTacToe(c));
const destroyTicTacToe = () => loadTicTacToe().then(m => m.destroyTicTacToe());
const initSnake = (c: HTMLElement) => loadSnake().then(m => m.initSnake(c));
const destroySnake = () => loadSnake().then(m => m.destroySnake());
const initDoom = (c: HTMLElement) => loadDoom().then(m => m.initDoom(c));
const destroyDoom = () => loadDoom().then(m => m.destroyDoom());
const initGymRoutine = (c: HTMLElement) => loadGym().then(m => m.initGymRoutine(c));
const destroyGymRoutine = () => loadGym().then(m => m.destroyGymRoutine());
import { handleTerminalCommand } from './terminal/core';
import { handlePietrOSCommand, resetTerminalSubModes } from './terminal/pietros';
import { handleCyberpunkCommand } from './terminal/cyberpunk';
import { handleFalloutCommand } from './terminal/fallout';



// state - shared app state with setters for mutations
import {
  activeWindows, incrementZIndex,
  currentPath, setCurrentPath, terminalHistory, pushTerminalHistory,
  terminalHistoryIndex, setTerminalHistoryIndex, guessGame, ciscoMode, terraformMode,
  shuffledQuotes, quoteIndex, setQuoteIndex, reshuffleQuotes, TERMINAL_STATE,
  tabCompletionIndex, setTabCompletionIndex, lastTabInput, setLastTabInput,
  registerTerminalCleanup, runTerminalCleanups, hasActiveCleanups
} from './state';

// window management
import {
  bringToFront, closeWindow, minimizeWindow, restoreWindow, toggleMaximize,
  startDrag, addTouchListeners, updateWindowCursor, handleResizeStart, initWindowEventListeners
} from './windows/manager';

// Global error handlers for better debugging and stability
window.addEventListener('error', (event) => {
  console.error('[Portfolio Error]', event.message, 'at', event.filename, ':', event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Promise Error]', event.reason);
});

// Cached module refs for dynamically-imported games/apps — populated on first open,
// reused on subsequent opens so onClose can call the matching destroy function.
let tttModule: typeof import('./games/tic-tac-toe') | null = null;
let snakeModule: typeof import('./games/snake') | null = null;
let doomModule: typeof import('./games/doom') | null = null;
let gymRoutineModule: typeof import('./apps/gym-routine') | null = null;
let tetrisModule: typeof import('./games/tetris') | null = null;
let iacVisualizerModule: typeof import('./apps/iac-visualizer') | null = null;
let networkTopologyModule: typeof import('./apps/network-topology') | null = null;
let subnetPlannerModule: typeof import('./apps/subnet-planner') | null = null;
let threesModule: typeof import('./games/threes') | null = null;

document.addEventListener("DOMContentLoaded", () => {
        // config object (kept for potential future use)
        const config = {};

        let isHandlingAppRoute = false;

        // expose window manager functions globally for HTML onclick handlers
        window.closeWindow = (id) => {
          closeWindow(id);
          if (!isHandlingAppRoute && getDeepLinkedApp(window.location.href) === id) {
            history.pushState({ app: null }, "", buildAppUrl(window.location.href, null));
          }
        };
        window.minimizeWindow = minimizeWindow;
        window.restoreWindow = (id) => restoreWindow(id, window.openWindow);
        window.toggleMaximize = toggleMaximize;
        window.startDrag = startDrag;

        // initialize window event listeners (drag, resize)
        initWindowEventListeners();

        // initialize audio system (loads saved preference)
        initAudio();

        // initialize dock fish-eye magnification
        initDock();

        // initialize monitor app handlers
        initMonitor();

        // initialize launchpad app handlers
        initLaunchpadModule();

        // expose markdown viewer (sanitized via DOMPurify)
        initMarkdownViewer();

        // expose sound toggle for settings
        window.toggleSound = toggleSound;
        window.isSoundEnabled = isSoundEnabled;

        // dock click sound via event delegation
        const dockContainer = document.querySelector('.dock-container');
        if (dockContainer) {
          dockContainer.addEventListener('click', () => playClick());
        }

        // Theme + wallpaper — implemented in src/theme.ts (initTheme() called below)

        // Lab filter for experiments window
        (window as any).labFilter = function (filter: string) {
          const items = document.querySelectorAll<HTMLElement>('#lab-grid [data-category]');
          const btns = document.querySelectorAll<HTMLElement>('.lab-filter-btn');
          btns.forEach(b => {
            const active = b.dataset.filter === filter;
            b.classList.toggle('bg-her-red', active);
            b.classList.toggle('text-white', active);
            b.classList.toggle('border-her-red', active);
            b.classList.toggle('border-her-text/20', !active);
            b.classList.toggle('text-her-dark/60', !active);
            b.classList.toggle('dark:text-her-textLight/60', !active);
          });
          items.forEach(item => {
            const show = filter === 'all' || item.dataset.category === filter;
            item.style.display = show ? '' : 'none';
          });
        };

        window.addEventListener("message", (event) => {
          if (event.data && event.data.type === "request-theme") {
            const currentTheme = document.documentElement.classList.contains(
              "dark"
            )
              ? "dark"
              : "light";
            (event.source as Window).postMessage(
              { type: "theme-change", theme: currentTheme },
              { targetOrigin: "*" }
            );
          }
        });

        initTheme();

        // Initialize Vercel Web Analytics
        inject();


        // spotlight (ctrl+k) — implemented in src/spotlight.ts
        initSpotlight();

        document.addEventListener("keydown", (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            window.toggleSpotlight();
          }
          if (
            e.key === "Escape" &&
            !document.getElementById("spotlight").classList.contains("hidden")
          ) {
            window.toggleSpotlight();
          }
          // E key to open Experiments Lab (when not typing in an input)
          const tag = (e.target as HTMLElement)?.tagName;
          const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
          if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping) {
            window.openWindow('experiments');
          }
          // Trap focus in spotlight when open
          trapFocusInSpotlight(e);
        });

        // windows
        const windows = {
          sysinfo: {
            title: "About pietrOS",
            content: `
                     <div class="h-full flex flex-col text-her-text dark:text-her-textLight p-6 select-none font-ui">
                        <h1 class="text-xl font-bold mb-1 font-serif">About pietrOS</h1>
                        <div class="text-xs opacity-60 mb-4 font-mono">Version 1.5 (Amber-Amy)</div>
                        <div class="h-px bg-her-text/10 dark:bg-white/10 w-full mb-4"></div>

                        <div class="flex-1 overflow-y-auto pr-2 space-y-4 text-sm">
                            <div>
                                <div class="font-bold opacity-40 mb-2 text-xs uppercase tracking-wider">Built with</div>
                                <ul class="space-y-1 opacity-80">
                                    <li>• HTML5 & TypeScript</li>
                                    <li>• Tailwind CSS v4</li>
                                    <li>• Vite (Build Tool)</li>
                                    <li>• Neuwaita Icons (SVGs)</li>
                                </ul>
                            </div>

                            <div>
                                <div class="font-bold opacity-40 mb-2 text-xs uppercase tracking-wider">Typography</div>
                                <ul class="space-y-3 opacity-80">
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">Headlines</span>
                                        <span class="font-headline font-bold text-base">Outfit</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">System UI</span>
                                        <span class="font-ui text-base">DM Sans</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">README (Display)</span>
                                        <span class="font-display font-bold text-base">Georgia (system)</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">README (Body)</span>
                                        <span class="font-serif text-base">Georgia (system)</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">Terminal</span>
                                        <span class="font-kernel text-base">Fixedsys</span>
                                    </li>
                                </ul>
                            </div>

                        </div>

                        <div class="mt-6 text-center text-xs opacity-60 font-mono">
                            Built by Pietro Uni<br>
                            © 2026 All rights reserved
                        </div>

                        <div class="mt-4 flex justify-center">
                            <button onclick="closeWindow('sysinfo')" class="px-6 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-her-text/10 dark:border-white/10 rounded-md text-sm font-medium transition-colors">Close</button>
                        </div>
                     </div>
                `,
            width: 400,
            height: 650,
          },
          about: {
            title: "README.md",
            content: `
                    <div class="h-full p-6 font-serif text-sm overflow-y-auto window-content selection:bg-her-red selection:text-white transition-colors">
                        <!-- Header -->
                        <h1 class="text-4xl font-display font-extrabold text-her-red dark:text-her-red tracking-tight mb-4">Hi, I'm Pietro</h1>
                        
                        <div class="space-y-4">
                            <!-- Background -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">Background</h2>
                                <p class="opacity-90">
                                    I'm a network and infrastructure engineer with a background in enterprise networking. I spent over three years at <span class="font-semibold text-her-red dark:text-her-red">Cisco TAC</span> solving complex routing, switching, and SDN problems for Fortune 500 customers — that foundation gave me a deep understanding of how distributed systems actually work. More recently I've been growing into cloud infrastructure: a new interest that builds naturally on those networking fundamentals, and on making things that are reliable by design.
                                </p>
                            </div>

                            <!-- What I'm Building -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">What I'm Building</h2>
                                <p class="opacity-90 mb-4">
                                    I have several projects here — a mix of infrastructure work and things I built out of curiosity. Check out <a href="#" onclick="openWindow('projects'); return false;" class="content-link">Projects</a> or my <a href="https://github.com/pietrocious" target="_blank" rel="noopener noreferrer" class="content-link">GitHub</a> to see what I'm working on.</p>
                            </div>

                            <!-- How I Think -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">How I Think</h2>
                                <p class="opacity-90">
                                    I've always been more interested in how things are built than in any particular tool or title. Cloud is just where a lot of the interesting building happens right now — systems that scale, infrastructure that's code, things you can actually ship. It's a natural extension of understanding how networks work at the bottom, and a good foundation for whatever comes next.
                                </p>
                            </div>

                            <!-- Beyond the Screen -->
                            <div>
                                <h2 class="text-lg font-display font-extrabold text-her-dark dark:text-her-cream mt-4 mb-2">Beyond the Screen</h2>
                                <p class="opacity-90">
                                    Outside of work, I listen to music across pretty much every genre, play games when I have time, and enjoy understanding how complex systems get built — I'm fascinated by how architecture decisions ripple all the way down, and how much we're all standing on the shoulders of giants.
                                </p>
                            </div>

                            <!-- Let's Connect -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">Let's Connect</h2>
                                <p class="opacity-90">
                                    If you'd like to talk, please reach out:
                                </p>
                                <div class="mt-4 flex gap-5">
                                    <a href="mailto:pietrouni@gmail.com" class="text-her-red dark:text-her-red hover:opacity-70 transition-opacity" title="Email">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </a>
                                    <a href="https://github.com/pietrocious" target="_blank" rel="noopener noreferrer" class="text-her-red dark:text-her-red hover:opacity-70 transition-opacity" title="GitHub">
                                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                                    </a>
                                    <a href="https://linkedin.com/in/pietrouni" target="_blank" rel="noopener noreferrer" class="text-her-red dark:text-her-red hover:opacity-70 transition-opacity" title="LinkedIn">
                                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </a>
                                </div>
                            </div>
                            
                            <div class="h-12"></div>
                        </div>
                    </div>
                `,
            width: 700,
            height: 800,
          },
          resume: {
            title: "Pietro Uni — Resume",
            content: `
                    <div class="h-full flex flex-col bg-her-paper dark:bg-[#2d1a14] text-her-dark dark:text-her-textLight">
                        <div class="px-4 py-3 border-b border-her-text/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div class="font-bold text-sm">PietroUni_Resume_2026.pdf</div>
                                <div class="text-xs opacity-55">Network & infrastructure engineering</div>
                            </div>
                            <div class="flex items-center gap-2">
                                <a href="/PietroUni_Resume_2026.pdf" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-md border border-her-text/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Open PDF</a>
                                <a href="/PietroUni_Resume_2026.pdf" download="PietroUni_Resume_2026.pdf" class="px-3 py-2 rounded-md bg-her-red text-white text-xs font-semibold hover:opacity-85 transition-opacity">Download</a>
                            </div>
                        </div>
                        <div class="flex-1 min-h-0 bg-black/5 dark:bg-black/20">
                            <iframe src="/PietroUni_Resume_2026.pdf#view=FitH" title="Pietro Uni resume PDF" class="w-full h-full border-0"></iframe>
                        </div>
                        <p class="px-4 py-2 text-[11px] opacity-55 md:hidden">If the embedded preview is unavailable on your browser, use Open PDF above.</p>
                    </div>
                `,
            width: 900,
            height: 720,
          },
          projects: {
            title: "Projects",
            content: `
                     <div class="h-full flex flex-col font-ui window-content" style="min-width: 500px;">
                        <!-- Header Bar -->
                        <div class="px-6 pt-4 pb-4 flex flex-col gap-1">
                            <h1 class="text-lg font-serif font-extrabold text-her-dark dark:text-her-textLight flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                Projects
                            </h1>
                            <p class="text-xs opacity-50">Cloud architecture, automation and software projects</p>
                        </div>

                        <!-- Scrollable Content -->
                        <div class="flex-1 overflow-y-auto px-6 pb-6 pt-2 space-y-4">
                            <!-- Current Projects -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    Current Projects
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    <!-- Terraform AWS Modules -->
                                    <a class="project-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 0ms" href="https://github.com/pietrocious/terraform-aws-pietrouni" target="_blank" rel="noopener noreferrer" aria-label="View Terraform AWS Modules on GitHub">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">Terraform AWS Modules</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Infrastructure</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Complete AWS cloud architecture featuring Multi-AZ networking, auto-scaling, CloudFront CDN, and automated deployment. Built to demonstrate enterprise IaC patterns..</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AWS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TERRAFORM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CI/CD</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-60">
                                                <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>GitHub</span>
                                            </div>
                                        </div>
                                    </a>

                                    <!-- pietrouni.com -->
                                    <a class="project-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 50ms" href="https://github.com/pietrocious/pietrouni.com" target="_blank" rel="noopener noreferrer" aria-label="View pietrouni.com on GitHub">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">pietrouni.com</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Portfolio</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">This interactive OS-themed portfolio website. Built with Vite, TypeScript, and Tailwind CSS. Features draggable/resizable windows and custom terminal.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">HTML</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">VITE</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TYPESCRIPT</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TAILWIND</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-60">
                                                <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>GitHub</span>
                                            </div>
                                        </div>
                                    </a>

                                </div>
                            </div>

                            <!-- Featured Exhibit -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h10"></path></svg>
                                    Featured Exhibit
                                </div>
                                <button type="button" class="project-card text-left w-full p-5 border border-her-red/25 bg-gradient-to-br from-blue-50/80 to-white/50 dark:from-blue-950/20 dark:to-white/5 rounded-xl hover:border-her-red/60 hover:-translate-y-0.5 hover:shadow-lg transition-all vault-card-animate" style="animation-delay: 100ms" onclick="window.openWindow('sitearchitecture')" aria-label="Open How this site runs">
                                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div class="max-w-xl">
                                            <div class="flex items-center gap-2 mb-2">
                                                <img src="assets/icons/network-wired.svg" class="w-6 h-6" alt="" />
                                                <h3 class="font-semibold text-her-dark dark:text-her-textLight">How this site runs</h3>
                                                <span class="text-[10px] px-2 py-0.5 rounded bg-her-red/10 text-her-red font-bold">LIVE ARCHITECTURE</span>
                                            </div>
                                            <p class="text-xs opacity-70 text-her-dark dark:text-her-textLight">Follow a commit through typecheck, tests, build, S3 deployment, and CloudFront cache invalidation. Includes the design decisions behind the static delivery path.</p>
                                        </div>
                                        <div class="flex flex-wrap gap-1.5 md:justify-end">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10">GITHUB ACTIONS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10">S3</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10">CLOUDFRONT</span>
                                        </div>
                                    </div>
                                </button>
                            </div>

                        </div>
                     </div>
                `,
            width: 900,
            height: 700,
          },

          sitearchitecture: {
            title: "How this site runs",
            content: `
                    <div class="h-full overflow-y-auto p-5 md:p-7 font-ui text-her-dark dark:text-her-textLight">
                        <div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
                            <div>
                                <div class="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-her-red mb-2">Production delivery path</div>
                                <h1 class="text-2xl md:text-3xl font-display font-bold">From commit to edge</h1>
                                <p class="text-sm opacity-65 mt-2 max-w-2xl">A deliberately small static architecture: validate every change, publish immutable build output, then let the CDN do the serving.</p>
                            </div>
                            <a href="https://github.com/pietrocious/pietrouni.com/blob/main/.github/workflows/production.yml" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-her-red hover:underline">View workflow ↗</a>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-2 mb-6" aria-label="Deployment architecture">
                            <div class="architecture-node"><span class="architecture-kicker">Source</span><strong>GitHub</strong><small>Push to main</small></div>
                            <div class="architecture-arrow" aria-hidden="true">→</div>
                            <div class="architecture-node"><span class="architecture-kicker">Quality gate</span><strong>GitHub Actions</strong><small>npm ci · typecheck · test suite · build</small></div>
                            <div class="architecture-arrow" aria-hidden="true">→</div>
                            <div class="architecture-node"><span class="architecture-kicker">Origin</span><strong>Amazon S3</strong><small>dist/ synchronized with deletion</small></div>
                            <div class="architecture-arrow" aria-hidden="true">→</div>
                            <div class="architecture-node"><span class="architecture-kicker">Edge</span><strong>CloudFront</strong><small>Global delivery + invalidation</small></div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                            <article class="architecture-note"><h2>Failure stops delivery</h2><p>The deploy job depends on CI, so a type, test, or build failure never reaches the origin bucket.</p></article>
                            <article class="architecture-note"><h2>Static by design</h2><p>No application server is required. S3 stores the artifact; CloudFront absorbs reads close to visitors.</p></article>
                            <article class="architecture-note"><h2>Freshness is explicit</h2><p>After synchronization, the workflow invalidates CloudFront so the new application shell becomes visible.</p></article>
                        </div>

                        <div class="rounded-xl border border-her-text/10 dark:border-white/10 bg-black/[0.025] dark:bg-white/[0.035] p-4 md:p-5">
                            <h2 class="font-bold mb-3">Operational tradeoffs</h2>
                            <dl class="grid grid-cols-1 md:grid-cols-[9rem_1fr] gap-x-5 gap-y-3 text-sm">
                                <dt class="font-mono text-xs text-her-red">Why this shape?</dt><dd class="opacity-75">Low operational overhead, low cost, and a delivery model that matches a client-side portfolio.</dd>
                                <dt class="font-mono text-xs text-her-red">What is measured?</dt><dd class="opacity-75">The repository gates correctness through TypeScript, Vitest, and the production Vite build before deployment.</dd>
                                <dt class="font-mono text-xs text-her-red">What would change?</dt><dd class="opacity-75">Dynamic APIs or authenticated data would introduce a separate compute boundary rather than turning the static origin into an application server.</dd>
                            </dl>
                        </div>
                    </div>
                `,
            width: 980,
            height: 680,
          },

          vault: {
            title: "Personal Vault",
            content: `
                    <div id="vault-app" class="h-full flex flex-col font-ui" style="min-width: 400px;">
                        <!-- Header -->
                        <div class="px-6 pt-4 pb-4 flex items-center gap-3">
                            <button id="vault-back-btn" onclick="window.vaultShowGrid()" class="hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Back to files">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <div>
                                <h2 id="vault-title" class="text-lg font-serif font-extrabold text-her-dark dark:text-her-textLight flex items-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    Personal Vault
                                </h2>
                                <p id="vault-subtitle" class="text-xs opacity-50 mt-1">Skills, resources & things I like</p>
                            </div>
                        </div>

                        <!-- Grid View -->
                        <div id="vault-grid" class="flex-1 overflow-y-auto px-3 md:px-6 pb-3 md:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 content-start">
                            <!-- Items Injected Here -->
                        </div>

                        <!-- Detail View (hidden by default) -->
                        <div id="vault-detail" class="flex-1 overflow-y-auto p-4 md:p-6 hidden">
                        </div>
                    </div>
                `,
            width: 800,
            height: 600,
          },

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
                tttModule = await import('./games/tic-tac-toe');
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
                snakeModule = await import('./games/snake');
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
                doomModule = await import('./games/doom');
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
                    <div id="gym-routine-container" class="h-full w-full bg-[#0e0e0e]"></div>
                `,
            width: 1100,
            height: 820,
            onOpen: () => {
              setTimeout(async () => {
                const container = document.getElementById("gym-routine-container");
                if (!container) return;
                gymRoutineModule = await import('./apps/gym-routine');
                if (container.isConnected) gymRoutineModule.initGymRoutine(container);
              }, 50);
            },
            onClose: () => {
              gymRoutineModule?.destroyGymRoutine();
            },
          },

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
          terminal: {
            title: "Terminal",
            content: `
                    <div class="h-full bg-transparent text-white p-4 font-kernel text-sm flex flex-col overflow-hidden" id="term-container" onclick="document.getElementById('cmd-input').focus()">
                        <div id="term-output" class="flex-1 overflow-y-auto space-y-1 window-content" style="-webkit-overflow-scrolling: touch; touch-action: pan-y;">
                            <pre class="text-green-400 hidden md:block text-xs leading-tight mb-2"> 
     _     _       _____ _____ 
 ___|_|___| |_ ___|     |   __|
| . | | -_|  _|  _|  |  |__   |
|  _|_|___|_| |_| |_____|_____|
|_|                                
                            </pre>
                            <div class="text-gray-400 hidden md:block">v1.5 (Amber-Amy) | Linux micro-kernel 6.8.0-45</div>
                            <div class="text-gray-500 hidden md:block">Type 'help' for commands, 'man &lt;cmd&gt;' for details</div>
                        </div>
                        <div class="md:border-t border-white/20 md:pt-2">
                            <div class="text-gray-400 text-xs md:hidden">pietrOS v1.5 (Amber-Amy) | Linux micro-kernel 6.8.0-45</div>
                            <div class="text-gray-500 text-xs mb-2 md:hidden">Type 'help' for commands</div>
                            <div class="flex items-center gap-2 text-white">
                                <span id="term-prompt" class="text-green-400 font-semibold whitespace-nowrap">guest@pietrOS</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>
                                <input id="cmd-input" type="text" class="flex-1 bg-transparent border-none outline-none text-white font-kernel focus:ring-0 min-w-0" autocomplete="off" onkeydown="window.handleTerminalCommand(event)">
                            </div>
                        </div>
                    </div>
                `,
            width: 850,
            height: 520,
          },
          monitor: {
            title: "Monitoring",
            content: `
                    <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                        <!-- Work in Progress Icon -->
                        <div class="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                            </svg>
                        </div>
                        
                        <!-- Title -->
                        <h2 class="text-2xl font-serif font-extrabold text-her-dark dark:text-her-textLight mb-3">Work in Progress</h2>
                        
                        <!-- Description -->
                        <p class="text-sm opacity-70 max-w-sm mb-6 text-her-text dark:text-her-textLight">
                            This dashboard will show live infrastructure metrics once connected to a metrics backend.
                        </p>
                        
                        <!-- Coming Soon Badge -->
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Coming Soon</span>
                        </div>
                        
                        <!-- Planned Features -->
                        <div class="mt-8 text-left max-w-xs">
                            <div class="text-[10px] uppercase font-bold opacity-40 mb-3 tracking-widest">Planned Features</div>
                            <ul class="space-y-2 text-xs opacity-60">
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    CDN traffic metrics
                                </li>
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    Object storage analytics
                                </li>
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    Real-time billing data
                                </li>
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    Edge node performance
                                </li>
                            </ul>
                        </div>
                    </div>
                `,
            width: 500,
            height: 480,
          },
          settings: {
            title: "Settings",
            content: `
                    <div class="h-full flex flex-col text-her-text dark:text-her-textLight p-6 select-none font-ui overflow-y-auto">
                        <h1 class="text-xl font-bold mb-1 font-serif">Settings</h1>
                        <div class="text-xs opacity-60 mb-4 font-mono">System Preferences</div>
                        <div class="h-px bg-her-text/10 dark:bg-white/10 w-full mb-6"></div>
                        
                        <div class="space-y-6">
                            <!-- Appearance Section -->
                            <div>
                                <div class="font-bold opacity-40 mb-3 text-xs uppercase tracking-wider">Appearance</div>
                                
                                <!-- Theme Toggle -->
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg mb-3">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 to-orange-400 dark:from-indigo-500 dark:to-purple-600 flex items-center justify-center">
                                            <svg class="w-5 h-5 text-white block dark:hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path></svg>
                                            <svg class="w-5 h-5 text-white hidden dark:block" fill="currentColor" viewBox="0 0 24 24"><path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"></path></svg>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-sm">Theme</div>
                                            <div class="text-xs opacity-60" id="settings-theme-label">System</div>
                                        </div>
                                    </div>
                                    <div id="theme-segmented" class="flex rounded-lg overflow-hidden border border-her-text/10 dark:border-white/10">
                                        <button onclick="window.setThemeMode('light')" data-mode="light" class="theme-seg-btn flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path></svg>
                                            Light
                                        </button>
                                        <button onclick="window.setThemeMode('system')" data-mode="system" class="theme-seg-btn flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border-x border-her-text/10 dark:border-white/10">
                                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm6 9.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-4zM7 18.25a.75.75 0 000 1.5h10a.75.75 0 000-1.5H7z"/></svg>
                                            System
                                        </button>
                                        <button onclick="window.setThemeMode('dark')" data-mode="dark" class="theme-seg-btn flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"></path></svg>
                                            Dark
                                        </button>
                                    </div>
                                </div>

                                <!-- Sound Toggle -->
                                <div class="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-lg mb-3">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-sm">UI Sounds</div>
                                            <div class="text-xs opacity-60" id="settings-sound-label">Off</div>
                                        </div>
                                    </div>
                                    <button onclick="const on = window.toggleSound(); document.getElementById('settings-sound-label').textContent = on ? 'On' : 'Off'; this.textContent = on ? 'Disable' : 'Enable';" class="px-4 py-2 bg-her-red text-white rounded-lg text-sm font-medium hover:bg-her-red/90 transition-colors">
                                        Enable
                                    </button>
                                </div>

                                <!-- Wallpaper Picker Grid -->
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
                                    <div class="flex items-center gap-3 mb-4">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-sm">Wallpaper</div>
                                            <div class="text-xs opacity-60">Choose a background</div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-3 gap-3" id="wallpaper-grid">
                                        <!-- Birds -->
                                        <button onclick="setWallpaper(0);" class="wallpaper-option group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-her-red transition-all" data-wallpaper="0">
                                            <div class="absolute inset-0" style="background:#f0dfc0"></div>
                                            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                                                <g fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                <path stroke="#c0390a" stroke-width="2.2" d="M88,58 Q92,53 96,58 Q100,53 104,58"/>
                                                <path stroke="#d4510e" stroke-width="2" d="M100,48 Q104,44 107,48 Q110,44 113,48"/>
                                                <path stroke="#e06820" stroke-width="1.8" d="M78,50 Q81,46 84,50 Q87,46 90,50"/>
                                                <path stroke="#c0390a" stroke-width="1.6" d="M112,55 Q115,51 117,55 Q119,51 121,55"/>
                                                <path stroke="#d4510e" stroke-width="1.5" d="M70,62 Q73,58 76,62 Q79,58 82,62"/>
                                                <path stroke="#e8761a" stroke-width="1.8" d="M108,38 Q111,34 114,38 Q117,34 120,38"/>
                                                <path stroke="#c0390a" stroke-width="1.4" d="M118,46 Q120,43 122,46 Q124,43 126,46"/>
                                                <path stroke="#d4510e" stroke-width="1.6" d="M95,38 Q98,34 101,38 Q104,34 107,38"/>
                                                <path stroke="#e06820" stroke-width="1.3" d="M122,62 Q124,59 126,62 Q128,59 130,62"/>
                                                <path stroke="#c0390a" stroke-width="1.5" d="M84,40 Q87,36 90,40 Q93,36 96,40"/>
                                                <path stroke="#d4510e" stroke-width="1.2" d="M128,52 Q130,49 132,52 Q134,49 136,52"/>
                                                <path stroke="#e8761a" stroke-width="1.4" d="M65,52 Q67,49 69,52 Q71,49 73,52"/>
                                                <path stroke="#c0390a" stroke-width="1.1" d="M75,38 Q77,35 79,38 Q81,35 83,38"/>
                                                <path stroke="#d4510e" stroke-width="1.3" d="M134,42 Q136,39 138,42 Q140,39 142,42"/>
                                                <path stroke="#e06820" stroke-width="1.2" d="M116,30 Q118,27 120,30 Q122,27 124,30"/>
                                                <path stroke="#c0390a" stroke-width="1" d="M140,58 Q142,55 144,58 Q146,55 148,58"/>
                                                <path stroke="#d4510e" stroke-width="1.1" d="M102,28 Q104,25 106,28 Q108,25 110,28"/>
                                                <path stroke="#e8761a" stroke-width="1" d="M58,44 Q60,41 62,44 Q64,41 66,44"/>
                                                <path stroke="#c0390a" stroke-width="1.2" d="M130,34 Q132,31 134,34 Q136,31 138,34"/>
                                                <path stroke="#d4510e" stroke-width="0.9" d="M144,68 Q146,65 148,68 Q150,65 152,68"/>
                                                <path stroke="#e06820" stroke-width="1" d="M88,30 Q90,27 92,30 Q94,27 96,30"/>
                                                <path stroke="#c0390a" stroke-width="0.9" d="M50,58 Q52,55 54,58 Q56,55 58,58"/>
                                                <path stroke="#d4510e" stroke-width="1" d="M148,38 Q150,35 152,38 Q154,35 156,38"/>
                                                <path stroke="#e8761a" stroke-width="0.8" d="M42,50 Q44,47 46,50 Q48,47 50,50"/>
                                                </g>
                                            </svg>
                                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            <div class="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium drop-shadow-md" style="color:#7a3010">Birds</div>
                                        </button>
                                        <!-- Halo -->
                                        <button onclick="setWallpaper(1);" class="wallpaper-option group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-her-red transition-all" data-wallpaper="1">
                                            <div class="absolute inset-0" style="background:#060010"></div>
                                            <div class="absolute inset-0" style="background:radial-gradient(ellipse 70% 80% at 50% 55%, rgba(80,0,180,0.55) 0%, transparent 70%)"></div>
                                            <div class="absolute inset-0" style="background:radial-gradient(circle at 50% 48%, rgba(255,255,255,0.97) 0%, rgba(160,220,255,0.85) 6%, rgba(100,180,255,0.7) 12%, rgba(160,80,255,0.55) 20%, rgba(80,0,200,0.25) 32%, transparent 48%)"></div>
                                            <div class="absolute inset-0" style="background:radial-gradient(ellipse 55% 35% at 50% 75%, rgba(30,0,70,0.85) 0%, transparent 100%)"></div>
                                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            <div class="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-yellow-300 drop-shadow-md">Halo</div>
                                        </button>
                                        <!-- Waves -->
                                        <button onclick="setWallpaper(2);" class="wallpaper-option group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-her-red transition-all" data-wallpaper="2">
                                            <div class="absolute inset-0" style="background:#2196f3"></div>
                                            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                                                <polygon points="0,0 40,0 20,25" fill="#1976d2"/><polygon points="40,0 80,0 60,25" fill="#1565c0"/><polygon points="80,0 120,0 100,25" fill="#1e88e5"/><polygon points="120,0 160,0 140,25" fill="#1976d2"/>
                                                <polygon points="0,0 20,25 0,50" fill="#1565c0"/><polygon points="20,25 40,0 60,25" fill="#42a5f5"/><polygon points="40,0 80,0 60,25" fill="#1565c0"/><polygon points="60,25 80,0 100,25" fill="#1e88e5"/><polygon points="80,0 120,0 100,25" fill="#1976d2"/><polygon points="100,25 120,0 140,25" fill="#42a5f5"/><polygon points="120,0 160,0 140,25" fill="#1565c0"/><polygon points="140,25 160,0 160,50" fill="#1976d2"/>
                                                <polygon points="0,50 20,25 40,50" fill="#1e88e5"/><polygon points="20,25 60,25 40,50" fill="#1565c0"/><polygon points="40,50 60,25 80,50" fill="#42a5f5"/><polygon points="60,25 100,25 80,50" fill="#1976d2"/><polygon points="80,50 100,25 120,50" fill="#1565c0"/><polygon points="100,25 140,25 120,50" fill="#1e88e5"/><polygon points="120,50 140,25 160,50" fill="#1976d2"/>
                                                <polygon points="0,50 40,50 20,75" fill="#1565c0"/><polygon points="40,50 80,50 60,75" fill="#1976d2"/><polygon points="80,50 120,50 100,75" fill="#1565c0"/><polygon points="120,50 160,50 140,75" fill="#1e88e5"/>
                                                <polygon points="0,50 20,75 0,100" fill="#1976d2"/><polygon points="20,75 40,50 60,75" fill="#1e88e5"/><polygon points="40,50 80,50 60,75" fill="#1565c0"/><polygon points="60,75 80,50 100,75" fill="#42a5f5"/><polygon points="80,50 120,50 100,75" fill="#1976d2"/><polygon points="100,75 120,50 140,75" fill="#1565c0"/><polygon points="120,50 160,50 140,75" fill="#1e88e5"/><polygon points="140,75 160,50 160,100" fill="#1565c0"/>
                                                <polygon points="0,100 20,75 40,100" fill="#1976d2"/><polygon points="20,75 60,75 40,100" fill="#1e88e5"/><polygon points="40,100 60,75 80,100" fill="#1565c0"/><polygon points="60,75 100,75 80,100" fill="#1976d2"/><polygon points="80,100 100,75 120,100" fill="#42a5f5"/><polygon points="100,75 140,75 120,100" fill="#1976d2"/><polygon points="120,100 140,75 160,100" fill="#1565c0"/>
                                                <polygon points="0,100 40,100 20,120" fill="#1565c0"/><polygon points="40,100 80,100 60,120" fill="#1976d2"/><polygon points="80,100 120,100 100,120" fill="#1e88e5"/><polygon points="120,100 160,100 140,120" fill="#1565c0"/>
                                                <polygon points="0,100 0,120 20,120" fill="#1976d2"/><polygon points="160,100 160,120 140,120" fill="#1976d2"/>
                                            </svg>
                                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            <div class="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-sky-100 drop-shadow-md">Waves</div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- About Section -->
                            <div>
                                <div class="font-bold opacity-40 mb-3 text-xs uppercase tracking-wider">About</div>
                                
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2z"/></svg>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-sm">pietrOS</div>
                                            <div class="text-xs opacity-60">Version 1.5 (Amber-Amy)</div>
                                        </div>
                                    </div>
                                    <button onclick="openWindow('sysinfo'); closeWindow('settings');" class="w-full px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-her-text/10 dark:border-white/10 rounded-lg text-sm font-medium transition-colors">
                                        View System Info
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-auto pt-6 text-center text-xs opacity-40 font-mono">
                            © 2026 Pietro Uni
                        </div>
                    </div>
                `,
            width: 380,
            height: 600,
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
                tetrisModule = await import('./games/tetris');
                if (container.isConnected) tetrisModule.initTetris(container);
              }, 100);
            },
            onClose: () => {
              tetrisModule?.destroyTetris();
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
                iacVisualizerModule = await import('./apps/iac-visualizer');
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
                networkTopologyModule = await import('./apps/network-topology');
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
                subnetPlannerModule = await import('./apps/subnet-planner');
                if (container.isConnected) subnetPlannerModule.initSubnetPlanner(container);
              }, 100);
            },
            onClose: () => {
              subnetPlannerModule?.destroySubnetPlanner();
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
                threesModule = await import('./games/threes');
                if (container.isConnected) threesModule.initThrees(container);
              }, 100);
            },
            onClose: () => {
              threesModule?.destroyThrees();
            },
          },
          finder: {
            title: "Finder",
            content: `
                    <div id="finder-app" class="h-full flex text-her-text dark:text-her-textLight select-none font-ui">
                        <!-- Sidebar -->
                        <div class="w-48 flex-shrink-0 bg-black/5 dark:bg-white/5 border-r border-her-text/10 dark:border-white/10 p-3 hidden md:block">
                            <div class="text-[10px] uppercase font-bold opacity-40 tracking-wider mb-2 px-2">Favorites</div>
                            <div class="space-y-1">
                                <button onclick="window.finderNavigate('/home/guest')" class="finder-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm transition-colors text-left" data-path="/home/guest">
                                    <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                                    Home
                                </button>
                                <button onclick="window.finderNavigate('/home/guest/projects')" class="finder-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm transition-colors text-left" data-path="/home/guest/projects">
                                    <svg class="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                                    Projects
                                </button>
                                <button onclick="window.finderNavigate('/home/guest/photos')" class="finder-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm transition-colors text-left" data-path="/home/guest/photos">
                                    <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                                    Photos
                                </button>
                                <button onclick="window.finderNavigate('/home/guest/vault')" class="finder-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm transition-colors text-left" data-path="/home/guest/vault">
                                    <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                                    Vault
                                </button>
                            </div>
                            <div class="text-[10px] uppercase font-bold opacity-40 tracking-wider mb-2 px-2 mt-6">Locations</div>
                            <div class="space-y-1">
                                <button onclick="window.finderNavigate('/')" class="finder-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm transition-colors text-left" data-path="/">
                                    <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v6H4v-6zm6 6v-6h4v6h-4zm10 0h-4v-6h4v6zm0-8H4V6h16v2z"/></svg>
                                    Root
                                </button>
                            </div>
                        </div>
                        
                        <!-- Main Content -->
                        <div class="flex-1 flex flex-col overflow-hidden">
                            <!-- Toolbar -->
                            <div class="flex items-center justify-between px-4 py-2 border-b border-her-text/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                                <div class="flex items-center gap-2">
                                    <button onclick="window.finderBack()" class="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Back">
                                        <svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                                    </button>
                                    <button onclick="window.finderForward()" class="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Forward">
                                        <svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                    </button>
                                    <button onclick="window.finderUp()" class="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Up">
                                        <svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                                    </button>
                                </div>
                                <div id="finder-path" class="text-sm font-medium opacity-70 truncate max-w-[200px] md:max-w-none">/home/guest</div>
                                <div class="flex items-center gap-1">
                                    <button onclick="window.finderToggleView('grid')" class="finder-view-btn p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" data-view="grid" title="Grid view">
                                        <svg class="w-4 h-4 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/></svg>
                                    </button>
                                    <button onclick="window.finderToggleView('list')" class="finder-view-btn p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" data-view="list" title="List view">
                                        <svg class="w-4 h-4 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- File Grid -->
                            <div id="finder-files" class="flex-1 overflow-y-auto p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 content-start">
                                <!-- Files injected by JS -->
                            </div>
                            
                            <!-- Status Bar -->
                            <div class="px-4 py-2 border-t border-her-text/10 dark:border-white/10 text-xs opacity-50 flex justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                                <span id="finder-item-count">0 items</span>
                                <span id="finder-storage">pietrOS Storage</span>
                            </div>
                        </div>
                    </div>
                `,
            width: 850,
            height: 550,
          },
          launchpad: {
            title: "Launchpad",
            content: `
                    <div id="launchpad-app" class="h-full flex flex-col bg-gradient-to-b from-black/80 to-black/90 backdrop-blur-xl p-6 md:p-8 select-none">
                        <!-- Search Bar -->
                        <div class="flex justify-center mb-8">
                            <div class="relative w-full max-w-md">
                                <svg class="w-4 h-4 absolute left-3 top-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" id="launchpad-search" placeholder="Search apps..." oninput="window.filterLaunchpad(this.value)" class="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm outline-none focus:border-white/40 transition-colors">
                            </div>
                        </div>
                        
                        <!-- Apps Grid -->
                        <div id="launchpad-grid" class="flex-1 overflow-y-auto grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 md:gap-6 content-start">
                            <!-- Apps injected by JS -->
                        </div>
                        
                        <!-- Hint -->
                        <div class="text-center text-white/30 text-xs mt-6">
                            Click an app to open, or click outside to close
                        </div>
                    </div>
                `,
            width: 900,
            height: 600,
          },
        };

        // window ops
        window.openWindow = function (id) {
          const winConfig = windows[id];
          if (!winConfig) return;

          if (!isHandlingAppRoute && isDeepLinkableApp(id)) {
            const currentApp = getDeepLinkedApp(window.location.href);
            if (currentApp !== id) {
              history.pushState({ app: id }, "", buildAppUrl(window.location.href, id));
            }
          }

          if (activeWindows[id]) {
            restoreWindow(id);
            return;
          }

          const activeElement = document.activeElement;
          const opener = activeElement instanceof HTMLElement && activeElement !== document.body
            ? activeElement
            : null;

          // Random positioning offset to prevent stacking
          const randX = Math.floor(Math.random() * 50);
          const randY = Math.floor(Math.random() * 50);

          // Container for dynamic window centering
          const container = document.getElementById("windows-container");
          const containerW = container.clientWidth;
          const containerH = container.clientHeight;

          // Mobile Detection
          const isMobile = window.innerWidth < 768;

          // Safe Area Calculation (Dock Buffer)
          const dockBuffer = isMobile ? 68 : 120;
          const maxAvailableHeight = containerH - dockBuffer;

          // Responsive Size Calculation - Full screen on mobile
          let finalW = isMobile ? containerW : winConfig.width;

          // Height Constraint: Full height on mobile (minus dock), clamp on desktop
          let finalH = winConfig.height;
          let heightStyle = ""; // Store CSS value string

          if (isMobile) {
            // Mobile: Adjust for dock and potential safe area
            // using dynamic height so it resizes with keyboard
            heightStyle = "calc(100vh - 85px)"; // slightly more than dock buffer to be safe
            finalH = maxAvailableHeight; // For initial calculation if needed, though style takes precedence
          } else {
            if (finalH > maxAvailableHeight) {
              finalH = maxAvailableHeight;
            }
            heightStyle = `${finalH}px`;
          }

          // Position: Edge-to-edge on mobile, centered on desktop
          let leftPos = isMobile
            ? 0
            : Math.max(0, (containerW - finalW) / 2) + randX;

          // Vertical position: Top on mobile, centered on desktop
          let topPos = isMobile
            ? 0
            : Math.max(10, (maxAvailableHeight - finalH) / 2) + randY;

          // Boundary Check: prevent overlap with dock (desktop only)
          if (!isMobile && topPos + finalH > maxAvailableHeight) {
            topPos = maxAvailableHeight - finalH;
            if (topPos < 10) topPos = 10;
          }

          const winEl = document.createElement("div");
          winEl.className =
            "window absolute flex flex-col active-window window-opening";
          winEl.id = `win-${id}`;
          winEl.setAttribute("role", "dialog");
          winEl.setAttribute("aria-labelledby", `win-title-${id}`);
          winEl.style.width = `${finalW}px`;
          winEl.style.height = heightStyle;
          winEl.style.left = `${leftPos}px`;
          winEl.style.top = `${topPos}px`;
          winEl.style.zIndex = incrementZIndex().toString();

          // macOS Header + Content
          winEl.innerHTML = `
                <div class="window-header" onmousedown="window.startDrag(event, '${id}')" ondblclick="window.toggleMaximize('${id}')">
                    <div class="controls-neon-flat" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                        <button class="btn-neon close" onclick="window.closeWindow('${id}')" aria-label="Close window"></button>
                        <button class="btn-neon min" onclick="window.minimizeWindow('${id}')" aria-label="Minimize window"></button>
                        <button class="btn-neon max" onclick="window.toggleMaximize('${id}')" aria-label="Maximize window"></button>
                    </div>
                    <span class="window-title" id="win-title-${id}">${winConfig.title}</span>
                </div>
                <div class="flex-1 relative overflow-hidden">
                    ${winConfig.content}
                </div>
            `;

          // Mouse down to bring to front
          winEl.addEventListener("mousedown", () => bringToFront(id));
          winEl.addEventListener("touchstart", () => bringToFront(id), {
            passive: true,
          });

          // 8-direction resize logic
          winEl.onmousemove = (e) => updateWindowCursor(e, winEl);
          winEl.onmousedown = (e) => {
            bringToFront(id);
            handleResizeStart(e, winEl, id);
          };

          // Add Touch Listeners for dragging
          addTouchListeners(winEl, id);

          document.getElementById("windows-container").appendChild(winEl);

          activeWindows[id] = {
            element: winEl,
            config: winConfig,
            maximized: false,
            opener,
            prevRect: null,
          };

          // Move keyboard users into the new dialog. App-specific focus (for
          // example the terminal input) can intentionally take over afterward.
          requestAnimationFrame(() => {
            winEl.querySelector<HTMLButtonElement>('.btn-neon.close')
              ?.focus({ preventScroll: true });
          });

          // Play window open sound
          playWindowOpen();

          // Trigger content entrance animations immediately (plays during window open)
          animateWindowContent(winEl);

          // Remove opening animation class after animation completes
          setTimeout(() => {
            winEl.classList.remove("window-opening");
          }, 450);

          // Dock State + Launch Bounce
          let dockItem = document.getElementById(`dock-${id}`);
          const appMetadata = getAppMetadata(id);
          if (!dockItem && appMetadata) {
            // Dynamically create a dock item for this app
            const dockContainer = document.querySelector('.dock-container');
            if (dockContainer) {
              const info = appMetadata;
              const button = document.createElement('button');
              button.type = 'button';
              button.id = `dock-${id}`;
              button.className = 'dock-item dock-item-dynamic cursor-pointer group';
              button.setAttribute('onclick', `restoreWindow('${id}')`);
              button.setAttribute('title', info.title);
              button.setAttribute('aria-label', `Open ${info.title}`);
              button.innerHTML = `
                <span class="dock-label">${info.title}</span>
                ${['snake', 'tictactoe', 'tetris', 'threes', 'doom'].includes(id) 
                  ? `<div style="transform: scale(1.2); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><img class="dock-icon" src="${info.icon}" alt="${info.title}" aria-hidden="true" /></div>`
                  : `<img class="dock-icon" src="${info.icon}" alt="${info.title}" aria-hidden="true" />`
                }
              `;
              // Add entry animation
              button.style.opacity = '0';
              button.style.transform = 'scale(0.3) translateY(20px)';
              dockContainer.appendChild(button);
              // Trigger animation
              requestAnimationFrame(() => {
                button.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                button.style.opacity = '1';
                button.style.transform = 'scale(1) translateY(0)';
                setTimeout(() => { button.style.transition = ''; button.style.transform = ''; }, 350);
              });
              refreshDockItems();
              dockItem = button;
            }
          }
          if (dockItem) {
            dockItem.classList.add("active");
            dockBounce(id);
          }

          // App specific logic init
          if (id === "monitor") startMonitor();
          if (id === "terminal")
            setTimeout(() => document.getElementById("cmd-input").focus(), 100);
          if (id === "vault") window.renderVault?.();
          if (id === "finder") window.initFinder();
          if (id === "launchpad") window.initLaunchpad();
          if (id === "settings") updateThemeUI();
          // Note: tetris/threes init already happens via their window config's onOpen below —
          // this used to duplicate that call, double-initializing the game on every open.

          // Generic onOpen callback from window config
          if (winConfig.onOpen) {
            winConfig.onOpen();
          }
        };

        function openDeepLinkedApp(): boolean {
          const appId = getDeepLinkedApp(window.location.href);
          if (!appId) return false;
          if (!isDeepLinkableApp(appId)) return false;
          if (!windows[appId]) return false;

          isHandlingAppRoute = true;
          try {
            window.openWindow(appId);
          } finally {
            isHandlingAppRoute = false;
          }
          return true;
        }

        window.addEventListener("popstate", openDeepLinkedApp);
        window.addEventListener("hashchange", openDeepLinkedApp);
        const openedDeepLink = openDeepLinkedApp();
        if (!openedDeepLink && shouldOpenFirstVisitIntro()) {
          isHandlingAppRoute = true;
          try {
            window.openWindow("about");
          } finally {
            isHandlingAppRoute = false;
          }
        }



        // md viewer
        // Markdown viewer — implemented in src/markdown-viewer.ts













        // clock — implemented in src/clock.ts
        initClock();

        // terminal
        function resolvePath(path) {
          const parts = path.split("/").filter((p) => p);
          let current = fileSystem["root"];

          for (let part of parts) {
            if (part === "root") continue;
            if (current[part] && typeof current[part] === "object") {
              current = current[part];
            } else {
              return null;
            }
          }
          return current;
        }



        function getTerminalPromptHTML() {
          if (TERMINAL_STATE.mode === "cyberpunk") {
            return `<div><span class="text-[#FF003C] font-bold">V@NET_ARCH</span><span class="text-white">:</span><span class="text-[#FCEE0A]">~/subnets</span><span class="text-[#FF003C]">$</span>`;
          }
          if (TERMINAL_STATE.mode === "fallout") {
            return `<div><span class="text-[#18dc04] font-bold">VAULT_DWELLER@PIPBOY</span> <span class="text-[#18dc04]">></span>`;
          }
          // Default pietrOS
          return `<div><span class="text-green-400 font-semibold">${TERMINAL_STATE.user}@${TERMINAL_STATE.host}</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>`;
        }

        // Forward declaration of handlers
        // Hook up imported terminal handlers
        (window as any).handleTerminalCommand = handleTerminalCommand;
        (window as any).handlePietrOSCommand = handlePietrOSCommand;
        (window as any).handleCyberpunkCommand = handleCyberpunkCommand;
        (window as any).handleFalloutCommand = handleFalloutCommand;
        (window as any).resetTerminalSubModes = resetTerminalSubModes;



        window.renderVault = function () {
          const grid = document.getElementById("vault-grid");
          if (!grid) return;
          grid.innerHTML = "";

          vaultData.forEach((item, i) => {
            const hasItems = item.items && item.items.length > 0;
            const isClickable = !!(item.url || item.file || item.appId || hasItems);
            const card = document.createElement(item.url ? "a" : isClickable ? "button" : "div");
            card.className =
              "p-3 md:p-4 border border-her-text/10 rounded-lg bg-white/60 dark:bg-white/5 hover:border-her-red/50 hover:-translate-y-0.5 transition-all group vault-card-animate text-left w-full" +
              (isClickable ? " cursor-pointer" : "");
            card.style.animationDelay = `${i * 50}ms`;
            if (card instanceof HTMLButtonElement) card.type = "button";
            if (card instanceof HTMLAnchorElement && item.url) {
              card.href = item.url;
              card.target = "_blank";
              card.rel = "noopener noreferrer";
            } else if (item.appId) {
              card.addEventListener("click", () => window.openWindow(item.appId!));
            } else if (item.file) {
              card.addEventListener("click", () => window.openMarkdownViewer(item.file!, item.title));
            } else if (hasItems) {
              card.addEventListener("click", () => window.vaultShowDetail(item.id));
            }

            // Badge icon
            let badge = '';
            if (item.url) {
              badge = '<svg class="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
            } else if (item.file) {
              badge = '<svg class="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
            } else if (item.appId || hasItems) {
              badge = '<svg class="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>';
            }

            card.innerHTML = `
                    <div class="flex items-start justify-between mb-2 md:mb-3">
                        ${item.icon}
                        ${badge}
                    </div>
                    <div class="font-bold text-xs md:text-sm mb-1 group-hover:text-her-red transition-colors">${item.title}</div>
                    <div class="text-[10px] md:text-xs opacity-60 line-clamp-2">${item.desc}</div>
                `;
            grid.appendChild(card);
          });
        };

        // Show vault detail view for a category
        window.vaultShowDetail = function (id: string) {
          const item = vaultData.find(v => v.id === id);
          if (!item || !item.items) return;
          const grid = document.getElementById("vault-grid");
          const detail = document.getElementById("vault-detail");
          const backBtn = document.getElementById("vault-back-btn");
          const titleEl = document.getElementById("vault-title");
          const subtitleEl = document.getElementById("vault-subtitle");
          if (grid) grid.classList.add("hidden");
          if (backBtn) backBtn.classList.remove("hidden");
          if (titleEl) titleEl.innerHTML = `${item.icon} ${item.title}`;
          if (subtitleEl) subtitleEl.textContent = item.desc;
          if (detail) {
            detail.classList.remove("hidden");
            detail.innerHTML = `<div class="flex flex-col gap-1.5">
              ${item.items.map((sub: { name: string; desc?: string; url?: string }) => {
                if (sub.url) {
                  return `<a href="${sub.url}" target="_blank" rel="noopener" class="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg bg-black/5 dark:bg-white/5 hover:bg-her-red/10 hover:text-her-red transition-colors">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium">${sub.name}</div>
                      ${sub.desc ? `<div class="text-xs opacity-50 mt-0.5 truncate">${sub.desc}</div>` : ''}
                    </div>
                    <svg class="w-3.5 h-3.5 opacity-30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </a>`;
                }
                return `<div class="px-3 py-2 text-sm rounded-lg bg-black/5 dark:bg-white/5">${sub.name}</div>`;
              }).join('')}
            </div>`;
          }
        };

        // Return to vault grid view
        window.vaultShowGrid = function () {
          const grid = document.getElementById("vault-grid");
          const detail = document.getElementById("vault-detail");
          const backBtn = document.getElementById("vault-back-btn");
          const titleEl = document.getElementById("vault-title");
          const subtitleEl = document.getElementById("vault-subtitle");
          if (grid) grid.classList.remove("hidden");
          if (detail) detail.classList.add("hidden");
          if (backBtn) backBtn.classList.add("hidden");
          if (titleEl) titleEl.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Personal Vault';
          if (subtitleEl) subtitleEl.textContent = 'Skills, resources & things I like';
        };

        // =====================================
        // FINDER APP FUNCTIONS
        // =====================================
        let finderCurrentPath = "/home/guest";
        let finderHistory: string[] = ["/home/guest"];
        let finderHistoryIndex = 0;
        let finderViewMode = "grid";
        let finderSelectedFile: string | null = null;

        window.initFinder = function () {
          window.finderNavigate("/home/guest");
        };

        window.finderNavigate = function (path: string) {
          finderCurrentPath = path;
          finderSelectedFile = null; // Clear selection on nav
          
          // Add to history if navigating forward
          if (finderHistoryIndex < finderHistory.length - 1) {
            finderHistory = finderHistory.slice(0, finderHistoryIndex + 1);
          }
          if (finderHistory[finderHistory.length - 1] !== path) {
            finderHistory.push(path);
            finderHistoryIndex = finderHistory.length - 1;
          }
          
          window.finderRender();
        };

        window.finderBack = function () {
          if (finderHistoryIndex > 0) {
            finderHistoryIndex--;
            finderCurrentPath = finderHistory[finderHistoryIndex];
            window.finderRender();
          }
        };

        window.finderForward = function () {
          if (finderHistoryIndex < finderHistory.length - 1) {
            finderHistoryIndex++;
            finderCurrentPath = finderHistory[finderHistoryIndex];
            window.finderRender();
          }
        };

        window.finderUp = function () {
          const parts = finderCurrentPath.split("/").filter(p => p);
          if (parts.length > 0) {
            parts.pop();
            const parentPath = "/" + parts.join("/");
            window.finderNavigate(parentPath || "/");
          }
        };

        window.finderToggleView = function (mode: string) {
          finderViewMode = mode;
          window.finderRender();
        };

        window.finderSelect = function (fileName: string) {
            finderSelectedFile = fileName;
            // visual update only to avoid full re-render
            const items = document.querySelectorAll(".finder-item");
            items.forEach(el => {
                if (el.getAttribute("data-name") === fileName) {
                    el.classList.add("bg-blue-500/20", "border-blue-500/50");
                } else {
                    el.classList.remove("bg-blue-500/20", "border-blue-500/50");
                }
            });
            // Update status bar
            const countEl = document.getElementById("finder-item-count");
            if (countEl) countEl.textContent = `Selected: ${fileName}`;
        };

        window.finderOpenFile = function (fileName: string) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            
            if (ext === 'md') {
                if (fileName.toLowerCase() === 'readme.md') {
                    window.openWindow('about'); 
                } else {
                    window.openMarkdownViewer(`/home/guest/${fileName}`, fileName);
                }
            } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
                 const viewerId = `img-${fileName.replace(/[^a-z0-9]/gi, '')}`;
                 if (activeWindows[viewerId]) {
                    restoreWindow(viewerId, undefined);
                    return;
                 }
                 let imgSrc = '';
                 if (fileName === 'vacation.jpg') imgSrc = '/assets/finder/vacation.webp';
                 else if (fileName === 'setup.png') imgSrc = '/assets/finder/setup.webp';
                 else imgSrc = 'https://via.placeholder.com/400x300?text=' + fileName;

                 const winContent = `<div class="h-full flex items-center justify-center bg-black/90 p-4"><img src="${imgSrc}" class="max-w-full max-h-full rounded shadow-lg"></div>`;
                 
                const winId = viewerId;
                const winEl = document.createElement("div");
                winEl.className = "window absolute flex flex-col active-window window-opening";
                winEl.id = `win-${winId}`;
                winEl.style.width = "600px";
                winEl.style.height = "500px";
                winEl.style.left = "100px";
                winEl.style.top = "100px";
                winEl.style.zIndex = incrementZIndex().toString();
                winEl.innerHTML = `
                    <div class="window-header" onmousedown="window.startDrag(event, '${winId}')" ondblclick="window.toggleMaximize('${winId}')">
                        <div class="controls-neon-flat" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                             <button class="btn-neon close" onclick="window.closeWindow('${winId}')"></button>
                             <button class="btn-neon min" onclick="window.minimizeWindow('${winId}')"></button>
                             <button class="btn-neon max" onclick="window.toggleMaximize('${winId}')"></button>
                        </div>
                        <span class="window-title">${fileName}</span>
                    </div>
                    <div class="flex-1 relative overflow-hidden">${winContent}</div>
                `;
                winEl.onmousedown = () => bringToFront(winId);
                const container = document.getElementById("windows-container");
                if (container) container.appendChild(winEl);
                activeWindows[winId] = { element: winEl, config: { title: fileName, content: winContent, width: 600, height: 500 }, maximized: false };
                setTimeout(() => winEl.classList.remove("window-opening"), 350);

            } else {
                const content = `Preview of ${fileName}\n\nThis is a simulated file content.`;
                const viewerId = `txt-${fileName.replace(/[^a-z0-9]/gi, '')}`;
                 if (activeWindows[viewerId]) {
                    restoreWindow(viewerId, undefined);
                    return;
                 }
                const winId = viewerId;
                const winEl = document.createElement("div");
                winEl.className = "window absolute flex flex-col active-window window-opening";
                winEl.id = `win-${winId}`;
                winEl.style.width = "500px";
                winEl.style.height = "400px";
                winEl.style.left = "150px";
                winEl.style.top = "150px";
                winEl.style.zIndex = incrementZIndex().toString();
                winEl.innerHTML = `
                    <div class="window-header" onmousedown="window.startDrag(event, '${winId}')" ondblclick="window.toggleMaximize('${winId}')">
                        <div class="controls-neon-flat" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                             <button class="btn-neon close" onclick="window.closeWindow('${winId}')"></button>
                             <button class="btn-neon min" onclick="window.minimizeWindow('${winId}')"></button>
                             <button class="btn-neon max" onclick="window.toggleMaximize('${winId}')"></button>
                        </div>
                        <span class="window-title">${fileName}</span>
                    </div>
                    <div class="flex-1 relative overflow-hidden bg-[#1e1e1e] text-gray-300 p-4 font-mono text-xs whitespace-pre-wrap">${content}</div>
                `;
                winEl.onmousedown = () => bringToFront(winId);
                const container = document.getElementById("windows-container");
                if (container) container.appendChild(winEl);
                activeWindows[winId] = { element: winEl, config: { title: fileName, content: content, width: 500, height: 400 }, maximized: false };
                setTimeout(() => winEl.classList.remove("window-opening"), 350);
            }
        };

        // (markdown viewer is in src/markdown-viewer.ts; an old duplicate stub was removed)

        window.finderRender = function () {
          const pathEl = document.getElementById("finder-path");
          const filesEl = document.getElementById("finder-files");
          const countEl = document.getElementById("finder-item-count");
          
          if (!pathEl || !filesEl || !countEl) return;
          
          pathEl.textContent = finderCurrentPath;
          
          // Get current directory contents from fileSystem
          const parts = finderCurrentPath.split("/").filter(p => p);
          let current: any = fileSystem.root;
          
          for (const part of parts) {
            if (current && current[part] !== undefined) {
              current = current[part];
            } else {
              current = null;
              break;
            }
          }
          
          filesEl.innerHTML = "";
          
          if (!current || typeof current === "string") {
            filesEl.innerHTML = '<div class="col-span-full text-center opacity-50 py-8">No items</div>';
            countEl.textContent = "0 items";
            return;
          }
          
          const entries = Object.entries(current);
          countEl.textContent = `${entries.length} item${entries.length !== 1 ? 's' : ''}`;
          
          // Update sidebar active state
          document.querySelectorAll(".finder-nav-item").forEach((btn) => {
            const btnPath = btn.getAttribute("data-path");
            if (btnPath === finderCurrentPath) {
              btn.classList.add("bg-her-red/20", "text-her-red");
            } else {
              btn.classList.remove("bg-her-red/20", "text-her-red");
            }
          });
          
          entries.forEach(([name, value]) => {
            const isFile = value === "FILE";
            const isHidden = name.startsWith(".");
            
            const item = document.createElement("div");
            item.className = `finder-item flex flex-col items-center gap-2 p-3 rounded-lg border border-transparent hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 ${isHidden ? 'opacity-50' : ''}`;
            item.setAttribute("data-name", name);
            
            // Icon selection based on extension/type
            let icon = '';
            if (!isFile) {
                // Directory
                icon = `<svg class="w-10 h-10 text-blue-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
            } else {
                // File icons
                const ext = name.split('.').pop()?.toLowerCase();
                if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
                     icon = `<svg class="w-10 h-10 text-purple-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
                } else if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'c', 'cpp'].includes(ext || '')) {
                     icon = `<svg class="w-10 h-10 text-yellow-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
                } else if (['md', 'txt', 'rtf'].includes(ext || '')) {
                     icon = `<svg class="w-10 h-10 text-gray-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
                } else {
                     // Default file
                     icon = `<svg class="w-10 h-10 text-gray-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
                }
            }
            
            item.innerHTML = `
              ${icon}
              <span class="text-xs text-center truncate w-full">${name}</span>
            `;
            
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.finderSelect(name);
            };
            
            item.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFile) {
                    window.finderOpenFile(name);
                } else {
                    window.finderNavigate(`${finderCurrentPath}/${name}`.replace("//", "/"));
                }
            };
            
            filesEl.appendChild(item);
          });
        };

        // Launchpad — implemented in src/launchpad.ts
        // Monitor (system dashboard) — implemented in src/monitor.ts

        // Initial site Launch - start with clean desktop
        // (Windows can be opened from the dock)
      });

registerServiceWorker();
