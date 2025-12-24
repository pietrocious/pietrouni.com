# Interactive OS-themed Portfolio

An OS-inspired interactive portfolio showcasing DevOps and Infrastructure projects. Built with a focus on rich aesthetics, interactivity, and a premium design.

Live demo: [pietrouni.com](https://pietrouni.com)

## Concept

This project is more than a static resume; it's a functional ["webtop"](https://en.wikipedia.org/wiki/Web_desktop). It features a window management system, a functional terminal, and an interactive "Vault" for explores files and resources, all within a macOS/GNOME-inspired desktop environment.

## Tech Stack

- **Core:** HTML5, Vanilla JavaScript
- **Styling:** Tailwind CSS (via CDN), Custom CSS (Glassmorphism, Animations)
- **Features:**
  - **Window Management:** Independent, draggable, and resizable window system.
  - **Terminal Emulator:** Custom-built shell with command history, file system simulation, and fun utility commands.
  - **Spotlight Search:** Global search functionality (Cmd+K) for quick access to apps and vault items.
  - **Vault & Markdown:** Markdown-based content rendering for "files" stored in the vault.
  - **Dynamic Theme:** System-aware dark mode and multiple wallpaper sets.

## Project Structure

- `index.html`: The main entry point containing the desktop environment, window templates, and core logic.
- `styles.css`: Custom animations, glassmorphism effects, and layout refinements.
- `vault/`: Markdown and PDF files displayed within the portfolio's "Vault" application.
- `icons/`: Custom SVGs for the dock and system UI.
- `experiments/`: Isolated UI/UX experiments (e.g., Arch Linux TWM theme).

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
