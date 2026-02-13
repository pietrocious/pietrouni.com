import { marked } from 'marked';

// config - static data
import { vaultData, fileSystem, asciiAlpha, PIETROS_COMMANDS, CYBERPUNK_COMMANDS, FALLOUT_COMMANDS } from './config';
import { getVaultContent } from './vault';
import { initTetris, destroyTetris } from './games/tetris';
import { initIaCVisualizer, destroyIaCVisualizer } from './apps/iac-visualizer';
import { initNetworkTopology, destroyNetworkTopology } from './apps/network-topology';
import { initThrees, destroyThrees } from './games/threes';
import { initDock, dockBounce, refreshDockItems } from './dock';
import { animateWindowContent } from './animations';
import { initParticles } from './particles';
import { initAudio, playClick, playWindowOpen, isSoundEnabled, toggleSound } from './audio';
import { initTicTacToe, destroyTicTacToe } from './games/tic-tac-toe';
import { initGame2048, destroyGame2048 } from './games/game-2048';
import { initSnake, destroySnake } from './games/snake';
import { initDoom, destroyDoom } from './games/doom';


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
        // ambient floating particles
        initParticles();

        // expose sound toggle for settings
        window.toggleSound = toggleSound;
        window.isSoundEnabled = isSoundEnabled;

        // dock click sound via event delegation
        const dockContainer = document.querySelector('.dock-container');
        if (dockContainer) {
          dockContainer.addEventListener('click', () => playClick());
        }

        function applyWallpaper() {
          const isDark = document.documentElement.classList.contains("dark");
          const wp = wallpapers[activeWallpaperIndex];
          const desktop = document.getElementById("desktop");

          // Reset - remove all wallpaper classes and inline styles
          desktop.style.background = "";
          allWallpaperClasses.forEach((cls) => desktop.classList.remove(cls));

          if (wp.type === "class") {
            desktop.classList.add(isDark ? wp.dark : wp.light);
          } else {
            desktop.style.background = isDark ? wp.dark : wp.light;
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
          const cards = document.querySelectorAll<HTMLElement>('#lab-grid .lab-card');
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
          cards.forEach(card => {
            const show = filter === 'all' || card.dataset.category === filter;
            card.style.display = show ? '' : 'none';
          });
        };

        window.toggleTheme = function () {
          const goingDark = !document.documentElement.classList.contains("dark");
          window.setThemeMode(goingDark ? "dark" : "light");
        };

        window.cycleWallpaper = function () {
          setActiveWallpaperIndex((activeWallpaperIndex + 1) % wallpapers.length);
          applyWallpaper();
        };

        // set wallpaper by index (for settings grid)
        window.setWallpaper = function (index: number) {
          if (index >= 0 && index < wallpapers.length) {
            setActiveWallpaperIndex(index);
            applyWallpaper();
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
            { id: "techstack", title: "Tech Stack", icon: "assets/icons/org.gnome.TextEditor.svg" },
            { id: "terminal", title: "Terminal", icon: "assets/icons/org.gnome.Terminal.svg" },
            { id: "monitor", title: "Monitoring", icon: "assets/icons/org.gnome.SystemMonitor.svg" },
            { id: "settings", title: "Settings", icon: "assets/icons/org.gnome.Settings.svg" },
            { id: "tictactoe", title: "Tic Tac Toe", icon: "assets/icons/org.gnome.Extensions.svg" },
            { id: "game2048", title: "2048", icon: "assets/icons/org.gnome.Extensions.svg" },
            { id: "sysinfo", title: "About pietrOS", icon: "assets/icons/contacts.svg" },
            { id: "doom", title: "DOOM", icon: "assets/icons/org.gnome.Extensions.svg" },
            { id: "snake", title: "Snake", icon: "assets/icons/org.gnome.Extensions.svg" },
            { id: "tetris", title: "Tetris", icon: "assets/icons/org.gnome.Extensions.svg" },
            { id: "threes", title: "Threes!", icon: "assets/icons/org.gnome.Extensions.svg" },
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
                desc: `Vault • ${item.category}`,
                action: item.action
                  ? `${item.action}; toggleSpotlight();`
                  : null,
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
                        <div class="text-xs opacity-60 mb-4 font-mono">Version 1.4 (Jade-Jonze)</div>
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
                                        <span class="text-[10px] uppercase opacity-50">Display/Headline</span>
                                        <span class="font-headline font-bold text-base">Playfair Display</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">Serif (Body)</span>
                                        <span class="font-serif text-base">Lora</span>
                                    </li>
                                    <li class="flex flex-col">
                                        <span class="text-[10px] uppercase opacity-50">System UI</span>
                                        <span class="font-ui text-base">Noto Sans</span>
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
                    <div class="h-full p-6 font-sans text-sm overflow-y-auto window-content selection:bg-her-red selection:text-white transition-colors">
                        <!-- Header -->
                        <h1 class="text-4xl font-serif font-extrabold text-her-red dark:text-her-red tracking-tight mb-4">Hi, I'm Pietro</h1>
                        
                        <div class="space-y-4">
                            <!-- My Journey -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">My Journey</h2>
                                <p class="opacity-90">
                                    I'm an Infrastructure Engineer specializing in AWS architecture and infrastructure-as-code automation. My path into cloud started with enterprise infrastructure, I spent over three years at <span class="font-semibold text-her-red dark:text-her-red">Cisco TAC</span> solving complex routing, switching, and SDN problems for Fortune 500 customers. That foundation taught me how distributed systems actually work under the hood.
                                </p>
                                <p class="opacity-90 mt-4">
                                    These days, I focus on building reliable cloud infrastructure. My current work centers on architecting AWS environments using Terraform, implementing CI/CD automation, and designing secure, highly-available systems that leverage cloud-native services.
                                </p>
                            </div>

                            <!-- What I'm Building -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">What I'm Building</h2>
                                <p class="opacity-90 mb-4">
                                    I build production-grade AWS infrastructure that demonstrates real cloud engineering capabilities:
                                </p>
                                <ul class="list-none space-y-4 font-serif font-normal">
                                    <li class="pl-4 border-l-2 border-her-red">
                                        <a href="https://github.com/pietrocious/terraform-aws-pietrouni" target="_blank" class="content-link font-semibold">Terraform AWS Infrastructure</a>: Complete AWS infrastructure deployment using Terraform IaC. Multi-AZ VPC networking, Auto Scaling Groups with ALB, CloudFront CDN, Route53 DNS, and ACM certificates. Includes S3 backend state management with DynamoDB locking. GitHub Actions automates validation and deployment.
                                        <div class="text-xs opacity-70 mt-1">Tech: AWS (VPC, EC2, ALB, ASG, S3, CloudFront, Route53, ACM), Terraform, GitHub Actions</div>
                                    </li>
                                    <li class="pl-4 border-l-2 border-her-red">
                                        <a href="https://github.com/pietrocious/pietrouni.com" target="_blank" class="content-link font-semibold">pietrouni.com</a>: The interactive portfolio website you're viewing right now, running on the AWS infrastructure above. Desktop OS mockup built with Vite, TypeScript and Tailwind CSS. Hosted on the AWS infrastructure above.
                                        <div class="text-xs opacity-70 mt-1">Tech: Vite, TypeScript, Tailwind v4</div>
                                    </li>
                                </ul>
                                <p class="mt-4 italic opacity-70">More projects coming soon. Check my <a href="https://github.com/pietrocious" target="_blank" class="content-link">GitHub</a> for updates.</p>
                            </div>

                            <!-- Why Cloud Engineering -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">Why Cloud Engineering?</h2>
                                <p class="opacity-90">
                                    After years of troubleshooting other people's infrastructure, I want to be the one designing and building it. Cloud engineering lets me leverage that infrastructure foundation while learning modern automation patterns like IaC, containers, orchestration, and CI/CD.
                                </p>
                            </div>

                            <!-- Beyond Work -->
                            <div>
                                <h2 class="text-lg font-serif font-extrabold text-her-dark dark:text-her-cream mt-4 mb-2">Beyond Work</h2>
                                <p class="opacity-90">
                                    Outside of infrastructure work, I listen to music across pretty much every genre, play games when I have time, and enjoy understanding how complex systems get built. I'm fascinated by how architecture decisions make something actually work at such a scale, and how much we're all standing on the shoulders of giants.
                                </p>
                            </div>

                            <!-- Let's Connect -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">Let's Connect</h2>
                                <p class="opacity-90">
                                    If you'd like to talk, please reach out:
                                </p>
                                <div class="mt-4 flex gap-4 text-sm font-ui font-semibold tracking-wide">
                                    <a href="mailto:pietrouni@gmail.com" class="content-link">EMAIL</a>
                                    <span class="opacity-30">·</span>
                                    <a href="https://github.com/pietrocious" target="_blank" class="content-link">GITHUB</a>
                                    <span class="opacity-30">·</span>
                                    <a href="https://linkedin.com/in/pietrouni" target="_blank" class="content-link">LINKEDIN</a>
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

                            <!-- Coming Soon -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Coming Soon
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                    <div id="vault-app" class="h-full flex flex-col" style="min-width: 400px;">
                        <!-- Header with Back Button -->
                        <div class="px-6 py-4 flex items-center justify-between border-b border-her-text/10">
                            <div class="flex items-center gap-3">
                                <button id="vault-back-btn" onclick="window.vaultShowGrid()" class="hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Back to files">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                <h2 id="vault-title" class="text-lg font-serif font-extrabold text-her-red dark:text-her-red flex items-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    <span class="hidden md:inline">Personal Vault</span>
                                    <span class="md:hidden">Vault</span>
                                </h2>
                            </div>
                            <div id="vault-search" class="relative">
                                <input type="text" placeholder="Search..." oninput="window.renderVault(this.value)" class="pl-9 pr-4 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-her-red outline-none text-sm transition-all w-32 md:w-64">
                                <svg class="w-4 h-4 absolute left-3 top-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>
                        
                        <!-- Filter Tabs (hidden when viewing file) -->
                        <div id="vault-filters" class="px-6 py-3 flex gap-2 overflow-x-auto border-b border-her-text/5 no-scrollbar">
                            <button onclick="window.filterVault('all')" class="vault-tab active px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors bg-her-red text-white flex-shrink-0">All</button>
                            <button onclick="window.filterVault('Professional')" class="vault-tab px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black/5 dark:hover:bg-white/5 opacity-70 flex-shrink-0">Professional</button>
                            <button onclick="window.filterVault('Lifestyle')" class="vault-tab px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black/5 dark:hover:bg-white/5 opacity-70 flex-shrink-0">Lifestyle</button>
                            <button onclick="window.filterVault('Creative')" class="vault-tab px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black/5 dark:hover:bg-white/5 opacity-70 flex-shrink-0">Creative</button>
                            <button onclick="window.filterVault('Resources')" class="vault-tab px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black/5 dark:hover:bg-white/5 opacity-70 flex-shrink-0">Resources</button>
                        </div>
                        
                        <!-- Grid View -->
                        <div id="vault-grid" class="flex-1 overflow-y-auto p-3 md:p-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 content-start">
                            <!-- Items Injected Here -->
                        </div>
                        
                        <!-- Content View (hidden by default) -->
                        <div id="vault-content" class="flex-1 overflow-y-auto p-6 md:p-8 hidden">
                            <article class="markdown-body prose prose-sm dark:prose-invert max-w-none">
                                <!-- Markdown content injected here -->
                            </article>
                        </div>
                    </div>
                `,
            width: 1000,
            height: 700,
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

                                <!-- Snake -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 50ms" onclick="window.openWindow('snake');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M13 3c-1.1 0-2 .9-2 2 0 .4.1.7.3 1H9.5C9.2 5.4 8.6 5 8 5H6.7c.2-.3.3-.6.3-1 0-1.1-.9-2-2-2s-2 .9-2 2c0 .7.4 1.4 1 1.7v.8C3.4 6.8 3 7.4 3 8v2c0 1.7 1.3 3 3 3h4c1.7 0 3-1.3 3-3V7c0-.6-.4-1.2-1-1.5V5c0-1.1-.9-2-2-2zM5 3.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1zm6 6.5c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V8c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2z"/></svg>Snake</h3>
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
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 100ms" onclick="window.openWindow('game2048');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1" opacity=".6"/><rect x="9" y="9" width="6" height="6" rx="1" opacity=".3"/></svg>2048</h3>
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
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 150ms" onclick="window.openWindow('tictactoe');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="15"/><line x1="10.5" y1="1" x2="10.5" y2="15"/><line x1="1" y1="5.5" x2="15" y2="5.5"/><line x1="1" y1="10.5" x2="15" y2="10.5"/><circle cx="3" cy="8" r="1.3" fill="currentColor" stroke="none"/><line x1="11.5" y1="2" x2="14" y2="4.5"/><line x1="14" y1="2" x2="11.5" y2="4.5"/></svg>Tic Tac Toe</h3>
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
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 200ms" onclick="window.openWindow('tetris');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><rect x="5" y="1" width="4" height="4" rx=".5"/><rect x="1" y="5" width="4" height="4" rx=".5"/><rect x="5" y="5" width="4" height="4" rx=".5"/><rect x="9" y="5" width="4" height="4" rx=".5" opacity=".7"/><rect x="5" y="9" width="4" height="4" rx=".5" opacity=".5"/><rect x="9" y="9" width="4" height="4" rx=".5" opacity=".3"/></svg>Tetris</h3>
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

                                <!-- Threes -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 250ms" onclick="window.openWindow('threes');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">3</text></svg>Threes!</h3>
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

                                <!-- DOOM -->
                                <div data-category="games" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 300ms" onclick="window.openWindow('doom');">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1C4.7 1 2 3.7 2 7c0 2 1 3.8 2.5 4.9V14c0 .6.4 1 1 1h5c.6 0 1-.4 1-1v-2.1C13 10.8 14 9 14 7c0-3.3-2.7-6-6-6zM6 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-2 2.5c-.8 0-1.5-.3-1.5-.7h3c0 .4-.7.7-1.5.7z"/></svg>DOOM</h3>
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

                                <!-- IaC Visualizer -->
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 300ms" onclick="window.openWindow('iacvisualizer');">
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
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 350ms" onclick="window.openWindow('networktopology');">
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
                                <div data-category="tools" class="lab-card p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-red/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer vault-card-animate flex flex-col h-full" style="animation-delay: 400ms" onclick="window.openWindow('finder');">
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
                            <div class="text-gray-400 hidden md:block">v1.4 (Jade-Jonze) | Linux micro-kernel 6.8.0-45</div>
                            <div class="text-gray-500 hidden md:block">Type 'help' for commands, 'man &lt;cmd&gt;' for details</div>
                        </div>
                        <div class="md:border-t border-white/20 md:pt-2">
                            <div class="text-gray-400 text-xs md:hidden">pietrOS v1.4 (Jade-Jonze) | Linux micro-kernel 6.8.0-45</div>
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
                                        <!-- Sonoma -->
                                        <button onclick="setWallpaper(0);" class="wallpaper-option group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-her-red transition-all" data-wallpaper="0">
                                            <div class="absolute inset-0 sonoma-bg"></div>
                                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            <div class="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white drop-shadow-md">Sonoma</div>
                                        </button>
                                        <!-- Sequoia -->
                                        <button onclick="setWallpaper(1);" class="wallpaper-option group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-her-red transition-all" data-wallpaper="1">
                                            <div class="absolute inset-0 sequoia-bg"></div>
                                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            <div class="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white drop-shadow-md">Sequoia</div>
                                        </button>
                                        <!-- Ventura -->
                                        <button onclick="setWallpaper(2);" class="wallpaper-option group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-her-red transition-all" data-wallpaper="2">
                                            <div class="absolute inset-0 ventura-bg"></div>
                                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            <div class="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white drop-shadow-md">Ventura</div>
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
                                            <div class="text-xs opacity-60">Version 1.4 (Jade-Jonze)</div>
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
          techstack: {
            title: "Tech Stack",
            content: `
                    <div class="h-full flex flex-col text-her-text dark:text-her-textLight p-6 select-none font-ui overflow-y-auto">
                        <h1 class="text-xl font-bold mb-1 font-serif">Tech Stack</h1>
                        <div class="text-xs opacity-60 mb-4 font-mono">Skills & Technologies</div>
                        <div class="h-px bg-her-text/10 dark:bg-white/10 w-full mb-6"></div>
                        
                        <div class="space-y-6 text-sm">
                            <!-- Cloud Platforms -->
                            <div>
                                <div class="font-bold opacity-40 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                                    Cloud Platforms
                                </div>
                                
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg mb-3">
                                        <div class="font-semibold mb-3">AWS</div>
                                    <div class="space-y-2 opacity-80">
                                        <div><span class="font-medium text-her-red">Compute:</span> EC2, Auto Scaling, ELB/ALB</div>
                                        <div><span class="font-medium text-her-red">Networking:</span> VPC, Route53, CloudFront, Direct Connect</div>
                                        <div><span class="font-medium text-her-red">Storage:</span> S3, EBS, EFS</div>
                                        <div><span class="font-medium text-her-red">Security:</span> IAM, ACM, Security Groups, NACLs</div>
                                        <div><span class="font-medium text-her-red">Monitoring:</span> CloudWatch, CloudTrail, Config</div>
                                        <div><span class="font-medium text-her-red">Databases:</span> RDS, DynamoDB</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Infrastructure & Automation -->
                            <div>
                                <div class="font-bold opacity-40 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    Infrastructure & Automation
                                </div>
                                
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 opacity-80">
                                    <div><span class="font-medium text-her-red">IaC:</span> Terraform, CloudFormation</div>
                                    <div><span class="font-medium text-her-red">CI/CD:</span> GitHub Actions, Jenkins</div>
                                    <div><span class="font-medium text-her-red">Scripting:</span> Python, Bash, PowerShell</div>
                                    <div><span class="font-medium text-her-red">Version Control:</span> Git, GitHub</div>
                                </div>
                            </div>
                            
                            <!-- Networking -->
                            <div>
                                <div class="font-bold opacity-40 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                    Networking
                                </div>
                                
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 opacity-80">
                                    <div><span class="font-medium text-her-red">Protocols:</span> TCP/IP, BGP, OSPF, EIGRP, STP</div>
                                    <div><span class="font-medium text-her-red">Certifications:</span> CCNA, CCNP (ENARSI)</div>
                                    <div><span class="font-medium text-her-red">Platforms:</span> Cisco Catalyst, DNA Center</div>
                                    <div><span class="font-medium text-her-red">Concepts:</span> VPN, routing, switching, network security</div>
                                </div>
                            </div>
                            
                            <!-- Additional Skills -->
                            <div>
                                <div class="font-bold opacity-40 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                                    Additional Skills
                                </div>
                                
                                <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 opacity-80">
                                    <div><span class="font-medium text-her-red">Containers:</span> Docker, Kubernetes (learning)</div>
                                    <div><span class="font-medium text-her-red">Config Mgmt:</span> Ansible</div>
                                    <div><span class="font-medium text-her-red">Monitoring:</span> Splunk, Nagios, Prometheus, Grafana</div>
                                    <div><span class="font-medium text-her-red">OS:</span> Linux (Ubuntu, CentOS), Windows Server</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-6 pt-4 border-t border-her-text/10 dark:border-white/10 text-center text-xs opacity-40 font-mono">
                            Always learning, always building
                        </div>
                    </div>
                `,
            width: 450,
            height: 700,
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
            snake: { title: "Snake", icon: "assets/icons/org.gnome.Extensions.svg" },
            game2048: { title: "2048", icon: "assets/icons/org.gnome.Extensions.svg" },
            tictactoe: { title: "Tic Tac Toe", icon: "assets/icons/org.gnome.Extensions.svg" },
            tetris: { title: "Tetris", icon: "assets/icons/org.gnome.Extensions.svg" },
            threes: { title: "Threes!", icon: "assets/icons/org.gnome.Extensions.svg" },
            doom: { title: "DOOM", icon: "assets/icons/org.gnome.Extensions.svg" },
            experiments: { title: "Lab", icon: "assets/icons/characters.svg" },
            sysinfo: { title: "About pietrOS", icon: "assets/icons/contacts.svg" },
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
                <img class="dock-icon" src="${info.icon}" alt="${info.title}" aria-hidden="true" />
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
          if (id === "vault") window.renderVault();
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
          const day = days[now.getDay()];
          const time = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const text = `${day} ${time}`;
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
        window.handlePietrOSCommand = null;
        window.handleCyberpunkCommand = null;
        window.handleFalloutCommand = null;


        // reset sub-modes (called by Ctrl+C)
        window.resetTerminalSubModes = function () {
          guessGame.active = false;
          ciscoMode.active = false;
          terraformMode.active = false;
          const prompt = document.getElementById("term-prompt");
          if (prompt) {
            prompt.outerHTML =
              '<span id="term-prompt" class="text-green-400 font-semibold">guest@OS93</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>';
          }
        };

        window.handleTerminalCommand = function (e) {
          const inputEl = document.getElementById("cmd-input");
          const output = document.getElementById("term-output");

          // Ctrl+C — cancel running animations / exit sub-modes
          if (e.key === "c" && e.ctrlKey) {
            e.preventDefault();
            if (hasActiveCleanups()) {
              runTerminalCleanups();
              inputEl.disabled = false;
              inputEl.focus();
            }
            window.resetTerminalSubModes();
            output.innerHTML += `${getTerminalPromptHTML()} <span class="text-red-400">^C</span></div>`;
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }

          // Ctrl+L — clear terminal
          if (e.key === "l" && e.ctrlKey) {
            e.preventDefault();
            output.innerHTML = "";
            return;
          }

          // Ctrl+U — clear current input line
          if (e.key === "u" && e.ctrlKey) {
            e.preventDefault();
            inputEl.value = "";
            return;
          }

          // History Navigation (Shared)
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (
              terminalHistory.length > 0 &&
              terminalHistoryIndex < terminalHistory.length - 1
            ) {
              setTerminalHistoryIndex(terminalHistoryIndex + 1);
              inputEl.value =
                terminalHistory[
                  terminalHistory.length - 1 - terminalHistoryIndex
                ];
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (terminalHistoryIndex > -1) {
              setTerminalHistoryIndex(terminalHistoryIndex - 1);
              inputEl.value =
                terminalHistoryIndex >= 0
                  ? terminalHistory[
                      terminalHistory.length - 1 - terminalHistoryIndex
                    ]
                  : "";
            }
            return;
          }

          // Tab Autocomplete
          if (e.key === "Tab") {
            e.preventDefault();
            const currentInput = inputEl.value.toLowerCase().trim();

            if (!currentInput) return;

            // Get commands for current mode
            let commands;
            if (TERMINAL_STATE.mode === "cyberpunk") {
              commands = CYBERPUNK_COMMANDS;
            } else if (TERMINAL_STATE.mode === "fallout") {
              commands = FALLOUT_COMMANDS;
            } else {
              commands = PIETROS_COMMANDS;
            }

            // Find matching commands
            const matches = commands.filter((cmd) =>
              cmd.startsWith(currentInput)
            );

            if (matches.length === 0) return;

            if (matches.length === 1) {
              // Single match - complete it
              inputEl.value = matches[0];
              setTabCompletionIndex(0);
              setLastTabInput("");
            } else {
              // Multiple matches - cycle through them
              if (lastTabInput !== currentInput) {
                // New input, reset cycle
                setTabCompletionIndex(0);
                setLastTabInput(currentInput);
                // Show available completions
                output.innerHTML += `<div class="text-gray-400 text-xs my-1">${matches.join(
                  "  "
                )}</div>`;
                output.scrollTop = output.scrollHeight;
              }
              inputEl.value = matches[tabCompletionIndex];
              setTabCompletionIndex((tabCompletionIndex + 1) % matches.length);
            }
            return;
          }

          // Reset tab completion on other key presses
          if (e.key !== "Tab") {
            setLastTabInput("");
            setTabCompletionIndex(0);
          }

          if (e.key === "Enter") {
            const input = e.target.value.trim();

            // Specific Router
            if (TERMINAL_STATE.mode === "cyberpunk") {
              window.handleCyberpunkCommand(input, output, inputEl);
            } else if (TERMINAL_STATE.mode === "fallout") {
              window.handleFalloutCommand(input, output, inputEl);
            } else {
              window.handlePietrOSCommand(input, output, inputEl);
            }
          }
        };

        // normal mode commands
        window.handlePietrOSCommand = function (input, output, inputEl) {
          // Echo
          output.innerHTML += `${getTerminalPromptHTML()} ${input}</div>`;

          if (!input) {
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }

          // Existing Sub-modes (Guess, Cisco, Terraform)
          if (guessGame.active) {
            // ... Guess Game Logic Copied/Adapted ...
            const guess = parseInt(input);
            if (isNaN(guess)) {
              output.innerHTML += `<div class="text-her-red">Please enter a valid number.</div>`;
            } else {
              guessGame.attempts++;
              if (guess === guessGame.target) {
                output.innerHTML += `<div class="text-green-500 font-bold">🎉 Correct! You guessed ${guessGame.target} in ${guessGame.attempts} attempts.</div>`;
                guessGame.active = false;
              } else if (guess < guessGame.target) {
                output.innerHTML += `<div class="text-blue-400">Too low! Try again.</div>`;
              } else {
                output.innerHTML += `<div class="text-blue-400">Too high! Try again.</div>`;
              }
            }
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }
          if (ciscoMode.active) {
            // ... Cisco Logic (Simplified Reference) ...
            // Setting simplified Cisco handler for brevity, can be fully expanded if needed or kept inline.
            // Ideally we should have kept the full Cisco logic block here but for this refactor I will assume standard commands mainly.
            // RE-INSERTING CISCO LOGIC:
            const ciscoCmd = input.toLowerCase().trim();
            const prompt = document.getElementById("term-prompt");
            if (
              ciscoCmd === "exit" ||
              ciscoCmd === "quit" ||
              ciscoCmd === "logout"
            ) {
              ciscoMode.active = false;
              const promptContainer = prompt.parentNode;
              prompt.outerHTML =
                '<span id="term-prompt" class="text-green-400 font-semibold">guest@OS93</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>';
              output.innerHTML += `<div class="text-gray-500">[Connection to CORE-RTR-01 closed]</div>`;
            } else if (ciscoCmd === "?" || ciscoCmd === "help") {
              output.innerHTML += `<div class="text-cyan-400 my-2"><pre class="text-xs">Exec commands:\n  show, ping, exit, enable, configure\n</pre></div>`;
            } else if (ciscoCmd.startsWith("show")) {
              output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">Cisco IOS Software, ISR Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 15.9(3)M\nCORE-RTR-01 uptime is 42 days, 7 hours, 23 minutes\n</pre>`;
            } else {
              output.innerHTML += `<div class="text-gray-500 text-xs">% Unknown command or unrecognized keyword. Type '?' for help.</div>`;
            }
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }
          if (terraformMode.active) {
            // ... Terraform Logic ...
            const tfResponse = input.toLowerCase().trim();
            if (tfResponse === "yes" || tfResponse === "y") {
              terraformMode.active = false;
              output.innerHTML += `<div class="text-green-400 font-bold">Apply complete! Resources: 1 added, 1 changed, 1 destroyed.</div>`;
            } else {
              terraformMode.active = false;
              output.innerHTML += `<div class="text-yellow-400 text-xs">Apply cancelled.</div>`;
            }
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }

          // Standard Commands
          pushTerminalHistory(input);
          setTerminalHistoryIndex(-1);

          const args = input.split(" ");
          const cmd = args[0].toLowerCase();

          switch (cmd) {
            case "cyberpunk":
              const termWin = document.getElementById("win-terminal");
              if (termWin) {
                termWin.classList.add("window-glitch");
                setTimeout(
                  () => termWin.classList.remove("window-glitch"),
                  500
                );

                // Enable Theme
                termWin.classList.add("theme-cyberpunk");
                termWin.classList.remove("theme-fallout");
                const titleEl = termWin.querySelector(".window-title");
                if (titleEl) titleEl.innerText = "NET_TERM // V2.0";

                // Switch State
                TERMINAL_STATE.mode = "cyberpunk";
                TERMINAL_STATE.user = "V";

                // Clear terminal and show welcome
                output.innerHTML = `<div class="text-[#FF003C] font-bold">INITIALIZING NETRUNNER INTERFACE...</div>`;
                setTimeout(() => {
                  output.innerHTML += `<div class="text-[#FCEE0A]">BREACH PROTOCOL: ACTIVE</div>`;
                  output.scrollTop = output.scrollHeight;
                }, 200);
                setTimeout(() => {
                  output.innerHTML += `<div class="text-[#FCEE0A]">Connection secured. Welcome, V.</div>`;
                  output.scrollTop = output.scrollHeight;
                }, 400);
              }
              break;

            case "fallout":
              const termWinFallout = document.getElementById("win-terminal");
              if (termWinFallout) {
                termWinFallout.classList.add("window-glitch");
                setTimeout(
                  () => termWinFallout.classList.remove("window-glitch"),
                  500
                );

                // Enable Theme
                termWinFallout.classList.add("theme-fallout");
                termWinFallout.classList.remove("theme-cyberpunk");
                const titleEl = termWinFallout.querySelector(".window-title");
                if (titleEl) titleEl.innerText = "ROBCO INDUSTRIES TM";

                // Switch State
                TERMINAL_STATE.mode = "fallout";
                TERMINAL_STATE.user = "VAULT_DWELLER";

                // Clear terminal and show welcome
                output.innerHTML = `<div class="text-[#18dc04] font-bold text-lg">WELCOME TO ROBCO OS v8.1</div>`;
                setTimeout(() => {
                  output.innerHTML += `<div class="text-[#18dc04]">> LOAD "PIP-BOY_3000"</div>`;
                  output.scrollTop = output.scrollHeight;
                }, 200);
              }
              break;

            case "help":
              output.innerHTML += `<div class="my-2 font-mono text-xs"><div class="text-her-red font-bold mb-2">Available Commands</div><div class="grid gap-y-1"><div><span class="text-blue-400 font-bold w-20 inline-block">SYSTEM</span> <span class="text-gray-300">help, clear, neofetch, version, uptime, history</span></div><div><span class="text-blue-400 font-bold w-20 inline-block">FILE OPS</span> <span class="text-gray-300">ls [-a], cd, pwd, mkdir, touch, rmdir, cat</span></div><div><span class="text-blue-400 font-bold w-20 inline-block">APPS</span> <span class="text-gray-300">open [app], about, projects, resume, contact</span></div><div><span class="text-blue-400 font-bold w-20 inline-block">NETWORK</span> <span class="text-gray-300">traceroute, dig, curl</span></div><div><span class="text-blue-400 font-bold w-20 inline-block">DEVOPS</span> <span class="text-gray-300">docker, terraform, cisco, ssh</span></div><div><span class="text-blue-400 font-bold w-20 inline-block">UTILS</span> <span class="text-gray-300">calc, clock, quote, whoami, skills, timeline</span></div><div><span class="text-pink-400 font-bold w-20 inline-block">TEXT ART</span> <span class="text-gray-300">ascii, figlet, cowsay, flip</span></div><div><span class="text-green-400 font-bold w-20 inline-block">GAMES</span> <span class="text-gray-300">guess, rps, 8ball</span></div><div><span class="text-cyan-400 font-bold w-20 inline-block">VISUALS</span> <span class="text-gray-300">matrix, rain, sl, hack, hlx</span></div><div><span class="text-yellow-400 font-bold w-20 inline-block">THEMES</span> <span class="text-gray-300">cyberpunk, fallout</span></div></div><div class="text-gray-500 mt-2">Type <span class="text-white">man &lt;cmd&gt;</span> for details. <span class="text-gray-600">Ctrl+C</span> cancels running commands.</div></div>`;
              break;
            case "clear":
              output.innerHTML = "";
              break;
            case "whoami":
              output.innerHTML += `<div>guest</div>`;
              break;
            case "pwd":
              output.innerHTML += `<div>${currentPath}</div>`;
              break;
            case "ls":
            case "ll": {
              const showHidden = args.includes("-a") || args.includes("-la") || args.includes("-al");
              const longFormat = cmd === "ll" || args.includes("-l") || args.includes("-la") || args.includes("-al");
              if (longFormat) {
                let rows = `<div class="text-xs font-mono my-1">`;
                if (dirObj) {
                  const keys = Object.keys(dirObj);
                  const visibleKeys = showHidden ? keys : keys.filter(k => !k.startsWith("."));
                  rows += `<div class="text-gray-500">total ${visibleKeys.length}</div>`;
                  visibleKeys.forEach((k) => {
                    const isDir = typeof dirObj[k] === "object";
                    const perms = isDir ? "drwxr-xr-x" : "-rw-r--r--";
                    const size = isDir ? "4096" : " 128";
                    const nameClass = isDir ? "text-blue-400 font-bold" : "text-gray-200";
                    rows += `<div><span class="text-green-400">${perms}</span> <span class="text-gray-500">guest guest</span> <span class="text-gray-400">${size}</span> <span class="text-gray-500">Jan 15 09:42</span> <span class="${nameClass}">${k}${isDir ? "/" : ""}</span></div>`;
                  });
                }
                rows += `</div>`;
                output.innerHTML += rows;
              } else {
                let content = "";
                if (dirObj) {
                  Object.keys(dirObj).forEach((k) => {
                    if (!showHidden && k.startsWith(".")) return;
                    const isDir = typeof dirObj[k] === "object";
                    content += `<span class="${isDir ? "text-blue-400 font-bold" : ""} mr-4">${k}${isDir ? "/" : ""}</span>`;
                  });
                }
                output.innerHTML += `<div>${content}</div>`;
              }
              break;
            }
            case "cd":
              const target = args[1];
              if (!target) break;
              if (target === "..") {
                const parts = currentPath.split("/");
                if (parts.length > 2) {
                  parts.pop();
                  setCurrentPath(parts.join("/"));
                }
              } else {
                if (
                  dirObj &&
                  dirObj[target] &&
                  typeof dirObj[target] === "object"
                ) {
                  setCurrentPath(currentPath === "/"
                    ? `/${target}`
                    : `${currentPath}/${target}`);
                } else {
                  output.innerHTML += `<div class="text-red-400">cd: no such directory: ${target}</div>`;
                }
              }
              document.getElementById(
                "term-prompt"
              ).innerText = `guest@portfolio ${
                currentPath === "/home/guest" ? "~" : currentPath
              } $`;
              break;
            case "mkdir":
              if (args[1]) {
                if (dirObj[args[1]])
                  output.innerHTML += `<div class="text-red-400">mkdir: cannot create directory '${args[1]}': File exists</div>`;
                else dirObj[args[1]] = {};
              }
              break;
            case "touch":
              if (args[1]) {
                dirObj[args[1]] = "FILE";
              }
              break;
            case "rmdir":
              if (args[1]) {
                if (dirObj[args[1]] && typeof dirObj[args[1]] === "object") {
                  if (Object.keys(dirObj[args[1]]).length === 0)
                    delete dirObj[args[1]];
                  else
                    output.innerHTML += `<div class="text-red-400">rmdir: failed to remove '${args[1]}': Directory not empty</div>`;
                } else {
                  output.innerHTML += `<div class="text-red-400">rmdir: failed to remove '${args[1]}': No such file or directory</div>`;
                }
              }
              break;
            case "cat":
              if (args[1] === "readme.md") {
                output.innerHTML += `<div class="whitespace-pre-wrap opacity-80 my-2">Hi, I'm Pietro. This is my interactive portfolio.\nRun 'about' to see the graphical version.</div>`;
              } else if (args[1] === ".secrets") {
                output.innerHTML += `<div class="whitespace-pre-wrap my-2 text-purple-400">🔮 You found a secret!\n\nHints:\n  - Try 'noclip' for R&D access\n  - 'hack' might do something fun\n  - 'matrix' is quite immersive\n  - 'guess' starts a mini-game\n\nThanks for exploring! 🚀</div>`;
              } else if (dirObj && dirObj[args[1]] === "FILE") {
                output.innerHTML += `<div>(Empty file)</div>`;
              } else {
                output.innerHTML += `<div class="text-red-400">cat: ${args[1]}: No such file</div>`;
              }
              break;
            case "open":
              const appName = args[1]?.toLowerCase();
              if (
                windows[appName] ||
                appName === "terminal" ||
                appName === "vault"
              ) {
                window.openWindow(
                  appName === "terminal" ? "terminal" : appName
                );
                output.innerHTML += `<div>Opening ${appName}...</div>`;
              } else {
                output.innerHTML += `<div class="text-red-400">App not found: ${appName}</div>`;
              }
              break;
            case "calc":
              // Safe calculator - only allows numbers and basic math operators
              try {
                const expr = args.slice(1).join("");
                if (!expr.trim()) {
                  output.innerHTML += `<div class="text-yellow-400">Usage: calc 2 + 2</div>`;
                  break;
                }
                // Strict validation: only digits, operators, parentheses, decimal points, spaces
                if (!/^[\d+\-*/().%\s]+$/.test(expr)) {
                  output.innerHTML += `<div class="text-red-400">Invalid expression. Only numbers and +, -, *, /, %, (), . allowed.</div>`;
                  break;
                }
                // Additional safety: no consecutive operators, balanced parentheses
                if (/[+\-*/%]{2,}/.test(expr.replace(/\s/g, ''))) {
                  output.innerHTML += `<div class="text-red-400">Invalid expression: consecutive operators.</div>`;
                  break;
                }
                const result = Function('"use strict"; return (' + expr + ')')();
                if (typeof result !== 'number' || !isFinite(result)) {
                  output.innerHTML += `<div class="text-red-400">Invalid result.</div>`;
                  break;
                }
                output.innerHTML += `<div class="text-green-400 font-bold my-1">= ${result}</div>`;
              } catch (e) {
                output.innerHTML += `<div class="text-red-400">Error: ${e.message}</div>`;
              }
              break;
            case "guess":
              guessGame.active = true;
              guessGame.target = Math.floor(Math.random() * 100) + 1;
              guessGame.attempts = 0;
              output.innerHTML += `<div class="text-green-400 font-bold my-2">🎮 Guess the Number Game Started!</div><div>I'm thinking of a number between 1 and 100.</div><div>Type your guess below:</div>`;
              break;
            case "traceroute":
            case "tracert": {
              const traceTarget = args[1] || "pietrouni.com";
              const hops = [
                { ip: "192.168.1.1", host: "router.local", ms: [1, 2, 1] },
                { ip: "10.0.0.1", host: "isp-gateway.net", ms: [8, 9, 8] },
                { ip: "72.14.215.85", host: "edge-router-1.carrier.net", ms: [15, 14, 16] },
                { ip: "142.250.169.174", host: "core-switch-eu.backbone.net", ms: [24, 25, 23] },
                { ip: "203.0.113.50", host: "cdn-edge.cloudfront.net", ms: [28, 29, 27] },
                { ip: "151.101.1.140", host: traceTarget, ms: [32, 31, 33] },
              ];
              output.innerHTML += `<div class="text-cyan-400 text-xs">traceroute to ${traceTarget}, 30 hops max, 60 byte packets</div>`;
              let hopIndex = 0;
              let traceCancelled = false;
              let traceTimeout;
              function showNextHop() {
                if (traceCancelled) return;
                if (hopIndex >= hops.length) {
                  output.innerHTML += `<div class="text-green-400 text-xs mt-1">Trace complete.</div>`;
                  output.scrollTop = output.scrollHeight;
                  return;
                }
                const hop = hops[hopIndex];
                output.innerHTML += `<div class="text-gray-300 text-xs font-mono">${(hopIndex + 1).toString().padStart(2)}  ${hop.host} (${hop.ip})  ${hop.ms[0]}ms  ${hop.ms[1]}ms  ${hop.ms[2]}ms</div>`;
                output.scrollTop = output.scrollHeight;
                hopIndex++;
                traceTimeout = setTimeout(showNextHop, 300 + Math.random() * 200);
              }
              registerTerminalCleanup(() => { traceCancelled = true; clearTimeout(traceTimeout); });
              showNextHop();
              break;
            }
            case "dig":
              const digTarget = args[1] || "pietrouni.com";
              output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">; <<>> DiG 9.18.18 <<>> ${digTarget}
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 42069
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;${digTarget}.                 IN      A

;; ANSWER SECTION:
${digTarget}.          300     IN      A       151.101.1.140
${digTarget}.          300     IN      A       151.101.65.140

;; Query time: 24 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: ${new Date().toUTCString()}
;; MSG SIZE  rcvd: 83</pre>`;
              break;
            case "curl":
              const curlTarget = args[1] || "https://api.pietrouni.com/status";
              const curlResponses = [
                {
                  status: 200,
                  body: '{"status":"ok","message":"Everything is awesome!","uptime":"42 days","coffee_level":"critical"}',
                },
                {
                  status: 418,
                  body: '{"error":"I\'m a teapot","message":"Cannot brew coffee with a teapot"}',
                },
                {
                  status: 202,
                  body: '{"status":"accepted","message":"Your request has been queued behind 3 cat videos"}',
                },
                {
                  status: 503,
                  body: '{"error":"Service Unavailable","reason":"The hamster powering the server is on break"}',
                },
              ];
              const resp =
                curlResponses[Math.floor(Math.random() * curlResponses.length)];
              const statusColor =
                resp.status === 200
                  ? "text-green-400"
                  : resp.status < 400
                  ? "text-yellow-400"
                  : "text-red-400";
              output.innerHTML += `<div class="text-xs my-2"><div class="text-gray-500">$ curl -s ${curlTarget}</div><div class="${statusColor} mt-1">HTTP/1.1 ${resp.status}</div><pre class="text-cyan-400 mt-1">${resp.body}</pre></div>`;
              break;
            case "docker":
              const dockerCmd = args[1] || "ps";
              if (dockerCmd === "ps" || dockerCmd === "container") {
                output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">CONTAINER ID   IMAGE                    STATUS          PORTS                    NAMES\na1b2c3d4e5f6   nginx:alpine             Up 42 days      0.0.0.0:80->80/tcp       web-frontend\nb2c3d4e5f6a1   portfolio-api:latest     Up 42 days      0.0.0.0:3000->3000/tcp   api-backend\nc3d4e5f6a1b2   redis:7-alpine           Up 42 days      6379/tcp                 cache-redis\nd4e5f6a1b2c3   postgres:15              Up 42 days      5432/tcp                 db-postgres\ne5f6a1b2c3d4   grafana/grafana:latest   Up 41 days      0.0.0.0:3001->3000/tcp   monitoring</pre>`;
              } else if (dockerCmd === "images") {
                output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">REPOSITORY           TAG       IMAGE ID       SIZE\nportfolio-api        latest    sha256:abc123   245MB\nnginx                alpine    sha256:def456   23MB\nredis                7-alpine  sha256:ghi789   30MB\npostgres             15        sha256:jkl012   379MB\ngrafana/grafana      latest    sha256:mno345   301MB</pre>`;
              } else if (dockerCmd === "stats") {
                output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">CONTAINER ID   NAME           CPU %     MEM USAGE / LIMIT     NET I/O\na1b2c3d4e5f6   web-frontend   0.50%     24MiB / 512MiB        1.2GB / 890MB\nb2c3d4e5f6a1   api-backend    2.30%     156MiB / 1GiB         4.5GB / 2.1GB\nc3d4e5f6a1b2   cache-redis    0.10%     12MiB / 256MiB        890MB / 450MB\nd4e5f6a1b2c3   db-postgres    1.20%     384MiB / 2GiB         2.3GB / 1.8GB</pre>`;
              } else {
                output.innerHTML += `<div class="text-gray-500 text-xs">Usage: docker [ps|images|stats]</div>`;
              }
              break;
            case "terraform":
              const tfCmd = args[1];
              if (!tfCmd) {
                output.innerHTML += `<pre class="text-xs my-2"><span class="text-purple-400 font-bold">Usage:</span> terraform [command]\n\n<span class="text-gray-400">Main commands:</span>\n  <span class="text-blue-300">init</span>      Prepare your working directory\n  <span class="text-blue-300">plan</span>      Show changes required by the current config\n  <span class="text-blue-300">apply</span>     Create or update infrastructure\n  <span class="text-blue-300">destroy</span>   Destroy previously-created infrastructure\n\n<span class="text-gray-500">Run 'terraform plan' to get started!</span></pre>`;
              } else if (tfCmd === "init") {
                output.innerHTML += `<pre class="text-xs my-2"><span class="text-white">Initializing the backend...</span>\n<span class="text-white">Initializing provider plugins...</span>\n- Finding latest version of hashicorp/aws...\n- Installing hashicorp/aws v5.31.0...\n- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)\n\n<span class="text-green-400 font-bold">Terraform has been successfully initialized!</span></pre>`;
              } else if (tfCmd === "plan") {
                output.innerHTML += `<pre class="text-xs my-2"><span class="text-white font-bold">Terraform will perform the following actions:</span>\n\n<span class="text-green-400">  + aws_instance.productivity</span>\n      ami           = "ami-0c55b159cbfafe1f0"\n      instance_type = "t3.unlimited-coffee"\n      tags          = {\n        Name = "productivity-boost"\n        Mood = "caffeinated"\n      }\n\n<span class="text-yellow-400">  ~ aws_s3_bucket.bugs</span>\n      - lifecycle_rule.enabled = true\n      + lifecycle_rule.enabled = false\n      <span class="text-gray-500"># (bugs are now permanent features)</span>\n\n<span class="text-red-400">  - aws_instance.weekend</span>\n      <span class="text-gray-500"># (will be destroyed Mon-Fri)</span>\n\n<span class="text-white font-bold">Plan:</span> <span class="text-green-400">1 to add</span>, <span class="text-yellow-400">1 to change</span>, <span class="text-red-400">1 to destroy</span>\n\n<span class="text-gray-500">Do you want to perform these actions? Enter 'yes' or 'no':</span></pre>`;
                terraformMode.active = true;
              } else {
                output.innerHTML += `<div class="text-gray-500 text-xs">Usage: terraform [plan|apply|destroy]</div>`;
              }
              break;
            case "cisco":
            case "ssh": {
              inputEl.disabled = true;
              const sshPrompt = document.getElementById("term-prompt");
              const sshMessages = [
                { text: '<span class="text-gray-400">Connecting to CORE-RTR-01 (192.168.1.1)...</span>', delay: 0 },
                { text: '<span class="text-gray-400">Verifying SSH key fingerprint...</span>', delay: 500 },
                { text: '<span class="text-green-400">Connection established.</span>', delay: 1000 },
                { text: "", delay: 1200 },
                { text: '<span class="text-cyan-400">CORE-RTR-01#</span> <span class="text-gray-500">Type ? for available commands, exit to disconnect</span>', delay: 1400 },
              ];
              let sshIndex = 0;
              let sshCancelled = false;
              let sshTimeout;
              function showNextSsh() {
                if (sshCancelled) return;
                if (sshIndex >= sshMessages.length) {
                  ciscoMode.active = true;
                  sshPrompt.outerHTML =
                    '<span id="term-prompt" class="text-cyan-400 font-semibold">CORE-RTR-01#</span>';
                  inputEl.disabled = false;
                  inputEl.focus();
                  return;
                }
                const msg = sshMessages[sshIndex];
                if (msg.text) output.innerHTML += `<div>${msg.text}</div>`;
                output.scrollTop = output.scrollHeight;
                sshIndex++;
                sshTimeout = setTimeout(
                  showNextSsh,
                  sshMessages[sshIndex]?.delay ? sshMessages[sshIndex].delay - msg.delay : 200
                );
              }
              registerTerminalCleanup(() => {
                sshCancelled = true;
                clearTimeout(sshTimeout);
                inputEl.disabled = false;
                inputEl.focus();
              });
              showNextSsh();
              break;
            }
            case "version":
              output.innerHTML += `<div class="my-2"><div class="text-her-red font-bold mb-2">📋 OS93 Version History</div><div class="font-mono text-xs space-y-1"><div class="flex gap-4"><span class="text-gray-500">1.0</span><span class="text-red-400">Scarlet-Samantha</span></div><div class="flex gap-4"><span class="text-gray-500">1.1</span><span class="text-teal-400">Teal-Twombly</span></div><div class="flex gap-4"><span class="text-gray-500">1.2</span><span class="text-orange-400">Coral-Catherine</span></div><div class="flex gap-4"><span class="text-gray-500">1.3</span><span class="text-amber-700">Walnut-Watts</span></div><div class="flex gap-4"><span class="text-green-400 font-bold">1.4</span><span class="text-emerald-400 font-bold">Jade-Jonze</span><span class="text-gray-400">Current ✓</span></div></div></div>`;
              break;
            case "uptime":
              output.innerHTML += `<div class="my-2"><div class="text-green-400 font-bold">⏱️ Session Uptime</div><div class="text-blue-300 mt-1">Visitor has been exploring for <span class="font-bold">${Math.floor(
                performance.now() / 60000
              )} mins</span></div></div>`;
              break;
            case "clock":
              const now = new Date();
              const timeStr = now.toLocaleTimeString();
              output.innerHTML += `<div class="my-2 text-cyan-400 font-bold text-lg">${timeStr}</div>`;
              break;
            case "quote":
              // get next quote from shuffled array
              const currentQuote = shuffledQuotes[quoteIndex];
              setQuoteIndex(quoteIndex + 1);
              if (quoteIndex >= shuffledQuotes.length) {
                setQuoteIndex(0);
                reshuffleQuotes(); // Reshuffle when all shown
              }
              output.innerHTML += `<div class="text-purple-300 italic my-2">💬 ${currentQuote}</div>`;
              break;
            case "neofetch":
              const info = `
<span class="text-blue-400">guest@OS93</span>
--------------------
<span class="text-her-red">OS</span>: OS93 Version 1.4 (Jade-Jonze)
<span class="text-her-red">Host</span>: Browser Virtual Machine
<span class="text-her-red">Kernel</span>: Linux micro-kernel 6.8.0-45
<span class="text-her-red">Uptime</span>: ${Math.floor(
                performance.now() / 60000
              )} mins
<span class="text-her-red">Shell</span>: posh 1.0.0
<span class="text-her-red">Resolution</span>: ${window.innerWidth}x${
                window.innerHeight
              }
<span class="text-her-red">Theme</span>: ${
                document.documentElement.classList.contains("dark")
                  ? "Dark"
                  : "Light"
              }
<span class="text-her-red">CPU</span>: Web Worker @ 2.4GHz
<span class="text-her-red">Memory</span>: 640KB / 1337MB
`;
              const logo = `
        .--.
       |o_o |
       |:_/ |
      //   \\ \\
     (|     |)
    /'\\_   _/ \`\\
    \\___)=(___/
`;
              output.innerHTML += `<div class="flex gap-4 my-2 font-mono text-xs"><pre class="text-blue-500 hidden sm:block">${logo}</pre><pre>${info}</pre></div>`;
              break;
            case "ascii":
              const text = args.slice(1).join(" ").toUpperCase() || "HELLO";
              // Simple 5x5 font for uppercase (partial)
              const asciiAlpha = {
                A: ["  A  ", " A A ", "AAAAA", "A   A", "A   A"],
                B: ["BBBB ", "B   B", "BBBB ", "B   B", "BBBB "],
                C: [" CCC ", "C    ", "C    ", "C    ", " CCC "],
                D: ["DDDD ", "D   D", "D   D", "D   D", "DDDD "],
                E: ["EEEEE", "E    ", "EEEEE", "E    ", "EEEEE"],
                F: ["FFFFF", "F    ", "FFFF ", "F    ", "F    "],
                G: [" GGG ", "G    ", "G  GG", "G   G", " GGG "],
                H: ["H   H", "H   H", "HHHHH", "H   H", "H   H"],
                I: ["IIIII", "  I  ", "  I  ", "  I  ", "IIIII"],
                J: ["JJJJJ", "    J", "    J", "J   J", " JJJ "],
                K: ["K   K", "K  K ", "KKK  ", "K  K ", "K   K"],
                L: ["L    ", "L    ", "L    ", "L    ", "LLLLL"],
                M: ["M   M", "MM MM", "M M M", "M   M", "M   M"],
                N: ["N   N", "NN  N", "N N N", "N  NN", "N   N"],
                O: [" OOO ", "O   O", "O   O", "O   O", " OOO "],
                P: ["PPPP ", "P   P", "PPPP ", "P    ", "P    "],
                Q: [" QQQ ", "Q   Q", "Q   Q", "Q  QQ", " QQQQ"],
                R: ["RRRR ", "R   R", "RRRR ", "R  R ", "R   R"],
                S: [" SSSS", "S    ", " SSS ", "    S", "SSSS "],
                T: ["TTTTT", "  T  ", "  T  ", "  T  ", "  T  "],
                U: ["U   U", "U   U", "U   U", "U   U", " UUU "],
                V: ["V   V", "V   V", "V   V", "V   V", "  V  "],
                W: ["W   W", "W   W", "W W W", "W W W", " W W "],
                X: ["X   X", " X X ", "  X  ", " X X ", "X   X"],
                Y: ["Y   Y", " Y Y ", "  Y  ", "  Y  ", "  Y  "],
                Z: ["ZZZZZ", "   Z ", "  Z  ", " Z   ", "ZZZZZ"],
                " ": ["     ", "     ", "     ", "     ", "     "],
              };
              let art = "";
              for (let i = 0; i < 5; i++) {
                let line = "";
                for (let char of text) {
                  if (asciiAlpha[char]) line += asciiAlpha[char][i] + "  ";
                  else line += "     ";
                }
                art += line + "\n";
              }
              output.innerHTML += `<pre class="text-[10px] leading-3 text-green-400 my-2 overflow-x-auto">${art}</pre>`;
              break;
            case "cowsay":
              const msg = args.slice(1).join(" ") || "Moo!";
              const cow = `\n         \\   ^__^\n          \\  (oo)\\_______\n             (__)\\       )\\/\\\n                 ||----w |\n                 ||     ||`;
              output.innerHTML += `<pre class="text-xs text-blue-300 my-2"> &lt; ${msg} &gt;${cow}</pre>`;
              break;
            case "figlet":
              const figletText = (args.slice(1).join(" ") || "HELLO")
                .toUpperCase()
                .slice(0, 10);
              // Figlet font omitted for brevity, using simple block char fallback if desired, or assume user happy with ascii command.
              // Re-implementing simplified figlet for reliability
              const figletFont = {
                A: ["  ██  ", " █  █ ", "██████", "█    █", "█    █"],
                B: ["█████ ", "█    █", "█████ ", "█    █", "█████ "],
                C: [" ████ ", "█     ", "█     ", "█     ", " ████ "],
                D: ["████  ", "█   █ ", "█    █", "█   █ ", "████  "],
                E: ["██████", "█     ", "████  ", "█     ", "██████"],
                F: ["██████", "█     ", "████  ", "█     ", "█     "],
                G: [" ████ ", "█     ", "█  ███", "█    █", " ████ "],
                H: ["█    █", "█    █", "██████", "█    █", "█    █"],
                I: ["██████", "  ██  ", "  ██  ", "  ██  ", "██████"],
                J: ["██████", "    █ ", "    █ ", "█   █ ", " ███  "],
                K: ["█   █ ", "█  █  ", "███   ", "█  █  ", "█   █ "],
                L: ["█     ", "█     ", "█     ", "█     ", "██████"],
                M: ["█    █", "██  ██", "█ ██ █", "█    █", "█    █"],
                N: ["█    █", "██   █", "█ █  █", "█  █ █", "█   ██"],
                O: [" ████ ", "█    █", "█    █", "█    █", " ████ "],
                P: ["█████ ", "█    █", "█████ ", "█     ", "█     "],
                Q: [" ████ ", "█    █", "█  █ █", "█   █ ", " ██ █ "],
                R: ["█████ ", "█    █", "█████ ", "█  █  ", "█   █ "],
                S: [" █████", "█     ", " ████ ", "     █", "█████ "],
                T: ["██████", "  ██  ", "  ██  ", "  ██  ", "  ██  "],
                U: ["█    █", "█    █", "█    █", "█    █", " ████ "],
                V: ["█    █", "█    █", " █  █ ", " █  █ ", "  ██  "],
                W: ["█    █", "█    █", "█ ██ █", "██  ██", "█    █"],
                X: ["█    █", " █  █ ", "  ██  ", " █  █ ", "█    █"],
                Y: ["█    █", " █  █ ", "  ██  ", "  ██  ", "  ██  "],
                Z: ["██████", "    █ ", "  ██  ", " █    ", "██████"],
                " ": ["      ", "      ", "      ", "      ", "      "],
              };
              let figletOutput = "";
              for (let row = 0; row < 5; row++) {
                let line = "";
                for (let char of figletText) {
                  line +=
                    (figletFont[char] ? figletFont[char][row] : "      ") + " ";
                }
                figletOutput += line + "\n";
              }
              output.innerHTML += `<pre class="text-green-400 text-xs my-2 overflow-x-auto">${figletOutput}</pre>`;
              break;
            case "flip":
              const flipMap = {
                a: "ɐ",
                b: "q",
                c: "ɔ",
                d: "p",
                e: "ǝ",
                f: "ɟ",
                g: "ƃ",
                h: "ɥ",
                i: "ᴉ",
                j: "ɾ",
                k: "ʞ",
                l: "l",
                m: "ɯ",
                n: "u",
                o: "o",
                p: "d",
                q: "b",
                r: "ɹ",
                s: "s",
                t: "ʇ",
                u: "n",
                v: "ʌ",
                w: "ʍ",
                x: "x",
                y: "ʎ",
                z: "z",
                A: "∀",
                B: "q",
                C: "Ɔ",
                D: "p",
                E: "Ǝ",
                F: "Ⅎ",
                G: "⅁",
                H: "H",
                I: "I",
                J: "ſ",
                K: "ʞ",
                L: "˥",
                M: "W",
                N: "N",
                O: "O",
                P: "Ԁ",
                Q: "Q",
                R: "ɹ",
                S: "S",
                T: "⊥",
                U: "∩",
                V: "Λ",
                W: "M",
                X: "X",
                Y: "⅄",
                Z: "Z",
                1: "Ɩ",
                2: "ᄅ",
                3: "Ɛ",
                4: "ㄣ",
                5: "ϛ",
                6: "9",
                7: "ㄥ",
                8: "8",
                9: "6",
                0: "0",
                ".": "˙",
                ",": "'",
                "'": ",",
                '"': "„",
                "`": ",",
                "?": "¿",
                "!": "¡",
                "[": "]",
                "]": "[",
                "(": ")",
                ")": "(",
                "{": "}",
                "}": "{",
                "<": ">",
                ">": "<",
                _: "‾",
                "^": "v",
                "&": "⅋",
              };
              const flipText = args.slice(1).join(" ") || "Hello World";
              const flipped = flipText
                .split("")
                .map((c) => flipMap[c] || c)
                .reverse()
                .join("");
              output.innerHTML += `<div class="text-cyan-400 my-2 font-bold">${flipped}</div>`;
              break;
            case "rps":
              const rpsChoices = ["rock", "paper", "scissors"];
              const rpsEmojis = { rock: "🪨", paper: "📄", scissors: "✂️" };
              const rpsInput = (args[1] || "").toLowerCase();
              let playerChoice = null;
              if (rpsInput.startsWith("r")) playerChoice = "rock";
              else if (rpsInput.startsWith("p")) playerChoice = "paper";
              else if (rpsInput.startsWith("s")) playerChoice = "scissors";

              if (!playerChoice) {
                output.innerHTML += `<div class="text-yellow-400 my-2">Usage: rps [rock|paper|scissors]</div>`;
              } else {
                const cpuChoice = rpsChoices[Math.floor(Math.random() * 3)];
                let result, resultColor;
                if (playerChoice === cpuChoice) {
                  result = "It's a draw!";
                  resultColor = "text-yellow-400";
                } else if (
                  (playerChoice === "rock" && cpuChoice === "scissors") ||
                  (playerChoice === "paper" && cpuChoice === "rock") ||
                  (playerChoice === "scissors" && cpuChoice === "paper")
                ) {
                  result = "You win! 🎉";
                  resultColor = "text-green-400";
                } else {
                  result = "You lose! 💀";
                  resultColor = "text-red-400";
                }
                output.innerHTML += `<div class="my-2"><div class="flex items-center gap-4 text-2xl mb-2"><span>${rpsEmojis[playerChoice]}</span><span class="text-gray-500 text-sm">vs</span><span>${rpsEmojis[cpuChoice]}</span></div><div class="text-sm"><span class="text-blue-300">You:</span> ${playerChoice} <span class="text-gray-500">|</span> <span class="text-purple-300">CPU:</span> ${cpuChoice}</div><div class="${resultColor} font-bold mt-1">${result}</div></div>`;
              }
              break;
            case "8ball":
              const question = args.slice(1).join(" ");
              const techResponses = [
                { text: "It is certain. Ship it!", color: "text-green-400" },
                {
                  text: "Yes, but write tests first.",
                  color: "text-green-400",
                },
                {
                  text: "Reply hazy, try Stack Overflow.",
                  color: "text-yellow-400",
                },
                {
                  text: "Don't count on it. That's technical debt.",
                  color: "text-red-400",
                },
                {
                  text: "Outlook not so good. Sounds like a future bug.",
                  color: "text-red-400",
                },
                { text: "404: Answer not found.", color: "text-red-400" },
              ];
              const response =
                techResponses[Math.floor(Math.random() * techResponses.length)];
              output.innerHTML += `<div class="my-2"><div class="text-purple-400">🎱 You asked: "${
                question || "nothing"
              }"</div><div class="${response.color} font-bold mt-1">➜ ${
                response.text
              }</div></div>`;
              break;
            case "sudo":
              const sudoResponses = [
                {
                  text: "Nice try, but you have no power here!",
                  color: "text-red-400",
                },
                {
                  text: "Permission denied. This isn't your Linux box!",
                  color: "text-red-400",
                },
                {
                  text: "sudo: user 'guest' is not in the sudoers file.",
                  color: "text-yellow-400",
                },
              ];
              const sudoResp =
                sudoResponses[Math.floor(Math.random() * sudoResponses.length)];
              output.innerHTML += `<div class="${sudoResp.color} my-2 font-bold">🔐 ${sudoResp.text}</div>`;
              break;
            case "rm":
              if (input.includes("-rf") && input.includes("/")) {
                inputEl.disabled = true;
                const rmMessages = [
                  { text: '<span class="text-red-500 font-bold">⚠️ WARNING: DESTRUCTIVE OPERATION DETECTED</span>', delay: 0 },
                  { text: '<span class="text-red-400">Deleting /bin...</span>', delay: 600 },
                  { text: '<span class="text-yellow-500 animate-pulse">KERNEL PANIC</span>', delay: 3000 },
                  { text: '<span class="text-green-400 font-bold text-lg"> jk this is just a website, silly 😂</span>', delay: 4000 },
                ];
                let rmIndex = 0;
                let rmCancelled = false;
                let rmTimeout;
                function showNextRm() {
                  if (rmCancelled) return;
                  if (rmIndex >= rmMessages.length) {
                    inputEl.disabled = false;
                    inputEl.focus();
                    return;
                  }
                  const msg = rmMessages[rmIndex];
                  if (msg.text) output.innerHTML += `<div>${msg.text}</div>`;
                  output.scrollTop = output.scrollHeight;
                  rmIndex++;
                  rmTimeout = setTimeout(
                    showNextRm,
                    rmMessages[rmIndex]?.delay ? rmMessages[rmIndex].delay - msg.delay : 500
                  );
                }
                registerTerminalCleanup(() => {
                  rmCancelled = true;
                  clearTimeout(rmTimeout);
                  inputEl.disabled = false;
                  inputEl.focus();
                });
                showNextRm();
              } else {
                output.innerHTML += `<div class="text-red-400">rm: missing operand</div>`;
              }
              break;
            case "exit":
              output.innerHTML += `<div class="text-purple-400 italic my-2">🚪 You can check out any time you like, but you can never leave... 🎸</div>`;
              break;
            case "pietro":
              const pietroLogo = ` ██████╗ ██╗███████╗████████╗██████╗  ██████╗ \n ██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗\n ██████╔╝██║█████╗     ██║   ██████╔╝██║   ██║\n ██╔═══╝ ██║██╔══╝     ██║   ██╔══██╗██║   ██║\n ██║     ██║███████╗   ██║   ██║  ██║╚██████╔╝\n ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝`;
              // Calculate uptime from birthdate (June 13, 1993 at 1:00 AM)
              const birthDate = new Date(1993, 5, 13, 1, 0, 0); // Month is 0-indexed
              const nowTime = new Date();
              let years = nowTime.getFullYear() - birthDate.getFullYear();
              const lastBday = new Date(nowTime.getFullYear(), 5, 13, 1, 0, 0);
              if (nowTime < lastBday) years--;
              const currentBday = new Date(
                nowTime.getFullYear() - (nowTime < lastBday ? 1 : 0),
                5,
                13,
                1,
                0,
                0
              );
              const diffMs = nowTime - currentBday;
              const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const hours = nowTime.getHours();
              const minutes = nowTime.getMinutes();
              const uptime = `${years} years, ${daysDiff} days, ${hours}h ${minutes}m`;
              const pietroInfo = `<span class="text-purple-400 font-bold">pietro@OS93</span>\n<span class="text-gray-500">──────────────────────────────</span>\n<span class="text-her-red">Resolution</span>: 5120x1440\n<span class="text-her-red">CPU</span>: Intel(R) Core(TM) i9-14900 @ 1.997GHz\n<span class="text-her-red">GPU</span>: NVIDIA GeForce RTX 4090\n<span class="text-her-red">Uptime</span>: ${uptime}\n<span class="text-gray-500">──────────────────────────────</span>\n<span class="text-her-red">Role</span>: Infrastructure Engineer\n<span class="text-her-red">Location</span>: Barcelona\n<span class="text-her-red">Languages</span>: Spanish, English, Italian\n<span class="text-her-red">Stack</span>: AWS, Terraform, Docker, K8s, Python\n<span class="text-gray-500">──────────────────────────────</span>`;
              output.innerHTML += `<div class="flex gap-4 my-2 font-mono text-xs"><pre class="text-purple-400 hidden sm:block">${pietroLogo}</pre><pre>${pietroInfo}</pre></div>`;
              break;
            case "matrix":
              const canvas = document.createElement("canvas");
              canvas.className =
                "fixed top-0 left-0 w-full h-full pointer-events-none z-50 opacity-80";
              document.body.appendChild(canvas);
              const ctx = canvas.getContext("2d");
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
              const katakana =
                "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";
              const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
              const nums = "0123456789";
              const alphabet = katakana + latin + nums;
              const fontSize = 16;
              const columns = canvas.width / fontSize;
              const drops = [];
              for (let x = 0; x < columns; x++) drops[x] = 1;
              function drawMatrix() {
                ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#0F0";
                ctx.font = fontSize + "px monospace";
                for (let i = 0; i < drops.length; i++) {
                  const text = alphabet.charAt(
                    Math.floor(Math.random() * alphabet.length)
                  );
                  ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                  if (
                    drops[i] * fontSize > canvas.height &&
                    Math.random() > 0.975
                  )
                    drops[i] = 0;
                  drops[i]++;
                }
              }
              const matrixInterval = setInterval(drawMatrix, 30);
              output.innerHTML += `<div class="text-green-400 font-bold my-2">Follow the white rabbit... (Click or Ctrl+C to stop)</div>`;
              const stopMatrix = () => {
                clearInterval(matrixInterval);
                canvas.remove();
                document.removeEventListener("click", stopMatrix);
              };
              document.addEventListener("click", stopMatrix);
              registerTerminalCleanup(stopMatrix);
              break;
            case "rain": {
              const rainCanvas = document.createElement("canvas");
              rainCanvas.className =
                "fixed top-0 left-0 w-full h-full pointer-events-none z-50 opacity-50";
              document.body.appendChild(rainCanvas);
              const rctx = rainCanvas.getContext("2d");
              rainCanvas.width = window.innerWidth;
              rainCanvas.height = window.innerHeight;
              const rainDrops = [];
              for (let i = 0; i < 100; i++)
                rainDrops.push({
                  x: Math.random() * rainCanvas.width,
                  y: Math.random() * rainCanvas.height,
                  l: Math.random() * 20 + 10,
                  v: Math.random() * 10 + 5,
                });
              let rainRunning = true;
              let rainFrameId;
              function drawRain() {
                if (!rainRunning) return;
                rctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
                rctx.strokeStyle = "rgba(174, 194, 224, 0.5)";
                rctx.lineWidth = 1;
                rctx.beginPath();
                for (let d of rainDrops) {
                  rctx.moveTo(d.x, d.y);
                  rctx.lineTo(d.x, d.y + d.l);
                  d.y += d.v;
                  if (d.y > rainCanvas.height) {
                    d.y = -d.l;
                    d.x = Math.random() * rainCanvas.width;
                  }
                }
                rctx.stroke();
                rainFrameId = requestAnimationFrame(drawRain);
              }
              rainFrameId = requestAnimationFrame(drawRain);
              registerTerminalCleanup(() => {
                rainRunning = false;
                cancelAnimationFrame(rainFrameId);
                rainCanvas.remove();
              });
              output.innerHTML += `<div class="text-blue-300 font-bold my-2">🌧️ It's raining code... (Ctrl+C to stop)</div>`;
              break;
            }
            case "sl": {
              const trainFrames = [
                "      ____\n     |DD|____T_\n     |_ |_____|<\n       @-@-@-oo\\",
                "      ____\n     |DD|____T_\n     |_ |_____|<\n      _@-@-@-oo\\",
                "      ____\n     |DD|____T_\n     |_ |_____|<\n       @-@-@-oo\\",
                "      ____\n     |DD|____T_\n     |_ |_____|<\n      _@-@-@-oo\\",
              ];
              let trainPos = window.innerWidth;
              const trainDiv = document.createElement("pre");
              trainDiv.className =
                "fixed bottom-10 z-50 text-white font-bold text-xs whitespace-pre";
              document.body.appendChild(trainDiv);
              let frameIdx = 0;
              let trainRunning = true;
              let trainFrameId;
              function moveTrain() {
                if (!trainRunning || trainPos < -200) {
                  trainDiv.remove();
                  return;
                }
                trainDiv.style.left = trainPos + "px";
                trainDiv.innerText = trainFrames[frameIdx % 4];
                trainPos -= 10;
                frameIdx++;
                trainFrameId = requestAnimationFrame(moveTrain);
              }
              registerTerminalCleanup(() => {
                trainRunning = false;
                cancelAnimationFrame(trainFrameId);
                trainDiv.remove();
              });
              moveTrain();
              output.innerHTML += `<div class="text-yellow-400 font-mono my-2">CHOO CHOO! 🚂</div>`;
              break;
            }
            case "hack": {
              inputEl.disabled = true;
              const hackLines = [
                { text: "Initializing brute-force attack...", color: "text-green-500" },
                { text: "Target: MAINFRAME (10.0.0.1)", color: "text-green-500" },
                { text: "Bypassing firewall...", color: "text-yellow-500" },
                { text: "Accessing secure nodes...", color: "text-yellow-500" },
                { text: "Decrypting passwords...", color: "text-red-500" },
                { text: "ACCESS GRANTED. Downloading database...", color: "text-green-500 font-bold" },
                { text: "Download complete. Traces cleared.", color: "text-blue-500" },
              ];
              let hackIndex = 0;
              let hackCancelled = false;
              let hackTimeout;
              function runHack() {
                if (hackCancelled) return;
                if (hackIndex >= hackLines.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  return;
                }
                output.innerHTML += `<div class="${hackLines[hackIndex].color} font-mono text-xs my-1">${hackLines[hackIndex].text}</div>`;
                output.scrollTop = output.scrollHeight;
                hackIndex++;
                hackTimeout = setTimeout(runHack, Math.random() * 800 + 200);
              }
              registerTerminalCleanup(() => {
                hackCancelled = true;
                clearTimeout(hackTimeout);
                inputEl.disabled = false;
                inputEl.focus();
              });
              runHack();
              break;
            }
            case "hlx": {
              inputEl.disabled = true;
              const hlxMessages = [
                { text: '<span class="text-green-400">Connecting to Valve servers...</span>', delay: 0 },
                { text: '<span class="text-green-400">Authenticating: ████████████ 100%</span>', delay: 800 },
                { text: '<span class="text-yellow-400">Loading HLX assets: 1... 2... 2.5... 2.75... 2.9... 2.99... 2.999...</span>', delay: 1600 },
                { text: "", delay: 2400 },
                { text: '<span class="text-gray-400 italic">"The right man in the wrong place can make all the difference in the world..."</span>', delay: 4500 },
                { text: '<span class="text-gray-500 text-xs">                                                              - G-Man</span>', delay: 5000 },
                { text: "", delay: 5800 },
                { text: '<span class="text-red-500 font-bold">ERROR: Unable to count to 3. This is a known Valve limitation.</span>', delay: 6300 },
              ];
              const lambdaArt = `
<pre class="hlx-lambda text-orange-500 font-bold my-2" style="text-shadow: 0 0 10px rgba(255,165,0,0.5);">
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⣤⣴⣦⣤⣤⣄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣤⣾⣿⣿⣿⣿⠿⠿⠿⠿⣿⣿⣿⣿⣶⣤⡀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⣾⣿⣿⡿⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⢿⣿⣿⣶⡀⠀⠀⠀⠀
⠀⠀⠀⣴⣿⣿⠟⠁⠀⠀⠀⣶⣶⣶⣶⡆⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⣦⠀⠀⠀
⠀⠀⣼⣿⣿⠋⠀⠀⠀⠀⠀⠛⠛⢻⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠙⣿⣿⣧⠀⠀
⠀⢸⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⡇⠀
⠀⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⠀
⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⡟⢹⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⣹⣿⣿⠀
⠀⣿⣿⣷⠀⠀⠀⠀⠀⠀⣰⣿⣿⠏⠀⠀⢻⣿⣿⡄⠀⠀⠀⠀⠀⠀⣿⣿⡿⠀
⠀⢸⣿⣿⡆⠀⠀⠀⠀⣴⣿⡿⠃⠀⠀⠀⠈⢿⣿⣷⣤⣤⡆⠀⠀⣰⣿⣿⠇⠀
⠀⠀⢻⣿⣿⣄⠀⠀⠾⠿⠿⠁⠀⠀⠀⠀⠀⠘⣿⣿⡿⠿⠛⠀⣰⣿⣿⡟⠀⠀
⠀⠀⠀⠻⣿⣿⣧⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⠏⠀⠀⠀
⠀⠀⠀⠀⠈⠻⣿⣿⣷⣤⣄⡀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣾⣿⣿⠟⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⠛⠿⣿⣿⣿⣿⣿⣶⣶⣿⣿⣿⣿⣿⠿⠋⠁⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠛⠛⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
</pre>`;
              let hlxIndex = 0;
              let hlxCancelled = false;
              let hlxTimeout;
              let hlxGlitchInterval;
              function showNextHlx() {
                if (hlxCancelled) return;
                if (hlxIndex >= hlxMessages.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  const lambdaEl = output.querySelector(".hlx-lambda");
                  if (lambdaEl) {
                    let glitchCount = 0;
                    hlxGlitchInterval = setInterval(() => {
                      if (glitchCount > 10 || hlxCancelled) {
                        clearInterval(hlxGlitchInterval);
                        lambdaEl.style.transform = "none";
                        lambdaEl.style.opacity = "1";
                        return;
                      }
                      lambdaEl.style.transform = `translate(${(Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 2}px) skewX(${(Math.random() - 0.5) * 3}deg)`;
                      lambdaEl.style.opacity = Math.random() > 0.3 ? "1" : "0.7";
                      lambdaEl.style.color = Math.random() > 0.8 ? "#ff6b6b" : "#f97316";
                      glitchCount++;
                    }, 100);
                  }
                  return;
                }
                const hlxMsg = hlxMessages[hlxIndex];
                const nextDelay = hlxIndex < hlxMessages.length - 1 ? hlxMessages[hlxIndex + 1].delay - hlxMsg.delay : 500;
                if (hlxIndex === 3) {
                  output.innerHTML += lambdaArt;
                } else if (hlxMsg.text) {
                  output.innerHTML += `<div>${hlxMsg.text}</div>`;
                }
                output.scrollTop = output.scrollHeight;
                hlxIndex++;
                hlxTimeout = setTimeout(showNextHlx, nextDelay);
              }
              registerTerminalCleanup(() => {
                hlxCancelled = true;
                clearTimeout(hlxTimeout);
                if (hlxGlitchInterval) clearInterval(hlxGlitchInterval);
                inputEl.disabled = false;
                inputEl.focus();
              });
              showNextHlx();
              break;
            }
            case "about":
              window.openWindow("about");
              break;
            case "contact":
              window.openWindow("contact");
              break;
            case "projects":
              window.openWindow("projects");
              break;
            case "resume":
              window.openWindow("resume");
              break;
            case "noclip":
              window.openWindow("experiments");
              output.innerHTML += `<div class="text-purple-400">🔬 Accessing R&D Lab...</div>`;
              // Add experiments to dock if not already there
              if (!document.getElementById('dock-experiments')) {
                const dock = document.querySelector('.dock-container');
                if (dock) {
                  const dockItem = document.createElement('div');
                  dockItem.id = 'dock-experiments';
                  dockItem.className = 'dock-item cursor-pointer group';
                  dockItem.setAttribute('title', 'Experiments Lab');
                  dockItem.setAttribute('role', 'button');
                  dockItem.setAttribute('aria-label', 'Open Experiments Lab');
                  dockItem.onclick = () => (window as any).restoreWindow('experiments');
                  dockItem.innerHTML = `
                    <span class="dock-label">Experiments</span>
                    <img class="dock-icon" src="assets/icons/org.gnome.Extensions.svg" alt="Experiments" aria-hidden="true" />
                  `;
                  dock.appendChild(dockItem);
                  output.innerHTML += `<div class="text-green-400">✓ Experiments Lab added to dock</div>`;
                }
              }
              break;
            case "history":
              if (terminalHistory.length === 0) {
                output.innerHTML += `<div class="text-gray-500">No commands in history.</div>`;
              } else {
                let histOut = "";
                terminalHistory.forEach((h, i) => {
                  histOut += `<div class="text-xs font-mono"><span class="text-gray-500 inline-block w-8 text-right mr-2">${i + 1}</span>${h}</div>`;
                });
                output.innerHTML += `<div class="my-1">${histOut}</div>`;
              }
              break;

            case "man": {
              const manCmd = args[1]?.toLowerCase();
              const manPages = {
                help: ["help", "Display all available commands grouped by category."],
                clear: ["clear", "Clear the terminal output. Shortcut: Ctrl+L"],
                ls: ["ls [-a]", "List files in the current directory. Use -a to show hidden files."],
                cd: ["cd <dir>", "Change directory. Use '..' to go up one level."],
                cat: ["cat <file>", "View file contents. Try: cat .secrets"],
                open: ["open <app>", "Open an application window. Apps: about, projects, resume, contact, terminal, vault"],
                matrix: ["matrix", "Full-screen Matrix rain effect. Click or Ctrl+C to stop."],
                rain: ["rain", "Ambient rainfall overlay. Ctrl+C to stop."],
                hack: ["hack", "Simulated hacking sequence with progressive output."],
                hlx: ["hlx", "Half-Life easter egg. A known Valve limitation applies."],
                skills: ["skills", "Animated skill assessment showing technical proficiencies."],
                timeline: ["timeline", "Career timeline with roles and tech stacks."],
                history: ["history", "Show all commands entered this session."],
                neofetch: ["neofetch", "Display system information with ASCII logo."],
                docker: ["docker [ps|images|stats]", "Simulated Docker container management."],
                terraform: ["terraform [init|plan]", "Simulated Terraform infrastructure workflow."],
                cisco: ["cisco / ssh", "Connect to simulated Cisco router. Type 'exit' to disconnect."],
                traceroute: ["traceroute [host]", "Animated network trace route simulation."],
                cyberpunk: ["cyberpunk", "Switch terminal to Cyberpunk 2077 NET_ARCH mode."],
                fallout: ["fallout", "Switch terminal to Fallout Pip-Boy RobCo mode."],
                guess: ["guess", "Number guessing game (1-100). Type numbers to guess."],
                rps: ["rps [rock|paper|scissors]", "Rock-Paper-Scissors against the CPU."],
                calc: ["calc <expr>", "Calculator. Example: calc 2 + 2"],
                sl: ["sl", "You meant 'ls', right? ...right?"],
                pietro: ["pietro", "Who is this guy anyway?"],
                cowsay: ["cowsay [msg]", "A cow says your message."],
                ascii: ["ascii [text]", "Convert text to block-letter ASCII art."],
                figlet: ["figlet [text]", "Convert text to heavy block-letter art."],
                flip: ["flip [text]", "Flip text upside down."],
                man: ["man <cmd>", "You're reading it. Very meta."],
              };
              if (!manCmd) {
                output.innerHTML += `<div class="text-yellow-400">Usage: man &lt;command&gt;</div>`;
              } else if (manPages[manCmd]) {
                const [usage, desc] = manPages[manCmd];
                output.innerHTML += `<div class="my-2 font-mono text-xs"><div class="text-her-red font-bold mb-1">MANUAL: ${manCmd.toUpperCase()}</div><div class="text-gray-500 mb-1">─────────────────────────</div><div><span class="text-blue-400">Usage:</span> <span class="text-white">${usage}</span></div><div class="mt-1"><span class="text-blue-400">Info:</span> <span class="text-gray-300">${desc}</span></div></div>`;
              } else {
                output.innerHTML += `<div class="text-red-400">No manual entry for '${manCmd}'</div>`;
              }
              break;
            }

            case "skills": {
              inputEl.disabled = true;
              const skills = [
                { name: "AWS", level: 90, color: "text-green-400" },
                { name: "Terraform", level: 85, color: "text-green-400" },
                { name: "Docker/K8s", level: 85, color: "text-green-400" },
                { name: "CI/CD", level: 90, color: "text-green-400" },
                { name: "Python", level: 80, color: "text-yellow-400" },
                { name: "Networking", level: 75, color: "text-yellow-400" },
                { name: "TypeScript", level: 70, color: "text-yellow-400" },
              ];
              const barWidth = 22;
              output.innerHTML += `<div class="my-2 font-mono text-xs"><div class="text-her-red font-bold mb-1">SKILLS ASSESSMENT</div><div class="text-gray-500 mb-2">───────────────────────────────────────</div><div id="skills-output"></div></div>`;
              const skillsContainer = output.querySelector("#skills-output");
              let skillIdx = 0;
              let skillCancelled = false;
              let skillTimeout;
              function showNextSkill() {
                if (skillCancelled) return;
                if (skillIdx >= skills.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  return;
                }
                const s = skills[skillIdx];
                const filled = Math.round((s.level / 100) * barWidth);
                const empty = barWidth - filled;
                const bar = "█".repeat(filled) + "░".repeat(empty);
                const row = document.createElement("div");
                row.className = "flex items-center gap-2 mb-1";
                row.innerHTML = `<span class="text-gray-400 w-24 inline-block text-right">${s.name}</span> <span class="${s.color}">${bar}</span> <span class="text-white font-bold">${s.level}%</span>`;
                skillsContainer.appendChild(row);
                output.scrollTop = output.scrollHeight;
                skillIdx++;
                skillTimeout = setTimeout(showNextSkill, 200);
              }
              registerTerminalCleanup(() => {
                skillCancelled = true;
                clearTimeout(skillTimeout);
                inputEl.disabled = false;
                inputEl.focus();
              });
              showNextSkill();
              break;
            }

            case "timeline":
              output.innerHTML += `<div class="my-2 font-mono text-xs">
<div class="text-her-red font-bold mb-1">CAREER TIMELINE</div>
<div class="text-gray-500 mb-2">═══════════════════════════════════════</div>
<div class="space-y-1">
<div><span class="text-cyan-400 font-bold">2024</span> <span class="text-gray-500">───</span> <span class="text-white font-bold">Infrastructure Engineer</span></div>
<div class="text-gray-500 pl-12">│  <span class="text-gray-400">AWS, Terraform, Kubernetes, CI/CD</span></div>
<div class="text-gray-500 pl-12">│</div>
<div><span class="text-cyan-400 font-bold">2022</span> <span class="text-gray-500">───</span> <span class="text-white font-bold">DevOps Engineer</span></div>
<div class="text-gray-500 pl-12">│  <span class="text-gray-400">Docker, Ansible, Jenkins, Python</span></div>
<div class="text-gray-500 pl-12">│</div>
<div><span class="text-cyan-400 font-bold">2020</span> <span class="text-gray-500">───</span> <span class="text-white font-bold">Network Engineer</span></div>
<div class="text-gray-500 pl-12">│  <span class="text-gray-400">Cisco, Juniper, Python automation</span></div>
<div class="text-gray-500 pl-12">│</div>
<div><span class="text-cyan-400 font-bold">2018</span> <span class="text-gray-500">───</span> <span class="text-white font-bold">IT Support &rarr; Networking</span></div>
<div class="text-gray-500 pl-12">   <span class="text-gray-400">Started the journey</span></div>
</div>
<div class="text-gray-500 mt-2">═══════════════════════════════════════</div></div>`;
              break;

            default:
              output.innerHTML += `<div class="text-red-400">Command not found: ${cmd}</div>`;
          }

          inputEl.value = "";
          output.scrollTop = output.scrollHeight;
        };

        // cyberpunk mode - because i can
        window.handleCyberpunkCommand = function (input, output, inputEl) {
          output.innerHTML += `${getTerminalPromptHTML()} ${input}</div>`;

          if (!input) {
            inputEl.value = "";
            return;
          }
          terminalHistory.push(input);
          setTerminalHistoryIndex(-1);

          const args = input.split(" ");
          const cmd = args[0].toLowerCase();

          switch (cmd) {
            case "help":
              output.innerHTML += `<div class="text-[#FCEE0A]">NET_ARCH COMMANDS:</div>
                        <div class="ml-4 text-[#FF003C]">scan</div>
                        <div class="ml-4 text-[#FF003C]">breach [target]</div>
                        <div class="ml-4 text-[#FF003C]">daemons</div>
                        <div class="ml-4 text-[#FF003C]">disconnect</div>`;
              break;
            case "scan":
              output.innerHTML += `<div class="text-[#FCEE0A]">SCANNING SUBNET...</div>`;
              setTimeout(
                () =>
                  (output.innerHTML += `<div>[192.168.0.105] <span class="text-red-500">ICE DETECTED</span></div>`),
                300
              );
              setTimeout(
                () =>
                  (output.innerHTML += `<div>[192.168.0.211] <span class="text-green-500">OPEN PORT</span></div>`),
                600
              );
              break;
            case "disconnect":
            case "exit":
              const termWin = document.getElementById("win-terminal");
              termWin.classList.remove("theme-cyberpunk");
              termWin.classList.add("window-glitch");
              setTimeout(() => termWin.classList.remove("window-glitch"), 500);
              const titleEl = termWin.querySelector(".window-title");
              if (titleEl) titleEl.innerText = "Terminal";
              TERMINAL_STATE.mode = "pietros";
              TERMINAL_STATE.user = "guest";
              // Clear terminal and show goodbye
              output.innerHTML = `<div class="text-blue-400">Disconnected from NET_ARCH. Returning to pietrOS...</div>`;
              break;
            default:
              output.innerHTML += `<div class="text-[#FF003C]">ERROR: UNRECOGNIZED PROTOCOL</div>`;
          }
          inputEl.value = "";
          output.scrollTop = output.scrollHeight;
        };

        // fallout mode - patrolling the mojave
        window.handleFalloutCommand = function (input, output, inputEl) {
          output.innerHTML += `${getTerminalPromptHTML()} ${input}</div>`;

          if (!input) {
            inputEl.value = "";
            return;
          }
          terminalHistory.push(input);
          setTerminalHistoryIndex(-1);

          const args = input.split(" ");
          const cmd = args[0].toLowerCase();

          switch (cmd) {
            case "help":
              output.innerHTML += `<div class="text-[#18dc04]">ROBCO TERMINAL INSTRUCTIONS:</div>
                        <div class="ml-4">STATS   - VIEW S.P.E.C.I.A.L.</div>
                        <div class="ml-4">INV     - INVENTORY</div>
                        <div class="ml-4">RADIO   - PIP-BOY RADIO</div>
                        <div class="ml-4">EXIT    - SHUTDOWN TERMINAL</div>`;
              break;
            case "stats":
              output.innerHTML += `<pre class="text-[#18dc04]">
 S : IIIIII [6]
 P : IIIIIII [7]
 E : IIII [4]
 C : IIIII [5]
 I : IIIIIIIII [9]
 A : IIII [4]
 L : IIIII [5]</pre>`;
              break;
            case "inv":
              output.innerHTML += `<div class="text-[#18dc04]">
                        [ ] 10mm Pistol (Equipped)
                        [ ] Stimpak (x3)
                        [ ] RadAway (x1)
                        [ ] Bobby Pin (x14)
                        </div>`;
              break;
            case "exit":
            case "disconnect":
              const termWin = document.getElementById("win-terminal");
              termWin.classList.remove("theme-fallout");
              termWin.classList.add("window-glitch");
              setTimeout(() => termWin.classList.remove("window-glitch"), 500);
              const titleEl = termWin.querySelector(".window-title");
              if (titleEl) titleEl.innerText = "Terminal";
              TERMINAL_STATE.mode = "pietros";
              TERMINAL_STATE.user = "guest";
              // Clear terminal and show goodbye
              output.innerHTML = `<div class="text-blue-400">RobCo Terminal Shutdown. Goodbye.</div>`;
              break;
            default:
              output.innerHTML += `<div class="text-[#18dc04]">Syntax Error. Please consult your Overseer.</div>`;
          }
          inputEl.value = "";
          output.scrollTop = output.scrollHeight;
        };

        window.renderVault = function (filter = "") {
          const grid = document.getElementById("vault-grid");
          if (!grid) return;
          grid.innerHTML = "";

          const term = filter.toLowerCase();
          const activeCategory = document
            .querySelector(".vault-tab.active")
            ?.innerText.toUpperCase();

          vaultData.forEach((item) => {
            // Filter Logic
            if (
              activeCategory &&
              activeCategory !== "ALL" &&
              item.category.toUpperCase() !== activeCategory
            )
              return;
            if (
              term &&
              !item.title.toLowerCase().includes(term) &&
              !item.desc.toLowerCase().includes(term)
            )
              return;

            // Render Card
            const card = document.createElement("div");
            card.className =
              "p-3 md:p-4 border border-her-text/10 rounded-lg bg-white/60 dark:bg-white/5 hover:border-her-orange/50 transition-all cursor-pointer group min-h-[120px] md:min-h-[144px] vault-card-animate";
            card.style.animationDelay = `${grid.children.length * 50}ms`;
            if (item.action) card.setAttribute("onclick", item.action);

            // Icon based on type - Custom Icons for variety
            let icon = "";
            switch (item.type) {
              case "doc":
                icon =
                  '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
                break;
              case "food":
                icon =
                  '<svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z"></path></svg>'; // Heroicons cake
                break;
              case "music":
                icon =
                  '<svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>';
                break;
              case "book":
                icon =
                  '<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
                break;
              case "game":
                icon =
                  '<svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"></path></svg>'; // Heroicons puzzle-piece
                break;
              case "app":
                icon =
                  '<svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>';
                break;
              case "video":
                icon =
                  '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                break;
              case "link":
                icon =
                  '<svg class="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>';
                break;
              case "location":
                icon =
                  '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
                break;
              default:
                icon =
                  '<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
            }

            card.innerHTML = `
                    <div class="flex items-start justify-between mb-2 md:mb-3">
                        ${icon}
                        ${
                          item.status === "soon"
                            ? '<span class="px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-bold bg-yellow-100 text-yellow-800 rounded">Soon</span>'
                            : ""
                        }
                    </div>
                    <div class="font-bold text-xs md:text-sm mb-1 group-hover:text-her-red transition-colors truncate">${
                      item.title
                    }</div>
                    <div class="text-[10px] md:text-xs opacity-60 mb-2 md:mb-3 line-clamp-2">${
                      item.desc
                    }</div>
                    <div class="flex items-center gap-2">
                        <span class="px-1.5 md:px-2 py-0.5 md:py-1 bg-black/5 dark:bg-white/10 rounded text-[8px] md:text-[10px] uppercase font-bold opacity-50">${
                          item.category
                        }</span>
                        ${
                          item.status === "ready"
                            ? '<svg class="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>'
                            : ""
                        }
                    </div>
                `;
            grid.appendChild(card);
          });
        };

        // vault nav
        window.vaultShowGrid = function () {
          const grid = document.getElementById("vault-grid");
          const content = document.getElementById("vault-content");
          const backBtn = document.getElementById("vault-back-btn");
          const filters = document.getElementById("vault-filters");
          const search = document.getElementById("vault-search");
          const title = document.getElementById("vault-title");

          if (!grid || !content) return;

          // Show grid, hide content
          grid.classList.remove("hidden");
          content.classList.add("hidden");
          backBtn.classList.add("hidden");
          filters.classList.remove("hidden");
          search.classList.remove("hidden");

          // Reset title
          title.innerHTML = `
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <span class="hidden md:inline">Personal Vault</span>
                    <span class="md:hidden">Vault</span>
                `;
        };

        window.vaultShowFile = function (fileName) {
          const grid = document.getElementById("vault-grid");
          const content = document.getElementById("vault-content");
          const backBtn = document.getElementById("vault-back-btn");
          const filters = document.getElementById("vault-filters");
          const search = document.getElementById("vault-search");
          const title = document.getElementById("vault-title");
          const article = content.querySelector(".markdown-body");

          if (!grid || !content || !article) return;

          // Show loading state
          article.innerHTML =
            '<div class="text-center p-8 opacity-50">Loading...</div>';

          // Hide grid, show content
          grid.classList.add("hidden");
          content.classList.remove("hidden");
          backBtn.classList.remove("hidden");
          filters.classList.add("hidden");
          search.classList.add("hidden");

          // Update title to filename
          title.innerHTML = `<span>${fileName}</span>`;

          // Fetch and parse markdown
          // Fetch and parse markdown
          const markdown = getVaultContent(fileName);
          
          if (markdown) {
            article.innerHTML = marked.parse(markdown);
          } else {
             article.innerHTML = `<div class="text-red-500 p-4">Error loading file: File not found in bundle</div>`;
          }
        };

        // vault filtering
        window.filterVault = function (category) {
          // Update active tab styling
          const tabs = document.querySelectorAll(".vault-tab");
          tabs.forEach((tab) => {
            if (tab.innerText.toUpperCase() === category.toUpperCase()) {
              tab.classList.add("active", "bg-her-red", "text-white");
              tab.classList.remove("opacity-70");
            } else {
              tab.classList.remove("active", "bg-her-red", "text-white");
              tab.classList.add("opacity-70");
            }
          });

          // Re-render the vault with the new filter
          window.renderVault("");
        };

        // =====================================
        // FINDER APP FUNCTIONS
        // =====================================
        let finderCurrentPath = "/home/guest";
        let finderHistory: string[] = ["/home/guest"];
        let finderHistoryIndex = 0;
        let finderViewMode = "grid";

        window.initFinder = function () {
          window.finderNavigate("/home/guest");
        };

        window.finderNavigate = function (path: string) {
          finderCurrentPath = path;
          
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

        window.finderToggleView = function (mode: string) {
          finderViewMode = mode;
          window.finderRender();
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
            item.className = `finder-item flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${isHidden ? 'opacity-50' : ''}`;
            
            const icon = isFile 
              ? `<svg class="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`
              : `<svg class="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
            
            item.innerHTML = `
              ${icon}
              <span class="text-xs text-center truncate w-full">${name}</span>
            `;
            
            if (!isFile) {
              item.onclick = () => window.finderNavigate(`${finderCurrentPath}/${name}`.replace("//", "/"));
            }
            
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
          { id: "techstack", title: "Tech Stack", icon: "⚡", color: "bg-green-500" },
          { id: "terminal", title: "Terminal", icon: "💻", color: "bg-gray-700" },
          { id: "finder", title: "Finder", icon: "📂", color: "bg-blue-400" },
          { id: "monitor", title: "Monitoring", icon: "📊", color: "bg-teal-500" },
          { id: "settings", title: "Settings", icon: "⚙️", color: "bg-gray-500" },
          { id: "sysinfo", title: "About pietrOS", icon: "ℹ️", color: "bg-rose-500" },
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
