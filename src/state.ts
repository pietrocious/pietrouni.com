// state.ts - centralized state for the whole app
// keeps track of windows, terminal state, and other shared stuff

import type { WindowState, Wallpaper, TerminalState, GuessGameState, ModeState } from './types';

// window management
export let zIndexCounter = 100;
export const activeWindows: Record<string, WindowState> = {};
export let monitorInterval: ReturnType<typeof setInterval> | null = null;

// wallpaper state — Halo (index 1) is default
export let activeWallpaperIndex = 1;

// 3D vanta effects only
export const wallpapers: Wallpaper[] = [
  { type: "vanta", light: "", dark: "", label: "Birds", vantaEffect: "BIRDS" },
  { type: "vanta", light: "", dark: "", label: "Halo",  vantaEffect: "HALO"  },
  { type: "vanta", light: "", dark: "", label: "Waves", vantaEffect: "WAVES" },
];

// CSS classes to clean up on wallpaper switch (legacy / her-bg variants)
export const allWallpaperClasses: string[] = [
  "her-bg",
  "her-bg-dark",
];

// terminal stuff
export let currentPath = "/home/guest";
export let terminalHistory: string[] = [];
export let terminalHistoryIndex = -1;
export const guessGame: GuessGameState = { active: false, target: 0, attempts: 0 };
export const ciscoMode: ModeState = { active: false };
export const terraformMode: ModeState = { active: false };

// quotes - shuffled on load for variety
export const quotes: string[] = [
  "If you don't work hard on your own dreams, you'll eventually end up building someone else's.",
  "The only way to do great work is to love what you do.",
  "Sometimes the correct path, the bravest path is the least obvious, and also the gentlest.",
  "If you don't like what is being said, change the conversation.",
  "Even though success is a reality, it's effects are temporary.",
  "You don't have to be great to start, but you have to start to be great.",
  "In the middle of difficulty lies opportunity.",
  "Every expert was once a beginner who refused to quit.",
  "The only way to make sense out of change is to plunge into it, move with it, and join the dance.",
];

// shuffle helper
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export let shuffledQuotes = shuffleArray([...quotes]);
export let quoteIndex = 0;

// terminal mode state
export const TERMINAL_STATE: TerminalState = {
  mode: "pietros",
  user: "guest",
  host: "pietrOS",
};

// tab completion for terminal
export let tabCompletionIndex = 0;
export let lastTabInput = "";

// setters for mutable state (since we cant reassign imports directly)
export function incrementZIndex(): number {
  return ++zIndexCounter;
}

export function setActiveWallpaperIndex(idx: number): void {
  activeWallpaperIndex = idx;
}

export function setMonitorInterval(interval: ReturnType<typeof setInterval> | null): void {
  monitorInterval = interval;
}

export function setCurrentPath(path: string): void {
  currentPath = path;
}

export function setTerminalHistoryIndex(idx: number): void {
  terminalHistoryIndex = idx;
}

export function pushTerminalHistory(cmd: string): void {
  terminalHistory.push(cmd);
}

export function setQuoteIndex(idx: number): void {
  quoteIndex = idx;
}

export function reshuffleQuotes(): void {
  shuffledQuotes = shuffleArray([...quotes]);
}

export function setTabCompletionIndex(idx: number): void {
  tabCompletionIndex = idx;
}

export function setLastTabInput(input: string): void {
  lastTabInput = input;
}

// terminal cleanup registry for Ctrl+C cancellation
let terminalCleanupFns: (() => void)[] = [];

export function registerTerminalCleanup(fn: () => void): void {
  terminalCleanupFns.push(fn);
}

export function runTerminalCleanups(): void {
  for (const fn of terminalCleanupFns) fn();
  terminalCleanupFns = [];
}

export function hasActiveCleanups(): boolean {
  return terminalCleanupFns.length > 0;
}
