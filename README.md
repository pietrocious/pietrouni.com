# pietrouni.com

[![CI/CD](https://github.com/pietrocious/pietrouni.com/actions/workflows/production.yml/badge.svg)](https://github.com/pietrocious/pietrouni.com/actions/workflows/production.yml)
[![](https://img.shields.io/website?down_color=red&down_message=offline&label=pietrouni.com&up_color=green&up_message=online&url=https%3A%2F%2Fpietrouni.com)](https://pietrouni.com)

# pietrOS

an OS-inspired interactive portfolio showcasing my profile and my DevOps and Infrastructure projects. Works on all devices: desktop, tablet, and mobile.

live demo: [pietrouni.com](https://pietrouni.com)

## concept

this project is meant to be more than a simple static resume and be a functional ["webtop"](https://en.wikipedia.org/wiki/Web_desktop). featuring a window management system, a functional terminal, and an interactive "vault" for exploring files and resources, all within an archlinux based desktop environment

this project started as a single HTML file with vanilla JavaScript, CSS, and Tailwind v3 via CDN. it has since evolved to use Vite, TypeScript, and Tailwind v4. I'm pretty happy with the results after this big upgrade

## tech stack

- **core:** HTML5, TypeScript
- **build:** Vite
- **styling:** Tailwind CSS v4, custom CSS
- **3d / wallpapers:** Vanta.js, Three.js
- **features:**
  - **window management:** draggable, resizable window system
  - **terminal emulator:** custom shell with command history, filesystem simulation, tab completion, and fun commands. switchable themes: pietrOS, Cyberpunk, and Fallout
  - **animated wallpapers:** 3D WebGL wallpapers powered by Vanta.js (Birds, Halo, Waves) with light/dark theme–aware configs. switchable from the settings panel
  - **spotlight search:** global search (Ctrl+K) for apps and vault items
  - **vault:** markdown-based content files
  - **games arcade:** Snake, 2048, Tetris, Threes, Tic-Tac-Toe, and a Doom launcher
  - **experiments lab:** interactive DevOps demos (IaC Visualizer, Network Topology)
  - **dock:** macOS-style fish-eye magnification with Gaussian falloff and bounce animations
  - **audio system:** synthesized UI sound effects (boot chime, clicks, window open/close) via Web Audio API — no external files needed
  - **dynamic theme:** system-aware dark mode with smooth transitions

## project structure

```
├── index.html          # main entry point, desktop environment and window templates
├── styles.css          # custom animations, wallpapers
├── src/
│   ├── main.ts         # core app logic, window definitions, terminal commands
│   ├── config.ts       # static data (vault items, filesystem, commands)
│   ├── state.ts        # shared app state (windows, terminal, wallpapers)
│   ├── vanta.ts        # Vanta.js animated wallpaper manager (Birds, Halo, Waves)
│   ├── dock.ts         # macOS-style fish-eye dock magnification
│   ├── audio.ts        # synthesized UI sound effects (Web Audio API)
│   ├── terminal/       # terminal commands and theme modules (pietrOS, Cyberpunk, Fallout)
│   ├── games/          # built-in games (Snake, 2048, Tetris, Threes, Tic-Tac-Toe, Doom)
│   ├── apps/           # standalone app modules (IaC Visualizer, Network Topology)
│   └── windows/        # window management (drag, resize, minimize)
├── assets/
│   ├── icons/          # dock and UI icons
│   └── favicon/        # favicon stuff
└── vault/              # markdown content files for the vault app
```

## credits

### fonts

this project uses a combination of Google Fonts and one custom font:

- **Playfair Display** (Google Fonts) – display/headline font
- **Lora** (Google Fonts) – serif body text
- **Noto Sans** (Google Fonts) – system UI font
- **JetBrains Mono** (Google Fonts) – code/monospace
- **Fixedsys** (custom, not included) – terminal emulator font

### icons and wallpapers

dock icons are from the [Neuwaita](https://github.com/RusticBard/Neuwaita) icon theme by [RusticBard](https://github.com/RusticBard), a beautiful take on the Adwaita theme for GNOME

animated desktop wallpapers are powered by [Vanta.js](https://github.com/tengbao/vanta) by [Teng Bao](https://github.com/tengbao), using [Three.js](https://threejs.org/) for WebGL rendering

### special thanks

- [Shubham Agrawal](https://agrashu.me/) for the inspiration
- [Tailwind CSS](https://tailwindcss.com/) by Tailwind Labs
