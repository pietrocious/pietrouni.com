
// config - static data
import { fileSystem } from './config';
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
  buildAppUrl,
  getAppMetadata,
  getDeepLinkedApp,
  isDeepLinkableApp,
} from './app-registry';
import { windowConfigs } from './windows/configs';

// Vercel Web Analytics
import { inject } from '@vercel/analytics';

import { handleTerminalCommand } from './terminal/core';
import { handlePietrOSCommand, resetTerminalSubModes } from './terminal/pietros';
import { handleCyberpunkCommand } from './terminal/cyberpunk';
import { handleFalloutCommand } from './terminal/fallout';



// state - shared app state with setters for mutations
import {
  activeWindows, incrementZIndex,
  TERMINAL_STATE,
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

document.addEventListener("DOMContentLoaded", () => {
        // The static summary remains crawlable and is visible without JS, but
        // should not add duplicate invisible links to the interactive tab order.
        const portfolioSummary = document.getElementById("portfolio-summary");
        if (portfolioSummary instanceof HTMLElement) portfolioSummary.inert = true;

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

        // Production is hosted on Vercel, so its first-party analytics endpoint is available.
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

        // window ops
        window.openWindow = function (id) {
          const winConfig = windowConfigs[id];
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
            winConfig.onOpen(winEl);
          }
        };

        function openDeepLinkedApp(): boolean {
          const appId = getDeepLinkedApp(window.location.href);
          if (!appId) return false;
          if (!isDeepLinkableApp(appId)) return false;
          if (!windowConfigs[appId]) return false;

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
