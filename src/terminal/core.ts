// terminal/core.ts - shared terminal functionality
// handles prompts, history navigation, tab completion, and command routing

import { fileSystem, PIETROS_COMMANDS, CYBERPUNK_COMMANDS, FALLOUT_COMMANDS } from '../config';
import {
  TERMINAL_STATE,
  terminalHistory, pushTerminalHistory,
  terminalHistoryIndex, setTerminalHistoryIndex,
  tabCompletionIndex, setTabCompletionIndex,
  lastTabInput, setLastTabInput,
  runTerminalCleanups, hasActiveCleanups
} from '../state';
import type { FileSystemNode } from '../types';

// filesystem helper
export function resolvePath(path: string): FileSystemNode | null {
  const parts = path.split("/").filter((p) => p);
  let current: FileSystemNode = fileSystem["root"];

  for (const part of parts) {
    if (part === "root") continue;
    if (current[part] && typeof current[part] === "object") {
      current = current[part] as FileSystemNode;
    } else {
      return null;
    }
  }
  return current;
}

// mode-specific prompts
export function getTerminalPromptHTML(): string {
  if (TERMINAL_STATE.mode === "cyberpunk") {
    return `<div><span class="text-[#FF003C] font-bold">V@NET_ARCH</span><span class="text-white">:</span><span class="text-[#FCEE0A]">~/subnets</span><span class="text-[#FF003C]">$</span>`;
  }
  if (TERMINAL_STATE.mode === "fallout") {
    return `<div><span class="text-[#18dc04] font-bold">VAULT_DWELLER@PIPBOY</span> <span class="text-[#18dc04]">></span>`;
  }
  // Default pietrOS
  return `<div><span class="text-green-400 font-semibold">${TERMINAL_STATE.user}@${TERMINAL_STATE.host}</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>`;
}

// main input handler - routes to mode-specific handlers
export function handleTerminalCommand(e: KeyboardEvent): void {
  const inputEl = document.getElementById("cmd-input") as HTMLInputElement | null;
  const output = document.getElementById("term-output");

  if (!inputEl || !output) return;

  // Ctrl+C — cancel running animations / exit sub-modes
  if (e.key === "c" && e.ctrlKey) {
    e.preventDefault();
    if (hasActiveCleanups()) {
      runTerminalCleanups();
      inputEl.disabled = false;
      inputEl.focus();
    }
    // reset sub-modes via pietros handler
    if (window.resetTerminalSubModes) {
      window.resetTerminalSubModes();
    }
    output.innerHTML += `${getTerminalPromptHTML()} <span class="text-red-400">^C</span></div>`;
    inputEl.value = "";
    output.scrollTop = output.scrollHeight;
    return;
  }

  // Ctrl+L — clear terminal
  if (e.key === "l" && e.ctrlKey) {
    e.preventDefault();
    output.innerHTML = "";
    return;
  }

  // Ctrl+U — clear current input line
  if (e.key === "u" && e.ctrlKey) {
    e.preventDefault();
    inputEl.value = "";
    return;
  }

  // History Navigation (Shared)
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (
      terminalHistory.length > 0 &&
      terminalHistoryIndex < terminalHistory.length - 1
    ) {
      setTerminalHistoryIndex(terminalHistoryIndex + 1);
      inputEl.value =
        terminalHistory[
          terminalHistory.length - 1 - terminalHistoryIndex
        ];
    }
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (terminalHistoryIndex > -1) {
      setTerminalHistoryIndex(terminalHistoryIndex - 1);
      inputEl.value =
        terminalHistoryIndex >= 0
          ? terminalHistory[
              terminalHistory.length - 1 - terminalHistoryIndex
            ]
          : "";
    }
    return;
  }

  // Tab Autocomplete
  if (e.key === "Tab") {
    e.preventDefault();
    const currentInput = inputEl.value.toLowerCase().trim();

    if (!currentInput) return;

    // Get commands for current mode
    let commands: string[];
    if (TERMINAL_STATE.mode === "cyberpunk") {
      commands = CYBERPUNK_COMMANDS;
    } else if (TERMINAL_STATE.mode === "fallout") {
      commands = FALLOUT_COMMANDS;
    } else {
      commands = PIETROS_COMMANDS;
    }

    // Find matching commands
    const matches = commands.filter((cmd) =>
      cmd.startsWith(currentInput)
    );

    if (matches.length === 0) return;

    if (matches.length === 1) {
      // Single match - complete it
      inputEl.value = matches[0];
      setTabCompletionIndex(0);
      setLastTabInput("");
    } else {
      // Multiple matches - cycle through them
      if (lastTabInput !== currentInput) {
        // New input, reset cycle
        setTabCompletionIndex(0);
        setLastTabInput(currentInput);
        // Show available completions
        output.innerHTML += `<div class="text-gray-400 text-xs my-1">${matches.join(
          "  "
        )}</div>`;
        output.scrollTop = output.scrollHeight;
      }
      inputEl.value = matches[tabCompletionIndex];
      setTabCompletionIndex((tabCompletionIndex + 1) % matches.length);
    }
    return;
  }

  // Reset tab completion on other key presses
  if (e.key !== "Tab") {
    setLastTabInput("");
    setTabCompletionIndex(0);
  }

  if (e.key === "Enter") {
    const input = (e.target as HTMLInputElement).value.trim();

    // Specific Router
    if (TERMINAL_STATE.mode === "cyberpunk") {
      window.handleCyberpunkCommand(input, output, inputEl);
    } else if (TERMINAL_STATE.mode === "fallout") {
      window.handleFalloutCommand(input, output, inputEl);
    } else {
      window.handlePietrOSCommand(input, output, inputEl);
    }
  }
}

// re-export state for use by command handlers
export { TERMINAL_STATE, pushTerminalHistory, setTerminalHistoryIndex };
