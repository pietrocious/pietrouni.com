# pietrouni.com

an OS-inspired interactive portfolio showcasing my profile and my DevOps and Infrastructure projects

live demo: [pietrouni.com](https://pietrouni.com)

## Concept

this project is meant to be more than a simple static resume and be a functional ["webtop"](https://en.wikipedia.org/wiki/Web_desktop). Featuring a window management system, a functional terminal, and an interactive "Vault" for explores files and resources, all within a macOS/GNOME-inspired hybrid desktop environment

this project started as a single HTML file with vanilla JavaScript, CSS, and Tailwind v3 via CDN. it has since evolved to use Vite, TypeScript, and Tailwind v4. I'm pretty happy with the results after this big upgrade

## Tech Stack

- **Core:** HTML5, TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS v4, custom CSS (glassmorphism, animations)
- **Markdown:** marked.js
- **Features:**
  - **Window Management:** draggable, resizable window system
  - **Terminal Emulator:** custom shell with command history, filesystem simulation, and fun commands
  - **Spotlight Search:** global search (Ctrl+K) for apps and vault items
  - **Vault:** markdown-based content files
  - **Dynamic Theme:** system-aware dark mode and multiple wallpapers

## project structure

```
├── index.html          # main entry point, desktop environment and window templates
├── styles.css          # custom animations, wallpapers
├── src/
│   ├── main.ts         # core app logic, window definitions, terminal commands
│   ├── config.ts       # static data (vault items, filesystem, commands)
│   ├── state.ts        # shared app state (windows, terminal, wallpapers)
│   ├── terminal/       # terminal commands and theme modules
│   └── windows/        # window management (drag, resize, minimize)
├── assets/
│   ├── icons/          # dock and UI icons
│   └── favicon/        # favicon stuff
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

### Tailwind CSS

[Tailwind CSS](https://tailwindcss.com/) by Tailwind Labs. Licensed under MIT.
