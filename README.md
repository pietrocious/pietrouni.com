# pietrouni.com

an OS-inspired interactive portfolio showcasing my profile and my DevOps and Infrastructure projects

live demo: [pietrouni.com](https://pietrouni.com)

## Concept

this project is meant to be more than a simple static resume and be a functional ["webtop"](https://en.wikipedia.org/wiki/Web_desktop). Featuring a window management system, a functional terminal, and an interactive "Vault" for explores files and resources, all within a macOS/GNOME-inspired hybrid desktop environment

## Tech Stack

- **Core:** HTML5, TypeScript
- **Styling:** Tailwind CSS (via CDN), Custom CSS (Glassmorphism, Animations)
- **Features:**
  - **Window Management:** Independent, draggable, and resizable window system.
  - **Terminal Emulator:** Custom-built shell with command history, file system simulation, and some utility and fun commands
  - **Spotlight Search:** Global search functionality (Ctrl+K) for quick access to apps and vault items
  - **Vault & Markdown:** Markdown-based content rendering for "files" stored in the vault
  - **Dynamic Theme:** System-aware dark mode and multiple wallpaper sets

## project structure

```
├── index.html          # main entry point, desktop environment and window templates
├── styles.css          # custom animations, glassmorphism, wallpapers
├── src/
│   ├── main.ts         # core app logic, window definitions, terminal commands
│   ├── config.ts       # static data (vault items, filesystem, commands)
│   ├── state.ts        # shared app state (windows, terminal, wallpapers)
│   ├── terminal/       # terminal theme modules (os93, cyberpunk, fallout)
│   └── windows/        # window management (drag, resize, minimize)
├── assets/
│   ├── icons/          # dock and UI icons (Neuwaita theme)
│   └── favicon/        # site favicon
└── vault/              # markdown content files for the vault app
```

## Licensing & Credits

### Fonts

This project uses a combination of Google Fonts and one custom font:

- **Playfair Display** (Google Fonts) – Display/headline font
- **Lora** (Google Fonts) – Serif body text
- **Noto Sans** (Google Fonts) – System UI font
- **JetBrains Mono** (Google Fonts) – Code/monospace
- **Fixedsys** (custom, not included) – Terminal emulator font

### Icons

Dock icons are from the [Neuwaita](https://github.com/RusticBard/Neuwaita) icon theme by [RusticBard](https://github.com/RusticBard), a beautiful take on the Adwaita theme for GNOME. Licensed under GPL-3.0.
