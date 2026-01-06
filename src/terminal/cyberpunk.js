// terminal/cyberpunk.js - netrunner mode commands
// v's got chrome to install

import { getTerminalPromptHTML, TERMINAL_STATE, pushTerminalHistory, setTerminalHistoryIndex } from './core.js';

export function handleCyberpunkCommand(input, output, inputEl) {
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
      output.innerHTML += `<div class="text-[#FCEE0A]">NET_ARCH COMMANDS:</div>
                <div class="ml-4 text-[#FF003C]">scan</div>
                <div class="ml-4 text-[#FF003C]">breach [target]</div>
                <div class="ml-4 text-[#FF003C]">daemons</div>
                <div class="ml-4 text-[#FF003C]">disconnect</div>`;
      break;
    case "scan":
      output.innerHTML += `<div class="text-[#FCEE0A]">SCANNING SUBNET...</div>`;
      setTimeout(
        () =>
          (output.innerHTML += `<div>[192.168.0.105] <span class="text-red-500">ICE DETECTED</span></div>`),
        300
      );
      setTimeout(
        () =>
          (output.innerHTML += `<div>[192.168.0.211] <span class="text-green-500">OPEN PORT</span></div>`),
        600
      );
      break;
    case "breach":
      const breachTarget = args[1] || "unknown";
      output.innerHTML += `<div class="text-[#FCEE0A]">INITIATING BREACH PROTOCOL...</div>`;
      setTimeout(() => {
        output.innerHTML += `<div class="text-[#FF003C]">[!] Firewall detected on ${breachTarget}</div>`;
      }, 400);
      setTimeout(() => {
        output.innerHTML += `<div class="text-green-400">[✓] Firewall bypassed</div>`;
      }, 800);
      setTimeout(() => {
        output.innerHTML += `<div class="text-[#FF003C]">ACCESS GRANTED. You're in, choom.</div>`;
        output.scrollTop = output.scrollHeight;
      }, 1200);
      break;
    case "daemons":
      output.innerHTML += `<div class="text-[#FCEE0A]">ACTIVE DAEMONS:</div>
                <div class="ml-4 text-green-400">[ICEPICK] - Reduces ICE resistance</div>
                <div class="ml-4 text-purple-400">[MASS VULNERABILITY] - Weakens targets</div>
                <div class="ml-4 text-red-400">[DATAMINE_V3] - Extracts eddies</div>`;
      break;
    case "disconnect":
    case "exit":
      const termWin = document.getElementById("win-terminal");
      termWin.classList.remove("theme-cyberpunk");
      termWin.classList.add("window-glitch");
      setTimeout(() => termWin.classList.remove("window-glitch"), 500);
      const titleEl = termWin.querySelector(".window-title");
      if (titleEl) titleEl.innerText = "Terminal";
      TERMINAL_STATE.mode = "os93";
      TERMINAL_STATE.user = "guest";
      // Clear terminal and show goodbye
      output.innerHTML = `<div class="text-blue-400">Disconnected from NET_ARCH. Returning to OS93...</div>`;
      break;
    default:
      output.innerHTML += `<div class="text-[#FF003C]">ERROR: UNRECOGNIZED PROTOCOL</div>`;
  }
  inputEl.value = "";
  output.scrollTop = output.scrollHeight;
}
