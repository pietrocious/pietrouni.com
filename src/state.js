// state.js - centralized state for the whole app
// keeps track of windows, terminal state, and other shared stuff

// window management
export let zIndexCounter = 100;
export const activeWindows = {}; // { element, config, maximized, prevRect }
export let monitorInterval = null;

// wallpaper state
export let activeWallpaperIndex = 0;

// wallpapers - named after macos versions because why not
export const wallpapers = [
  // Sonoma Flow - Organic Flowing Blobs (Default)
  { type: "class", light: "sonoma-bg", dark: "sonoma-bg-dark" },
  // Sequoia Gradient - Rich Layered Diagonals
  { type: "class", light: "sequoia-bg", dark: "sequoia-bg-dark" },
  // Ventura Waves - Smooth Flowing Layers
  { type: "class", light: "ventura-bg", dark: "ventura-bg-dark" },
];

// all wallpaper classes for cleanup
export const allWallpaperClasses = [
  "her-bg",
  "her-bg-dark",
  "sonoma-bg",
  "sonoma-bg-dark",
  "sequoia-bg",
  "sequoia-bg-dark",
  "ventura-bg",
  "ventura-bg-dark",
];

// terminal stuff
export let currentPath = "/home/guest";
export let terminalHistory = [];
export let terminalHistoryIndex = -1;
export let guessGame = { active: false, target: 0, attempts: 0 };
export let ciscoMode = { active: false };
export let terraformMode = { active: false };

// quotes - shuffled on load for variety
export const quotes = [
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
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export let shuffledQuotes = shuffleArray([...quotes]);
export let quoteIndex = 0;

// terminal mode state
export const TERMINAL_STATE = {
  mode: "os93", // 'os93', 'cyberpunk', 'fallout'
  user: "guest",
  host: "OS93",
};

// tab completion for terminal
export let tabCompletionIndex = 0;
export let lastTabInput = "";

// setters for mutable state (since we cant reassign imports directly)
export function incrementZIndex() {
  return ++zIndexCounter;
}

export function setActiveWallpaperIndex(idx) {
  activeWallpaperIndex = idx;
}

export function setMonitorInterval(interval) {
  monitorInterval = interval;
}

export function setCurrentPath(path) {
  currentPath = path;
}

export function setTerminalHistoryIndex(idx) {
  terminalHistoryIndex = idx;
}

export function pushTerminalHistory(cmd) {
  terminalHistory.push(cmd);
}

export function setQuoteIndex(idx) {
  quoteIndex = idx;
}

export function reshuffleQuotes() {
  shuffledQuotes = shuffleArray([...quotes]);
}

export function setTabCompletionIndex(idx) {
  tabCompletionIndex = idx;
}

export function setLastTabInput(input) {
  lastTabInput = input;
}
