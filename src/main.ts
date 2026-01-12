import { marked } from 'marked';

// config - static data
import { vaultData, fileSystem, asciiAlpha, OS93_COMMANDS, CYBERPUNK_COMMANDS, FALLOUT_COMMANDS } from './config';
import { getVaultContent } from './vault';

// state - shared app state with setters for mutations
import {
  activeWindows, incrementZIndex, wallpapers, allWallpaperClasses,
  currentPath, setCurrentPath, terminalHistory, pushTerminalHistory,
  terminalHistoryIndex, setTerminalHistoryIndex, guessGame, ciscoMode, terraformMode,
  shuffledQuotes, quoteIndex, setQuoteIndex, reshuffleQuotes, TERMINAL_STATE,
  activeWallpaperIndex, setActiveWallpaperIndex, monitorInterval, setMonitorInterval,
  tabCompletionIndex, setTabCompletionIndex, lastTabInput, setLastTabInput
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
        function initTheme() {
          const desktop = document.getElementById("desktop");
          if (
            localStorage.theme === "dark" ||
            (!("theme" in localStorage) &&
              window.matchMedia("(prefers-color-scheme: dark)").matches)
          ) {
            document.documentElement.classList.add("dark");
            // Initial load: remove defaults to allow style override
            desktop.classList.remove("her-bg", "her-bg-dark");
          } else {
            document.documentElement.classList.remove("dark");
            desktop.classList.remove("her-bg", "her-bg-dark");
          }
          applyWallpaper();
        }

        window.toggleTheme = function () {
          if (document.documentElement.classList.contains("dark")) {
            document.documentElement.classList.remove("dark");
            localStorage.theme = "light";
          } else {
            document.documentElement.classList.add("dark");
            localStorage.theme = "dark";
          }
          applyWallpaper();

          const frames = document.querySelectorAll("iframe");
          const newTheme = document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";
          frames.forEach((frame) => {
            frame.contentWindow.postMessage(
              { type: "theme-change", theme: newTheme },
              "*"
            );
          });
        };

        window.cycleWallpaper = function () {
          setActiveWallpaperIndex((activeWallpaperIndex + 1) % wallpapers.length);
          applyWallpaper();
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
          // Trap focus in spotlight when open
          trapFocusInSpotlight(e);
        });

        window.handleSearch = function (query) {
          const container = document.getElementById("spotlight-results");
          container.innerHTML = "";
          const term = query.toLowerCase();

          const results = [];

          // Search Windows (Apps)
          Object.keys(windows).forEach((key) => {
            const w = windows[key];
            if (w.title.toLowerCase().includes(term) || key.includes(term)) {
              results.push({
                title: w.title,
                desc: "Application",
                action: `restoreWindow('${key}'); toggleSpotlight();`,
                icon: `<div class="w-8 h-8 rounded bg-her-red text-white flex items-center justify-center font-bold text-xs">${w.title
                  .substring(0, 2)
                  .toUpperCase()}</div>`,
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
            title: "About OS93",
            content: `
                     <div class="h-full flex flex-col bg-her-paper dark:bg-[#1a100c] text-her-text dark:text-her-textLight p-6 select-none font-ui">
                        <h1 class="text-xl font-bold mb-1 font-serif">About OS93</h1>
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
                        <h1 class="text-4xl font-serif font-extrabold text-her-red dark:text-her-red tracking-tight mb-4">Hi, I'm Pietro 👋</h1>
                        
                        <div class="space-y-4">
                            <!-- My Journey -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">My Journey</h2>
                                <p class="opacity-90">
                                    I'm an Infrastructure Engineer based in Barcelona with a somewhat winding path through tech. What started as HP printer support in 2014 eventually led me through enterprise help desk work, specialized medical device support, and into the world of enterprise networking. I spent over three years at <span class="font-semibold text-her-red dark:text-her-red">Cisco TAC</span> solving complex routing, switching, and SDN problems for Fortune 500 companies—the kind of work that teaches you how distributed systems actually break in production.
                                </p>
                                <p class="opacity-90 mt-4">
                                    These days, I have been working on Infrastructure for the last two years and I'm actively transitioning toward DevOps and Platform Engineering. I've realized I'd rather build and automate systems than just keep them running.
                                </p>
                            </div>

                            <!-- What I'm Building -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">What I'm Building</h2>
                                <p class="opacity-90 mb-4">
                                    I believe the best way to learn is to build things that actually work. My current focus is creating production-grade infrastructure projects that demonstrate real DevOps capabilities:
                                </p>
                                <ul class="list-none space-y-4 font-serif font-normal">
                                    <li class="pl-4 border-l-2 border-her-red">
                                        <a href="https://github.com/pietrocious/terraform-aws-pietrouni" target="_blank" class="content-link font-semibold">Terraform AWS Modules</a> – Complete AWS infrastructure featuring Multi-AZ networking, Auto-scaling, and CloudFront. Built to demonstrate enterprise DevOps practices.
                                    </li>
                                    <li class="pl-4 border-l-2 border-her-red">
                                        <a href="https://github.com/pietrocious/pietrouni.com" target="_blank" class="content-link font-semibold">pietrouni.com</a> – This interactive OS-themed portfolio website you're viewing right now. Built with HTML, TypeScript, and Tailwind CSS.
                                    </li>
                                </ul>
                                <p class="mt-4 italic opacity-70">You can see the code behind these projects on my <a href="https://github.com/pietrocious" target="_blank" class="content-link">GitHub</a>.</p>
                            </div>

                            <!-- Why DevOps -->
                            <div>
                                <h2 class="text-lg font-serif font-bold text-her-dark dark:text-her-cream mt-4 mb-2">Why DevOps?</h2>
                                <p class="opacity-90">
                                    After years of troubleshooting other people's infrastructure, I want to be the one designing and building it. My networking background gives me an edge—I understand how distributed systems communicate, fail, and scale. DevOps lets me leverage that foundation while learning to automate, containerize, and orchestrate at scale.
                                </p>
                            </div>

                            <!-- Beyond Work -->
                            <div>
                                <h2 class="text-lg font-serif font-extrabold text-her-dark dark:text-her-cream mt-4 mb-2">Beyond Work</h2>
                                <p class="opacity-90">
                                    Outside of infrastructure work, I listen to music across pretty much every genre, play games when I have time, and enjoy understanding how complex systems get built. I'm fascinated by the engineering behind games and tech products; the coordination, the tradeoffs, the architecture decisions that make something actually work at such a scale, and how much we're all standing on the shoulders of giants.
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
                                    <span class="opacity-30">/</span>
                                    <a href="https://github.com/pietrocious" target="_blank" class="content-link">GITHUB</a>
                                    <span class="opacity-30">/</span>
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
                     <div class="h-full dyn-p font-ui overflow-y-auto window-content selection:bg-her-red selection:text-white p-2">
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
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate" style="animation-delay: 0ms" onclick="window.open('https://github.com/pietrocious/terraform-aws-pietrouni', '_blank')">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">Terraform AWS Modules</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Infrastructure</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight">Complete AWS infrastructure featuring Multi-AZ networking, Auto-scaling, and CloudFront. Built to demonstrate enterprise DevOps practices.</p>
                                        <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TERRAFORM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">AWS</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">CICD</span>
                                        </div>
                                        <div class="flex gap-3 text-xs opacity-60">
                                            <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg> GitHub</span>
                                        </div>
                                    </div>

                                    <!-- pietrouni.com -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate" style="animation-delay: 50ms" onclick="window.open('https://github.com/pietrocious/pietrouni.com', '_blank')">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">pietrouni.com</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Portfolio</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight">This interactive OS-themed portfolio website. Built with HTML, TypeScript, and Tailwind CSS.</p>
                                        <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">HTML</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TYPESCRIPT</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">TAILWIND</span>
                                        </div>
                                        <div class="flex gap-3 text-xs opacity-60">
                                            <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg> GitHub</span>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <!-- Scripts -->
                            <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                    Scripts
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    <!-- psbp-scripts -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate" style="animation-delay: 100ms" onclick="window.open('https://github.com/pietrocious/psbp-scripts', '_blank')">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">psbp-scripts</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">Scripts</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight">PowerShell, bash and Python scripts for network automation, home lab automation and experiments like wifi-keys to extract all wifi passwords.</p>
                                        <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">POWERSHELL</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">BASH</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">PYTHON</span>
                                        </div>
                                        <div class="flex gap-3 text-xs opacity-60">
                                            <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>GitHub</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            
                            <!-- Personal Projects -->
                             <div>
                                <div class="flex items-center gap-2 mb-4 opacity-50 text-xs font-bold tracking-widest uppercase text-her-dark dark:text-her-textLight">
                                    <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                    Personal Projects
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    <!-- runcible -->
                                    <div class="p-4 border border-her-text/10 bg-white/40 dark:bg-white/5 rounded-lg hover:border-her-text/30 transition-colors cursor-pointer vault-card-animate" style="animation-delay: 150ms" onclick="window.open('https://github.com/pietrocious/runcible', '_blank')">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-ui font-semibold text-her-dark dark:text-her-textLight">runcible</h3>
                                            <span class="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-her-text/10 opacity-70">AI / Edge</span>
                                        </div>
                                        <p class="text-xs opacity-70 mb-4 text-her-dark dark:text-her-textLight">An out-of-place artifact (OOPArt) — a self-contained AI knowledge system for edge hardware. Exploring how to compress human knowledge into the smallest viable form factor.</p>
                                        <div class="flex flex-wrap gap-1.5 mb-4">
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">PYTHON</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">LLM</span>
                                            <span class="px-2 py-1 text-[10px] rounded bg-black/5 dark:bg-white/10 text-her-dark dark:text-her-textLight">RASPBERRY PI</span>
                                        </div>
                                        <div class="flex gap-3 text-xs opacity-60">
                                            <span class="flex items-center gap-1 hover:underline hover:opacity-100 text-her-dark dark:text-her-textLight"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>GitHub</span>
                                        </div>
                                    </div>

                                </div>
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
                    <div id="vault-app" class="h-full flex flex-col bg-her-paper dark:bg-[#2D1A14]">
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
                        <div id="vault-grid" class="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          experiments: {
            title: "Lab // Experiments",
            content: `
                    <div class="h-full bg-[#0a0a0a] text-green-500 font-mono p-6 overflow-y-auto select-none border-t-4 border-green-500">
                        <div class="flex items-center justify-between mb-8">
                            <div>
                                <h1 class="text-2xl font-bold uppercase tracking-widest">Research & Development</h1>
                                <div class="text-xs opacity-50">SECTOR 7 // RESTRICTED ACCESS</div>
                            </div>
                            <div class="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="border border-green-500/30 p-4 hover:bg-green-500/10 cursor-pointer transition-all">
                                <div class="text-xs border border-green-500 inline-block px-1 mb-2">PROTOTYPE</div>
                                <h3 class="font-bold text-lg mb-1">WebGL Fluid Sim</h3>
                                <p class="text-xs opacity-60">GPU-accelerated fluid dynamics test using Three.js.</p>
                            </div>
                            <div class="border border-green-500/30 p-4 hover:bg-green-500/10 cursor-pointer transition-all">
                                <div class="text-xs border border-green-500 inline-block px-1 mb-2">CONCEPT</div>
                                <h3 class="font-bold text-lg mb-1">Neural Network Viz</h3>
                                <p class="text-xs opacity-60">Visualizing weights and biases in real-time.</p>
                            </div>
                        </div>
                        
                        <div class="mt-8 text-xs opacity-40">
                            > SYSTEM INTEGRITY: 100%<br>
                            > LOGGING ENABLED
                        </div>
                    </div>
                `,
            width: 800,
            height: 600,
          },
          terminal: {
            title: "Terminal",
            content: `
                    <div class="h-full bg-transparent text-white p-4 font-kernel text-sm flex flex-col overflow-hidden" id="term-container" onclick="document.getElementById('cmd-input').focus()">
                        <div id="term-output" class="flex-1 overflow-y-auto space-y-1 window-content" style="-webkit-overflow-scrolling: touch; touch-action: pan-y;">
                            <div class="text-gray-400 hidden md:block">OS93 v1.4 (Jade-Jonze) | Linux micro-kernel 6.8.0-45</div>
                            <div class="text-gray-500 hidden md:block">Type 'help' for available commands</div>
                            <div class="text-gray-500 mb-4 hidden md:block">...and 'help-fun' for fun commands!</div>
                        </div>
                        <div class="md:border-t border-white/20 md:pt-2">
                            <div class="text-gray-400 text-xs md:hidden">OS93 v1.4 (Jade-Jonze) | Linux micro-kernel 6.8.0-45</div>
                            <div class="text-gray-500 text-xs mb-2 md:hidden">Type 'help' or 'help-fun' for available commands</div>
                            <div class="flex items-center gap-2 text-white">
                                <span id="term-prompt" class="text-green-400 font-semibold whitespace-nowrap">guest@OS93</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>
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
                    <div class="h-full flex flex-col items-center justify-center bg-her-paper dark:bg-[#2D1A14] p-8 text-center">
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
                        <button class="btn-neon min" onclick="window.minimizeWindow('${id}')" aria-label="Minimize window"></button>
                        <button class="btn-neon max" onclick="window.toggleMaximize('${id}')" aria-label="Maximize window"></button>
                        <button class="btn-neon close" onclick="window.closeWindow('${id}')" aria-label="Close window"></button>
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

          // Remove opening animation class after animation completes
          setTimeout(() => winEl.classList.remove("window-opening"), 350);

          // Dock State
          const dockItem = document.getElementById(`dock-${id}`);
          if (dockItem) {
            dockItem.classList.add("active");
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
                        <div class="h-full overflow-y-auto bg-her-paper dark:bg-[#2D1A14] p-6 md:p-8">
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













        // clock
        function updateClock() {
          const now = new Date();
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const day = days[now.getDay()];
          const time = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
          document.getElementById("clock").innerText = `${day} ${time}`;
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
          // Default OS93
          return `<div><span class="text-green-400 font-semibold">${TERMINAL_STATE.user}@${TERMINAL_STATE.host}</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>`;
        }

        // Forward declaration of handlers
        window.handleOS93Command = null;
        window.handleCyberpunkCommand = null;
        window.handleFalloutCommand = null;


        window.handleTerminalCommand = function (e) {
          const inputEl = document.getElementById("cmd-input");
          const output = document.getElementById("term-output");

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
              commands = OS93_COMMANDS;
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
              window.handleOS93Command(input, output, inputEl);
            }
          }
        };

        // normal mode commands
        window.handleOS93Command = function (input, output, inputEl) {
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
              output.innerHTML += `
                        <div class="opacity-80 mt-1 mb-2">
                            <div class="font-bold text-her-red mb-1">Available Commands:</div>
                            <div class="pl-2">
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">System</div>
                                <div>help, about, clear, neofetch, version</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">File Operations</div>
                                <div>ls [-a], cd, pwd, mkdir, touch, rmdir, cat</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Applications</div>
                                <div>open [app], about, projects, resume</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Network & DevOps</div>
                                <div>traceroute, dig, curl, docker, terraform, ssh, cisco</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Utilities</div>
                                <div>calc, uptime, clock, version, quote</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Fun & Games</div>
                                <div>💡 Try 'help-fun' for some fun commands!</div>
                            </div>
                        </div>`;
              break;
            case "help-fun":
              output.innerHTML += `
                            <div class="opacity-80 mt-1 mb-2">
                                <div class="font-bold text-purple-400 mb-2">🎮 Fun Commands:</div>
                                <div class="pl-2 space-y-2">
                                    <div><span class="text-pink-400 font-bold text-xs uppercase">Text & Art:</span> ascii, figlet, cowsay, flip</div>
                                    <div><span class="text-green-400 font-bold text-xs uppercase">Games:</span> guess, rps, 8ball, hack</div>
                                    <div><span class="text-cyan-400 font-bold text-xs uppercase">Visuals:</span> matrix, rain, sl, clock</div>
                                    <div><span class="text-yellow-400 font-bold text-xs uppercase">Eggs:</span> hlx, fallout, sudo, rm, pietro</div>
                                </div>
                            </div>`;
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
            case "ll":
              let showHidden = args.includes("-a");
              let content = "";
              if (dirObj) {
                Object.keys(dirObj).forEach((k) => {
                  if (!showHidden && k.startsWith(".")) return;
                  const isDir = typeof dirObj[k] === "object";
                  content += `<span class="${
                    isDir ? "text-blue-400 font-bold" : ""
                  } mr-4">${k}${isDir ? "/" : ""}</span>`;
                });
              }
              output.innerHTML += `<div>${content}</div>`;
              break;
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
            case "tracert":
              const traceTarget = args[1] || "pietrouni.com";
              const hops = [
                { ip: "192.168.1.1", host: "router.local", ms: [1, 2, 1] },
                { ip: "10.0.0.1", host: "isp-gateway.net", ms: [8, 9, 8] },
                {
                  ip: "72.14.215.85",
                  host: "edge-router-1.carrier.net",
                  ms: [15, 14, 16],
                },
                {
                  ip: "142.250.169.174",
                  host: "core-switch-eu.backbone.net",
                  ms: [24, 25, 23],
                },
                {
                  ip: "203.0.113.50",
                  host: "cdn-edge.cloudfront.net",
                  ms: [28, 29, 27],
                },
                { ip: "151.101.1.140", host: traceTarget, ms: [32, 31, 33] },
              ];
              output.innerHTML += `<div class="text-cyan-400 text-xs">traceroute to ${traceTarget}, 30 hops max, 60 byte packets</div>`;
              let hopIndex = 0;
              function showNextHop() {
                if (hopIndex >= hops.length) {
                  output.innerHTML += `<div class="text-green-400 text-xs mt-1">Trace complete.</div>`;
                  output.scrollTop = output.scrollHeight;
                  return;
                }
                const hop = hops[hopIndex];
                output.innerHTML += `<div class="text-gray-300 text-xs font-mono">${(
                  hopIndex + 1
                )
                  .toString()
                  .padStart(2)}  ${hop.host} (${hop.ip})  ${hop.ms[0]}ms  ${
                  hop.ms[1]
                }ms  ${hop.ms[2]}ms</div>`;
                output.scrollTop = output.scrollHeight;
                hopIndex++;
                setTimeout(showNextHop, 300 + Math.random() * 200);
              }
              showNextHop();
              break;
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
            case "ssh":
              inputEl.disabled = true;
              const sshPrompt = document.getElementById("term-prompt");
              const sshMessages = [
                {
                  text: '<span class="text-gray-400">Connecting to CORE-RTR-01 (192.168.1.1)...</span>',
                  delay: 0,
                },
                {
                  text: '<span class="text-gray-400">Verifying SSH key fingerprint...</span>',
                  delay: 500,
                },
                {
                  text: '<span class="text-green-400">Connection established.</span>',
                  delay: 1000,
                },
                { text: "", delay: 1200 },
                {
                  text: '<span class="text-cyan-400">CORE-RTR-01#</span> <span class="text-gray-500">Type ? for available commands, exit to disconnect</span>',
                  delay: 1400,
                },
              ];
              let sshIndex = 0;
              function showNextSsh() {
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
                setTimeout(
                  showNextSsh,
                  sshMessages[sshIndex]?.delay
                    ? sshMessages[sshIndex].delay - msg.delay
                    : 200
                );
              }
              showNextSsh();
              break;
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
                  {
                    text: '<span class="text-red-500 font-bold">⚠️ WARNING: DESTRUCTIVE OPERATION DETECTED</span>',
                    delay: 0,
                  },
                  {
                    text: '<span class="text-red-400">Deleting /bin...</span>',
                    delay: 600,
                  },
                  {
                    text: '<span class="text-yellow-500 animate-pulse">KERNEL PANIC</span>',
                    delay: 3000,
                  },
                  {
                    text: '<span class="text-green-400 font-bold text-lg"> jk this is just a website, silly 😂</span>',
                    delay: 4000,
                  },
                ];
                let rmIndex = 0;
                function showNextRm() {
                  if (rmIndex >= rmMessages.length) {
                    inputEl.disabled = false;
                    inputEl.focus();
                    return;
                  }
                  const msg = rmMessages[rmIndex];
                  if (msg.text) output.innerHTML += `<div>${msg.text}</div>`;
                  output.scrollTop = output.scrollHeight;
                  rmIndex++;
                  setTimeout(
                    showNextRm,
                    rmMessages[rmIndex]?.delay
                      ? rmMessages[rmIndex].delay - msg.delay
                      : 500
                  );
                }
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
              output.innerHTML += `<div class="text-green-400 font-bold my-2">Follow the white rabbit... (Click to stop)</div>`;
              const stopMatrix = () => {
                clearInterval(matrixInterval);
                canvas.remove();
                document.removeEventListener("click", stopMatrix);
              };
              document.addEventListener("click", stopMatrix);
              break;
            case "rain":
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
              function drawRain() {
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
                requestAnimationFrame(drawRain);
              }
              const rainAnim = requestAnimationFrame(drawRain);
              output.innerHTML += `<div class="text-blue-300 font-bold my-2">🌧️ It's raining code... (Reload to stop)</div>`;
              break;
            case "sl":
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
              function moveTrain() {
                if (trainPos < -200) {
                  trainDiv.remove();
                  return;
                }
                trainDiv.style.left = trainPos + "px";
                trainDiv.innerText = trainFrames[frameIdx % 4];
                trainPos -= 10;
                frameIdx++;
                requestAnimationFrame(moveTrain);
              }
              moveTrain();
              output.innerHTML += `<div class="text-yellow-400 font-mono my-2">CHOO CHOO! 🚂</div>`;
              break;
            case "hack":
              inputEl.disabled = true;
              const hackLines = [
                {
                  text: "Initializing brute-force attack...",
                  color: "text-green-500",
                },
                {
                  text: "Target: MAINFRAME (10.0.0.1)",
                  color: "text-green-500",
                },
                { text: "Bypassing firewall...", color: "text-yellow-500" },
                { text: "Accessing secure nodes...", color: "text-yellow-500" },
                { text: "Decrypting passwords...", color: "text-red-500" },
                {
                  text: "ACCESS GRANTED. Downloading database...",
                  color: "text-green-500 font-bold",
                },
                {
                  text: "Download complete. Traces cleared.",
                  color: "text-blue-500",
                },
              ];
              let hackIndex = 0;
              function runHack() {
                if (hackIndex >= hackLines.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  return;
                }
                output.innerHTML += `<div class="${hackLines[hackIndex].color} font-mono text-xs my-1">${hackLines[hackIndex].text}</div>`;
                output.scrollTop = output.scrollHeight;
                hackIndex++;
                setTimeout(runHack, Math.random() * 800 + 200);
              }
              runHack();
              break;
            case "hlx":
              // Half-Life 3 / HLX Easter Egg
              inputEl.disabled = true;

              const hlxMessages = [
                {
                  text: '<span class="text-green-400">Connecting to Valve servers...</span>',
                  delay: 0,
                },
                {
                  text: '<span class="text-green-400">Authenticating: ████████████ 100%</span>',
                  delay: 800,
                },
                {
                  text: '<span class="text-yellow-400">Loading HLX assets: 1... 2... 2.5... 2.75... 2.9... 2.99... 2.999...</span>',
                  delay: 1600,
                },
                { text: "", delay: 2400 }, // Lambda will be inserted here
                {
                  text: '<span class="text-gray-400 italic">"The right man in the wrong place can make all the difference in the world..."</span>',
                  delay: 4500,
                },
                {
                  text: '<span class="text-gray-500 text-xs">                                                              - G-Man</span>',
                  delay: 5000,
                },
                { text: "", delay: 5800 },
                {
                  text: '<span class="text-red-500 font-bold">ERROR: Unable to count to 3. This is a known Valve limitation.</span>',
                  delay: 6300,
                },
              ];

              // Lambda ASCII art with glitch effect
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

              function showNextHlx() {
                if (hlxIndex >= hlxMessages.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  // Start glitch effect on lambda
                  const lambdaEl = output.querySelector(".hlx-lambda");
                  if (lambdaEl) {
                    let glitchCount = 0;
                    const glitchInterval = setInterval(() => {
                      if (glitchCount > 10) {
                        clearInterval(glitchInterval);
                        lambdaEl.style.transform = "none";
                        lambdaEl.style.opacity = "1";
                        return;
                      }
                      const offsetX = (Math.random() - 0.5) * 4;
                      const offsetY = (Math.random() - 0.5) * 2;
                      const skew = (Math.random() - 0.5) * 3;
                      lambdaEl.style.transform = `translate(${offsetX}px, ${offsetY}px) skewX(${skew}deg)`;
                      lambdaEl.style.opacity =
                        Math.random() > 0.3 ? "1" : "0.7";
                      // Color glitch
                      lambdaEl.style.color =
                        Math.random() > 0.8 ? "#ff6b6b" : "#f97316";
                      glitchCount++;
                    }, 100);
                  }
                  return;
                }

                const hlxMsg = hlxMessages[hlxIndex];
                const nextDelay =
                  hlxIndex < hlxMessages.length - 1
                    ? hlxMessages[hlxIndex + 1].delay - hlxMsg.delay
                    : 500;

                if (hlxIndex === 3) {
                  // Insert lambda art
                  output.innerHTML += lambdaArt;
                } else if (hlxMsg.text) {
                  output.innerHTML += `<div>${hlxMsg.text}</div>`;
                }

                output.scrollTop = output.scrollHeight;
                hlxIndex++;
                setTimeout(showNextHlx, nextDelay);
              }

              showNextHlx();
              break;
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
              TERMINAL_STATE.mode = "os93";
              TERMINAL_STATE.user = "guest";
              // Clear terminal and show goodbye
              output.innerHTML = `<div class="text-blue-400">Disconnected from NET_ARCH. Returning to OS93...</div>`;
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
              TERMINAL_STATE.mode = "os93";
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
              "p-4 border border-her-text/10 rounded-lg bg-white/60 dark:bg-white/5 hover:border-her-orange/50 transition-all cursor-pointer group h-36 vault-card-animate";
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
                  '<svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"></path></svg>'; // Utensils/Abstract
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
                  '<svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>';
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
                    <div class="flex items-start justify-between mb-3">
                        ${icon}
                        ${
                          item.status === "soon"
                            ? '<span class="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-yellow-800 rounded">Soon</span>'
                            : ""
                        }
                    </div>
                    <div class="font-bold text-sm mb-1 group-hover:text-her-red transition-colors">${
                      item.title
                    }</div>
                    <div class="text-xs opacity-60 mb-3 line-clamp-2">${
                      item.desc
                    }</div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-[10px] uppercase font-bold opacity-50">${
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

        // fake monitor charts
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

        // Initial site Launch
        setTimeout(() => {
          window.openWindow("about");
        }, 100);
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
