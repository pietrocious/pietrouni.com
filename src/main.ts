import { marked } from 'marked';

// Lab Icons
import snakeIcon from './assets/icons/lab/snake.png';
import game2048Icon from './assets/icons/lab/2048.png';
import tictactoeIcon from './assets/icons/lab/tictactoe.png';
import tetrisIcon from './assets/icons/lab/tetris.png';
import threesIcon from './assets/icons/lab/threes.png';
import doomIcon from './assets/icons/lab/doom.png';



// config - static data
import { fileSystem, asciiAlpha, PIETROS_COMMANDS, CYBERPUNK_COMMANDS, FALLOUT_COMMANDS } from './config';
import { vaultData } from './vault';
import { initTetris, destroyTetris } from './games/tetris';
import { initIaCVisualizer, destroyIaCVisualizer } from './apps/iac-visualizer';
import { initNetworkTopology, destroyNetworkTopology } from './apps/network-topology';
import { initThrees, destroyThrees } from './games/threes';
import { initDock, dockBounce, refreshDockItems } from './dock';
import { animateWindowContent } from './animations';
import { initVanta, destroyVanta, updateVantaTheme, isVantaActive } from './vanta';
import { initAudio, playClick, playWindowOpen, isSoundEnabled, toggleSound } from './audio';
import { initTicTacToe, destroyTicTacToe } from './games/tic-tac-toe';
import { initGame2048, destroyGame2048 } from './games/game-2048';
import { initSnake, destroySnake } from './games/snake';
import { initDoom, destroyDoom } from './games/doom';
import { handleTerminalCommand } from './terminal/core';
import { handlePietrOSCommand, resetTerminalSubModes } from './terminal/pietros';
import { handleCyberpunkCommand } from './terminal/cyberpunk';
import { handleFalloutCommand } from './terminal/fallout';



// state - shared app state with setters for mutations
import {
  activeWindows, incrementZIndex, wallpapers, allWallpaperClasses,
  currentPath, setCurrentPath, terminalHistory, pushTerminalHistory,
  terminalHistoryIndex, setTerminalHistoryIndex, guessGame, ciscoMode, terraformMode,
  shuffledQuotes, quoteIndex, setQuoteIndex, reshuffleQuotes, TERMINAL_STATE,
  activeWallpaperIndex, setActiveWallpaperIndex, monitorInterval, setMonitorInterval,
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

document.addEventListener("DOMContentLoaded", () => {
        // config object (kept for potential future use)
        const config = {};

        // expose window manager functions globally for HTML onclick handlers
        window.closeWindow = closeWindow;
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

        // expose sound toggle for settings
        window.toggleSound = toggleSound;
        window.isSoundEnabled = isSoundEnabled;

        // dock click sound via event delegation
        const dockContainer = document.querySelector('.dock-container');
        if (dockContainer) {
          dockContainer.addEventListener('click', () => playClick());
        }

        function applyWallpaperClasses(wp: (typeof wallpapers)[0], isDark: boolean, desktop: HTMLElement) {
          desktop.style.background = "";
          allWallpaperClasses.forEach((cls) => desktop.classList.remove(cls));
          if (wp.type === "class") {
            desktop.classList.add(isDark ? wp.dark : wp.light);
            destroyVanta();
          } else if (wp.type === "gradient") {
            desktop.style.background = isDark ? wp.dark : wp.light;
            destroyVanta();
          } else if (wp.type === "vanta" && wp.vantaEffect) {
            desktop.style.background = "";
            initVanta(wp.vantaEffect, isDark, desktop);
          }
        }

        function applyWallpaper(animate = false) {
          const isDark = document.documentElement.classList.contains("dark");
          const wp = wallpapers[activeWallpaperIndex];
          const desktop = document.getElementById("desktop");
          if (!desktop) return;

          // If switching away from vanta, no cross-fade needed (canvas unmounts)
          const skipFade = wp.type === "vanta" || isVantaActive();

          if (animate && !skipFade) {
            // Cross-fade: freeze current look in ::before, swap underneath, then fade ::before out
            desktop.classList.add("wallpaper-transitioning");
            requestAnimationFrame(() => {
              applyWallpaperClasses(wp, isDark, desktop);
              requestAnimationFrame(() => {
                desktop.classList.remove("wallpaper-transitioning");
              });
            });
          } else {
            applyWallpaperClasses(wp, isDark, desktop);
          }

        }

        // theme + wallpaper
        function setTheme(dark: boolean) {
          const desktop = document.getElementById("desktop");
          if (dark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          desktop.classList.remove("her-bg", "her-bg-dark");
          // If a vanta effect is active, update its colors live rather than full reinit
          if (isVantaActive()) {
            updateVantaTheme(dark);
          }
          applyWallpaper();

          // notify iframes
          const newTheme = dark ? "dark" : "light";
          document.querySelectorAll("iframe").forEach((frame) => {
            frame.contentWindow.postMessage(
              { type: "theme-change", theme: newTheme },
              "*"
            );
          });
        }

        function initTheme() {
          // Resolve initial theme: explicit localStorage > system preference
          const prefersDark =
            localStorage.theme === "dark" ||
            (!("theme" in localStorage) &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          setTheme(prefersDark);
          updateThemeUI();

          // Live-sync with OS preference when user hasn't manually overridden
          window
            .matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", (e) => {
              if (!("theme" in localStorage)) {
                setTheme(e.matches);
                updateThemeUI();
              }
            });
        }

        function updateThemeUI() {
          const mode = localStorage.theme || "system";
          const isDark = document.documentElement.classList.contains("dark");
          // Update settings label
          const label = document.getElementById("settings-theme-label");
          if (label) {
            const labels: Record<string, string> = { light: "Light Mode", dark: "Dark Mode", system: "System (" + (isDark ? "Dark" : "Light") + ")" };
            label.textContent = labels[mode] || labels.system;
          }
          // Update segmented control active state
          document.querySelectorAll(".theme-seg-btn").forEach((btn) => {
            const el = btn as HTMLElement;
            const isActive = el.dataset.mode === mode;
            if (isActive) {
              el.classList.add("bg-her-red", "text-white");
              el.classList.remove("hover:bg-black/10", "dark:hover:bg-white/10");
            } else {
              el.classList.remove("bg-her-red", "text-white");
              el.classList.add("hover:bg-black/10", "dark:hover:bg-white/10");
            }
          });
        }

        window.setThemeMode = function (mode: string) {
          if (mode === "system") {
            localStorage.removeItem("theme");
            setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
          } else {
            localStorage.theme = mode;
            setTheme(mode === "dark");
          }
          updateThemeUI();
        };

        // Menu bar button — simple light/dark flip (pins the choice)
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

        window.toggleTheme = function () {
          const goingDark = !document.documentElement.classList.contains("dark");
          window.setThemeMode(goingDark ? "dark" : "light");
        };

        window.cycleWallpaper = function () {
          setActiveWallpaperIndex((activeWallpaperIndex + 1) % wallpapers.length);
          applyWallpaper(true);
        };

        // set wallpaper by index (for settings grid)
        window.setWallpaper = function (index: number) {
          if (index >= 0 && index < wallpapers.length) {
            setActiveWallpaperIndex(index);
            applyWallpaper(true);
          }
        };

        window.addEventListener("message", (event) => {
          if (event.data && event.data.type === "request-theme") {
            const currentTheme = document.documentElement.classList.contains(
              "dark"
            )
              ? "dark"
              : "light";
            event.source.postMessage(
              { type: "theme-change", theme: currentTheme },
              "*"
            );
          }
        });

        // Listen for real-time system theme changes
        window
          .matchMedia("(prefers-color-scheme: dark)")
          .addEventListener("change", (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!("theme" in localStorage)) {
              if (e.matches) {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
              applyWallpaper();
              // Notify iframes of theme change
              const frames = document.querySelectorAll("iframe");
              const newTheme = e.matches ? "dark" : "light";
              frames.forEach((frame) => {
                frame.contentWindow.postMessage(
                  { type: "theme-change", theme: newTheme },
                  "*"
                );
              });
            }
          });

        initTheme();

        // spotlight (ctrl+k)
        window.toggleSpotlight = function () {
          const spot = document.getElementById("spotlight");
          const box = document.getElementById("spotlight-box");
          const input = document.getElementById("spotlight-input");

          if (spot.classList.contains("hidden")) {
            spot.classList.remove("hidden");
            spot.classList.add("flex");
            setTimeout(() => {
              box.classList.remove("scale-95", "opacity-0");
              box.classList.add("scale-100", "opacity-100");
              input.focus();
            }, 10);
            window.handleSearch("");
          } else {
            box.classList.remove("scale-100", "opacity-100");
            box.classList.add("scale-95", "opacity-0");
            setTimeout(() => {
              spot.classList.add("hidden");
              spot.classList.remove("flex");
            }, 300);
          }
        };

        // Focus trapping for spotlight
        function trapFocusInSpotlight(e) {
          const spot = document.getElementById("spotlight");
          if (spot.classList.contains("hidden")) return;

          const spotlightBox = document.getElementById("spotlight-box");
          const focusableElements = spotlightBox.querySelectorAll(
            'input, button, [tabindex]:not([tabindex="-1"]), .spotlight-result'
          );
          const firstFocusable = focusableElements[0];
          const lastFocusable = focusableElements[focusableElements.length - 1];

          if (e.key === "Tab") {
            if (e.shiftKey) {
              // Shift + Tab
              if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable?.focus();
              }
            } else {
              // Tab
              if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable?.focus();
              }
            }
          }
        }

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

        window.handleSearch = function (query) {
          const container = document.getElementById("spotlight-results");
          container.innerHTML = "";
          const term = query.toLowerCase().trim();

          // Define all apps with same icons as dock
          const spotlightApps = [
            { id: "finder", title: "Finder", icon: "assets/icons/org.gnome.Nautilus.svg" },
            { id: "about", title: "README.md", icon: "assets/icons/org.gnome.Logs.svg" },
            { id: "projects", title: "Projects", icon: "assets/icons/org.gnome.tweaks.svg" },
            { id: "vault", title: "Vault", icon: "assets/icons/org.gnome.FileRoller.svg" },
            { id: "terminal", title: "Terminal", icon: "assets/icons/org.gnome.Terminal.svg" },
            { id: "settings", title: "Settings", icon: "assets/icons/org.gnome.Settings.svg" },
            { id: "experiments", title: "Lab", icon: "assets/icons/characters.svg" },
            { id: "sysinfo", title: "About", icon: "assets/icons/contacts.svg" },
          ];

          // If no search term, show app grid (like macOS 26 Siri/Spotlight)
          if (!term) {
            container.innerHTML = `
              <div class="p-4">
                <div class="text-[10px] uppercase font-bold opacity-40 tracking-wider mb-3">Applications</div>
                <div class="grid grid-cols-5 gap-3">
                  ${spotlightApps.map(app => `
                    <div 
                      class="spotlight-app flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all hover:scale-105"
                      onclick="restoreWindow('${app.id}'); toggleSpotlight();"
                      role="button"
                      tabindex="0"
                      onkeydown="if(event.key==='Enter'){restoreWindow('${app.id}'); toggleSpotlight();}"
                    >
                      <img src="${app.icon}" alt="${app.title}" class="w-10 h-10 drop-shadow-sm" />
                      <span class="text-[10px] text-center truncate w-full opacity-70">${app.title}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            `;
            return;
          }

          const results = [];

          // Search apps
          spotlightApps.forEach(app => {
            if (app.title.toLowerCase().includes(term) || app.id.includes(term)) {
              results.push({
                title: app.title,
                desc: "Application",
                action: `restoreWindow('${app.id}'); toggleSpotlight();`,
                icon: `<img src="${app.icon}" alt="${app.title}" class="w-8 h-8" />`,
              });
            }
          });

          // Search Vault
          vaultData.forEach((item) => {
            if (
              item.title.toLowerCase().includes(term) ||
              item.desc.toLowerCase().includes(term)
            ) {
              results.push({
                title: item.title,
                desc: `Vault • ${item.desc}`,
                action: item.url
                  ? `window.open('${item.url}', '_blank'); toggleSpotlight();`
                  : `restoreWindow('vault'); toggleSpotlight();`,
                icon: `<div class="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>`,
              });
            }
          });

          if (results.length === 0) {
            container.innerHTML = `<div class="p-4 text-center opacity-50 text-sm">No results found.</div>`;
            return;
          }

          results.forEach((res, idx) => {
            const div = document.createElement("div");
            div.className = `spotlight-result p-3 flex items-center gap-3 border-b border-her-red/5 last:border-0 ${
              idx === 0 ? "selected" : ""
            }`;
            div.setAttribute("tabindex", "0");
            div.setAttribute("role", "option");
            div.setAttribute("aria-selected", idx === 0 ? "true" : "false");
            if (res.action) {
              div.setAttribute("onclick", res.action);
              div.setAttribute(
                "onkeydown",
                `if(event.key==='Enter'){${res.action}}`
              );
            }

            div.innerHTML = `
                    ${res.icon}
                    <div>
                        <div class="font-bold text-sm text-her-text dark:text-her-textLight">${res.title}</div>
                        <div class="text-xs opacity-60">${res.desc}</div>
                    </div>
                 `;
            container.appendChild(div);
          });
        };

        window.executeSearchResult = function () {
          const first = document.querySelector(".spotlight-result");
          if (first) first.click();
        };

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
                                        <span class="font-display font-bold text-base">Copernicus</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">README (Body)</span>
                                        <span class="font-serif text-base">Tiempos Text</span>
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
                            <!-- My Journey -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">My Journey</h2>
                                <p class="opacity-90">
                                    I'm an Infrastructure Engineer specializing in AWS architecture and infrastructure-as-code automation. My path into cloud started with enterprise infrastructure, I spent over three years at <span class="font-semibold text-her-red dark:text-her-red">Cisco TAC</span> solving complex routing, switching, and SDN problems for Fortune 500 customers. That foundation taught me how distributed systems actually work under the hood.
                                </p>
                                <p class="opacity-90 mt-4">
                                    These days, I focus on building reliable cloud infrastructure. My current work centers on architecting AWS environments using Terraform, implementing CI/CD automation, and designing secure, highly-available systems that leverage cloud-native services.
                                </p>
                            </div>

                            <!-- What I'm Building -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">What I'm Building</h2>
                                <p class="opacity-90 mb-4">
                                    I have several projects here, please check <a href="#" onclick="openWindow('projects'); return false;" class="content-link">Projects</a> or my <a href="https://github.com/pietrocious" target="_blank" class="content-link">GitHub</a> to see what I'm working on.</p>
                            </div>

                            <!-- Why Cloud Engineering -->
                            <div>
                                <h2 class="text-lg font-display font-bold text-her-dark dark:text-her-cream mt-4 mb-2">Why Cloud Engineering?</h2>
                                <p class="opacity-90">
                                    After years of troubleshooting other people's infrastructure, I want to be the one designing and building it. Cloud engineering lets me leverage that infrastructure foundation while learning modern automation patterns like IaC, containers, orchestration, and CI/CD.
                                </p>
                            </div>

                            <!-- Beyond Work -->
                            <div>
                                <h2 class="text-lg font-display font-extrabold text-her-dark dark:text-her-cream mt-4 mb-2">Beyond Work</h2>
                                <p class="opacity-90">
                                    Outside of infrastructure work, I listen to music across pretty much every genre, play games when I have time, and enjoy understanding how complex systems get built. I'm fascinated by how architecture decisions make something actually work at such a scale, and how much we're all standing on the shoulders of giants.
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
                                    <a href="https://github.com/pietrocious" target="_blank" class="text-her-red dark:text-her-red hover:opacity-70 transition-opacity" title="GitHub">
                                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                                    </a>
                                    <a href="https://linkedin.com/in/pietrouni" target="_blank" class="text-her-red dark:text-her-red hover:opacity-70 transition-opacity" title="LinkedIn">
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
          projects: {
            title: "Projects",
            content: `
                     <div class="h-full dyn-p font-ui overflow-y-auto window-content selection:bg-her-red selection:text-white p-2" style="min-width: 500px;">
                        <!-- Header -->
                        <div class="mb-6 p-4">
                            <h1 class="font-ui font-bold text-2xl text-her-dark dark:text-her-textLight">Projects</h1>
                        </div>

                        <div class="space-y-8 p-2">

                            <!-- Current Projects -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    Current Projects
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    <!-- Terraform AWS Modules -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 0ms" onclick="window.open('https://github.com/pietrocious/terraform-aws-pietrouni', '_blank')">
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
                                    </div>

                                    <!-- pietrouni.com -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 50ms" onclick="window.open('https://github.com/pietrocious/pietrouni.com', '_blank')">
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
                                    </div>

                                </div>
                            </div>

                            <!-- Coming Soon -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Coming Soon
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    <!-- psbp-scripts -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg transition-colors vault-card-animate flex flex-col h-full" style="animation-delay: 100ms">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">psbp-scripts</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-bold border border-yellow-200 dark:border-yellow-900/50">Coming Soon</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">PowerShell, bash and Python scripts for network automation, home lab automation and experiments.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">POWERSHELL</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">BASH</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">PYTHON</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-50">
                                                <span class="flex items-center gap-1 cursor-not-allowed"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>Coming soon</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- runcible -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg transition-colors vault-card-animate flex flex-col h-full" style="animation-delay: 150ms">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">runcible</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-bold border border-yellow-200 dark:border-yellow-900/50">Coming Soon</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">An out-of-place artifact (OOPArt) — a self-contained AI knowledge system for edge hardware. Exploring how to compress human knowledge into the smallest viable form factor.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">PYTHON</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">LLM</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">RASPBERRY PI</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-50">
                                                <span class="flex items-center gap-1 cursor-not-allowed"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>Coming soon</span>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- AWS Multi-Region DR Setup -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg transition-colors vault-card-animate flex flex-col h-full" style="animation-delay: 200ms">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">AWS Multi-Region DR Setup</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-bold border border-yellow-200 dark:border-yellow-900/50">Coming Soon</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Disaster recovery architecture demonstrating cross-region replication, failover automation, and backup strategies. Will showcase Route53 health checks, S3 cross-region replication, and RDS read replicas.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AWS</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TERRAFORM</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AUTOMATION</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-50">
                                                <span class="flex items-center gap-1 cursor-not-allowed"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>Coming soon</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Kubernetes Homelab Cluster -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg transition-colors vault-card-animate flex flex-col h-full" style="animation-delay: 250ms">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">Kubernetes Homelab Cluster</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-bold border border-yellow-200 dark:border-yellow-900/50">Coming Soon</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Self-hosted K8s cluster for learning container orchestration. Planning to deploy monitoring stack (Prometheus/Grafana), practice Helm charts, and document the full setup process.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">KUBERNETES</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">HELM</span>
                                                <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">RASPBERRY PI</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-50">
                                                <span class="flex items-center gap-1 cursor-not-allowed"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>Coming soon</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>

                            <!-- Personal Projects -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                    Personal Projects
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    <!-- suprsymmetry.com -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 0ms" onclick="window.open('https://suprsymmetry.com/', '_blank')">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">suprsymmetry.com</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Creative</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">AI art studio for generative art and concept art. Features Gemini-powered image generation with a sleek nocturne-themed interface.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">REACT</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">GEMINI</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AI</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-60">
                                                <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>Live Site</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- cerebralwwaves.com -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 50ms" onclick="window.open('https://cerebralwwaves.com/', '_blank')">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">cerebralwwaves.com</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Creative</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Creative experimental space with an obsidian cinema aesthetic. Features AI-powered content generation with a dark, cinematic interface.</p>
                                        <div class="mt-auto">
                                            <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">REACT</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">GEMINI</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AI</span>
                                            </div>
                                            <div class="flex gap-3 text-xs opacity-60">
                                                <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>Live Site</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <!-- Footer Message -->
                            <div class="mt-8 text-center text-sm opacity-50 text-her-dark dark:text-her-textLight">
                                <p class="font-semibold">More projects and categories will be added soon</p>
                                <p class="text-xs mt-1">Including research papers, open source contributions, and experimental projects</p>
                            </div>

                        </div>
                     </div>
                `,
            width: 900,
            height: 700,
          },

          vault: {
            title: "Personal Vault",
            content: `
                    <div id="vault-app" class="h-full flex flex-col font-ui" style="min-width: 400px;">
                        <!-- Header -->
                        <div class="px-6 py-4 border-b border-her-text/10 flex items-center gap-3">
                            <button id="vault-back-btn" onclick="window.vaultShowGrid()" class="hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Back to files">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <div>
                                <h2 id="vault-title" class="text-lg font-serif font-extrabold text-her-red dark:text-her-red flex items-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    Personal Vault
                                </h2>
                                <p id="vault-subtitle" class="text-xs opacity-50 mt-1">Skills, resources & things I like</p>
                            </div>
                        </div>

                        <!-- Grid View -->
                        <div id="vault-grid" class="flex-1 overflow-y-auto p-3 md:p-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 content-start">
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
              setTimeout(() => {
                const container = document.getElementById("ttt-container");
                if (container) initTicTacToe(container);
              }, 50);
            },
            onClose: () => {
              destroyTicTacToe();
            },
          },

          game2048: {
            title: "2048",
            content: `
                    <div id="game2048-container" class="h-full flex flex-col items-center justify-center bg-[#faf8ef] select-none p-4 w-full">
                        <!-- Canvas injected by TS -->
                    </div>
                `,
            width: 580,
            height: 720,
            onOpen: () => {
              setTimeout(() => {
                const container = document.getElementById("game2048-container");
                if (container) initGame2048(container);
              }, 50);
            },
            onClose: () => {
              destroyGame2048();
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
              setTimeout(() => {
                const container = document.getElementById("snake-container");
                if (container) initSnake(container);
              }, 50);
            },
            onClose: () => {
              destroySnake();
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
              setTimeout(() => {
                const container = document.getElementById("doom-container");
                if (container) initDoom(container);
              }, 100);
            },
            onClose: () => {
              destroyDoom();
            },
          },

          experiments: {
            title: "Experiments Lab",
            content: `
                    <div class="h-full dyn-p font-ui overflow-y-auto window-content selection:bg-her-red selection:text-white p-2">
                        <!-- Header -->
                        <div class="mb-4 p-4 pb-0">
                            <h1 class="font-ui font-bold text-2xl text-her-dark dark:text-her-textLight">Experiments Lab</h1>
                            <p class="text-sm opacity-60 mt-1 text-her-dark dark:text-her-textLight">Interactive demos and prototypes</p>
                        </div>

                        <!-- Filter Tabs -->
                        <div class="flex gap-2 px-4 pt-3 pb-1" id="lab-filter-bar">
                            <button data-filter="all" class="lab-filter-btn px-3 py-1 text-xs font-bold rounded-full border transition-all bg-her-red text-white border-her-red" onclick="labFilter('all')">All</button>
                            <button data-filter="games" class="lab-filter-btn px-3 py-1 text-xs font-bold rounded-full border transition-all border-her-text/20 text-her-dark/60 dark:text-her-textLight/60 hover:border-her-red/50" onclick="labFilter('games')">Games</button>
                            <button data-filter="tools" class="lab-filter-btn px-3 py-1 text-xs font-bold rounded-full border transition-all border-her-text/20 text-her-dark/60 dark:text-her-textLight/60 hover:border-her-red/50" onclick="labFilter('tools')">Dev Tools</button>
                        </div>

                        <div class="p-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="lab-grid">

                                <!-- ═══ Dev Tools ═══ -->
                                <div class="col-span-full" data-category="tools">
                                    <h2 class="text-xs font-bold uppercase tracking-widest text-her-dark/40 dark:text-her-textLight/40 mb-1">Dev Tools</h2>
                                </div>

                                <!-- IaC Visualizer -->
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 50ms" onclick="window.openWindow('iacvisualizer');">
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
                                </div>

                                <!-- Network Topology -->
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 100ms" onclick="window.openWindow('networktopology');">
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
                                </div>

                                <!-- Finder -->
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 150ms" onclick="window.openWindow('finder');">
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
                                </div>

                                <!-- Monitoring -->
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 200ms" onclick="window.openWindow('monitor');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight"><img src="assets/icons/org.gnome.SystemMonitor.svg" class="inline w-5 h-5 mr-1" alt="" /> Monitoring</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">WIP</span>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Live AWS infrastructure metrics dashboard. Currently under construction.</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AWS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CLOUDWATCH</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- ═══ Games ═══ -->
                                <div class="col-span-full mt-4" data-category="games">
                                    <h2 class="text-xs font-bold uppercase tracking-widest text-her-dark/40 dark:text-her-textLight/40 mb-1">Games</h2>
                                </div>

                                <!-- DOOM -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 250ms" onclick="window.openWindow('doom');">
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

                                </div>
                                <!-- Threes -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 500ms" onclick="window.openWindow('threes');">
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
                                </div>

                                <!-- Snake -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 300ms" onclick="window.openWindow('snake');">
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
                                </div>

                                <!-- 2048 -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 350ms" onclick="window.openWindow('game2048');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><img src="${game2048Icon}" class="w-5 h-5 object-contain" alt="2048" />2048</h3>
                                        <div class="flex items-center gap-2">
                                            <span id="lab-hs-2048" class="text-[10px] font-mono opacity-50 text-her-dark dark:text-her-textLight hidden"></span>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">PLAYABLE</span>
                                        </div>
                                    </div>
                                    <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight flex-grow">Addictive number merging puzzle. Reach the 2048 tile!</p>
                                    <div class="mt-auto">
                                        <div class="flex flex-wrap gap-1.5">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CANVAS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">PUZZLE</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tic Tac Toe -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 400ms" onclick="window.openWindow('tictactoe');">
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
                                </div>

                                <!-- Tetris -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 450ms" onclick="window.openWindow('tetris');">
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
                                </div>

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
                            This dashboard will show live AWS infrastructure metrics once connected to CloudWatch.
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
                                    CloudFront traffic metrics
                                </li>
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    S3 storage analytics
                                </li>
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    Real-time billing data
                                </li>
                                <li class="flex items-center gap-2">
                                    <span class="w-1 h-1 rounded-full bg-her-red"></span>
                                    Edge location performance
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
              setTimeout(() => {
                const container = document.getElementById('tetris-app');
                if (container) initTetris(container);
              }, 100);
            },
            onClose: () => {
              destroyTetris();
            },
          },
          iacvisualizer: {
            title: "IaC Visualizer",
            content: `
                    <div id="iac-app" class="h-full flex bg-[#0f172a] text-white select-none font-ui">
                        <!-- Left Panel: Code Editor -->
                        <div class="w-[420px] flex-shrink-0 flex flex-col border-r border-white/10">
                            <div class="p-3 border-b border-white/10 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold uppercase opacity-50">Code</span>
                                    <span id="iac-format" class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Terraform HCL</span>
                                </div>
                                <div class="flex gap-2">
                                    <button id="iac-terraform" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">Terraform</button>
                                    <button id="iac-kubernetes" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">Kubernetes</button>
                                    <button id="iac-microservices" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">Microservices</button>
                                </div>
                            </div>
                            <textarea id="iac-code" class="flex-1 bg-[#1e293b] text-green-400 font-mono text-xs p-4 resize-none outline-none" spellcheck="false" placeholder="Paste your Terraform or Kubernetes code here..."></textarea>
                        </div>
                        
                        <!-- Right Panel: Graph + Details -->
                        <div class="flex-1 flex flex-col">
                            <div class="p-3 border-b border-white/10 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold uppercase opacity-50">Infrastructure Graph</span>
                                    <span id="iac-count" class="text-xs opacity-50">0 resources</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span id="iac-zoom" class="text-xs opacity-30 font-mono">100%</span>
                                    <button id="iac-export" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">⬇ PNG</button>
                                    <span class="text-xs opacity-30">Scroll=zoom · Drag=pan/move</span>
                                </div>
                            </div>
                            <div class="flex-1 relative">
                                <canvas id="iac-canvas" width="700" height="400" class="absolute inset-0 w-full h-full"></canvas>
                            </div>
                            <div id="iac-details" class="h-40 border-t border-white/10 p-3 overflow-y-auto text-sm">
                                <div class="text-xs opacity-50">Click a node to view details</div>
                            </div>
                            <div id="iac-errors" class="hidden bg-red-500/20 text-red-400 text-xs p-2 border-t border-red-500/30"></div>
                        </div>
                    </div>
                `,
            width: 1200,
            height: 740,
            onOpen: () => {
              setTimeout(() => {
                const container = document.getElementById('iac-app');
                if (container) initIaCVisualizer(container);
              }, 100);
            },
            onClose: () => {
              destroyIaCVisualizer();
            },
          },
          networktopology: {
            title: "Network Topology Mapper",
            content: `
                    <div id="netmap-app" class="h-full flex bg-[#0f172a] text-white select-none font-ui">
                        <!-- Left Panel: Data Input -->
                        <div class="w-[420px] flex-shrink-0 flex flex-col border-r border-white/10">
                            <div class="p-3 border-b border-white/10 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold uppercase opacity-50">Input</span>
                                    <span id="netmap-format" class="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded">LLDP Neighbors</span>
                                </div>
                                <div class="flex gap-2">
                                    <button id="netmap-lldp" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">LLDP</button>
                                    <button id="netmap-cdp" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">CDP</button>
                                    <button id="netmap-routing" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">Routing</button>
                                </div>
                            </div>
                            <textarea id="netmap-code" class="flex-1 bg-[#1e293b] text-teal-400 font-mono text-xs p-4 resize-none outline-none" spellcheck="false" placeholder="Paste LLDP/CDP neighbors or routing table output..."></textarea>
                        </div>
                        
                        <!-- Right Panel: Topology Graph + Details -->
                        <div class="flex-1 flex flex-col">
                            <div class="p-3 border-b border-white/10 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold uppercase opacity-50">Network Topology</span>
                                    <span id="netmap-count" class="text-xs opacity-50">0 devices, 0 links</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span id="netmap-zoom" class="text-xs opacity-30 font-mono">100%</span>
                                    <button id="netmap-export" class="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">⬇ PNG</button>
                                    <span class="text-xs opacity-30">Scroll=zoom · Drag=pan/move</span>
                                </div>
                            </div>
                            <div class="flex-1 relative">
                                <canvas id="netmap-canvas" width="700" height="450" class="absolute inset-0 w-full h-full"></canvas>
                            </div>
                            <div id="netmap-details" class="h-40 border-t border-white/10 p-3 overflow-y-auto text-sm">
                                <div class="text-xs opacity-50">Click a device to view details</div>
                            </div>
                            <div id="netmap-errors" class="hidden bg-red-500/20 text-red-400 text-xs p-2 border-t border-red-500/30"></div>
                        </div>
                    </div>
                `,
            width: 1200,
            height: 740,
            onOpen: () => {
              setTimeout(() => {
                const container = document.getElementById('netmap-app');
                if (container) initNetworkTopology(container);
              }, 100);
            },
            onClose: () => {
              destroyNetworkTopology();
            },
          },
          threes: {
            title: "Threes!",
            content: `
                    <div id="threes-app" class="h-full flex flex-col bg-zinc-100 text-zinc-800 select-none font-ui p-4 items-center">
                        <!-- Header -->
                        <div class="text-center mb-4">
                            <h1 class="text-2xl font-bold">Threes!</h1>
                            <p class="text-zinc-500 text-xs">Combine 1+2 to make 3, then match pairs!</p>
                        </div>
                        
                        <!-- Score Section -->
                        <div class="flex justify-between items-center mb-3 w-full max-w-[360px]">
                            <div class="flex items-center gap-2">
                                <span class="text-zinc-500 text-xs">Next:</span>
                                <div class="flex flex-col items-center gap-0.5">
                                    <div id="threes-next" class="w-8 h-8 rounded flex items-center justify-center font-bold text-sm shadow-md bg-sky-400 text-white">1</div>
                                    <span id="threes-next-hint" class="text-[9px] text-zinc-400 font-mono leading-none">+2→3</span>
                                </div>
                            </div>
                            <div class="flex gap-4">
                                <div class="text-center">
                                    <div class="text-[10px] text-zinc-500 uppercase">Score</div>
                                    <div class="text-lg font-bold" id="threes-score">0</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-[10px] text-zinc-500 uppercase">Best</div>
                                    <div class="text-lg font-bold" id="threes-highscore">0</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Game Board -->
                        <canvas id="threes-board" width="410" height="410" class="rounded-xl shadow-lg"></canvas>
                        <div id="threes-status" class="h-6 flex items-center justify-center mt-2"></div>
                        
                        <!-- Mobile Controls -->
                        <div class="mt-3 grid grid-cols-3 gap-2 max-w-[160px] md:hidden">
                            <div></div>
                            <button id="threes-up" class="bg-zinc-200 hover:bg-zinc-300 rounded-lg p-2 flex items-center justify-center transition-colors">
                                <svg class="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                            </button>
                            <div></div>
                            <button id="threes-left" class="bg-zinc-200 hover:bg-zinc-300 rounded-lg p-2 flex items-center justify-center transition-colors">
                                <svg class="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                            </button>
                            <button id="threes-down" class="bg-zinc-200 hover:bg-zinc-300 rounded-lg p-2 flex items-center justify-center transition-colors">
                                <svg class="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            <button id="threes-right" class="bg-zinc-200 hover:bg-zinc-300 rounded-lg p-2 flex items-center justify-center transition-colors">
                                <svg class="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                        
                        <!-- Reset Button -->
                        <button id="threes-reset" class="mt-4 bg-zinc-800 text-white px-5 py-1.5 rounded-lg font-semibold text-sm hover:bg-zinc-700 transition-colors">New Game</button>
                        
                        <!-- Controls Help -->
                        <div class="mt-3 text-center text-zinc-500 text-xs hidden md:block">
                            <p>Use arrow keys or swipe to move tiles</p>
                        </div>
                    </div>
                `,
            width: 490,
            height: 660,
            onOpen: () => {
              setTimeout(() => {
                const container = document.getElementById('threes-app');
                if (container) initThrees(container);
              }, 100);
            },
            onClose: () => {
              destroyThrees();
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
          if (activeWindows[id]) {
            restoreWindow(id);
            return;
          }

          const winConfig = windows[id];

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
          winEl.style.zIndex = incrementZIndex();

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
            prevRect: null,
          };

          // Play window open sound
          playWindowOpen();

          // Trigger content entrance animations immediately (plays during window open)
          animateWindowContent(winEl);

          // Remove opening animation class after animation completes
          setTimeout(() => {
            winEl.classList.remove("window-opening");
          }, 450);

          // Dock State + Launch Bounce
          // Icon map for apps that don't have a static dock item
          const dockIconMap: Record<string, { title: string; icon: string }> = {
            snake: { title: "Snake", icon: snakeIcon },
            game2048: { title: "2048", icon: game2048Icon },
            tictactoe: { title: "Tic Tac Toe", icon: tictactoeIcon },
            tetris: { title: "Tetris", icon: tetrisIcon },
            threes: { title: "Threes!", icon: threesIcon },
            doom: { title: "DOOM", icon: doomIcon },
            iacvisualizer: { title: "IaC Visualizer", icon: "assets/icons/org.gaphor.Gaphor.svg" },
            networktopology: { title: "Network Topology", icon: "assets/icons/network-wired.svg" },
            monitor: { title: "Monitoring", icon: "assets/icons/org.gnome.SystemMonitor.svg" },
            experiments: { title: "Lab", icon: "assets/icons/characters.svg" },
            sysinfo: { title: "About", icon: "assets/icons/contacts.svg" },
            finder: { title: "Finder", icon: "assets/icons/org.gnome.Nautilus.svg" },
            launchpad: { title: "Launchpad", icon: "assets/icons/org.gnome.Extensions.svg" },
          };

          let dockItem = document.getElementById(`dock-${id}`);
          if (!dockItem && dockIconMap[id]) {
            // Dynamically create a dock item for this app
            const dockContainer = document.querySelector('.dock-container');
            if (dockContainer) {
              const info = dockIconMap[id];
              const div = document.createElement('div');
              div.id = `dock-${id}`;
              div.className = 'dock-item dock-item-dynamic cursor-pointer group';
              div.setAttribute('onclick', `restoreWindow('${id}')`);
              div.setAttribute('title', info.title);
              div.setAttribute('role', 'button');
              div.setAttribute('aria-label', `Open ${info.title}`);
              div.innerHTML = `
                <span class="dock-label">${info.title}</span>
                ${['snake', 'game2048', 'tictactoe', 'tetris', 'threes', 'doom'].includes(id) 
                  ? `<div style="transform: scale(1.2); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><img class="dock-icon" src="${info.icon}" alt="${info.title}" aria-hidden="true" /></div>`
                  : `<img class="dock-icon" src="${info.icon}" alt="${info.title}" aria-hidden="true" />`
                }
              `;
              // Add entry animation
              div.style.opacity = '0';
              div.style.transform = 'scale(0.3) translateY(20px)';
              dockContainer.appendChild(div);
              // Trigger animation
              requestAnimationFrame(() => {
                div.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                div.style.opacity = '1';
                div.style.transform = 'scale(1) translateY(0)';
                setTimeout(() => { div.style.transition = ''; div.style.transform = ''; }, 350);
              });
              refreshDockItems();
              dockItem = div;
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
          if (id === "resume") {
            // Inject theme via URL param first
            const theme = document.documentElement.classList.contains("dark")
              ? "dark"
              : "light";
            const iframe = winEl.querySelector("iframe");
            if (iframe) {
              // Add theme param to src if not present
              if (iframe.src.indexOf("?") === -1)
                iframe.src += `?theme=${theme}`;
            }
          }
          if (id === "finder") window.initFinder();
          if (id === "launchpad") window.initLaunchpad();
          if (id === "tetris") {
            setTimeout(() => {
              const container = document.getElementById('tetris-app');
              if (container) initTetris(container);
            }, 100);
          }
          if (id === "threes") {
            setTimeout(() => {
              const container = document.getElementById('threes-app');
              if (container) initThrees(container);
            }, 100);
          }

          // Generic onOpen callback from window config
          if (winConfig.onOpen) {
            winConfig.onOpen();
          }
        };



        // md viewer
        window.openMarkdownViewer = async function (filePath, title) {
          const viewerId = "md-viewer-" + title.replace(/[^a-z0-9]/gi, "");

          // If already open, bring to front
          if (activeWindows[viewerId]) {
            restoreWindow(viewerId);
            return;
          }

          // Fetch and parse markdown
          let htmlContent = "";
          try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error("File not found");
            const markdown = await response.text();
            htmlContent = marked.parse(markdown);
          } catch (error) {
            // Check if it's a CORS/local file issue
            const isLocalFile = window.location.protocol === "file:";
            if (isLocalFile) {
              htmlContent = `
                            <div class="text-center p-8">
                                <div class="text-4xl mb-4">📁</div>
                                <h3 class="text-lg font-bold mb-2 text-her-dark dark:text-her-textLight">Local Server Required</h3>
                                <p class="text-sm opacity-70 mb-4">Markdown files can't be loaded directly from the file system.<br>Please run a local server or deploy to S3.</p>
                                <code class="text-xs bg-black/10 dark:bg-white/10 px-3 py-2 rounded block">npx serve .</code>
                            </div>
                        `;
            } else {
              htmlContent = `<div class="text-red-500 p-4">Error loading file: ${error.message}</div>`;
            }
          }

          // Create window config dynamically
          const viewerConfig = {
            title: title,
            content: `
                        <div class="h-full overflow-y-auto p-6 md:p-8">
                            <article class="markdown-body prose prose-sm dark:prose-invert max-w-none">
                                ${htmlContent}
                            </article>
                        </div>
                    `,
            width: 700,
            height: 600,
          };

          // Use similar logic to openWindow
          const container = document.getElementById("windows-container");
          const containerW = container.clientWidth;
          const containerH = container.clientHeight;
          const isMobile = window.innerWidth < 768;
          const dockBuffer = isMobile ? 68 : 120;
          const maxAvailableHeight = containerH - dockBuffer;

          let finalW = isMobile ? containerW : viewerConfig.width;
          let finalH = isMobile
            ? maxAvailableHeight
            : Math.min(viewerConfig.height, maxAvailableHeight);
          let leftPos = isMobile
            ? 0
            : Math.max(0, (containerW - finalW) / 2) +
              Math.floor(Math.random() * 30);
          let topPos = isMobile
            ? 0
            : Math.max(10, (maxAvailableHeight - finalH) / 2) +
              Math.floor(Math.random() * 30);

          const winEl = document.createElement("div");
          winEl.className =
            "window absolute flex flex-col active-window window-opening";
          winEl.id = `win-${viewerId}`;
          winEl.setAttribute("role", "dialog");
          winEl.setAttribute("aria-labelledby", `win-title-${viewerId}`);
          winEl.style.width = `${finalW}px`;
          winEl.style.height = `${finalH}px`;
          winEl.style.left = `${leftPos}px`;
          winEl.style.top = `${topPos}px`;
          winEl.style.zIndex = ++zIndexCounter;

          winEl.innerHTML = `
                    <div class="window-header" onmousedown="window.startDrag(event, '${viewerId}')" ondblclick="window.toggleMaximize('${viewerId}')">
                        <div class="controls-neon-flat" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                            <button class="btn-neon min" onclick="window.minimizeWindow('${viewerId}')" aria-label="Minimize window"></button>
                            <button class="btn-neon max" onclick="window.toggleMaximize('${viewerId}')" aria-label="Maximize window"></button>
                            <button class="btn-neon close" onclick="window.closeWindow('${viewerId}')" aria-label="Close window"></button>
                        </div>
                        <span class="window-title" id="win-title-${viewerId}">${viewerConfig.title}</span>
                    </div>
                    <div class="flex-1 relative overflow-hidden">
                        ${viewerConfig.content}
                    </div>
                `;

          winEl.addEventListener("mousedown", () => bringToFront(viewerId));
          winEl.addEventListener("touchstart", () => bringToFront(viewerId), {
            passive: true,
          });
          winEl.onmousemove = (e) => updateWindowCursor(e, winEl);
          winEl.onmousedown = (e) => {
            bringToFront(viewerId);
            handleResizeStart(e, winEl, viewerId);
          };
          addTouchListeners(winEl, viewerId);

          container.appendChild(winEl);
          activeWindows[viewerId] = {
            element: winEl,
            config: viewerConfig,
            maximized: false,
            prevRect: null,
          };
          setTimeout(() => winEl.classList.remove("window-opening"), 350);
        };













        // clock with flip-digit animation
        let prevClockText = '';
        function updateClock() {
          const now = new Date();
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const day = days[now.getDay()];
          const month = months[now.getMonth()];
          const date = now.getDate();
          const time = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
          });
          const text = `${day} ${month} ${date} ${time}`;
          const clockEl = document.getElementById("clock");
          if (!clockEl) return;

          // First render or text length changed — just set it
          if (!prevClockText || prevClockText.length !== text.length) {
            clockEl.innerHTML = '';
            for (const ch of text) {
              const span = document.createElement('span');
              span.className = 'clock-char';
              span.textContent = ch;
              span.dataset.char = ch;
              clockEl.appendChild(span);
            }
            prevClockText = text;
            return;
          }

          // Animate only changed characters
          const spans = clockEl.querySelectorAll('.clock-char');
          for (let i = 0; i < text.length; i++) {
            if (prevClockText[i] !== text[i] && spans[i]) {
              const span = spans[i] as HTMLElement;
              span.classList.add('clock-char-flip');
              span.textContent = text[i];
              span.dataset.char = text[i];
              // Remove animation class after it completes
              setTimeout(() => span.classList.remove('clock-char-flip'), 400);
            }
          }
          prevClockText = text;
        }
        setInterval(updateClock, 1000);
        updateClock();

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
            const card = document.createElement("div");
            const hasItems = item.items && item.items.length > 0;
            const isClickable = !!(item.url || hasItems);
            card.className =
              "p-3 md:p-4 border border-her-text/10 rounded-lg bg-white/60 dark:bg-white/5 hover:border-her-red/50 hover:-translate-y-0.5 transition-all group vault-card-animate" +
              (isClickable ? " cursor-pointer" : "");
            card.style.animationDelay = `${i * 50}ms`;
            if (item.url) card.setAttribute("onclick", `window.open('${item.url}', '_blank')`);
            else if (hasItems) card.setAttribute("onclick", `window.vaultShowDetail('${item.id}')`);

            // Badge icon
            let badge = '';
            if (item.url) {
              badge = '<svg class="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
            } else if (hasItems) {
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
                    window.openMarkdownViewer(fileName, `/home/guest/${fileName}`); 
                }
            } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
                 const viewerId = `img-${fileName.replace(/[^a-z0-9]/gi, '')}`;
                 if (activeWindows[viewerId]) {
                    restoreWindow(viewerId, undefined);
                    return;
                 }
                 let imgSrc = '';
                 if (fileName === 'vacation.jpg') imgSrc = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
                 else if (fileName === 'setup.png') imgSrc = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
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

        window.openMarkdownViewer = function(title: string, file: string) {
             const viewerId = `md-${title.replace(/[^a-z0-9]/gi, '')}`;
             if (activeWindows[viewerId]) {
                restoreWindow(viewerId, undefined);
                return;
             }
             
             // Mock markdown content since we don't have a real file reader yet
             const mdContent = `# ${title}\n\nThis is a markdown preview for **${title}**.\n\n- Feature 1\n- Feature 2\n\n*Simulated markdown content.*`;
             // In a real app we would parse `mdContent` with marked()
             // but here we will just wrap it in a pre for now, or basic HTML
             
             const winContent = `
                <div class="h-full bg-[#0d1117] text-[#c9d1d9] p-6 overflow-y-auto font-ui markdown-body">
                    <h1 class="text-2xl font-bold mb-4 border-b border-[#30363d] pb-2">${title}</h1>
                    <p class="mb-4">This is a markdown preview for <strong class="text-white">${title}</strong>.</p>
                    <ul class="list-disc pl-5 mb-4 space-y-1">
                        <li>Feature 1</li>
                        <li>Feature 2</li>
                    </ul>
                    <p class="italic opacity-70">Simulated markdown content.</p>
                </div>
             `;
             
             const winId = viewerId;
             const winEl = document.createElement("div");
             winEl.className = "window absolute flex flex-col active-window window-opening";
             winEl.id = `win-${winId}`;
             winEl.style.width = "600px";
             winEl.style.height = "500px";
             winEl.style.left = "120px";
             winEl.style.top = "120px";
             winEl.style.zIndex = incrementZIndex().toString();
             winEl.innerHTML = `
                <div class="window-header" onmousedown="window.startDrag(event, '${winId}')" ondblclick="window.toggleMaximize('${winId}')">
                    <div class="controls-neon-flat" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                         <button class="btn-neon close" onclick="window.closeWindow('${winId}')"></button>
                         <button class="btn-neon min" onclick="window.minimizeWindow('${winId}')"></button>
                         <button class="btn-neon max" onclick="window.toggleMaximize('${winId}')"></button>
                    </div>
                    <span class="window-title">${title}</span>
                </div>
                <div class="flex-1 relative overflow-hidden">${winContent}</div>
            `;
            winEl.onmousedown = () => bringToFront(winId);
            const container = document.getElementById("windows-container");
            if (container) container.appendChild(winEl);
            activeWindows[winId] = { element: winEl, config: { title: title, content: winContent, width: 600, height: 500 }, maximized: false };
            setTimeout(() => winEl.classList.remove("window-opening"), 350);
        };

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

        // =====================================
        // LAUNCHPAD APP FUNCTIONS
        // =====================================
        const launchpadApps = [
          { id: "about", title: "README.md", icon: "📄", color: "bg-blue-500" },
          { id: "projects", title: "Projects", icon: "📁", color: "bg-purple-500" },
          { id: "vault", title: "Vault", icon: "🔒", color: "bg-amber-500" },
          { id: "terminal", title: "Terminal", icon: "💻", color: "bg-gray-700" },
          { id: "finder", title: "Finder", icon: "📂", color: "bg-blue-400" },
          { id: "monitor", title: "Monitoring", icon: "📊", color: "bg-teal-500" },
          { id: "settings", title: "Settings", icon: "⚙️", color: "bg-gray-500" },
          { id: "sysinfo", title: "About", icon: "ℹ️", color: "bg-rose-500" },
          { id: "experiments", title: "Lab", icon: "🧪", color: "bg-lime-500" },
        ];

        window.initLaunchpad = function () {
          window.filterLaunchpad("");
        };

        window.filterLaunchpad = function (query: string) {
          const grid = document.getElementById("launchpad-grid");
          if (!grid) return;
          
          const term = query.toLowerCase();
          const filtered = launchpadApps.filter(app => 
            app.title.toLowerCase().includes(term) || app.id.includes(term)
          );
          
          grid.innerHTML = "";
          
          filtered.forEach((app, idx) => {
            const item = document.createElement("div");
            item.className = "launchpad-item flex flex-col items-center gap-2 cursor-pointer group";
            item.style.animationDelay = `${idx * 30}ms`;
            item.innerHTML = `
              <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl ${app.color} flex items-center justify-center text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform">
                ${app.icon}
              </div>
              <span class="text-white text-xs text-center truncate w-full opacity-80 group-hover:opacity-100">${app.title}</span>
            `;
            
            item.onclick = () => {
              window.closeWindow("launchpad");
              setTimeout(() => window.restoreWindow(app.id), 100);
            };
            
            grid.appendChild(item);
          });
        };
        window.switchMonitorTab = function (tab) {
          document.getElementById("mon-view-infra").style.display = "none";
          document.getElementById("mon-view-cloudfront").style.display = "none";
          document.getElementById("mon-view-billing").style.display = "none";

          // Layout logic: Infra is default (block/space-y), Cloudfront block, Billing flex (center)
          if (tab === "infra")
            document.getElementById("mon-view-infra").style.display = "block";
          else if (tab === "cf")
            document.getElementById("mon-view-cloudfront").style.display =
              "block";
          else if (tab === "bill")
            document.getElementById("mon-view-billing").style.display = "flex";

          // Tab styling
          ["infra", "cf", "bill"].forEach((t) => {
            const el = document.getElementById(`tab-${t}`);
            if (t === tab) {
              el.classList.add(
                "border-her-red",
                "text-her-red",
                "bg-white/50",
                "dark:bg-black/20"
              );
              el.classList.remove("border-transparent", "opacity-60");
            } else {
              el.classList.remove(
                "border-her-red",
                "text-her-red",
                "bg-white/50",
                "dark:bg-black/20"
              );
              el.classList.add("border-transparent", "opacity-60");
            }
          });
        };

        function startMonitor() {
          if (monitorInterval) clearInterval(monitorInterval);

          // Canvas Setup
          const canvas = document.getElementById("monitor-canvas");
          const ctx = canvas.getContext("2d");
          let dataPoints = new Array(50).fill(20);
          let errorPoints = new Array(50).fill(5); // Error rate series

          // KPI Simulation
          const kpiReq = document.getElementById("kpi-req");
          const kpiData = document.getElementById("kpi-data");
          const logContainer = document.getElementById("sys-log");

          const logs = [
            "[INFO] Auto-scaling group: +1 instance",
            "[INFO] Route53 health check: Healthy",
            "[WARN] High latency detected in ap-south-1",
            "[INFO] S3 Lifecycle rule executed",
            "[INFO] CloudFront cache refresh",
          ];

          setMonitorInterval(setInterval(() => {
            // Update Graph Data
            dataPoints.shift();
            errorPoints.shift();
            const base = 40 + Math.random() * 30;
            dataPoints.push(base);
            errorPoints.push(Math.max(0, 5 + (Math.random() * 10 - 5))); // Sim error

            // Render Graph
            // Check visibility to save resources
            if (canvas && canvas.offsetParent !== null) {
              // Resize if needed
              if (canvas.width !== canvas.clientWidth) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
              }
              const w = canvas.width;
              const h = canvas.height;

              ctx.clearRect(0, 0, w, h);

              // Draw Main Traffic
              ctx.beginPath();
              ctx.moveTo(0, h);
              dataPoints.forEach((p, i) => {
                const x = (i / (dataPoints.length - 1)) * w;
                const y = h - (p / 100) * h;
                ctx.lineTo(x, y);
              });
              ctx.lineTo(w, h);
              ctx.fillStyle = "rgba(74, 124, 157, 0.2)"; // Blue tint #4A7C9D
              ctx.fill();

              // Stroke Main
              ctx.beginPath();
              dataPoints.forEach((p, i) => {
                const x = (i / (dataPoints.length - 1)) * w;
                const y = h - (p / 100) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.strokeStyle = "#4A7C9D"; // Blue
              ctx.lineWidth = 2;
              ctx.stroke();

              // Draw Error Rate (Dashed)
              ctx.beginPath();
              ctx.setLineDash([5, 5]);
              errorPoints.forEach((p, i) => {
                const x = (i / (errorPoints.length - 1)) * w;
                const y = h - (p / 100) * h; // Scale differently realistically, but for viz ok
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.strokeStyle = "#4A7C9D";
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // Update KPIs
            if (kpiReq && Math.random() > 0.7)
              kpiReq.innerText = (2.4 + Math.random() * 0.2).toFixed(1) + "k";
            if (logContainer && Math.random() > 0.9) {
              const log = logs[Math.floor(Math.random() * logs.length)];
              const div = document.createElement("div");
              div.innerText = log;
              logContainer.prepend(div);
              if (logContainer.children.length > 5)
                logContainer.lastChild.remove();
            }
          }, 1000));
        }

        // Initial site Launch - start with clean desktop
        // (Windows can be opened from the dock)
      });

// register service worker for pwa
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registration successful, scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}
