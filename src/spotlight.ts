// Spotlight (Ctrl+K) search overlay
import { vaultData } from "./vault";
import { getLauncherApps } from "./app-registry";

interface SpotlightApp {
  id: string;
  title: string;
  icon: string;
}

const spotlightApps: SpotlightApp[] = getLauncherApps().map(({ id, title, icon }) => ({ id, title, icon }));

export function toggleSpotlight(): void {
  const spot = document.getElementById("spotlight")!;
  const box = document.getElementById("spotlight-box")!;
  const input = document.getElementById("spotlight-input") as HTMLInputElement | null;

  if (spot.classList.contains("hidden")) {
    spot.classList.remove("hidden");
    spot.classList.add("flex");
    setTimeout(() => {
      box.classList.remove("scale-95", "opacity-0");
      box.classList.add("scale-100", "opacity-100");
      input?.focus();
    }, 10);
    handleSearch("");
  } else {
    box.classList.remove("scale-100", "opacity-100");
    box.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      spot.classList.add("hidden");
      spot.classList.remove("flex");
    }, 300);
  }
}

export function handleSearch(query: string): void {
  const container = document.getElementById("spotlight-results");
  if (!container) return;
  container.innerHTML = "";
  const term = query.toLowerCase().trim();

  if (!term) {
    container.innerHTML = `
      <div class="p-4">
        <div class="text-[10px] uppercase font-bold opacity-40 tracking-wider mb-3">Applications</div>
        <div class="grid grid-cols-5 gap-3">
          ${spotlightApps.map(app => `
            <div
              class="spotlight-app flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all hover:scale-105"
              onclick="restoreWindow('${app.id}'); toggleSpotlight();"
              role="button"
              tabindex="0"
              onkeydown="if(event.key==='Enter'){restoreWindow('${app.id}'); toggleSpotlight();}"
            >
              <img src="${app.icon}" alt="${app.title}" class="w-10 h-10 drop-shadow-sm" />
              <span class="text-[10px] text-center truncate w-full opacity-70">${app.title}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    return;
  }

  const results: { title: string; desc: string; action: string; icon: string }[] = [];

  spotlightApps.forEach(app => {
    if (app.title.toLowerCase().includes(term) || app.id.includes(term)) {
      results.push({
        title: app.title,
        desc: "Application",
        action: `restoreWindow('${app.id}'); toggleSpotlight();`,
        icon: `<img src="${app.icon}" alt="${app.title}" class="w-8 h-8" />`,
      });
    }
  });

  vaultData.forEach((item) => {
    if (
      item.title.toLowerCase().includes(term) ||
      item.desc.toLowerCase().includes(term)
    ) {
      results.push({
        title: item.title,
        desc: `Vault • ${item.desc}`,
        action: item.url
          ? `window.open('${item.url}', '_blank', 'noopener,noreferrer'); toggleSpotlight();`
          : item.appId
            ? `restoreWindow('${item.appId}'); toggleSpotlight();`
            : item.file
              ? `window.openMarkdownViewer('${item.file}', '${item.title}'); toggleSpotlight();`
              : `restoreWindow('vault'); toggleSpotlight();`,
        icon: `<div class="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>`,
      });
    }
  });

  if (results.length === 0) {
    container.innerHTML = `<div class="p-4 text-center opacity-50 text-sm">No results found.</div>`;
    return;
  }

  results.forEach((res, idx) => {
    const div = document.createElement("div");
    div.className = `spotlight-result p-3 flex items-center gap-3 border-b border-her-red/5 last:border-0 ${
      idx === 0 ? "selected" : ""
    }`;
    div.setAttribute("tabindex", "0");
    div.setAttribute("role", "option");
    div.setAttribute("aria-selected", idx === 0 ? "true" : "false");
    if (res.action) {
      div.setAttribute("onclick", res.action);
      div.setAttribute("onkeydown", `if(event.key==='Enter'){${res.action}}`);
    }

    div.innerHTML = `
            ${res.icon}
            <div>
                <div class="font-bold text-sm text-her-text dark:text-her-textLight">${res.title}</div>
                <div class="text-xs opacity-60">${res.desc}</div>
            </div>
         `;
    container.appendChild(div);
  });
}

export function executeSearchResult(): void {
  const first = document.querySelector<HTMLElement>(".spotlight-result");
  if (first) first.click();
}

export function trapFocusInSpotlight(e: KeyboardEvent): void {
  const spot = document.getElementById("spotlight");
  if (!spot || spot.classList.contains("hidden")) return;

  const spotlightBox = document.getElementById("spotlight-box");
  if (!spotlightBox) return;
  const focusableElements = spotlightBox.querySelectorAll<HTMLElement>(
    'input, button, [tabindex]:not([tabindex="-1"]), .spotlight-result'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  if (e.key === "Tab") {
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }
}

export function initSpotlight(): void {
  window.toggleSpotlight = toggleSpotlight;
  window.handleSearch = handleSearch;
  window.executeSearchResult = executeSearchResult;
}
