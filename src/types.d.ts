// Global type declarations for the portfolio app

// Window function extensions
declare global {
  interface Window {
    // Window management
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    restoreWindow: (id: string) => void;
    toggleMaximize: (id: string) => void;
    startDrag: (e: MouseEvent | TouchEvent, id: string) => void;
    openWindow: (id: string) => void;

    // Theme
    toggleTheme: () => void;

    // Vault
    vaultShowFile: (filename: string) => void;

    // Terminal command handlers
    handleOS93Command: (input: string, output: HTMLElement, inputEl: HTMLInputElement) => void;
    handleCyberpunkCommand: (input: string, output: HTMLElement, inputEl: HTMLInputElement) => void;
    handleFalloutCommand: (input: string, output: HTMLElement, inputEl: HTMLInputElement) => void;
  }
}

// Wallpaper configuration
export interface Wallpaper {
  type: 'class' | 'gradient';
  light: string;
  dark: string;
}

// Active window state
export interface WindowState {
  element: HTMLElement;
  config: WindowConfig;
  maximized: boolean;
  prevRect?: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
}

// Window configuration
export interface WindowConfig {
  title: string;
  icon: string;
  width: string;
  height: string;
  x?: string;
  y?: string;
  body: string | (() => string);
  onOpen?: (win: HTMLElement) => void;
}

// Terminal mode state
export interface TerminalState {
  mode: 'os93' | 'cyberpunk' | 'fallout';
  user: string;
  host: string;
}

// Vault item
export interface VaultItem {
  id: string;
  title: string;
  desc: string;
  type: string;
  category: string;
  status: 'ready' | 'soon';
  action: string;
}

// Guess game state
export interface GuessGameState {
  active: boolean;
  target: number;
  attempts: number;
}

// Sub-mode state
export interface ModeState {
  active: boolean;
}

// FileSystem structure
export interface FileSystemNode {
  [key: string]: FileSystemNode | 'FILE';
}

export {};
