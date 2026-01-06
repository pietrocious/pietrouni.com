// terminal/fallout.ts - patrolling the mojave almost makes you wish for a nuclear winter
// robco industries (tm)

import { getTerminalPromptHTML, TERMINAL_STATE, pushTerminalHistory, setTerminalHistoryIndex } from './core';

export function handleFalloutCommand(input: string, output: HTMLElement, inputEl: HTMLInputElement): void {
  output.innerHTML += `${getTerminalPromptHTML()} ${input}</div>`;

  if (!input) {
    inputEl.value = "";
    return;
  }
  pushTerminalHistory(input);
  setTerminalHistoryIndex(-1);

  const args = input.split(" ");
  const cmd = args[0].toLowerCase();

  switch (cmd) {
    case "help":
      output.innerHTML += `<div class="text-[#18dc04]">ROBCO TERMINAL INSTRUCTIONS:</div>
                <div class="ml-4">STATS   - VIEW S.P.E.C.I.A.L.</div>
                <div class="ml-4">INV     - INVENTORY</div>
                <div class="ml-4">RADIO   - PIP-BOY RADIO</div>
                <div class="ml-4">EXIT    - SHUTDOWN TERMINAL</div>`;
      break;
    case "stats":
      output.innerHTML += `<pre class="text-[#18dc04]">
 S : IIIIII [6]
 P : IIIIIII [7]
 E : IIII [4]
 C : IIIII [5]
 I : IIIIIIIII [9]
 A : IIII [4]
 L : IIIII [5]</pre>`;
      break;
    case "inv":
      output.innerHTML += `<div class="text-[#18dc04]">
                [ ] 10mm Pistol (Equipped)
                [ ] Stimpak (x3)
                [ ] RadAway (x1)
                [ ] Bobby Pin (x14)
                </div>`;
      break;
    case "radio":
      output.innerHTML += `<div class="text-[#18dc04]">
                <div class="font-bold mb-2">📻 PIP-BOY RADIO</div>
                <div class="ml-2">[1] Galaxy News Radio</div>
                <div class="ml-2">[2] Mojave Music Radio</div>
                <div class="ml-2 text-gray-500">[3] Enclave Radio (Signal Lost)</div>
                <div class="mt-2 italic text-xs">♪ "I don't want to set the world on fire..." ♪</div>
                </div>`;
      break;
    case "exit":
    case "disconnect": {
      const termWin = document.getElementById("win-terminal");
      if (termWin) {
        termWin.classList.remove("theme-fallout");
        termWin.classList.add("window-glitch");
        setTimeout(() => termWin.classList.remove("window-glitch"), 500);
        const titleEl = termWin.querySelector(".window-title");
        if (titleEl) titleEl.textContent = "Terminal";
      }
      TERMINAL_STATE.mode = "os93";
      TERMINAL_STATE.user = "guest";
      // Clear terminal and show goodbye
      output.innerHTML = `<div class="text-blue-400">RobCo Terminal Shutdown. Goodbye.</div>`;
      break;
    }
    default:
      output.innerHTML += `<div class="text-[#18dc04]">Syntax Error. Please consult your Overseer.</div>`;
  }
  inputEl.value = "";
  output.scrollTop = output.scrollHeight;
}
