import type { WindowConfig } from '../types';

export const portfolioWindowConfigs: Record<string, WindowConfig> = {
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

};

