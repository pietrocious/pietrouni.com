// Launchpad — full-screen app grid with search filter
import { getLauncherApps } from './app-registry';

const launchpadApps = getLauncherApps();

export function filterLaunchpad(query: string): void {
  const grid = document.getElementById("launchpad-grid");
  if (!grid) return;

  const term = query.toLowerCase();
  const filtered = launchpadApps.filter(app =>
    app.title.toLowerCase().includes(term) || app.id.includes(term)
  );

  grid.innerHTML = "";

  filtered.forEach((app, idx) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "launchpad-item flex flex-col items-center gap-2 cursor-pointer group";
    item.setAttribute('aria-label', `Open ${app.title}`);
    item.style.animationDelay = `${idx * 30}ms`;
    item.innerHTML = `
      <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl ${app.launcherColor} flex items-center justify-center text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform">
        ${app.launcherIcon}
      </div>
      <span class="text-white text-xs text-center truncate w-full opacity-80 group-hover:opacity-100">${app.title}</span>
    `;

    item.onclick = () => {
      window.closeWindow("launchpad");
      setTimeout(() => window.restoreWindow(app.id), 100);
    };

    grid.appendChild(item);
  });
}

export function initLaunchpadModule(): void {
  window.initLaunchpad = () => filterLaunchpad("");
  window.filterLaunchpad = filterLaunchpad;
}
