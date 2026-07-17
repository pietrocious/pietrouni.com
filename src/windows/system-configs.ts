import type { WindowConfig } from '../types';

export const systemWindowConfigs: Record<string, WindowConfig> = {
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
