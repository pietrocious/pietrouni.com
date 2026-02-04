# pietrouni.com

[![CI/CD](https://github.com/pietrocious/pietrouni.com/actions/workflows/production.yml/badge.svg)](https://github.com/pietrocious/pietrouni.com/actions/workflows/production.yml)
[![](https://img.shields.io/website?down_color=red&down_message=offline&label=pietrouni.com&up_color=green&up_message=online&url=https%3A%2F%2Fpietrouni.com)](https://pietrouni.com)

# pietrOS

an OS-inspired interactive portfolio showcasing my profile and my DevOps and Infrastructure projects. Works on all devices—desktop, tablet, and mobile.

live demo: [pietrouni.com](https://pietrouni.com)

## concept

this project is meant to be more than a simple static resume and be a functional ["webtop"](https://en.wikipedia.org/wiki/Web_desktop). featuring a window management system, a functional terminal, and an interactive "vault" for exploring files and resources, all within an archlinux based desktop environment

this project started as a single HTML file with vanilla JavaScript, CSS, and Tailwind v3 via CDN. it has since evolved to use Vite, TypeScript, and Tailwind v4. I'm pretty happy with the results after this big upgrade

## tech stack

- **core:** HTML5, TypeScript
- **build:** Vite
- **styling:** Tailwind CSS v4, custom CSS (glassmorphism, animations)
- **features:**
  - **window management:** draggable, resizable window system
  - **terminal emulator:** custom shell with command history, filesystem simulation, and fun commands
  - **spotlight search:** global search (Ctrl+K) for apps and vault items
  - **vault:** markdown-based content files
  - **dynamic theme:** system-aware dark mode and multiple wallpapers

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

## credits

### fonts

this project uses a combination of Google Fonts and one custom font:

- **Playfair Display** (Google Fonts) – display/headline font
- **Lora** (Google Fonts) – serif body text
- **Noto Sans** (Google Fonts) – system UI font
- **JetBrains Mono** (Google Fonts) – code/monospace
- **Fixedsys** (custom, not included) – terminal emulator font

### icons

dock icons are from the [Neuwaita](https://github.com/RusticBard/Neuwaita) icon theme by [RusticBard](https://github.com/RusticBard), a beautiful take on the Adwaita theme for GNOME

### special thanks

- [Shubham Agrawal](https://agrashu.me/) for the inspiration
- [Tailwind CSS](https://tailwindcss.com/) by Tailwind Labs
